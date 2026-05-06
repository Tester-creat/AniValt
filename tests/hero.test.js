import { describe, it, expect, beforeEach } from 'vitest';

// ─── Minimal stubs for app.js functions used by renderHero ───────────────────

const STATUS_OPTIONS = [
  "watching", "completed", "queued", "plan-to-watch",
  "dropped", "paused", "untracked",
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getDisplayTitle(entry) {
  return entry.titleEnglish || entry.title;
}

// ─── Extracted renderHero logic (mirrors app.js implementation) ───────────────

function renderHero(allEntries, getEntry) {
  if (allEntries.length === 0) return "";

  // Get most recently watched entry
  const recentlyWatched = allEntries
    .filter((entry) => entry.lastWatched > 0)
    .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));

  let featuredEntry = null;

  if (recentlyWatched.length > 0) {
    featuredEntry = recentlyWatched[0];
  } else {
    const watchingEntries = allEntries.filter((entry) => entry.status === "watching");
    if (watchingEntries.length > 0) {
      featuredEntry = watchingEntries[Math.floor(Math.random() * watchingEntries.length)];
    } else {
      return "";
    }
  }

  const backgroundImage = featuredEntry.banner || featuredEntry.cover || "";
  const backgroundStyle = backgroundImage
    ? `background-image: url('${escapeHtml(backgroundImage)}');`
    : `background: linear-gradient(135deg, var(--accent) 0%, rgba(14, 14, 24, 0.95) 100%);`;

  const genreTags = featuredEntry.genres.slice(0, 3).join(" • ");
  const year = featuredEntry.year || "Unknown year";
  const episodeCount = featuredEntry.episodes
    ? `${featuredEntry.episodes} episodes`
    : "Episode count unknown";
  const subtitle = [genreTags, year, episodeCount].filter(Boolean).join(" • ");

  const inLibrary = getEntry(featuredEntry.id) !== null;

  const watchButton = `<button type="button" class="hero-cta hero-cta--primary" data-action="open-watch" data-id="${featuredEntry.id}">▶ Watch Now</button>`;
  const addButton = inLibrary
    ? ""
    : `<button type="button" class="hero-cta hero-cta--secondary" data-action="open-detail" data-id="${featuredEntry.id}">＋ Add to Library</button>`;

  return `
  <section class="hero-section" style="${backgroundStyle}">
    <div class="hero-section__overlay"></div>
    <div class="hero-section__content">
      <h1 class="hero-section__title">${escapeHtml(getDisplayTitle(featuredEntry))}</h1>
      <div class="hero-section__subtitle">${escapeHtml(subtitle)}</div>
      <div class="hero-section__actions">
        ${watchButton}
        ${addButton}
      </div>
    </div>
  </section>`;
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeEntry(overrides = {}) {
  return {
    id: 21,
    anilistId: 21,
    title: "Naruto",
    titleEnglish: "Naruto",
    cover: "https://example.com/cover.jpg",
    banner: "https://example.com/banner.jpg",
    episodes: 220,
    status: "watching",
    episodesWatched: 50,
    language: "sub",
    rating: 8,
    dateAdded: 1700000000000,
    lastWatched: 1700000000000,
    completedAt: 0,
    notes: "",
    genres: ["Action", "Adventure", "Fantasy"],
    year: 2002,
    sessionLog: [],
    averageScore: 79,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('renderHero()', () => {
  describe('empty library', () => {
    it('returns empty string when library is empty', () => {
      const result = renderHero([], () => null);
      expect(result).toBe('');
    });
  });

  describe('selection logic', () => {
    it('selects the most recently watched entry', () => {
      const older = makeEntry({ id: 1, title: "Older Anime", titleEnglish: "Older Anime", lastWatched: 1000 });
      const newer = makeEntry({ id: 2, title: "Newer Anime", titleEnglish: "Newer Anime", lastWatched: 9000 });
      const result = renderHero([older, newer], (id) => makeEntry({ id }));
      expect(result).toContain('Newer Anime');
      expect(result).not.toContain('Older Anime');
    });

    it('falls back to a "watching" entry when no lastWatched timestamps exist', () => {
      const entry = makeEntry({ lastWatched: 0, status: "watching" });
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain('Naruto');
    });

    it('returns empty string when no lastWatched and no "watching" entries', () => {
      const entry = makeEntry({ lastWatched: 0, status: "completed" });
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toBe('');
    });

    it('prefers lastWatched entry over watching status', () => {
      const recentlyWatched = makeEntry({ id: 1, title: "Recently Watched", titleEnglish: "Recently Watched", lastWatched: 9999, status: "completed" });
      const watching = makeEntry({ id: 2, title: "Currently Watching", titleEnglish: "Currently Watching", lastWatched: 0, status: "watching" });
      const result = renderHero([recentlyWatched, watching], (id) => makeEntry({ id }));
      expect(result).toContain('Recently Watched');
    });
  });

  describe('background image', () => {
    it('uses banner image when available', () => {
      const entry = makeEntry({ banner: "https://example.com/banner.jpg", cover: "https://example.com/cover.jpg" });
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain("background-image: url('https://example.com/banner.jpg')");
    });

    it('falls back to cover when no banner', () => {
      const entry = makeEntry({ banner: "", cover: "https://example.com/cover.jpg" });
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain("background-image: url('https://example.com/cover.jpg')");
    });

    it('uses CSS gradient when neither banner nor cover available', () => {
      const entry = makeEntry({ banner: "", cover: "" });
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain('background: linear-gradient');
      expect(result).not.toContain('background-image: url');
    });
  });

  describe('title rendering', () => {
    it('renders the anime title in an h1 element', () => {
      const entry = makeEntry({ title: "Naruto", titleEnglish: "Naruto" });
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain('<h1 class="hero-section__title">Naruto</h1>');
    });

    it('prefers English title over romaji title', () => {
      const entry = makeEntry({ title: "Shingeki no Kyojin", titleEnglish: "Attack on Titan" });
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain('Attack on Titan');
      expect(result).not.toContain('Shingeki no Kyojin');
    });

    it('falls back to romaji title when no English title', () => {
      const entry = makeEntry({ title: "Shingeki no Kyojin", titleEnglish: "" });
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain('Shingeki no Kyojin');
    });

    it('escapes HTML special characters in title', () => {
      const entry = makeEntry({ title: "Anime & <Test>", titleEnglish: "" });
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain('Anime &amp; &lt;Test&gt;');
    });
  });

  describe('subtitle rendering', () => {
    it('includes genre tags in subtitle', () => {
      const entry = makeEntry({ genres: ["Action", "Adventure", "Fantasy"] });
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain('Action • Adventure • Fantasy');
    });

    it('limits genres to 3 in subtitle', () => {
      const entry = makeEntry({ genres: ["Action", "Adventure", "Fantasy", "Comedy", "Drama"] });
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain('Action • Adventure • Fantasy');
      expect(result).not.toContain('Comedy');
    });

    it('includes year in subtitle', () => {
      const entry = makeEntry({ year: 2002 });
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain('2002');
    });

    it('includes episode count in subtitle', () => {
      const entry = makeEntry({ episodes: 220 });
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain('220 episodes');
    });

    it('shows "Episode count unknown" when episodes is 0', () => {
      const entry = makeEntry({ episodes: 0 });
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain('Episode count unknown');
    });
  });

  describe('CTA buttons', () => {
    it('always renders the Watch Now button', () => {
      const entry = makeEntry({ id: 21 });
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain('▶ Watch Now');
      expect(result).toContain('data-action="open-watch"');
      expect(result).toContain('data-id="21"');
    });

    it('Watch Now button data-id matches the featured entry id', () => {
      const entry = makeEntry({ id: 12345 });
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain('data-action="open-watch" data-id="12345"');
    });

    it('does not render Add to Library button when entry is in library', () => {
      const entry = makeEntry({ id: 21 });
      // getEntry returns the entry (it's in library)
      const result = renderHero([entry], (id) => entry);
      expect(result).not.toContain('＋ Add to Library');
    });

    it('renders Add to Library button when entry is NOT in library', () => {
      const entry = makeEntry({ id: 21 });
      // getEntry returns null (not in library)
      const result = renderHero([entry], () => null);
      expect(result).toContain('＋ Add to Library');
      expect(result).toContain('data-action="open-detail"');
      expect(result).toContain('data-id="21"');
    });
  });

  describe('HTML structure', () => {
    it('renders a hero-section element', () => {
      const entry = makeEntry();
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain('class="hero-section"');
    });

    it('renders a gradient overlay element', () => {
      const entry = makeEntry();
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain('class="hero-section__overlay"');
    });

    it('renders hero content container', () => {
      const entry = makeEntry();
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain('class="hero-section__content"');
    });

    it('renders hero actions container', () => {
      const entry = makeEntry();
      const result = renderHero([entry], (id) => makeEntry({ id }));
      expect(result).toContain('class="hero-section__actions"');
    });
  });
});
