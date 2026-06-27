/**
 * P2 — normalizeEntry is idempotent and total.
 * For any input (valid, partial, malformed, null), normalizeEntry produces a
 * fully-shaped entry, and normalizing twice yields an identical result.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { arbMediaEntry, arbMalformedEntry } from "./generators.js";
import { normalizeEntry, STATUS_OPTIONS } from "./_appcode.js";

const REQUIRED_KEYS = [
  "id", "mediaType", "key", "title", "overview", "poster", "backdrop", "year",
  "voteAverage", "genreIds", "status", "rating", "notes", "dateAdded",
  "lastWatched", "completedAt", "season", "episode", "totalSeasons",
  "totalEpisodes", "watched", "sessionLog",
];

describe("P2: normalizeEntry idempotence & totality", () => {
  it("normalizing twice equals normalizing once (valid input)", () => {
    fc.assert(
      fc.property(arbMediaEntry, (entry) => {
        const once = normalizeEntry(entry);
        const twice = normalizeEntry(once);
        expect(twice).toEqual(once);
      }),
      { numRuns: 200 },
    );
  });

  it("normalizing twice equals normalizing once (malformed input)", () => {
    fc.assert(
      fc.property(arbMalformedEntry, (entry) => {
        const once = normalizeEntry(entry);
        const twice = normalizeEntry(once);
        expect(twice).toEqual(once);
      }),
      { numRuns: 200 },
    );
  });

  it("always returns a complete, well-typed entry", () => {
    fc.assert(
      fc.property(arbMalformedEntry, (entry) => {
        const n = normalizeEntry(entry);
        REQUIRED_KEYS.forEach((k) => expect(n).toHaveProperty(k));
        expect(["movie", "tv"]).toContain(n.mediaType);
        expect([...STATUS_OPTIONS, "untracked"]).toContain(n.status);
        expect(n.rating).toBeGreaterThanOrEqual(0);
        expect(n.rating).toBeLessThanOrEqual(10);
        expect(n.season).toBeGreaterThanOrEqual(1);
        expect(n.episode).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(n.genreIds)).toBe(true);
        expect(Array.isArray(n.sessionLog)).toBe(true);
        expect(typeof n.title).toBe("string");
        expect(n.title.length).toBeGreaterThan(0);
        expect(n.key).toBe(`${n.mediaType}-${n.id}`);
      }),
      { numRuns: 200 },
    );
  });
});
