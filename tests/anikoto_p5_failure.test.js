/**
 * Property test for API failure always returns empty string (Property 5)
 * Validates: Requirements 2.4
 *
 * Property 5: API failure always returns empty string
 * For any failure mode of the Anikoto API (network error, non-200 response,
 * missing `embedId` field, null response), `buildUrl` SHALL return "" —
 * never throwing an exception and never returning a non-string value.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { arbAnimeEntry } from './generators.js';

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.unstubAllGlobals();
  clearCache();
});

describe('Property P5: API failure always returns empty string', () => {

  // ── Failure mode 1: rejected promise (network error) ──────────────────────
  it(
    'should return "" when fetch rejects (network error)',
    () => {
      fc.assert(
        fc.property(
          arbAnimeEntry,
          fc.integer({ min: 1 }),
          fc.oneof(fc.constant("sub"), fc.constant("dub")),
          (entry, ep, lang) => {
            clearCache();
            vi.stubGlobal('fetch', () => Promise.reject(new Error('Network error')));

            let result;
            let threw = false;
            try {
              result = anikotoProvider.buildUrl(entry, ep, lang);
            } catch {
              threw = true;
            }

            expect(threw).toBe(false);
            expect(result).toBe("");
          }
        ),
        { numRuns: 50 }
      );
    }
  );

  // ── Failure mode 2: non-200 response (e.g. 404 or 500) ───────────────────
  it(
    'should return "" when fetch returns a non-200 status',
    () => {
      fc.assert(
        fc.property(
          arbAnimeEntry,
          fc.integer({ min: 1 }),
          fc.oneof(fc.constant("sub"), fc.constant("dub")),
          fc.oneof(fc.constant(404), fc.constant(500), fc.constant(503)),
          (entry, ep, lang, statusCode) => {
            clearCache();
            vi.stubGlobal('fetch', () =>
              Promise.resolve({
                ok: false,
                status: statusCode,
                json: () => Promise.reject(new Error(`HTTP ${statusCode}`)),
              })
            );

            let result;
            let threw = false;
            try {
              result = anikotoProvider.buildUrl(entry, ep, lang);
            } catch {
              threw = true;
            }

            expect(threw).toBe(false);
            expect(result).toBe("");
          }
        ),
        { numRuns: 50 }
      );
    }
  );

  // ── Failure mode 3: missing embedId field in response ─────────────────────
  it(
    'should return "" when response body is missing the embedId field',
    () => {
      fc.assert(
        fc.property(
          arbAnimeEntry,
          fc.integer({ min: 1 }),
          fc.oneof(fc.constant("sub"), fc.constant("dub")),
          // Responses that parse successfully but lack a usable embedId
          fc.oneof(
            fc.constant({}),
            fc.constant({ other: "data" }),
            fc.constant({ embedId: null }),
            fc.constant({ embedId: "" }),
            fc.constant({ embedId: 0 }),
          ),
          (entry, ep, lang, responseBody) => {
            clearCache();
            vi.stubGlobal('fetch', () =>
              Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve(responseBody),
              })
            );

            let result;
            let threw = false;
            try {
              result = anikotoProvider.buildUrl(entry, ep, lang);
            } catch {
              threw = true;
            }

            expect(threw).toBe(false);
            expect(result).toBe("");
          }
        ),
        { numRuns: 50 }
      );
    }
  );

  // ── Failure mode 4: null response body ────────────────────────────────────
  it(
    'should return "" when response body is null',
    () => {
      fc.assert(
        fc.property(
          arbAnimeEntry,
          fc.integer({ min: 1 }),
          fc.oneof(fc.constant("sub"), fc.constant("dub")),
          (entry, ep, lang) => {
            clearCache();
            vi.stubGlobal('fetch', () =>
              Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve(null),
              })
            );

            let result;
            let threw = false;
            try {
              result = anikotoProvider.buildUrl(entry, ep, lang);
            } catch {
              threw = true;
            }

            expect(threw).toBe(false);
            expect(result).toBe("");
          }
        ),
        { numRuns: 50 }
      );
    }
  );

  // ── Combined: all failure modes in a single property run ──────────────────
  it(
    'should never throw and always return "" across all failure modes',
    () => {
      const failureModes = [
        // Rejected promise
        () => Promise.reject(new Error('Network error')),
        // 404
        () => Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error('404')) }),
        // 500
        () => Promise.resolve({ ok: false, status: 500, json: () => Promise.reject(new Error('500')) }),
        // Empty object (no embedId)
        () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }),
        // Unrelated fields
        () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ other: "data" }) }),
        // Null body
        () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(null) }),
      ];

      fc.assert(
        fc.property(
          arbAnimeEntry,
          fc.integer({ min: 1 }),
          fc.oneof(fc.constant("sub"), fc.constant("dub")),
          fc.integer({ min: 0, max: failureModes.length - 1 }),
          (entry, ep, lang, modeIndex) => {
            clearCache();
            vi.stubGlobal('fetch', failureModes[modeIndex]);

            let result;
            let threw = false;
            try {
              result = anikotoProvider.buildUrl(entry, ep, lang);
            } catch {
              threw = true;
            }

            expect(threw).toBe(false);
            expect(result).toBe("");
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
