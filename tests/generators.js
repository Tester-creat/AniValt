/**
 * Test utilities and generators for CineVault property-based tests.
 * fast-check arbitraries for valid / malformed library entries, provider
 * configs, and color pairs, plus a WCAG contrast helper.
 */
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Constants (mirror app.js)
// ---------------------------------------------------------------------------
export const STATUS_OPTIONS = ["watching", "completed", "watchlist", "paused", "dropped"];
export const MEDIA_TYPES = ["movie", "tv"];

// ---------------------------------------------------------------------------
// WCAG contrast helpers
// ---------------------------------------------------------------------------
function toHex(r, g, b) {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}
function linearize(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}
export function calculateContrastRatio(color1, color2) {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------
const arbPath = fc.oneof(
  fc.constant(""),
  fc.stringMatching(/^\/[a-zA-Z0-9]{6,12}\.jpg$/),
);

/** A fully-populated, valid CineVault library entry. */
export const arbMediaEntry = fc.record({
  id: fc.integer({ min: 1, max: 2_000_000 }),
  mediaType: fc.constantFrom(...MEDIA_TYPES),
  title: fc.string({ minLength: 1, maxLength: 120 }),
  overview: fc.string({ maxLength: 400 }),
  poster: arbPath,
  backdrop: arbPath,
  year: fc.integer({ min: 1900, max: 2035 }),
  voteAverage: fc.float({ min: 0, max: 10, noNaN: true }),
  genreIds: fc.array(fc.integer({ min: 1, max: 11000 }), { maxLength: 8 }),
  status: fc.constantFrom(...STATUS_OPTIONS),
  rating: fc.integer({ min: 0, max: 10 }),
  notes: fc.string({ maxLength: 500 }),
  dateAdded: fc.integer({ min: 1, max: 9_999_999_999_999 }),
  lastWatched: fc.integer({ min: 0, max: 9_999_999_999_999 }),
  completedAt: fc.integer({ min: 0, max: 9_999_999_999_999 }),
  season: fc.integer({ min: 1, max: 40 }),
  episode: fc.integer({ min: 1, max: 500 }),
  totalSeasons: fc.integer({ min: 0, max: 40 }),
  totalEpisodes: fc.integer({ min: 0, max: 5000 }),
  watched: fc.boolean(),
  sessionLog: fc.array(fc.integer({ min: 1, max: 9_999_999_999_999 }), { maxLength: 50 }),
});

/** Malformed / partial entries to stress normalizeEntry. */
export const arbMalformedEntry = fc.oneof(
  fc.constant({}),
  fc.constant(null),
  fc.constant(undefined),
  fc.record(
    {
      id: fc.oneof(fc.integer(), fc.string(), fc.constant(null), fc.constant(-5)),
      mediaType: fc.oneof(fc.constant("movie"), fc.constant("tv"), fc.string(), fc.constant(null)),
      title: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
      poster: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
      year: fc.oneof(fc.integer(), fc.string(), fc.constant(null)),
      voteAverage: fc.oneof(fc.float({ noNaN: true }), fc.string(), fc.constant(null)),
      genreIds: fc.oneof(fc.array(fc.integer()), fc.string(), fc.constant(null), fc.constant("Action")),
      status: fc.oneof(fc.string(), fc.integer(), fc.constant(null), fc.constant("invalid"), fc.constant("")),
      rating: fc.oneof(fc.integer({ min: -100, max: 100 }), fc.string(), fc.constant(null)),
      notes: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
      dateAdded: fc.oneof(fc.integer(), fc.string(), fc.constant(null)),
      lastWatched: fc.oneof(fc.integer(), fc.string(), fc.constant(null)),
      season: fc.oneof(fc.integer({ min: -10, max: 80 }), fc.string(), fc.constant(null)),
      episode: fc.oneof(fc.integer({ min: -10, max: 800 }), fc.string(), fc.constant(null)),
      watched: fc.oneof(fc.boolean(), fc.string(), fc.constant(null)),
      sessionLog: fc.oneof(fc.array(fc.integer()), fc.string(), fc.constant(null)),
    },
    { requiredKeys: [] },
  ),
);

/** A text/background color pair as valid hex strings. */
export const arbColorPair = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }),
  )
  .map(([tr, tg, tb, br, bg, bb]) => ({ textColor: toHex(tr, tg, tb), bgColor: toHex(br, bg, bb) }));
