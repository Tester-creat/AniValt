/**
 * P3 — Provider URL validity.
 * buildStreamUrl returns a non-empty HTTPS URL for every provider, for both
 * movies and series, across arbitrary TMDB ids / seasons / episodes.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { STREAM_PROVIDERS, buildStreamUrl } from "./_appcode.js";

describe("P3: provider URL validity", () => {
  it("every provider yields an https URL for movies", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 2_000_000 }), (id) => {
        STREAM_PROVIDERS.forEach((_, i) => {
          const url = buildStreamUrl({ id, mediaType: "movie" }, i);
          expect(typeof url).toBe("string");
          expect(url.startsWith("https://")).toBe(true);
          expect(url).toContain(String(id));
        });
      }),
      { numRuns: 150 },
    );
  });

  it("every provider yields an https URL for series with season/episode", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2_000_000 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 500 }),
        (id, s, e) => {
          STREAM_PROVIDERS.forEach((_, i) => {
            const url = buildStreamUrl({ id, mediaType: "tv" }, i, s, e);
            expect(url.startsWith("https://")).toBe(true);
            expect(url).toContain(String(id));
            expect(url).toMatch(new RegExp(`(^|[/=])${s}([/&]|$)`));
            expect(url).toMatch(new RegExp(`(^|[/=])${e}([/&]|$)`));
          });
        },
      ),
      { numRuns: 150 },
    );
  });

  it("falls back to the first provider for an out-of-range index", () => {
    const url = buildStreamUrl({ id: 42, mediaType: "movie" }, 999);
    expect(url).toBe(STREAM_PROVIDERS[0].movie(42));
  });

  it("returns empty string for an entry without an id", () => {
    expect(buildStreamUrl({ mediaType: "movie" }, 0)).toBe("");
    expect(buildStreamUrl(null, 0)).toBe("");
  });
});
