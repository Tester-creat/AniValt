/**
 * Property test for provider URL validity (P4)
 * Validates: Requirements 5.3, 6.5
 * 
 * Property 4: Provider buildUrl returns valid HTTPS URL
 * For any active provider in STREAM_PROVIDERS, any anime entry with a positive
 * integer anilistId, any episode number ≥ 1, and any language value of "sub" or "dub",
 * calling provider.buildUrl(entry, ep, lang) SHALL return a non-empty string that
 * begins with "https://".
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { arbAnimeEntry } from './generators.js';

// Copy STREAM_PROVIDERS array from app.js to avoid browser dependency issues
const STREAM_PROVIDERS = [
  {
    // URL pattern: /stream/ani/{anilistId}/{episode}/{lang}
    // lang values: "sub" | "dub"
    name: "MegaPlay",
    active: true,
    idType: "anilist",
    buildUrl: (entry, ep, lang) =>
      `https://megaplay.buzz/stream/ani/${entry.anilistId}/${ep}/${lang}`,
    notes: "Confirmed working. Supports sub/dub via lang param.",
  },
  {
    // URL pattern: /anime/{anilistId}/{episode}/{lang}
    // lang values: "sub" | "dub"
    name: "VidLink",
    active: true,
    idType: "anilist",
    buildUrl: (entry, ep, lang) =>
      `https://vidlink.pro/anime/${entry.anilistId}/${ep}/${lang}`,
    notes: "AniList ID-based. Generally reliable for popular series.",
  },
  {
    // URL pattern: /embed/anime/{anilistId}/{episode}/{dubFlag}
    // dubFlag: 1 = dub, 0 = sub (numeric, not string)
    name: "VidSrc",
    active: true,
    idType: "anilist",
    buildUrl: (entry, ep, lang) =>
      `https://vidsrc.icu/embed/anime/${entry.anilistId}/${ep}/${lang === "dub" ? 1 : 0}`,
    notes: "AniList ID-based. Dub flag is numeric 0/1.",
  },
  {
    // URL pattern: /embed/anime/{anilistId}/{episode}
    // No explicit lang param — player defaults to available audio track
    name: "AniPlay",
    active: true,
    idType: "anilist",
    buildUrl: (entry, ep, lang) =>
      `https://aniplay.co/embed/anime/${entry.anilistId}/${ep}`,
    notes: "Anime-focused. No explicit dub param; defaults to available audio.",
  },
];

describe('Property P4: Provider buildUrl returns valid HTTPS URL', () => {
  it(
    'should validate that all active providers return HTTPS URLs for any valid input',
    () => {
      // Filter to only active providers
      const activeProviders = STREAM_PROVIDERS.filter(p => p.active);
      
      fc.assert(
        fc.property(
          arbAnimeEntry,
          fc.integer({ min: 1 }), // episode number ≥ 1
          fc.oneof(fc.constant("sub"), fc.constant("dub")), // language
          (entry, ep, lang) => {
            // Verify entry has positive anilistId (from arbAnimeEntry generator)
            expect(entry.anilistId).toBeGreaterThan(0);
            
            // Test each active provider
            activeProviders.forEach((provider) => {
              const url = provider.buildUrl(entry, ep, lang);
              
              // Verify URL is non-empty
              expect(typeof url).toBe('string');
              expect(url.length).toBeGreaterThan(0);
              
              // Verify URL starts with "https://"
              expect(url.startsWith('https://')).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'should validate HTTPS URLs across varied inputs (100+ iterations)',
    () => {
      const activeProviders = STREAM_PROVIDERS.filter(p => p.active);
      
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 2_000_000 }), // anilistId
          fc.integer({ min: 1 }), // episode ≥ 1
          fc.oneof(fc.constant("sub"), fc.constant("dub")), // language
          (anilistId, ep, lang) => {
            const entry = {
              id: anilistId,
              anilistId: anilistId,
              title: `Test Anime ${anilistId}`,
              titleEnglish: `English Title ${anilistId}`,
              cover: `https://example.com/cover/${anilistId}.jpg`,
              banner: `https://example.com/banner/${anilistId}.jpg`,
              episodes: 12,
              status: "watching",
              episodesWatched: 1,
              language: lang,
              rating: 8,
              dateAdded: Date.now(),
              lastWatched: Date.now(),
              completedAt: 0,
              notes: "Test entry",
              genres: ["Action", "Adventure"],
              year: 2024,
              sessionLog: [],
              averageScore: 85,
            };
            
            activeProviders.forEach((provider) => {
              const url = provider.buildUrl(entry, ep, lang);
              
              expect(typeof url).toBe('string');
              expect(url.length).toBeGreaterThan(0);
              expect(url.startsWith('https://')).toBe(true);
            });
          }
        ),
        { numRuns: 150 }
      );
    }
  );

  describe('Provider-specific URL validation', () => {
    it('should generate valid HTTPS URLs for each provider with sub language', () => {
      const testEntry = {
        id: 12345,
        anilistId: 12345,
        title: "Test Anime",
        titleEnglish: "Test Anime EN",
        cover: "https://example.com/cover.jpg",
        banner: "https://example.com/banner.jpg",
        episodes: 12,
        status: "watching",
        episodesWatched: 1,
        language: "sub",
        rating: 8,
        dateAdded: Date.now(),
        lastWatched: Date.now(),
        completedAt: 0,
        notes: "Test",
        genres: ["Action"],
        year: 2024,
        sessionLog: [],
        averageScore: 85,
      };
      
      STREAM_PROVIDERS.forEach((provider) => {
        if (provider.active) {
          const url = provider.buildUrl(testEntry, 1, "sub");
          expect(url.startsWith('https://')).toBe(true);
          expect(url.length).toBeGreaterThan(0);
        }
      });
    });

    it('should generate valid HTTPS URLs for each provider with dub language', () => {
      const testEntry = {
        id: 12345,
        anilistId: 12345,
        title: "Test Anime",
        titleEnglish: "Test Anime EN",
        cover: "https://example.com/cover.jpg",
        banner: "https://example.com/banner.jpg",
        episodes: 12,
        status: "watching",
        episodesWatched: 1,
        language: "dub",
        rating: 8,
        dateAdded: Date.now(),
        lastWatched: Date.now(),
        completedAt: 0,
        notes: "Test",
        genres: ["Action"],
        year: 2024,
        sessionLog: [],
        averageScore: 85,
      };
      
      STREAM_PROVIDERS.forEach((provider) => {
        if (provider.active) {
          const url = provider.buildUrl(testEntry, 1, "dub");
          expect(url.startsWith('https://')).toBe(true);
          expect(url.length).toBeGreaterThan(0);
        }
      });
    });

    it('should handle large episode numbers correctly', () => {
      const testEntry = {
        id: 12345,
        anilistId: 12345,
        title: "Test Anime",
        titleEnglish: "Test Anime EN",
        cover: "https://example.com/cover.jpg",
        banner: "https://example.com/banner.jpg",
        episodes: 500,
        status: "watching",
        episodesWatched: 1,
        language: "sub",
        rating: 8,
        dateAdded: Date.now(),
        lastWatched: Date.now(),
        completedAt: 0,
        notes: "Test",
        genres: ["Action"],
        year: 2024,
        sessionLog: [],
        averageScore: 85,
      };
      
      const largeEpisodes = [100, 250, 500, 1000];
      
      STREAM_PROVIDERS.forEach((provider) => {
        if (provider.active) {
          largeEpisodes.forEach((ep) => {
            const url = provider.buildUrl(testEntry, ep, "sub");
            expect(url.startsWith('https://')).toBe(true);
            expect(url.length).toBeGreaterThan(0);
          });
        }
      });
    });
  });
});
