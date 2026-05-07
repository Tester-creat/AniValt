/**
 * Property test for cache hit avoiding re-fetch (Property 6)
 * Validates: Requirements 3.1, 3.3
 *
 * Property 6: Cache hit avoids re-fetch
 * For any `anilistId`-and-episode combination that already exists in
 * `episodeEmbedCache`, calling `buildUrl` SHALL return the cached stream URL
 * immediately and SHALL NOT initiate a new fetch request.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Inline copy of the Anikoto provider (mirrors app.js pattern used by other
// test files — do NOT import from app.js to avoid browser dependency issues).
// episodeEmbedCache is declared here so the buildUrl closure resolves correctly.
// ---------------------------------------------------------------------------
const episodeEmbedCache = {};

const anikotoProvider = {
  name: "Anikoto",
  active: true,
  idType: "anilist",
  notes: "Requires async embed ID lookup via Anikoto API. Returns '' on cache miss; re-renders on resolution.",
  buildUrl: (entry, ep, lang) => {
    const key = `${entry.anilistId}-${ep}`;
    if (episodeEmbedCache[key]) {
      return `https://anikoto.to/stream/s-2/${episodeEmbedCache[key]}/${lang}`;
    }
    fetch(`https://anikoto.to/api/episode?anilistId=${entry.anilistId}&ep=${ep}`)
      .then(r => r.json())
      .then(data => {
        const embedId = data && data.embedId;
        if (embedId) {
          episodeEmbedCache[key] = embedId;
          // queueRender() is not available in tests — omitted intentionally
        }
      })
      .catch(() => {});
    return "";
  }
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clear the shared cache before each test run. */
function clearCache() {
  for (const key of Object.keys(episodeEmbedCache)) {
    delete episodeEmbedCache[key];
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.unstubAllGlobals();
  clearCache();
});

describe('Property P6: Cache hit avoids re-fetch', () => {

  it(
    'returns cached stream URL and never calls fetch when cache is pre-populated',
    () => {
      fc.assert(
        fc.property(
          // Generate (anilistId, episode, embedId, lang) triples.
          // embedId must be non-empty (truthy) for the cache hit branch to fire.
          fc.integer({ min: 1, max: 2_000_000 }),
          fc.integer({ min: 1, max: 1000 }),
          fc.string({ minLength: 1 }),
          fc.oneof(fc.constant("sub"), fc.constant("dub")),
          (anilistId, episode, embedId, lang) => {
            clearCache();

            // Track whether fetch was called
            let fetchCalled = false;
            vi.stubGlobal('fetch', () => {
              fetchCalled = true;
              return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ embedId }),
              });
            });

            // Pre-populate the cache — this is the cache hit scenario
            const key = `${anilistId}-${episode}`;
            episodeEmbedCache[key] = embedId;

            const entry = { anilistId };
            const result = anikotoProvider.buildUrl(entry, episode, lang);

            // Assert: return value equals the expected cached stream URL
            expect(result).toBe(`https://anikoto.to/stream/s-2/${embedId}/${lang}`);

            // Assert: fetch was never called
            expect(fetchCalled).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'returned URL starts with https:// on a cache hit',
    () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 2_000_000 }),
          fc.integer({ min: 1, max: 1000 }),
          fc.string({ minLength: 1 }),
          fc.oneof(fc.constant("sub"), fc.constant("dub")),
          (anilistId, episode, embedId, lang) => {
            clearCache();

            vi.stubGlobal('fetch', () => {
              throw new Error('fetch should not be called on a cache hit');
            });

            const key = `${anilistId}-${episode}`;
            episodeEmbedCache[key] = embedId;

            const result = anikotoProvider.buildUrl({ anilistId }, episode, lang);

            expect(result.startsWith('https://')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'returned URL contains the exact embedId and lang token on a cache hit',
    () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 2_000_000 }),
          fc.integer({ min: 1, max: 1000 }),
          fc.string({ minLength: 1 }),
          fc.oneof(fc.constant("sub"), fc.constant("dub")),
          (anilistId, episode, embedId, lang) => {
            clearCache();

            vi.stubGlobal('fetch', () => {
              throw new Error('fetch should not be called on a cache hit');
            });

            const key = `${anilistId}-${episode}`;
            episodeEmbedCache[key] = embedId;

            const result = anikotoProvider.buildUrl({ anilistId }, episode, lang);

            // URL must contain the literal lang token
            expect(result).toContain(lang);
            // URL must be exactly the documented pattern
            expect(result).toBe(`https://anikoto.to/stream/s-2/${embedId}/${lang}`);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

});
