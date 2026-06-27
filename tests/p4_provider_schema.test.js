/**
 * P4 — Provider schema.
 * Each provider exposes a unique name and movie()/tv() builders that are pure
 * functions returning distinct, valid URLs.
 */
import { describe, it, expect } from "vitest";
import { STREAM_PROVIDERS } from "./_appcode.js";

describe("P4: provider schema", () => {
  it("declares at least four providers", () => {
    expect(STREAM_PROVIDERS.length).toBeGreaterThanOrEqual(4);
  });

  it("each provider has a name and movie/tv builder functions", () => {
    STREAM_PROVIDERS.forEach((p) => {
      expect(typeof p.name).toBe("string");
      expect(p.name.length).toBeGreaterThan(0);
      expect(typeof p.movie).toBe("function");
      expect(typeof p.tv).toBe("function");
    });
  });

  it("provider names are unique", () => {
    const names = STREAM_PROVIDERS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("builders are pure (same input → same output)", () => {
    STREAM_PROVIDERS.forEach((p) => {
      expect(p.movie(100)).toBe(p.movie(100));
      expect(p.tv(100, 2, 3)).toBe(p.tv(100, 2, 3));
    });
  });

  it("movie and tv URLs differ for the same id", () => {
    STREAM_PROVIDERS.forEach((p) => {
      expect(p.movie(500)).not.toBe(p.tv(500, 1, 1));
    });
  });
});
