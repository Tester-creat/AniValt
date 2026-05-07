/**
 * Property test for fetch uses `anilistId` and result is cached under composite key (Property 3)
 * Validates: Requirements 2.1, 2.2, 2.5, 3.2
 *
 * Property 3: Fetch uses `anilistId` and result is cached under composite key
 * For any anime entry with a positive `anilistId` and any episode number, when
 * `buildUrl` is called on a cache miss, the outgoing fetch request URL SHALL
 * contain `entry.anilistId` (not `entry.id`), and after the fetch resolves
 * successfully with an `embedId`, the `episodeEmbedCache` SHALL contain that
 * `embedId` under the key `"{anilistId}-{episode}"`.
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

/** Clear the shared cache before each test run so each call is a cache miss. */
function clearCache() {
  for (const key of Object.keys(episodeEmbedCache)) {
    delete episodeEmbedCache[key];
  }
}

/**
 * Drain the microtask queue enough to let the fetch promise chain resolve.
 * The chain is: fetch() → .then(r => r.json()) → .then(data => {...})
 * Each .then() adds one microtask tick, so we need at least 3 awaits.
 * We use 6 to be safe.
 */
async function drainMicrotasks() {
  for (let i = 0; i < 6; i++) {
    await Promise.resolve();
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.unstubAllGlobals();
  clearCache();
});

describe('Property P3: Fetch uses anilistId and result is cached under composite key', () => {

  it(
    'fetch URL contains entry.anilistId (not entry.id) and cache is populated after resolution',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate (anilistId, id, episode, embedId) where anilistId !== id.
          // embedId must be non-empty and non-whitespace so the `if (embedId)` check passes.
          fc.record({
            anilistId: fc.integer({ min: 1, max: 2_000_000 }),
            id: fc.integer({ min: 1, max: 2_000_000 }),
            episode: fc.integer({ min: 1, max: 1000 }),
            embedId: fc.stringMatching(/^[a-zA-Z0-9_-]{1,40}$/),
          }).filter(({ anilistId, id }) => anilistId !== id),
          fc.oneof(fc.constant("sub"), fc.constant("dub")),
          async ({ anilistId, id, episode, embedId }, lang) => {
            clearCache();

            let capturedUrl = null;

            vi.stubGlobal('fetch', (url) => {
              capturedUrl = url;
              return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ embedId }),
              });
            });

            const entry = { anilistId, id };

            // Call buildUrl on a cache miss — returns "" synchronously
            const syncResult = anikotoProvider.buildUrl(entry, episode, lang);
            expect(syncResult).toBe("");

            // Drain the microtask queue so the fetch promise chain resolves
            await drainMicrotasks();

            // Assert: fetch URL contains anilistId, not id
            expect(capturedUrl).not.toBeNull();
            // Parse the URL to extract the anilistId query parameter value precisely
            const urlObj = new URL(capturedUrl);
            expect(urlObj.searchParams.get('anilistId')).toBe(String(anilistId));
            expect(urlObj.searchParams.get('anilistId')).not.toBe(String(id));

            // Assert: cache is populated under the composite key
            const expectedKey = `${anilistId}-${episode}`;
            expect(episodeEmbedCache[expectedKey]).toBe(embedId);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'fetch URL uses anilistId in the query parameter, not id',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            anilistId: fc.integer({ min: 1, max: 2_000_000 }),
            id: fc.integer({ min: 1, max: 2_000_000 }),
            episode: fc.integer({ min: 1, max: 1000 }),
            embedId: fc.stringMatching(/^[a-zA-Z0-9_-]{1,40}$/),
          }).filter(({ anilistId, id }) => anilistId !== id),
          fc.oneof(fc.constant("sub"), fc.constant("dub")),
          async ({ anilistId, id, episode, embedId }, lang) => {
            clearCache();

            let capturedUrl = null;

            vi.stubGlobal('fetch', (url) => {
              capturedUrl = url;
              return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ embedId }),
              });
            });

            anikotoProvider.buildUrl({ anilistId, id }, episode, lang);

            await drainMicrotasks();

            // The URL must use anilistId in the anilistId= query param
            // Parse the URL to extract the anilistId query parameter value precisely
            const urlObj = new URL(capturedUrl);
            expect(urlObj.searchParams.get('anilistId')).toBe(String(anilistId));
            expect(urlObj.searchParams.get('anilistId')).not.toBe(String(id));
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'composite cache key is "{anilistId}-{episode}" after successful fetch',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            anilistId: fc.integer({ min: 1, max: 2_000_000 }),
            id: fc.integer({ min: 1, max: 2_000_000 }),
            episode: fc.integer({ min: 1, max: 1000 }),
            embedId: fc.stringMatching(/^[a-zA-Z0-9_-]{1,40}$/),
          }).filter(({ anilistId, id }) => anilistId !== id),
          fc.oneof(fc.constant("sub"), fc.constant("dub")),
          async ({ anilistId, id, episode, embedId }, lang) => {
            clearCache();

            vi.stubGlobal('fetch', () =>
              Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ embedId }),
              })
            );

            anikotoProvider.buildUrl({ anilistId, id }, episode, lang);

            await drainMicrotasks();

            const expectedKey = `${anilistId}-${episode}`;
            expect(episodeEmbedCache[expectedKey]).toBe(embedId);

            // The id-based key must NOT be set
            const wrongKey = `${id}-${episode}`;
            expect(episodeEmbedCache[wrongKey]).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
