import { describe, it, expect, vi, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Inline copy of STREAM_PROVIDERS from app.js (avoids browser dependency).
// episodeEmbedCache is declared here so the Anikoto buildUrl closure resolves.
// ---------------------------------------------------------------------------
const episodeEmbedCache = {};

const STREAM_PROVIDERS = [
  {
    name: "MegaPlay",
    active: true,
    idType: "anilist",
    buildUrl: (entry, ep, lang) =>
      `https://megaplay.buzz/stream/ani/${entry.anilistId}/${ep}/${lang}`,
    notes: "Confirmed working. Supports sub/dub via lang param.",
  },
  {
    name: "Cinetaro",
    active: true,
    idType: "anilist",
    buildUrl: (entry, ep, lang) =>
      `https://api.cinetaro.buzz/embed/anime/${entry.anilistId}/1/${ep}?type=${lang}`,
    notes: "Each AniList entry is one season; season is always 1 relative to that entry.",
  },
  {
    name: "VidPlus",
    active: true,
    idType: "anilist",
    buildUrl: (entry, ep, lang) =>
      `https://player.vidplus.to/embed/anime/${entry.anilistId}/${ep}?dub=${lang === "dub"}&autoplay=true`,
    notes: "AniList ID-based. Dub flag is boolean query param.",
  },
  {
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
            // queueRender() not available in tests — omitted intentionally
          }
        })
        .catch(() => {});
      return "";
    },
  },
];

function buildStreamUrl(entry, episode, language, providerIndex = 0) {
  if (!entry || !entry.anilistId) return "";
  const provider = STREAM_PROVIDERS[providerIndex] || STREAM_PROVIDERS[0];
  if (!provider || !provider.active) return "";
  return provider.buildUrl(entry, episode, language);
}

/** Clear the shared embed cache between tests. */
function clearEmbedCache() {
  for (const key of Object.keys(episodeEmbedCache)) {
    delete episodeEmbedCache[key];
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearEmbedCache();
});

describe('Provider URL Generation', () => {
  const sampleEntry = {
    anilistId: 21,
    title: "Naruto",
    titleEnglish: "Naruto"
  };

  describe('MegaPlay provider', () => {
    it('should generate correct URL with sub language', () => {
      const url = STREAM_PROVIDERS[0].buildUrl(sampleEntry, 1, 'sub');
      expect(url).toBe('https://megaplay.buzz/stream/ani/21/1/sub');
    });

    it('should generate correct URL with dub language', () => {
      const url = STREAM_PROVIDERS[0].buildUrl(sampleEntry, 1, 'dub');
      expect(url).toBe('https://megaplay.buzz/stream/ani/21/1/dub');
    });

    it('should handle different episode numbers', () => {
      const url1 = STREAM_PROVIDERS[0].buildUrl(sampleEntry, 5, 'sub');
      const url2 = STREAM_PROVIDERS[0].buildUrl(sampleEntry, 100, 'sub');
      expect(url1).toBe('https://megaplay.buzz/stream/ani/21/5/sub');
      expect(url2).toBe('https://megaplay.buzz/stream/ani/21/100/sub');
    });
  });

  describe('Cinetaro provider', () => {
    it('should generate correct URL with sub language', () => {
      const url = STREAM_PROVIDERS[1].buildUrl(sampleEntry, 1, 'sub');
      expect(url).toBe('https://api.cinetaro.buzz/embed/anime/21/1/1?type=sub');
    });

    it('should generate correct URL with dub language', () => {
      const url = STREAM_PROVIDERS[1].buildUrl(sampleEntry, 1, 'dub');
      expect(url).toBe('https://api.cinetaro.buzz/embed/anime/21/1/1?type=dub');
    });

    it('should handle different episode numbers', () => {
      const url1 = STREAM_PROVIDERS[1].buildUrl(sampleEntry, 12, 'sub');
      const url2 = STREAM_PROVIDERS[1].buildUrl(sampleEntry, 250, 'dub');
      expect(url1).toBe('https://api.cinetaro.buzz/embed/anime/21/1/12?type=sub');
      expect(url2).toBe('https://api.cinetaro.buzz/embed/anime/21/1/250?type=dub');
    });
  });

  describe('VidPlus provider', () => {
    it('should generate correct URL with sub language (dub=false)', () => {
      const url = STREAM_PROVIDERS[2].buildUrl(sampleEntry, 1, 'sub');
      expect(url).toBe('https://player.vidplus.to/embed/anime/21/1?dub=false&autoplay=true');
    });

    it('should generate correct URL with dub language (dub=true)', () => {
      const url = STREAM_PROVIDERS[2].buildUrl(sampleEntry, 1, 'dub');
      expect(url).toBe('https://player.vidplus.to/embed/anime/21/1?dub=true&autoplay=true');
    });

    it('should handle different episode numbers with sub', () => {
      const url = STREAM_PROVIDERS[2].buildUrl(sampleEntry, 50, 'sub');
      expect(url).toBe('https://player.vidplus.to/embed/anime/21/50?dub=false&autoplay=true');
    });

    it('should handle different episode numbers with dub', () => {
      const url = STREAM_PROVIDERS[2].buildUrl(sampleEntry, 75, 'dub');
      expect(url).toBe('https://player.vidplus.to/embed/anime/21/75?dub=true&autoplay=true');
    });
  });

  describe('Anikoto provider', () => {
    it('should return "" synchronously on a cache miss (fetch is mocked)', () => {
      vi.stubGlobal('fetch', () => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ embedId: 'abc123' }),
      }));

      const result = STREAM_PROVIDERS[3].buildUrl(sampleEntry, 1, 'sub');
      expect(result).toBe('');
    });

    it('should return the correct URL on a cache hit', () => {
      const embedId = 'abc123xyz';
      episodeEmbedCache['21-1'] = embedId;

      const result = STREAM_PROVIDERS[3].buildUrl(sampleEntry, 1, 'sub');
      expect(result).toBe(`https://anikoto.to/stream/s-2/${embedId}/sub`);
    });

    it('should return the correct URL with dub lang on a cache hit', () => {
      const embedId = 'def456uvw';
      episodeEmbedCache['21-5'] = embedId;

      const result = STREAM_PROVIDERS[3].buildUrl(sampleEntry, 5, 'dub');
      expect(result).toBe(`https://anikoto.to/stream/s-2/${embedId}/dub`);
    });

    it('URL starts with "https://" when a cache hit is present', () => {
      const embedId = 'ghi789rst';
      episodeEmbedCache['21-10'] = embedId;

      const result = STREAM_PROVIDERS[3].buildUrl(sampleEntry, 10, 'sub');
      expect(result.startsWith('https://')).toBe(true);
    });
  });

  describe('All providers HTTPS verification', () => {
    it('should return HTTPS URLs for all active providers (cache pre-populated for Anikoto)', () => {
      // Pre-populate cache so Anikoto returns a URL instead of ""
      episodeEmbedCache['21-1'] = 'test-embed-id';

      STREAM_PROVIDERS.forEach((provider) => {
        if (provider.active) {
          const url = provider.buildUrl(sampleEntry, 1, 'sub');
          expect(url).toMatch(/^https:\/\//);
        }
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle episode 0', () => {
      const url = STREAM_PROVIDERS[0].buildUrl(sampleEntry, 0, 'sub');
      expect(url).toBe('https://megaplay.buzz/stream/ani/21/0/sub');
    });

    it('should handle episode 1', () => {
      const url = STREAM_PROVIDERS[0].buildUrl(sampleEntry, 1, 'sub');
      expect(url).toBe('https://megaplay.buzz/stream/ani/21/1/sub');
    });

    it('should handle large episode numbers', () => {
      const url = STREAM_PROVIDERS[0].buildUrl(sampleEntry, 9999, 'sub');
      expect(url).toBe('https://megaplay.buzz/stream/ani/21/9999/sub');
    });

    it('should handle different anime IDs', () => {
      const entry1 = { anilistId: 1, title: "Cowboy Bebop" };
      const entry2 = { anilistId: 12345, title: "Test Anime" };

      const url1 = STREAM_PROVIDERS[0].buildUrl(entry1, 1, 'sub');
      const url2 = STREAM_PROVIDERS[0].buildUrl(entry2, 1, 'sub');

      expect(url1).toBe('https://megaplay.buzz/stream/ani/1/1/sub');
      expect(url2).toBe('https://megaplay.buzz/stream/ani/12345/1/sub');
    });
  });

  describe('buildStreamUrl function', () => {
    it('should return URL from default provider (index 0)', () => {
      const url = buildStreamUrl(sampleEntry, 1, 'sub');
      expect(url).toBe('https://megaplay.buzz/stream/ani/21/1/sub');
    });

    it('should return URL from specified provider index', () => {
      const url = buildStreamUrl(sampleEntry, 1, 'sub', 1);
      expect(url).toBe('https://api.cinetaro.buzz/embed/anime/21/1/1?type=sub');
    });

    it('should handle out-of-bounds provider index (positive)', () => {
      const url = buildStreamUrl(sampleEntry, 1, 'sub', 999);
      expect(url).toBe('https://megaplay.buzz/stream/ani/21/1/sub');
    });

    it('should handle out-of-bounds provider index (negative)', () => {
      const url = buildStreamUrl(sampleEntry, 1, 'sub', -1);
      expect(url).toBe('https://megaplay.buzz/stream/ani/21/1/sub');
    });

    it('should return empty string for missing entry', () => {
      const url = buildStreamUrl(null, 1, 'sub');
      expect(url).toBe('');
    });

    it('should return empty string for entry without anilistId', () => {
      const invalidEntry = { title: "Test" };
      const url = buildStreamUrl(invalidEntry, 1, 'sub');
      expect(url).toBe('');
    });

    it('should return empty string for entry with falsy anilistId', () => {
      const invalidEntry = { anilistId: 0, title: "Test" };
      const url = buildStreamUrl(invalidEntry, 1, 'sub');
      expect(url).toBe('');
    });
  });

  describe('Language parameter handling', () => {
    it('should handle sub language for all providers (cache pre-populated for Anikoto)', () => {
      episodeEmbedCache['21-1'] = 'embed-sub-test';

      const urls = STREAM_PROVIDERS.map(provider =>
        provider.buildUrl(sampleEntry, 1, 'sub')
      );

      expect(urls[0]).toContain('/sub');       // MegaPlay
      expect(urls[1]).toContain('type=sub');   // Cinetaro
      expect(urls[2]).toContain('dub=false');  // VidPlus
      expect(urls[3]).toContain('/sub');        // Anikoto (cache hit)
    });

    it('should handle dub language for all providers (cache pre-populated for Anikoto)', () => {
      episodeEmbedCache['21-1'] = 'embed-dub-test';

      const urls = STREAM_PROVIDERS.map(provider =>
        provider.buildUrl(sampleEntry, 1, 'dub')
      );

      expect(urls[0]).toContain('/dub');       // MegaPlay
      expect(urls[1]).toContain('type=dub');   // Cinetaro
      expect(urls[2]).toContain('dub=true');   // VidPlus
      expect(urls[3]).toContain('/dub');        // Anikoto (cache hit)
    });
  });

  describe('Provider schema validation', () => {
    it('should have required fields for all providers', () => {
      STREAM_PROVIDERS.forEach((provider) => {
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('active');
        expect(provider).toHaveProperty('idType');
        expect(provider).toHaveProperty('buildUrl');
        expect(provider).toHaveProperty('notes');

        expect(typeof provider.name).toBe('string');
        expect(provider.name.length).toBeGreaterThan(0);
        expect(typeof provider.active).toBe('boolean');
        expect(typeof provider.buildUrl).toBe('function');
        expect(typeof provider.notes).toBe('string');
      });
    });

    it('should have exactly 4 active providers', () => {
      const activeProviders = STREAM_PROVIDERS.filter(p => p.active);
      expect(activeProviders).toHaveLength(4);
    });

    it('should all use anilist idType', () => {
      STREAM_PROVIDERS.forEach((provider) => {
        expect(provider.idType).toBe('anilist');
      });
    });
  });
});
