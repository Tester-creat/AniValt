/**
 * P5 — Status & rating coercion.
 * Status always lands in the allowed set; rating is always an integer in [0,10];
 * known statuses are preserved verbatim.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { normalizeEntry, STATUS_OPTIONS } from "./_appcode.js";

const ALLOWED = [...STATUS_OPTIONS, "untracked"];

describe("P5: status & rating coercion", () => {
  it("coerces any status value into the allowed set", () => {
    fc.assert(
      fc.property(fc.anything(), (status) => {
        const n = normalizeEntry({ id: 1, mediaType: "movie", status });
        expect(ALLOWED).toContain(n.status);
      }),
      { numRuns: 200 },
    );
  });

  it("preserves valid statuses verbatim", () => {
    STATUS_OPTIONS.forEach((status) => {
      const n = normalizeEntry({ id: 1, mediaType: "tv", status });
      expect(n.status).toBe(status);
    });
  });

  it("defaults unknown / empty status to watchlist", () => {
    expect(normalizeEntry({ id: 1, status: "bogus" }).status).toBe("watchlist");
    expect(normalizeEntry({ id: 1, status: "" }).status).toBe("watchlist");
    expect(normalizeEntry({ id: 1 }).status).toBe("watchlist");
  });

  it("clamps rating into an integer in [0,10]", () => {
    fc.assert(
      fc.property(fc.oneof(fc.integer({ min: -1000, max: 1000 }), fc.double(), fc.string(), fc.constant(null)), (rating) => {
        const n = normalizeEntry({ id: 1, rating });
        expect(Number.isInteger(n.rating)).toBe(true);
        expect(n.rating).toBeGreaterThanOrEqual(0);
        expect(n.rating).toBeLessThanOrEqual(10);
      }),
      { numRuns: 200 },
    );
  });
});
