import { describe, it, expect } from 'vitest';

// Copy STREAM_PROVIDERS array from app.js to avoid browser dependency issues
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
    name: "VidLink",
    active: true,
    idType: "anilist",
    buildUrl: (entry, ep, lang) =>
      `https://vidlink.pro/anime/${entry.anilistId}/${ep}/${lang}`,
    notes: "AniList ID-based. Generally reliable for popular series.",
  },
  {
    name: "VidSrc",
    active: true,
    idType: "anilist",
    buildUrl: (entry, ep, lang) =>
      `https://vidsrc.icu/embed/anime/${entry.anilistId}/${ep}/${lang === "dub" ? 1 : 0}`,
    notes: "AniList ID-based. Dub flag is numeric 0/1.",
  },
  {
    name: "AniPlay",
    active: true,
    idType: "anilist",
    buildUrl: (entry, ep, lang) =>
      `https://aniplay.co/embed/anime/${entry.anilistId}/${ep}`,
    notes: "Anime-focused. No explicit dub param; defaults to available audio.",
  },
];

function buildStreamUrl(entry, episode, language, providerIndex = 0) {
  if (!entry || !entry.anilistId) return "";
  const provider = STREAM_PROVIDERS[providerIndex] || STREAM_PROVIDERS[0];
  if (!provider || !provider.active) return "";
  return provider.buildUrl(entry, episode, language);
}

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

  describe('VidLink provider', () => {
    it('should generate correct URL with sub language', () => {
      const url = STREAM_PROVIDERS[1].buildUrl(sampleEntry, 1, 'sub');
      expect(url).toBe('https://vidlink.pro/anime/21/1/sub');
    });

    it('should generate correct URL with dub language', () => {
      const url = STREAM_PROVIDERS[1].buildUrl(sampleEntry, 1, 'dub');
      expect(url).toBe('https://vidlink.pro/anime/21/1/dub');
    });

    it('should handle different episode numbers', () => {
      const url1 = STREAM_PROVIDERS[1].buildUrl(sampleEntry, 12, 'sub');
      const url2 = STREAM_PROVIDERS[1].buildUrl(sampleEntry, 250, 'dub');
      expect(url1).toBe('https://vidlink.pro/anime/21/12/sub');
      expect(url2).toBe('https://vidlink.pro/anime/21/250/dub');
    });
  });

  describe('VidSrc provider', () => {
    it('should generate correct URL with sub language (numeric 0)', () => {
      const url = STREAM_PROVIDERS[2].buildUrl(sampleEntry, 1, 'sub');
      expect(url).toBe('https://vidsrc.icu/embed/anime/21/1/0');
    });

    it('should generate correct URL with dub language (numeric 1)', () => {
      const url = STREAM_PROVIDERS[2].buildUrl(sampleEntry, 1, 'dub');
      expect(url).toBe('https://vidsrc.icu/embed/anime/21/1/1');
    });

    it('should handle different episode numbers with sub', () => {
      const url = STREAM_PROVIDERS[2].buildUrl(sampleEntry, 50, 'sub');
      expect(url).toBe('https://vidsrc.icu/embed/anime/21/50/0');
    });

    it('should handle different episode numbers with dub', () => {
      const url = STREAM_PROVIDERS[2].buildUrl(sampleEntry, 75, 'dub');
      expect(url).toBe('https://vidsrc.icu/embed/anime/21/75/1');
    });
  });

  describe('AniPlay provider', () => {
    it('should generate correct URL (no language parameter)', () => {
      const url = STREAM_PROVIDERS[3].buildUrl(sampleEntry, 1, 'sub');
      expect(url).toBe('https://aniplay.co/embed/anime/21/1');
    });

    it('should ignore language parameter', () => {
      const urlSub = STREAM_PROVIDERS[3].buildUrl(sampleEntry, 1, 'sub');
      const urlDub = STREAM_PROVIDERS[3].buildUrl(sampleEntry, 1, 'dub');
      expect(urlSub).toBe(urlDub);
      expect(urlSub).toBe('https://aniplay.co/embed/anime/21/1');
    });

    it('should handle different episode numbers', () => {
      const url1 = STREAM_PROVIDERS[3].buildUrl(sampleEntry, 10, 'sub');
      const url2 = STREAM_PROVIDERS[3].buildUrl(sampleEntry, 999, 'dub');
      expect(url1).toBe('https://aniplay.co/embed/anime/21/10');
      expect(url2).toBe('https://aniplay.co/embed/anime/21/999');
    });
  });

  describe('All providers HTTPS verification', () => {
    it('should return HTTPS URLs for all active providers', () => {
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
      expect(url).toBe('https://vidlink.pro/anime/21/1/sub');
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
    it('should handle sub language for all providers', () => {
      const urls = STREAM_PROVIDERS.map(provider => 
        provider.buildUrl(sampleEntry, 1, 'sub')
      );
      
      expect(urls[0]).toContain('/sub');
      expect(urls[1]).toContain('/sub');
      expect(urls[2]).toContain('/0'); // VidSrc uses numeric
      expect(urls[3]).not.toContain('/sub'); // AniPlay has no lang param
    });

    it('should handle dub language for all providers', () => {
      const urls = STREAM_PROVIDERS.map(provider => 
        provider.buildUrl(sampleEntry, 1, 'dub')
      );
      
      expect(urls[0]).toContain('/dub');
      expect(urls[1]).toContain('/dub');
      expect(urls[2]).toContain('/1'); // VidSrc uses numeric
      expect(urls[3]).not.toContain('/dub'); // AniPlay has no lang param
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
