/**
 * P1 — Library round-trip.
 * A normalized library survives JSON serialize → parse → normalize unchanged,
 * and every valid entry is keyed by `${mediaType}-${id}`.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { arbMediaEntry } from "./generators.js";
import { normalizeLibrary, normalizeEntry } from "./_appcode.js";

describe("P1: library round-trip", () => {
  it("survives JSON export/import without changing", () => {
    fc.assert(
      fc.property(fc.array(arbMediaEntry, { minLength: 1, maxLength: 20 }), (entries) => {
        const lib = {};
        entries.forEach((e) => { const n = normalizeEntry(e); lib[n.key] = n; });
        const once = normalizeLibrary(lib);
        const twice = normalizeLibrary(JSON.parse(JSON.stringify(once)));
        expect(twice).toEqual(once);
      }),
      { numRuns: 100 },
    );
  });

  it("keys every entry as `${mediaType}-${id}`", () => {
    fc.assert(
      fc.property(fc.array(arbMediaEntry, { maxLength: 20 }), (entries) => {
        const raw = {};
        entries.forEach((e, i) => { raw[`junk-key-${i}`] = e; });
        const lib = normalizeLibrary(raw);
        Object.entries(lib).forEach(([key, entry]) => {
          expect(key).toBe(`${entry.mediaType}-${entry.id}`);
          expect(entry.id).toBeGreaterThan(0);
        });
      }),
      { numRuns: 100 },
    );
  });

  it("ignores non-object input", () => {
    expect(normalizeLibrary(null)).toEqual({});
    expect(normalizeLibrary(undefined)).toEqual({});
    expect(normalizeLibrary("nope")).toEqual({});
  });
});
