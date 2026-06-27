/* ==========================================================================
   CineVault — premium, privacy-first movies / TV / animation streaming + tracking
   Vanilla JS, zero runtime dependencies. Data: TMDB. Playback: TMDB-ID embeds.
   ========================================================================== */

"use strict";

/* ------------------------------------------------------------------ config */
const APP_NAME = "CineVault";
const STORAGE_KEY = "cinevault_v1";
const SETTINGS_KEY = "cinevault_settings";

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";
const YT_BASE = "https://www.youtube.com/embed/";
const ANIMATION_GENRE = 16;

/* Site-wide TMDB v3 key — works out of the box for every visitor.
   (Users can still override it with their own key in Settings.) */
const HARDCODED_TMDB_KEY = "5427ba9d67c932c36943a19db08617d1";
let TMDB_API_KEY = "";

const NAV_TABS = ["home", "movies", "tv", "animation", "mylist"];
const NAV_LABELS = { home: "Home", movies: "Movies", tv: "TV Shows", animation: "Animation", mylist: "My List", search: "Search", stats: "Stats" };

const STATUS_OPTIONS = ["watching", "completed", "watchlist", "paused", "dropped"];
const STATUS_LABELS = {
  watching: "Watching", completed: "Completed", watchlist: "Watchlist",
  paused: "Paused", dropped: "Dropped", untracked: "Untracked",
};
const TOAST_TITLES = { success: "Success", error: "Something went wrong", info: "Heads up" };

const STATIC_GENRES = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};
const GENRE_MAP = { ...STATIC_GENRES }; // augmented from TMDB at runtime

/* Rows rendered per page. type: media type the endpoint returns. */
const PAGE_ROWS = {
  home: [
    { id: "trending", title: "Trending Now", path: "/trending/all/week" },
    { id: "popMovies", title: "Popular Movies", path: "/movie/popular", type: "movie" },
    { id: "popTv", title: "Popular Series", path: "/tv/popular", type: "tv" },
    { id: "topMovies", title: "Top Rated Movies", path: "/movie/top_rated", type: "movie" },
    { id: "nowPlaying", title: "In Theaters", path: "/movie/now_playing", type: "movie" },
    { id: "animation", title: "Animation", path: "/discover/movie", type: "movie", params: { with_genres: ANIMATION_GENRE, sort_by: "popularity.desc" } },
    { id: "onAir", title: "On The Air", path: "/tv/on_the_air", type: "tv" },
    { id: "action", title: "Action & Adventure", path: "/discover/movie", type: "movie", params: { with_genres: "28,12", sort_by: "popularity.desc" } },
    { id: "scifi", title: "Sci-Fi", path: "/discover/movie", type: "movie", params: { with_genres: 878, sort_by: "popularity.desc" } },
  ],
  movies: [
    { id: "popMovies", title: "Popular", path: "/movie/popular", type: "movie" },
    { id: "topMovies", title: "Top Rated", path: "/movie/top_rated", type: "movie" },
    { id: "nowPlaying", title: "Now Playing", path: "/movie/now_playing", type: "movie" },
    { id: "upcoming", title: "Coming Soon", path: "/movie/upcoming", type: "movie" },
    { id: "mAction", title: "Action", path: "/discover/movie", type: "movie", params: { with_genres: 28, sort_by: "popularity.desc" } },
    { id: "mComedy", title: "Comedy", path: "/discover/movie", type: "movie", params: { with_genres: 35, sort_by: "popularity.desc" } },
    { id: "mDrama", title: "Drama", path: "/discover/movie", type: "movie", params: { with_genres: 18, sort_by: "popularity.desc" } },
    { id: "mHorror", title: "Horror", path: "/discover/movie", type: "movie", params: { with_genres: 27, sort_by: "popularity.desc" } },
    { id: "mScifi", title: "Science Fiction", path: "/discover/movie", type: "movie", params: { with_genres: 878, sort_by: "popularity.desc" } },
  ],
  tv: [
    { id: "popTv", title: "Popular", path: "/tv/popular", type: "tv" },
    { id: "topTv", title: "Top Rated", path: "/tv/top_rated", type: "tv" },
    { id: "onAir", title: "On The Air", path: "/tv/on_the_air", type: "tv" },
    { id: "airToday", title: "Airing Today", path: "/tv/airing_today", type: "tv" },
    { id: "tDrama", title: "Drama", path: "/discover/tv", type: "tv", params: { with_genres: 18, sort_by: "popularity.desc" } },
    { id: "tCrime", title: "Crime", path: "/discover/tv", type: "tv", params: { with_genres: 80, sort_by: "popularity.desc" } },
    { id: "tSciFi", title: "Sci-Fi & Fantasy", path: "/discover/tv", type: "tv", params: { with_genres: 10765, sort_by: "popularity.desc" } },
    { id: "tReality", title: "Reality", path: "/discover/tv", type: "tv", params: { with_genres: 10764, sort_by: "popularity.desc" } },
  ],
  animation: [
    { id: "aMovies", title: "Animated Movies", path: "/discover/movie", type: "movie", params: { with_genres: ANIMATION_GENRE, sort_by: "popularity.desc" } },
    { id: "aTv", title: "Animated Series", path: "/discover/tv", type: "tv", params: { with_genres: ANIMATION_GENRE, sort_by: "popularity.desc" } },
    { id: "aTop", title: "Top Rated Animation", path: "/discover/movie", type: "movie", params: { with_genres: ANIMATION_GENRE, sort_by: "vote_average.desc", "vote_count.gte": 500 } },
    { id: "aFamily", title: "Family Animation", path: "/discover/movie", type: "movie", params: { with_genres: `${ANIMATION_GENRE},10751`, sort_by: "popularity.desc" } },
    { id: "aTvTop", title: "Best Animated Series", path: "/discover/tv", type: "tv", params: { with_genres: ANIMATION_GENRE, sort_by: "vote_average.desc", "vote_count.gte": 200 } },
  ],
};

/* ------------------------------------------------------------------- state */
const catalog = {}; // page -> { status, rows:[{id,title,items}], recRows:[] }
NAV_TABS.concat(["home"]).forEach((p) => { catalog[p] = { status: "idle", rows: [], recRows: [] }; });

const mediaIndex = {};   // key -> normalized media (everything we've seen)
const detailCache = {};  // key -> full detail object
const seasonCache = {};  // `${key}-${season}` -> { episodes:[...] }
const recCache = {};     // key -> [media]

let userData = {};       // library, keyed by `${mediaType}-${id}`
let settings = { tmdbKey: "", theme: "dark", region: "US", autoNext: true };

const uiState = {
  tab: "home",
  overlay: null,                                  // { type:"detail"|"settings", key }
  watch: null,                                    // { key, season, episode, provider, streamLoaded, trailer }
  detailLoading: false,
  search: { query: "", results: [], status: "idle", focus: false },
  library: { filter: "all", query: "", sort: "recent" },
};
let previousTab = "home";

const heroState = { current: 0, total: 0, timer: null, items: [] };
let searchTimer = null;
let providerTimer = null;

const app = document.getElementById("app");
const toastZone = document.getElementById("toastZone");

/* --------------------------------------------------------------- utilities */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
function safeParse(value) { try { return JSON.parse(value); } catch { return null; } }
function queueRender() { window.requestAnimationFrame(() => renderApp()); }

function img(path, size = "w500") {
  if (!path) return "";
  if (/^https?:/.test(path)) return path;
  return `${IMG_BASE}/${size}${path}`;
}
function mediaKey(type, id) { return `${type}-${id}`; }
function genreName(id) { return GENRE_MAP[id] || STATIC_GENRES[id] || ""; }
function genreNames(ids, limit = 3) { return (ids || []).map(genreName).filter(Boolean).slice(0, limit); }

function formatYear(media) { return media.year ? String(media.year) : ""; }
function formatVote(v) { return v ? Number(v).toFixed(1) : ""; }
function typeLabel(type) { return type === "tv" ? "Series" : "Movie"; }
function formatCount(value, noun) { return `${value} ${noun}${value === 1 ? "" : "s"}`; }
function formatRuntime(min) {
  if (!min) return "";
  const h = Math.floor(min / 60); const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
function formatDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function getRatingLabel(score) {
  if (!score) return "";
  if (score >= 9) return "Masterpiece";
  if (score >= 8) return "Great";
  if (score >= 7) return "Good";
  if (score >= 5) return "Okay";
  if (score >= 3) return "Weak";
  return "Bad";
}

/* ----------------------------------------------------------- normalization */
function pickMediaType(raw, forced) {
  if (forced === "movie" || forced === "tv") return forced;
  if (raw.media_type === "movie" || raw.media_type === "tv") return raw.media_type;
  if (raw.title || raw.release_date) return "movie";
  if (raw.name || raw.first_air_date) return "tv";
  return "movie";
}

function yearFromDate(date) {
  if (!date || typeof date !== "string") return 0;
  const y = Number(date.slice(0, 4));
  return Number.isFinite(y) ? y : 0;
}

/* Turn a raw TMDB list/detail object into the canonical media shape. */
function normalizeMedia(raw, forced) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.media_type === "person") return null;
  const id = Number(raw.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const mediaType = pickMediaType(raw, forced);
  const genreIds = Array.isArray(raw.genre_ids)
    ? raw.genre_ids.map(Number).filter(Number.isFinite)
    : Array.isArray(raw.genres)
      ? raw.genres.map((g) => Number(g.id)).filter(Number.isFinite)
      : [];
  const media = {
    id,
    mediaType,
    key: mediaKey(mediaType, id),
    title: String(raw.title || raw.name || "Untitled"),
    overview: String(raw.overview || ""),
    poster: raw.poster_path || "",
    backdrop: raw.backdrop_path || "",
    year: yearFromDate(raw.release_date || raw.first_air_date),
    voteAverage: Number.isFinite(Number(raw.vote_average)) ? Number(raw.vote_average) : 0,
    genreIds,
    popularity: Number(raw.popularity) || 0,
  };
  mediaIndex[media.key] = media;
  return media;
}

/* Coerce any (possibly malformed) object into a valid, idempotent library entry. */
function normalizeEntry(entry) {
  const src = entry && typeof entry === "object" ? entry : {};
  const id = Number(src.id);
  const mediaType = src.mediaType === "tv" ? "tv" : "movie";
  const safeId = Number.isFinite(id) && id > 0 ? id : 0;
  const status = STATUS_OPTIONS.includes(src.status) ? src.status : (src.status === "untracked" ? "untracked" : "watchlist");
  const rating = clamp(Math.round(Number(src.rating) || 0), 0, 10);
  const genreIds = Array.isArray(src.genreIds) ? src.genreIds.map(Number).filter(Number.isFinite) : [];
  const num = (v, min = 0) => { const n = Number(v); return Number.isFinite(n) && n >= min ? Math.floor(n) : min; };
  return {
    id: safeId,
    mediaType,
    key: mediaKey(mediaType, safeId),
    title: String(src.title || "Untitled"),
    overview: typeof src.overview === "string" ? src.overview : "",
    poster: typeof src.poster === "string" ? src.poster : "",
    backdrop: typeof src.backdrop === "string" ? src.backdrop : "",
    year: num(src.year),
    voteAverage: Number.isFinite(Number(src.voteAverage)) ? Number(src.voteAverage) : 0,
    genreIds,
    status,
    rating,
    notes: typeof src.notes === "string" ? src.notes : "",
    dateAdded: num(src.dateAdded) || Date.now(),
    lastWatched: num(src.lastWatched),
    completedAt: num(src.completedAt),
    season: Math.max(1, num(src.season, 1)),
    episode: Math.max(1, num(src.episode, 1)),
    totalSeasons: num(src.totalSeasons),
    totalEpisodes: num(src.totalEpisodes),
    watched: Boolean(src.watched),
    sessionLog: Array.isArray(src.sessionLog) ? src.sessionLog.map(Number).filter((n) => Number.isFinite(n) && n > 0) : [],
  };
}

function normalizeLibrary(raw) {
  const result = {};
  if (!raw || typeof raw !== "object") return result;
  Object.values(raw).forEach((value) => {
    const entry = normalizeEntry(value);
    if (entry.id > 0) result[entry.key] = entry;
  });
  return result;
}

/* ---------------------------------------------------------------- storage */
function loadSettings() {
  const parsed = safeParse(localStorage.getItem(SETTINGS_KEY)) || {};
  settings = {
    tmdbKey: typeof parsed.tmdbKey === "string" ? parsed.tmdbKey : "",
    theme: parsed.theme === "light" ? "light" : "dark",
    region: typeof parsed.region === "string" ? parsed.region : "US",
    autoNext: parsed.autoNext !== false,
  };
  TMDB_API_KEY = HARDCODED_TMDB_KEY || settings.tmdbKey || "";
  document.documentElement.setAttribute("data-theme", settings.theme);
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}
function loadData() {
  userData = normalizeLibrary(safeParse(localStorage.getItem(STORAGE_KEY)) || {});
}
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(userData)); }
  catch { showToast("Could not save — storage may be full.", "error"); }
}
function hasKey() { return Boolean(TMDB_API_KEY); }

/* library accessors */
function getEntry(key) { return userData[key] || null; }
function getEntries() { return Object.values(userData); }
function getEntriesByStatus(status) { return getEntries().filter((e) => e.status === status); }

/* --------------------------------------------------------------- TMDB API */
async function tmdbFetch(path, params = {}) {
  if (!hasKey()) throw new Error("NO_KEY");
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set("api_key", TMDB_API_KEY);
  url.searchParams.set("language", "en-US");
  if (settings.region) url.searchParams.set("region", settings.region);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (res.status === 401) throw new Error("BAD_KEY");
  if (!res.ok) throw new Error(`TMDB request failed (${res.status})`);
  return res.json();
}

async function loadGenres() {
  if (!hasKey()) return;
  try {
    const [m, t] = await Promise.all([
      tmdbFetch("/genre/movie/list"),
      tmdbFetch("/genre/tv/list"),
    ]);
    [...(m.genres || []), ...(t.genres || [])].forEach((g) => { GENRE_MAP[g.id] = g.name; });
  } catch { /* fall back to STATIC_GENRES */ }
}

/* Fetch every row for a page in parallel, then render. */
async function loadPage(page) {
  const state = catalog[page];
  if (!state) return;
  if (state.status === "loading" || state.status === "ready") return;
  if (!hasKey()) { state.status = "needkey"; renderApp(); return; }
  state.status = "loading";
  renderApp();
  try {
    const configs = PAGE_ROWS[page] || [];
    const rows = await Promise.all(configs.map(async (c) => {
      const data = await tmdbFetch(c.path, c.params || {});
      const items = (data.results || []).map((r) => normalizeMedia(r, c.type)).filter(Boolean);
      return { id: c.id, title: c.title, items };
    }));
    state.rows = rows.filter((r) => r.items.length);
    state.status = "ready";
    renderApp();
    if (page === "home") loadHomeRecommendations();
  } catch (err) {
    state.status = err.message === "BAD_KEY" ? "badkey" : "error";
    renderApp();
  }
}

/* "Because you watched…" rows built from TMDB recommendations for recent titles. */
async function loadHomeRecommendations() {
  const recent = getEntries()
    .filter((e) => e.lastWatched && (e.status === "watching" || e.status === "completed"))
    .sort((a, b) => b.lastWatched - a.lastWatched)
    .slice(0, 2);
  if (!recent.length) return;
  try {
    const rows = [];
    for (const entry of recent) {
      let items = recCache[entry.key];
      if (!items) {
        const data = await tmdbFetch(`/${entry.mediaType}/${entry.id}/recommendations`);
        items = (data.results || []).map((r) => normalizeMedia(r, r.media_type)).filter(Boolean).slice(0, 18);
        recCache[entry.key] = items;
      }
      if (items.length) rows.push({ id: `rec-${entry.key}`, title: `Because you watched ${entry.title}`, items });
    }
    catalog.home.recRows = rows;
    if (uiState.tab === "home" && !uiState.watch) renderApp();
  } catch { /* recommendations are best-effort */ }
}

async function fetchDetail(key) {
  if (detailCache[key]) return detailCache[key];
  const media = mediaIndex[key] || getEntry(key);
  if (!media) throw new Error("Unknown title");
  const data = await tmdbFetch(`/${media.mediaType}/${media.id}`, {
    append_to_response: "credits,videos,similar,recommendations",
  });
  data._mediaType = media.mediaType;
  detailCache[key] = data;
  return data;
}

async function fetchSeason(key, season) {
  const cacheKey = `${key}-${season}`;
  if (seasonCache[cacheKey]) return seasonCache[cacheKey];
  const media = mediaIndex[key] || getEntry(key);
  if (!media) return { episodes: [] };
  const data = await tmdbFetch(`/${media.mediaType}/${media.id}/season/${season}`);
  seasonCache[cacheKey] = data;
  return data;
}

/* Resolve a media object from anything we've indexed or have in the library. */
function resolveMedia(key) {
  return mediaIndex[key] || getEntry(key) || null;
}

/* ----------------------------------------------------------- streaming */
/* Multi-server lineup (TMDB-ID embeds). Order = default + auto-fallback order.
   Keep VidLink first; users can switch to any server in the watch view. */
const STREAM_PROVIDERS = [
  {
    name: "VidLink",
    movie: (id) => `https://vidlink.pro/movie/${id}`,
    tv: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
  },
  {
    name: "VidFast",
    movie: (id) => `https://vidfast.pro/movie/${id}`,
    tv: (id, s, e) => `https://vidfast.pro/tv/${id}/${s}/${e}`,
  },
  {
    name: "VidSrc",
    movie: (id) => `https://vidsrc.to/embed/movie/${id}`,
    tv: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "VidSrc.cc",
    movie: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    tv: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "2Embed",
    movie: (id) => `https://www.2embed.cc/embed/${id}`,
    tv: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
  },
  {
    name: "SuperEmbed",
    movie: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    tv: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  },
  {
    name: "AutoEmbed",
    movie: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    tv: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "EmbedAPI",
    movie: (id) => `https://player.embed-api.stream/?id=${id}`,
    tv: (id, s, e) => `https://player.embed-api.stream/?id=${id}&s=${s}&e=${e}`,
  },
];

function buildStreamUrl(entry, providerIndex = 0, season = 1, episode = 1) {
  if (!entry || !entry.id) return "";
  const provider = STREAM_PROVIDERS[providerIndex] || STREAM_PROVIDERS[0];
  return entry.mediaType === "tv"
    ? provider.tv(entry.id, season, episode)
    : provider.movie(entry.id);
}

/* --------------------------------------------------------------- top nav */
function renderTopNav() {
  const tabs = NAV_TABS.map((tab) => {
    const active = uiState.tab === tab ? "is-active" : "";
    return `<button type="button" class="nav-link ${active}" data-action="tab" data-tab="${tab}">${NAV_LABELS[tab]}</button>`;
  }).join("");
  return `
  <header class="topbar" id="topbar">
    <div class="topbar__left">
      <button type="button" class="brand" data-action="tab" data-tab="home" aria-label="${APP_NAME} home">
        <span class="brand__mark">CV</span><span class="brand__name">CineVault</span>
      </button>
      <nav class="nav-links" aria-label="Primary">${tabs}</nav>
    </div>
    <div class="topbar__right">
      <div class="searchbox">
        <span class="searchbox__icon" aria-hidden="true">⌕</span>
        <input id="navSearchInput" class="searchbox__input" type="search" placeholder="Search movies & series"
          value="${escapeHtml(uiState.search.query)}" aria-label="Search">
      </div>
      <button type="button" class="icon-btn" data-action="tab" data-tab="stats" title="Your stats" aria-label="Stats">📊</button>
      <button type="button" class="icon-btn" data-action="open-settings" title="Settings" aria-label="Settings">⚙</button>
    </div>
  </header>`;
}

function renderMobileNav() {
  const items = [["home", "⌂", "Home"], ["movies", "🎬", "Movies"], ["tv", "📺", "TV"], ["search", "⌕", "Search"], ["mylist", "♥", "My List"]];
  return `<nav class="mobile-nav" aria-label="Primary mobile">
    ${items.map(([tab, icon, label]) => {
      const active = uiState.tab === tab ? "is-active" : "";
      return `<button type="button" class="mobile-nav__btn ${active}" data-action="tab" data-tab="${tab}">
        <span class="mobile-nav__icon">${icon}</span><span class="mobile-nav__label">${label}</span></button>`;
    }).join("")}
  </nav>`;
}

/* --------------------------------------------------------------- cards */
function libraryBadge(media) {
  const entry = getEntry(media.key);
  if (!entry || entry.status === "untracked") return "";
  return `<span class="card__badge card__badge--${entry.status}">${STATUS_LABELS[entry.status]}</span>`;
}

function renderCard(media) {
  if (!media) return "";
  const poster = img(media.poster, "w342");
  const vote = formatVote(media.voteAverage);
  const genres = genreNames(media.genreIds, 2).join(" • ");
  const inList = Boolean(getEntry(media.key));
  return `<article class="card" data-action="open-detail" data-key="${media.key}" tabindex="0" role="button" aria-label="${escapeHtml(media.title)}">
    <div class="card__media">
      ${poster ? `<img loading="lazy" src="${poster}" alt="${escapeHtml(media.title)}">` : `<div class="card__noimg">${escapeHtml(media.title)}</div>`}
      <span class="card__type">${typeLabel(media.mediaType)}</span>
      ${libraryBadge(media)}
      <div class="card__hover">
        <div class="card__hover-actions">
          <button type="button" class="round-btn round-btn--play" data-action="open-watch" data-key="${media.key}" title="Play" aria-label="Play ${escapeHtml(media.title)}">▶</button>
          <button type="button" class="round-btn" data-action="toggle-list" data-key="${media.key}" title="${inList ? "In your list" : "Add to My List"}" aria-label="Toggle list">${inList ? "✓" : "+"}</button>
          <button type="button" class="round-btn" data-action="open-detail" data-key="${media.key}" title="More info" aria-label="More info">ⓘ</button>
        </div>
        <div class="card__hover-meta">
          ${vote ? `<span class="card__score">★ ${vote}</span>` : ""}
          ${media.year ? `<span>${media.year}</span>` : ""}
        </div>
        ${genres ? `<div class="card__genres">${escapeHtml(genres)}</div>` : ""}
      </div>
    </div>
    <div class="card__title">${escapeHtml(media.title)}</div>
  </article>`;
}

function renderContinueCard(entry) {
  const pct = continueProgressPercent(entry);
  const sub = entry.mediaType === "tv" ? `S${entry.season} · E${entry.episode}` : "Resume movie";
  return `<article class="continue-card" data-action="open-watch" data-key="${entry.key}" tabindex="0" role="button" aria-label="Resume ${escapeHtml(entry.title)}">
    <div class="continue-card__bg">${entry.backdrop ? `<img loading="lazy" src="${img(entry.backdrop, "w780")}" alt="">` : entry.poster ? `<img loading="lazy" src="${img(entry.poster, "w500")}" alt="">` : ""}</div>
    <div class="continue-card__shade"></div>
    <div class="continue-card__play">▶</div>
    <div class="continue-card__info">
      <div class="continue-card__title">${escapeHtml(entry.title)}</div>
      <div class="continue-card__sub">${sub}</div>
    </div>
    <div class="continue-card__bar"><span style="width:${pct}%"></span></div>
  </article>`;
}

function continueProgressPercent(entry) {
  if (entry.mediaType === "movie") return entry.watched ? 100 : 35;
  const total = entry.totalEpisodes || (entry.totalSeasons ? entry.totalSeasons * 10 : 12);
  const done = Math.max(0, (entry.episode || 1) - 1) + (entry.season > 1 ? (entry.season - 1) * 10 : 0);
  return clamp(Math.round((done / total) * 100), 4, 100);
}

/* --------------------------------------------------------------- rows */
function renderRow(row) {
  if (!row.items || !row.items.length) return "";
  const trackId = `row-${row.id}`;
  return `<section class="row">
    <div class="row__head">
      <h2 class="row__title">${escapeHtml(row.title)}</h2>
      <div class="row__controls">
        <button type="button" class="scroll-btn" data-action="row-scroll" data-target="${trackId}" data-dir="prev" aria-label="Scroll left">‹</button>
        <button type="button" class="scroll-btn" data-action="row-scroll" data-target="${trackId}" data-dir="next" aria-label="Scroll right">›</button>
      </div>
    </div>
    <div class="row__viewport" id="${trackId}" data-row-track="${trackId}">
      <div class="row__track">${row.items.map(renderCard).join("")}</div>
    </div>
  </section>`;
}

function renderSkeletonRows(count = 5) {
  const cards = Array.from({ length: 8 }).map(() => `<div class="skel-card"></div>`).join("");
  return Array.from({ length: count }).map(() => `<section class="row">
    <div class="row__head"><div class="skel-title"></div></div>
    <div class="row__viewport"><div class="row__track">${cards}</div></div>
  </section>`).join("");
}

/* --------------------------------------------------------------- hero */
function pickHeroItems(rows) {
  const trending = (rows.find((r) => r.id === "trending") || rows[0] || { items: [] }).items;
  return trending.filter((m) => m.backdrop).slice(0, 6);
}

function renderHero(items) {
  if (!items.length) return "";
  heroState.items = items;
  heroState.total = items.length;
  if (heroState.current >= items.length) heroState.current = 0;
  const slides = items.map((m, i) => {
    const inList = Boolean(getEntry(m.key));
    return `<div class="hero__slide ${i === heroState.current ? "is-active" : ""}" data-index="${i}">
      <div class="hero__bg">${m.backdrop ? `<img src="${img(m.backdrop, "original")}" alt="">` : ""}</div>
      <div class="hero__scrim"></div>
      <div class="hero__content">
        <div class="hero__badges">
          <span class="hero__tag">${typeLabel(m.mediaType)}</span>
          ${m.year ? `<span class="hero__dot">${m.year}</span>` : ""}
          ${m.voteAverage ? `<span class="hero__dot">★ ${formatVote(m.voteAverage)}</span>` : ""}
          ${genreNames(m.genreIds, 2).map((g) => `<span class="hero__dot">${escapeHtml(g)}</span>`).join("")}
        </div>
        <h1 class="hero__title">${escapeHtml(m.title)}</h1>
        <p class="hero__overview">${escapeHtml((m.overview || "").slice(0, 220))}${(m.overview || "").length > 220 ? "…" : ""}</p>
        <div class="hero__actions">
          <button type="button" class="btn btn--play" data-action="open-watch" data-key="${m.key}">▶ Play</button>
          <button type="button" class="btn btn--ghost" data-action="open-detail" data-key="${m.key}">ⓘ More Info</button>
          <button type="button" class="btn btn--icon" data-action="toggle-list" data-key="${m.key}" title="My List">${inList ? "✓" : "＋"}</button>
        </div>
      </div>
    </div>`;
  }).join("");
  const dots = items.map((_, i) => `<button type="button" class="hero__indicator ${i === heroState.current ? "is-active" : ""}" data-action="hero-dot" data-index="${i}" aria-label="Slide ${i + 1}"></button>`).join("");
  return `<section class="hero" id="hero">
    ${slides}
    <div class="hero__nav">
      <button type="button" class="hero__arrow" data-action="hero-prev" aria-label="Previous">‹</button>
      <button type="button" class="hero__arrow" data-action="hero-next" aria-label="Next">›</button>
    </div>
    <div class="hero__indicators">${dots}</div>
  </section>`;
}

function startHeroAuto() {
  clearInterval(heroState.timer);
  if (heroState.total <= 1) return;
  heroState.timer = setInterval(() => goHero(heroState.current + 1), 7000);
}
function goHero(index) {
  if (heroState.total <= 0) return;
  heroState.current = (index + heroState.total) % heroState.total;
  const hero = document.getElementById("hero");
  if (!hero) return;
  hero.querySelectorAll(".hero__slide").forEach((s, i) => s.classList.toggle("is-active", i === heroState.current));
  hero.querySelectorAll(".hero__indicator").forEach((d, i) => d.classList.toggle("is-active", i === heroState.current));
}

/* --------------------------------------------------------------- pages */
function renderNeedKey() {
  return `<div class="onboard">
    <div class="onboard__card">
      <div class="onboard__logo">CV</div>
      <h1>Welcome to CineVault</h1>
      <p>Add a free <strong>TMDB API key</strong> to unlock movies, series & animation. Your key is stored only in this browser.</p>
      <ol class="onboard__steps">
        <li>Open <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener">themoviedb.org/settings/api</a></li>
        <li>Request a free <strong>v3 API Key</strong></li>
        <li>Paste it in Settings below</li>
      </ol>
      <button type="button" class="btn btn--play" data-action="open-settings">⚙ Open Settings</button>
    </div>
  </div>`;
}

function renderLoadError(state) {
  if (state.status === "badkey") {
    return `<div class="state-msg"><h2>Invalid TMDB key</h2><p>Your API key was rejected. Update it in Settings.</p>
      <button type="button" class="btn btn--play" data-action="open-settings">Open Settings</button></div>`;
  }
  return `<div class="state-msg"><h2>Couldn't load titles</h2><p>Check your connection and try again.</p>
    <button type="button" class="btn btn--play" data-action="retry-load">Retry</button></div>`;
}

function renderCatalogPage(page, heading, subtitle) {
  const state = catalog[page];
  if (!hasKey()) return renderNeedKey();
  if (state.status === "loading" || state.status === "idle") {
    return `<div class="catalog">${page === "home" ? "" : `<div class="page-hero"><h1>${escapeHtml(heading)}</h1></div>`}${renderSkeletonRows()}</div>`;
  }
  if (state.status === "error" || state.status === "badkey") return renderLoadError(state);

  let heroHtml = "";
  let rows = state.rows;
  if (page === "home") {
    heroHtml = renderHero(pickHeroItems(state.rows));
    rows = [...state.rows, ...(state.recRows || [])];
  } else {
    heroHtml = `<div class="page-hero"><h1>${escapeHtml(heading)}</h1>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</div>`;
  }
  const continueRow = page === "home" ? renderContinueSection() : "";
  return `<div class="catalog">${heroHtml}${continueRow}${rows.map(renderRow).join("")}</div>`;
}

function renderContinueSection() {
  const entries = getEntries()
    .filter((e) => e.status === "watching" || (e.status === "paused"))
    .sort((a, b) => (b.lastWatched || b.dateAdded) - (a.lastWatched || a.dateAdded));
  if (!entries.length) return "";
  const trackId = "row-continue";
  return `<section class="row row--continue">
    <div class="row__head"><h2 class="row__title">Continue Watching</h2>
      <div class="row__controls">
        <button type="button" class="scroll-btn" data-action="row-scroll" data-target="${trackId}" data-dir="prev" aria-label="Scroll left">‹</button>
        <button type="button" class="scroll-btn" data-action="row-scroll" data-target="${trackId}" data-dir="next" aria-label="Scroll right">›</button>
      </div>
    </div>
    <div class="row__viewport" id="${trackId}" data-row-track="${trackId}"><div class="row__track">${entries.map(renderContinueCard).join("")}</div></div>
  </section>`;
}

/* My List ----------------------------------------------------------------- */
function getFilteredLibrary() {
  let entries = getEntries();
  if (uiState.library.filter !== "all") entries = entries.filter((e) => e.status === uiState.library.filter);
  const q = uiState.library.query.trim().toLowerCase();
  if (q) entries = entries.filter((e) => e.title.toLowerCase().includes(q));
  const sorters = {
    recent: (a, b) => (b.lastWatched || b.dateAdded) - (a.lastWatched || a.dateAdded),
    added: (a, b) => b.dateAdded - a.dateAdded,
    alpha: (a, b) => a.title.localeCompare(b.title),
    rating: (a, b) => (b.rating || 0) - (a.rating || 0),
    year: (a, b) => (b.year || 0) - (a.year || 0),
  };
  return entries.sort(sorters[uiState.library.sort] || sorters.recent);
}

function renderMyList() {
  const entries = getFilteredLibrary();
  const filters = [["all", "All"], ...STATUS_OPTIONS.map((s) => [s, STATUS_LABELS[s]])];
  return `<div class="catalog mylist">
    <div class="page-hero"><h1>My List</h1><p>Everything you've saved — stored locally in this browser.</p></div>
    <div class="toolbar">
      <div class="chips">${filters.map(([v, l]) => `<button type="button" class="chip ${uiState.library.filter === v ? "is-active" : ""}" data-action="set-library-filter" data-filter="${v}">${l}</button>`).join("")}</div>
      <div class="toolbar__right">
        <input id="librarySearchInput" class="input" type="search" placeholder="Filter your list" value="${escapeHtml(uiState.library.query)}">
        <select id="librarySortSelect" class="select" aria-label="Sort">
          ${[["recent", "Recently watched"], ["added", "Recently added"], ["alpha", "A–Z"], ["rating", "My rating"], ["year", "Year"]].map(([v, l]) => `<option value="${v}" ${uiState.library.sort === v ? "selected" : ""}>${l}</option>`).join("")}
        </select>
      </div>
    </div>
    ${entries.length
      ? `<div class="grid">${entries.map(renderCard).join("")}</div>`
      : `<div class="state-msg"><h2>Nothing here yet</h2><p>Browse and tap ＋ to build your list.</p><button type="button" class="btn btn--play" data-action="tab" data-tab="home">Browse titles</button></div>`}
  </div>`;
}

/* Search ------------------------------------------------------------------ */
function renderSearch() {
  const { query, results, status } = uiState.search;
  let body;
  if (!hasKey()) body = renderNeedKey();
  else if (!query.trim()) body = `<div class="state-msg"><h2>Search CineVault</h2><p>Find any movie or series by title.</p></div>`;
  else if (status === "loading") body = `<div class="grid">${Array.from({ length: 12 }).map(() => `<div class="skel-card skel-card--tall"></div>`).join("")}</div>`;
  else if (status === "error") body = `<div class="state-msg"><h2>Search failed</h2><p>Try again in a moment.</p></div>`;
  else if (!results.length) body = `<div class="state-msg"><h2>No results for “${escapeHtml(query)}”</h2><p>Check the spelling or try another title.</p></div>`;
  else body = `<div class="grid">${results.map(renderCard).join("")}</div>`;
  return `<div class="catalog">
    <div class="page-hero"><h1>${query.trim() ? `Results for “${escapeHtml(query)}”` : "Search"}</h1></div>
    <div id="searchResults">${body}</div>
  </div>`;
}

function scheduleSearch(query) {
  uiState.search.query = query;
  window.clearTimeout(searchTimer);
  if (!query.trim()) { uiState.search.results = []; uiState.search.status = "idle"; patchSearch(); return; }
  uiState.search.status = "loading";
  patchSearch();
  searchTimer = window.setTimeout(() => runSearch(query), 350);
}
async function runSearch(query) {
  if (!hasKey()) return;
  try {
    const data = await tmdbFetch("/search/multi", { query, include_adult: false, page: 1 });
    if (uiState.search.query !== query) return; // stale
    uiState.search.results = (data.results || []).map((r) => normalizeMedia(r)).filter(Boolean);
    uiState.search.status = "ready";
  } catch {
    uiState.search.status = "error";
  }
  patchSearch();
}
/* Surgical update so the nav search input never loses focus while typing. */
function patchSearch() {
  if (uiState.tab !== "search" || uiState.watch || uiState.overlay) return;
  const container = document.getElementById("searchResults");
  if (!container) { renderApp(); return; }
  const { query, results, status } = uiState.search;
  if (!query.trim()) container.innerHTML = `<div class="state-msg"><h2>Search CineVault</h2><p>Find any movie or series by title.</p></div>`;
  else if (status === "loading") container.innerHTML = `<div class="grid">${Array.from({ length: 12 }).map(() => `<div class="skel-card skel-card--tall"></div>`).join("")}</div>`;
  else if (status === "error") container.innerHTML = `<div class="state-msg"><h2>Search failed</h2><p>Try again in a moment.</p></div>`;
  else if (!results.length) container.innerHTML = `<div class="state-msg"><h2>No results for “${escapeHtml(query)}”</h2></div>`;
  else container.innerHTML = `<div class="grid">${results.map(renderCard).join("")}</div>`;
}

/* --------------------------------------------------------------- detail */
function openDetail(key) {
  uiState.overlay = { type: "detail", key, trailer: false };
  uiState.detailLoading = !detailCache[key];
  renderApp();
  if (!detailCache[key]) {
    fetchDetail(key).then(() => {
      uiState.detailLoading = false;
      if (uiState.overlay && uiState.overlay.key === key) renderApp();
    }).catch(() => {
      uiState.detailLoading = false;
      if (uiState.overlay && uiState.overlay.key === key) { showToast("Couldn't load details.", "error"); renderApp(); }
    });
  }
}

function renderOverlay() {
  if (!uiState.overlay) return "";
  if (uiState.overlay.type === "settings") return renderSettingsOverlay();
  return renderDetailOverlay();
}

function renderDetailOverlay() {
  const key = uiState.overlay.key;
  const media = resolveMedia(key);
  const detail = detailCache[key];
  const entry = getEntry(key);
  if (!media && !detail) return "";
  const base = detail || media;
  const title = base.title || base.name || media.title;
  const backdrop = img((detail && detail.backdrop_path) || media.backdrop, "original");
  const poster = img((detail && detail.poster_path) || media.poster, "w500");
  const overview = (detail && detail.overview) || media.overview || "";
  const mediaType = media.mediaType;
  const year = mediaType === "tv"
    ? yearFromDate(detail && detail.first_air_date) || media.year
    : yearFromDate(detail && detail.release_date) || media.year;
  const vote = formatVote((detail && detail.vote_average) || media.voteAverage);
  const runtime = detail ? (mediaType === "tv" ? (detail.episode_run_time && detail.episode_run_time[0]) : detail.runtime) : 0;
  const genres = detail && detail.genres ? detail.genres.map((g) => g.name) : genreNames(media.genreIds, 4);
  const seasons = detail && mediaType === "tv" ? detail.number_of_seasons : 0;
  const episodes = detail && mediaType === "tv" ? detail.number_of_episodes : 0;
  const cast = detail && detail.credits ? (detail.credits.cast || []).slice(0, 8) : [];
  const trailer = detail && detail.videos ? (detail.videos.results || []).find((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")) : null;
  const similar = detail ? [...((detail.recommendations && detail.recommendations.results) || []), ...((detail.similar && detail.similar.results) || [])]
    .map((r) => normalizeMedia(r, r.media_type || mediaType)).filter(Boolean) : [];
  const seen = new Set();
  const similarUnique = similar.filter((m) => (m.key !== key) && !seen.has(m.key) && seen.add(m.key)).slice(0, 12);

  const statusBtns = STATUS_OPTIONS.map((s) =>
    `<button type="button" class="seg ${entry && entry.status === s ? "is-active" : ""}" data-action="set-status" data-key="${key}" data-status="${s}">${STATUS_LABELS[s]}</button>`
  ).join("");

  const metaBits = [year, mediaType === "tv" ? formatCount(seasons || media.totalSeasons || 0, "season") : formatRuntime(runtime), vote ? `★ ${vote}` : "", typeLabel(mediaType)].filter(Boolean);

  return `<div class="overlay" data-action="close-overlay">
    <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}" data-stop="1">
      <button type="button" class="modal__close" data-action="close-overlay" aria-label="Close">✕</button>
      <div class="modal__hero">
        ${uiState.overlay.trailer && trailer
          ? `<div class="modal__trailer"><iframe src="${YT_BASE}${trailer.key}?autoplay=1&rel=0" title="Trailer" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe></div>`
          : `<div class="modal__backdrop">${backdrop ? `<img src="${backdrop}" alt="">` : ""}</div><div class="modal__hero-scrim"></div>`}
        <div class="modal__hero-body">
          <h2 class="modal__title">${escapeHtml(title)}</h2>
          <div class="modal__actions">
            <button type="button" class="btn btn--play" data-action="open-watch" data-key="${key}">▶ Play</button>
            ${trailer ? `<button type="button" class="btn btn--ghost" data-action="${uiState.overlay.trailer ? "stop-trailer" : "play-trailer"}" data-key="${key}">${uiState.overlay.trailer ? "■ Stop" : "🎬 Trailer"}</button>` : ""}
            <button type="button" class="btn btn--icon" data-action="toggle-list" data-key="${key}" title="My List">${entry ? "✓" : "＋"}</button>
          </div>
        </div>
      </div>
      <div class="modal__body">
        ${uiState.detailLoading ? `<div class="modal__loading">Loading details…</div>` : ""}
        <div class="modal__cols">
          <div class="modal__main">
            <div class="modal__meta">${metaBits.map((b) => `<span>${escapeHtml(String(b))}</span>`).join("<i>•</i>")}</div>
            <p class="modal__overview">${escapeHtml(overview) || "No description available."}</p>
            ${mediaType === "tv" && episodes ? `<div class="modal__sub">${formatCount(episodes, "episode")} across ${formatCount(seasons, "season")}</div>` : ""}
            <div class="modal__track-status">
              <div class="modal__label">In your list</div>
              <div class="seg-group">${statusBtns}${entry ? `<button type="button" class="seg seg--danger" data-action="remove" data-key="${key}">Remove</button>` : ""}</div>
            </div>
            ${renderRatingComponent(key)}
            ${entry ? `<div class="modal__notes"><div class="modal__label">Notes</div><textarea id="notesField" class="textarea" data-key="${key}" placeholder="Your private notes…">${escapeHtml(entry.notes)}</textarea></div>` : ""}
          </div>
          <aside class="modal__aside">
            ${poster ? `<img class="modal__poster" src="${poster}" alt="${escapeHtml(title)}">` : ""}
            ${genres.length ? `<div class="modal__genres">${genres.map((g) => `<span class="tag">${escapeHtml(g)}</span>`).join("")}</div>` : ""}
          </aside>
        </div>
        ${cast.length ? `<div class="modal__section"><div class="modal__label">Cast</div><div class="cast-row">${cast.map((c) => `<div class="cast"><div class="cast__img">${c.profile_path ? `<img loading="lazy" src="${img(c.profile_path, "w185")}" alt="${escapeHtml(c.name)}">` : `<div class="cast__noimg">${escapeHtml((c.name || "?").charAt(0))}</div>`}</div><div class="cast__name">${escapeHtml(c.name)}</div><div class="cast__role">${escapeHtml(c.character || "")}</div></div>`).join("")}</div></div>` : ""}
        ${similarUnique.length ? `<div class="modal__section"><div class="modal__label">More like this</div><div class="grid grid--compact">${similarUnique.map(renderCard).join("")}</div></div>` : ""}
      </div>
    </div>
  </div>`;
}

function renderRatingComponent(key) {
  const entry = getEntry(key);
  const current = entry ? entry.rating : 0;
  const stars = Array.from({ length: 10 }).map((_, i) => {
    const v = i + 1;
    return `<button type="button" class="rate-star ${v <= current ? "is-on" : ""}" data-action="set-rating" data-key="${key}" data-rating="${v}" aria-label="Rate ${v}">★</button>`;
  }).join("");
  return `<div class="modal__rate"><div class="modal__label">Your rating ${current ? `— ${current}/10 · ${getRatingLabel(current)}` : ""}</div>
    <div class="rate-stars">${stars}${current ? `<button type="button" class="rate-clear" data-action="set-rating" data-key="${key}" data-rating="0">clear</button>` : ""}</div></div>`;
}

/* --------------------------------------------------------------- settings */
function openSettings() { uiState.overlay = { type: "settings" }; renderApp(); }
function renderSettingsOverlay() {
  return `<div class="overlay" data-action="close-overlay">
    <div class="modal modal--settings" role="dialog" aria-modal="true" aria-label="Settings" data-stop="1">
      <button type="button" class="modal__close" data-action="close-overlay" aria-label="Close">✕</button>
      <div class="settings">
        <h2>Settings</h2>
        <div class="settings__group">
          <label class="settings__label" for="setRegion">Region</label>
          <select id="setRegion" class="select">
            ${["US", "GB", "CA", "AU", "IN", "DE", "FR", "ES", "BR", "JP", "KR", "MX"].map((r) => `<option value="${r}" ${settings.region === r ? "selected" : ""}>${r}</option>`).join("")}
          </select>
        </div>
        <div class="settings__group settings__group--row">
          <label class="settings__toggle"><input id="setAutoNext" type="checkbox" ${settings.autoNext ? "checked" : ""}> Auto-play next episode</label>
          <label class="settings__toggle"><input id="setTheme" type="checkbox" ${settings.theme === "light" ? "checked" : ""}> Light theme</label>
        </div>
        <div class="settings__actions">
          <button type="button" class="btn btn--play" data-action="save-settings">Save</button>
          <button type="button" class="btn btn--ghost" data-action="export">⬇ Export library</button>
          <label class="btn btn--ghost file-btn">⬆ Import<input id="importFile" type="file" accept="application/json" hidden></label>
        </div>
        <div class="settings__meta">${formatCount(getEntries().length, "title")} in your library</div>
      </div>
    </div>
  </div>`;
}

/* --------------------------------------------------------------- watch */
function ensureEntry(media, { markWatching = false } = {}) {
  let entry = getEntry(media.key);
  if (!entry) {
    entry = normalizeEntry({
      id: media.id, mediaType: media.mediaType, title: media.title, overview: media.overview,
      poster: media.poster, backdrop: media.backdrop, year: media.year, voteAverage: media.voteAverage,
      genreIds: media.genreIds, status: markWatching ? "watching" : "watchlist", season: 1, episode: 1,
    });
    userData[entry.key] = entry;
  } else {
    // refresh display fields from latest media
    entry.poster = entry.poster || media.poster;
    entry.backdrop = entry.backdrop || media.backdrop;
    if (!entry.genreIds.length) entry.genreIds = media.genreIds;
    if (markWatching && (entry.status === "watchlist" || entry.status === "untracked")) entry.status = "watching";
  }
  saveData();
  return entry;
}

function openWatch(key) {
  const media = resolveMedia(key);
  if (!media) { showToast("Title unavailable.", "error"); return; }
  const entry = ensureEntry(media, { markWatching: true });
  previousTab = uiState.tab;
  uiState.overlay = null;
  uiState.watch = {
    key,
    season: entry.mediaType === "tv" ? entry.season || 1 : 1,
    episode: entry.mediaType === "tv" ? entry.episode || 1 : 1,
    provider: 0,
    streamLoaded: false,
  };
  entry.lastWatched = Date.now();
  saveData();
  renderApp();
  // hydrate detail + season info in the background
  fetchDetail(key).then(() => {
    const d = detailCache[key];
    if (d && d._mediaType === "tv") {
      entry.totalSeasons = d.number_of_seasons || entry.totalSeasons;
      entry.totalEpisodes = d.number_of_episodes || entry.totalEpisodes;
      saveData();
    }
    if (uiState.watch && uiState.watch.key === key) renderApp();
  }).catch(() => {});
  if (media.mediaType === "tv") loadWatchSeason(key, uiState.watch.season);
}

function loadWatchSeason(key, season) {
  fetchSeason(key, season).then(() => {
    if (uiState.watch && uiState.watch.key === key) renderApp();
  }).catch(() => {});
}

function closeWatch() {
  uiState.watch = null;
  uiState.tab = previousTab || "home";
  exitFullscreenSafe();
  renderApp();
}

function renderWatchView() {
  const w = uiState.watch;
  const entry = getEntry(w.key);
  const media = resolveMedia(w.key);
  if (!entry || !media) { return `<div class="state-msg">Title unavailable. <button type="button" class="btn" data-action="close-watch">Back</button></div>`; }
  const isTv = media.mediaType === "tv";
  const detail = detailCache[w.key];
  const streamUrl = buildStreamUrl(entry, w.provider, w.season, w.episode);
  const providerBtns = STREAM_PROVIDERS.map((p, i) =>
    `<button type="button" class="seg ${i === w.provider ? "is-active" : ""}" data-action="set-provider" data-index="${i}">${p.name}</button>`
  ).join("");

  const seasons = detail && isTv ? detail.number_of_seasons : (entry.totalSeasons || 1);
  const seasonOptions = isTv ? Array.from({ length: Math.max(1, seasons) }).map((_, i) =>
    `<option value="${i + 1}" ${w.season === i + 1 ? "selected" : ""}>Season ${i + 1}</option>`).join("") : "";

  const season = seasonCache[`${w.key}-${w.season}`];
  const episodeList = isTv ? renderEpisodeList(season, w) : "";

  const recs = (detail && detail.recommendations && detail.recommendations.results || [])
    .map((r) => normalizeMedia(r, r.media_type || media.mediaType)).filter(Boolean).filter((m) => m.key !== w.key).slice(0, 12);

  const heading = isTv ? `S${w.season} · E${w.episode}${currentEpisodeName(season, w.episode) ? ` — ${currentEpisodeName(season, w.episode)}` : ""}` : (media.year ? `${media.year}` : "");

  return `<div class="watch">
    <div class="watch__topbar">
      <button type="button" class="watch__back" data-action="close-watch">‹ Back</button>
      <div class="watch__heading"><span class="watch__title">${escapeHtml(media.title)}</span><span class="watch__sub">${escapeHtml(heading)}</span></div>
      <div class="watch__top-actions">
        <button type="button" class="icon-btn" data-action="toggle-fullscreen" title="Fullscreen" aria-label="Fullscreen">⛶</button>
        <button type="button" class="icon-btn" data-action="open-detail" data-key="${w.key}" title="Details" aria-label="Details">ⓘ</button>
      </div>
    </div>
    <div class="watch__stage">
      <div class="watch__player" id="watchPlayer">
        ${streamUrl
          ? `<iframe id="streamFrame" src="${streamUrl}" title="Player" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="origin"></iframe><div class="watch__loading" id="watchLoading"><div class="spinner"></div><span>Loading ${escapeHtml(STREAM_PROVIDERS[w.provider].name)}…</span></div>`
          : `<div class="watch__loading">Preparing stream…</div>`}
      </div>
      <div class="watch__controls">
        <div class="watch__providers"><span class="watch__label">Source</span><div class="seg-group">${providerBtns}</div></div>
        <div class="watch__provider-hint">If a source won't play, switch to another. Auto-fallback runs after 30s.</div>
      </div>
    </div>
    ${isTv ? `<div class="watch__episodes">
      <div class="watch__episodes-head">
        <select id="seasonSelect" class="select">${seasonOptions}</select>
        <div class="watch__ep-nav">
          <button type="button" class="btn btn--ghost btn--sm" data-action="prev-episode">‹ Prev</button>
          <button type="button" class="btn btn--ghost btn--sm" data-action="next-episode">Next ›</button>
        </div>
      </div>
      ${episodeList}
    </div>` : `<div class="watch__movie-actions">
      <button type="button" class="btn ${entry.watched ? "btn--ghost" : "btn--play"}" data-action="mark-watched">${entry.watched ? "✓ Watched" : "Mark as watched"}</button>
      <button type="button" class="btn btn--ghost" data-action="toggle-list" data-key="${w.key}">${entry ? "✓ In list" : "＋ My List"}</button>
    </div>`}
    ${recs.length ? `<div class="watch__recs"><h2 class="row__title">More like this</h2><div class="grid grid--compact">${recs.map(renderCard).join("")}</div></div>` : ""}
  </div>`;
}

function currentEpisodeName(season, episode) {
  if (!season || !season.episodes) return "";
  const ep = season.episodes.find((e) => e.episode_number === episode);
  return ep ? ep.name : "";
}

function renderEpisodeList(season, w) {
  if (!season || !season.episodes) return `<div class="ep-loading">Loading episodes…</div>`;
  return `<div class="ep-list">${season.episodes.map((ep) => {
    const active = ep.episode_number === w.episode ? "is-active" : "";
    const still = ep.still_path ? img(ep.still_path, "w300") : "";
    return `<button type="button" class="ep ${active}" data-action="select-episode" data-episode="${ep.episode_number}">
      <div class="ep__thumb">${still ? `<img loading="lazy" src="${still}" alt="">` : `<div class="ep__noimg">${ep.episode_number}</div>`}<span class="ep__num">E${ep.episode_number}</span></div>
      <div class="ep__info"><div class="ep__name">${escapeHtml(ep.name || `Episode ${ep.episode_number}`)}</div>
      <div class="ep__meta">${ep.runtime ? formatRuntime(ep.runtime) : ""}${ep.air_date ? ` · ${ep.air_date}` : ""}</div>
      ${ep.overview ? `<div class="ep__overview">${escapeHtml(ep.overview.slice(0, 130))}${ep.overview.length > 130 ? "…" : ""}</div>` : ""}</div>
    </button>`;
  }).join("")}</div>`;
}

/* watch actions */
function setProvider(index) {
  if (!uiState.watch) return;
  uiState.watch.provider = clamp(index, 0, STREAM_PROVIDERS.length - 1);
  uiState.watch.streamLoaded = false;
  renderApp();
}
function switchEpisode(episode) {
  const w = uiState.watch; if (!w) return;
  w.episode = Math.max(1, episode);
  w.streamLoaded = false;
  const entry = getEntry(w.key);
  if (entry) { entry.season = w.season; entry.episode = w.episode; entry.lastWatched = Date.now(); pushSession(entry); saveData(); }
  renderApp();
}
function switchSeason(season) {
  const w = uiState.watch; if (!w) return;
  w.season = Math.max(1, season); w.episode = 1; w.streamLoaded = false;
  const entry = getEntry(w.key);
  if (entry) { entry.season = w.season; entry.episode = 1; saveData(); }
  loadWatchSeason(w.key, w.season);
  renderApp();
}
function nextEpisode() {
  const w = uiState.watch; if (!w) return;
  const season = seasonCache[`${w.key}-${w.season}`];
  const max = season && season.episodes ? season.episodes.length : Infinity;
  if (w.episode < max) { switchEpisode(w.episode + 1); }
  else { switchSeason(w.season + 1); }
}
function prevEpisode() {
  const w = uiState.watch; if (!w) return;
  if (w.episode > 1) switchEpisode(w.episode - 1);
  else if (w.season > 1) switchSeason(w.season - 1);
}
function markMovieWatched() {
  const w = uiState.watch; if (!w) return;
  const entry = getEntry(w.key); if (!entry) return;
  entry.watched = !entry.watched;
  if (entry.watched) { entry.status = "completed"; entry.completedAt = Date.now(); pushSession(entry); }
  saveData(); renderApp();
  showToast(entry.watched ? "Marked as watched." : "Marked as unwatched.", "success");
}
function pushSession(entry) {
  const today = Date.now();
  entry.sessionLog = entry.sessionLog || [];
  entry.sessionLog.push(today);
  if (entry.sessionLog.length > 500) entry.sessionLog = entry.sessionLog.slice(-500);
}

/* fullscreen helpers */
function isFullscreen() { return Boolean(document.fullscreenElement); }
function toggleFullscreen() {
  const el = document.getElementById("watchPlayer");
  if (!el) return;
  if (isFullscreen()) { document.exitFullscreen && document.exitFullscreen().catch(() => {}); }
  else { el.requestFullscreen && el.requestFullscreen().catch(() => {}); }
}
function exitFullscreenSafe() { if (isFullscreen() && document.exitFullscreen) document.exitFullscreen().catch(() => {}); }

/* --------------------------------------------------------------- stats */
function renderStats() {
  const entries = getEntries();
  if (!entries.length) return `<div class="catalog"><div class="page-hero"><h1>Your Stats</h1></div><div class="state-msg"><h2>No data yet</h2><p>Track some titles to see your stats.</p></div></div>`;
  const byStatus = {};
  STATUS_OPTIONS.forEach((s) => byStatus[s] = 0);
  let movies = 0, series = 0, rated = 0, ratingSum = 0, episodesWatched = 0;
  const genreCount = {};
  const dayMap = {};
  entries.forEach((e) => {
    if (byStatus[e.status] !== undefined) byStatus[e.status]++;
    if (e.mediaType === "tv") series++; else movies++;
    if (e.rating) { rated++; ratingSum += e.rating; }
    if (e.mediaType === "tv") episodesWatched += Math.max(0, (e.season - 1) * 10 + (e.episode - 1));
    e.genreIds.forEach((g) => { const n = genreName(g); if (n) genreCount[n] = (genreCount[n] || 0) + 1; });
    (e.sessionLog || []).forEach((ts) => { const d = new Date(ts).toISOString().slice(0, 10); dayMap[d] = (dayMap[d] || 0) + 1; });
  });
  const completed = byStatus.completed || 0;
  const avgRating = rated ? (ratingSum / rated).toFixed(1) : "—";
  const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxGenre = topGenres.length ? topGenres[0][1] : 1;

  const statCards = [
    ["Total titles", entries.length], ["Movies", movies], ["Series", series],
    ["Completed", completed], ["Avg rating", avgRating], ["Episodes watched", episodesWatched],
  ];

  return `<div class="catalog stats">
    <div class="page-hero"><h1>Your Stats</h1><p>Built entirely from your local library.</p></div>
    <div class="stat-grid">${statCards.map(([l, v]) => `<div class="stat-card"><div class="stat-card__value">${v}</div><div class="stat-card__label">${l}</div></div>`).join("")}</div>
    <div class="stats__cols">
      <div class="stats__panel"><h2 class="row__title">Status breakdown</h2>${renderDonut(byStatus, entries.length)}</div>
      <div class="stats__panel"><h2 class="row__title">Top genres</h2><div class="bars">${topGenres.map(([g, c]) => `<div class="bar"><span class="bar__label">${escapeHtml(g)}</span><span class="bar__track"><span class="bar__fill" style="width:${Math.round((c / maxGenre) * 100)}%"></span></span><span class="bar__count">${c}</span></div>`).join("") || "<p>No genres yet.</p>"}</div></div>
    </div>
    <div class="stats__panel"><h2 class="row__title">Watch activity</h2>${renderHeatmap(dayMap)}</div>
  </div>`;
}

const DONUT_COLORS = { watching: "#e50914", completed: "#22c55e", watchlist: "#3b82f6", paused: "#f59e0b", dropped: "#6b7280" };
function renderDonut(byStatus, total) {
  if (!total) return "<p>No data.</p>";
  let offset = 0;
  const r = 70, c = 2 * Math.PI * r;
  const segs = STATUS_OPTIONS.filter((s) => byStatus[s]).map((s) => {
    const frac = byStatus[s] / total;
    const len = frac * c;
    const seg = `<circle r="${r}" cx="90" cy="90" fill="none" stroke="${DONUT_COLORS[s]}" stroke-width="22" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 90 90)"></circle>`;
    offset += len;
    return seg;
  }).join("");
  const legend = STATUS_OPTIONS.filter((s) => byStatus[s]).map((s) => `<div class="legend"><span class="legend__dot" style="background:${DONUT_COLORS[s]}"></span>${STATUS_LABELS[s]} <b>${byStatus[s]}</b></div>`).join("");
  return `<div class="donut-wrap"><svg viewBox="0 0 180 180" class="donut">${segs}<text x="90" y="84" class="donut__num">${total}</text><text x="90" y="104" class="donut__cap">titles</text></svg><div class="legends">${legend}</div></div>`;
}

function renderHeatmap(dayMap) {
  const weeks = 17, cols = [];
  const today = new Date();
  const start = new Date(today); start.setDate(today.getDate() - weeks * 7 + 1);
  let max = 1;
  Object.values(dayMap).forEach((v) => { if (v > max) max = v; });
  for (let w = 0; w < weeks; w++) {
    const cells = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start); date.setDate(start.getDate() + w * 7 + d);
      if (date > today) { cells.push(`<span class="hm-cell hm-cell--empty"></span>`); continue; }
      const key = date.toISOString().slice(0, 10);
      const count = dayMap[key] || 0;
      const level = count === 0 ? 0 : count >= max * 0.75 ? 4 : count >= max * 0.5 ? 3 : count >= max * 0.25 ? 2 : 1;
      cells.push(`<span class="hm-cell hm-cell--${level}" title="${key}: ${count}"></span>`);
    }
    cols.push(`<div class="hm-col">${cells.join("")}</div>`);
  }
  return `<div class="heatmap">${cols.join("")}</div><div class="heatmap__legend">Less <span class="hm-cell hm-cell--0"></span><span class="hm-cell hm-cell--1"></span><span class="hm-cell hm-cell--2"></span><span class="hm-cell hm-cell--3"></span><span class="hm-cell hm-cell--4"></span> More</div>`;
}

/* --------------------------------------------------------------- actions */
function toggleList(key) {
  const media = resolveMedia(key);
  if (!media) return;
  const entry = getEntry(key);
  if (entry) {
    delete userData[key];
    saveData();
    showToast(`Removed “${media.title}” from your list.`, "info");
  } else {
    ensureEntry(media);
    showToast(`Added “${media.title}” to your list.`, "success");
  }
  renderApp();
}
function setStatus(key, status) {
  const media = resolveMedia(key);
  if (!media) return;
  const entry = getEntry(key) || ensureEntry(media);
  entry.status = STATUS_OPTIONS.includes(status) ? status : entry.status;
  if (status === "completed") { entry.completedAt = Date.now(); if (entry.mediaType === "movie") entry.watched = true; }
  entry.lastWatched = entry.lastWatched || Date.now();
  saveData(); renderApp();
}
function setRating(key, rating) {
  const media = resolveMedia(key);
  if (!media) return;
  const entry = getEntry(key) || ensureEntry(media);
  entry.rating = clamp(rating, 0, 10);
  saveData(); renderApp();
}
function removeFromLibrary(key) {
  const entry = getEntry(key);
  if (!entry) return;
  delete userData[key];
  saveData();
  showToast("Removed from your list.", "info");
  renderApp();
}

/* --------------------------------------------------------------- import/export */
function exportData() {
  const payload = { app: APP_NAME, schema: 1, exportedAt: Date.now(), library: userData };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cinevault-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  showToast("Library exported.", "success");
}
function importData(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const parsed = safeParse(reader.result);
    const lib = parsed && (parsed.library || parsed);
    if (!lib || typeof lib !== "object") { showToast("That file isn't a valid CineVault backup.", "error"); return; }
    const incoming = normalizeLibrary(lib);
    let added = 0;
    Object.entries(incoming).forEach(([k, v]) => { if (!userData[k]) added++; userData[k] = v; });
    saveData();
    showToast(`Imported ${formatCount(Object.keys(incoming).length, "title")} (${added} new).`, "success");
    renderApp();
  };
  reader.readAsText(file);
}

/* --------------------------------------------------------------- toast */
function showToast(message, type = "info") {
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.innerHTML = `<div class="toast__title">${escapeHtml(TOAST_TITLES[type] || "Info")}</div><div class="toast__msg">${escapeHtml(message)}</div>`;
  toastZone.appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-in"));
  setTimeout(() => { el.classList.remove("is-in"); setTimeout(() => el.remove(), 300); }, 3200);
}

/* --------------------------------------------------------------- render */
function renderCurrentPage() {
  switch (uiState.tab) {
    case "home": return renderCatalogPage("home", "Home");
    case "movies": return renderCatalogPage("movies", "Movies", "Blockbusters, classics, and everything between.");
    case "tv": return renderCatalogPage("tv", "TV Shows", "Bingeable series across every genre.");
    case "animation": return renderCatalogPage("animation", "Animation", "Animated movies and series — for all ages.");
    case "mylist": return renderMyList();
    case "search": return renderSearch();
    case "stats": return renderStats();
    default: return renderCatalogPage("home", "Home");
  }
}

function renderApp() {
  const parts = [];
  if (uiState.watch) {
    parts.push(renderWatchView());
  } else {
    parts.push(renderTopNav());
    parts.push(`<main class="main">${renderCurrentPage()}</main>`);
    parts.push(renderMobileNav());
  }
  if (uiState.overlay) parts.push(renderOverlay());
  app.innerHTML = parts.join("");
  afterRender();
}

function afterRender() {
  document.body.classList.toggle("no-scroll", Boolean(uiState.overlay));
  if (!uiState.watch && !uiState.overlay && document.getElementById("hero")) startHeroAuto();
  else clearInterval(heroState.timer);

  document.querySelectorAll("[data-row-track]").forEach((el) => syncScrollButtons(el.id));
  if (uiState.watch) setupWatchPlayer();

  // keep search input focused while typing
  if (uiState.search.focus && uiState.tab === "search" && !uiState.watch && !uiState.overlay) {
    const input = document.getElementById("navSearchInput");
    if (input && document.activeElement !== input) {
      input.focus();
      const v = input.value; input.value = ""; input.value = v;
    }
  }
}

function syncScrollButtons(trackId) {
  const vp = document.getElementById(trackId);
  if (!vp) return;
  const head = vp.parentElement && vp.parentElement.querySelector(".row__controls");
  if (!head) return;
  const prev = head.querySelector('[data-dir="prev"]');
  const next = head.querySelector('[data-dir="next"]');
  const maxScroll = vp.scrollWidth - vp.clientWidth - 4;
  if (prev) prev.disabled = vp.scrollLeft <= 2;
  if (next) next.disabled = vp.scrollLeft >= maxScroll;
}
function scrollRow(trackId, dir) {
  const vp = document.getElementById(trackId);
  if (!vp) return;
  vp.scrollBy({ left: dir === "next" ? vp.clientWidth * 0.85 : -vp.clientWidth * 0.85, behavior: "smooth" });
  setTimeout(() => syncScrollButtons(trackId), 350);
}

function setupWatchPlayer() {
  const frame = document.getElementById("streamFrame");
  const loading = document.getElementById("watchLoading");
  if (!frame) return;
  clearTimeout(providerTimer);
  const onLoad = () => {
    if (uiState.watch) uiState.watch.streamLoaded = true;
    if (loading) loading.style.display = "none";
    clearTimeout(providerTimer);
  };
  frame.addEventListener("load", onLoad, { once: true });
  // auto-fallback to next provider if nothing loads
  providerTimer = setTimeout(() => {
    if (uiState.watch && !uiState.watch.streamLoaded && uiState.watch.provider < STREAM_PROVIDERS.length - 1) {
      showToast(`${STREAM_PROVIDERS[uiState.watch.provider].name} timed out — trying ${STREAM_PROVIDERS[uiState.watch.provider + 1].name}.`, "info");
      setProvider(uiState.watch.provider + 1);
    }
  }, 30000);
}

/* --------------------------------------------------------------- events */
function switchTab(tab) {
  if (!NAV_LABELS[tab]) return;
  uiState.tab = tab;
  uiState.search.focus = tab === "search";
  window.scrollTo({ top: 0 });
  renderApp();
  if (["home", "movies", "tv", "animation"].includes(tab)) loadPage(tab);
}

function closeOverlay() { uiState.overlay = null; renderApp(); }

function handleClick(event) {
  const trigger = event.target.closest("[data-action]");
  if (!trigger) return;
  const action = trigger.dataset.action;
  const key = trigger.dataset.key;

  // overlay backdrop click closes; clicks inside modal stop here
  if (action === "close-overlay") {
    if (event.target.closest("[data-stop]") && !event.target.matches(".modal__close") && !event.target.closest(".modal__close")) {
      if (!event.target.matches(".overlay")) return;
    }
    closeOverlay(); return;
  }

  switch (action) {
    case "tab": switchTab(trigger.dataset.tab); break;
    case "open-detail": event.stopPropagation(); openDetail(key); break;
    case "open-watch": event.stopPropagation(); openWatch(key); break;
    case "close-watch": closeWatch(); break;
    case "toggle-list": event.stopPropagation(); toggleList(key); break;
    case "set-status": setStatus(key, trigger.dataset.status); break;
    case "set-rating": setRating(key, Number(trigger.dataset.rating)); break;
    case "remove": removeFromLibrary(key); break;
    case "open-settings": openSettings(); break;
    case "save-settings": handleSaveSettings(); break;
    case "export": exportData(); break;
    case "retry-load": catalog[uiState.tab] && (catalog[uiState.tab].status = "idle"); loadPage(uiState.tab); break;
    case "set-library-filter": uiState.library.filter = trigger.dataset.filter; renderApp(); break;
    case "play-trailer": if (uiState.overlay) { uiState.overlay.trailer = true; renderApp(); } break;
    case "stop-trailer": if (uiState.overlay) { uiState.overlay.trailer = false; renderApp(); } break;
    case "set-provider": setProvider(Number(trigger.dataset.index)); break;
    case "select-episode": switchEpisode(Number(trigger.dataset.episode)); break;
    case "next-episode": nextEpisode(); break;
    case "prev-episode": prevEpisode(); break;
    case "mark-watched": markMovieWatched(); break;
    case "toggle-fullscreen": toggleFullscreen(); break;
    case "row-scroll": scrollRow(trigger.dataset.target, trigger.dataset.dir); break;
    case "hero-prev": clearInterval(heroState.timer); goHero(heroState.current - 1); startHeroAuto(); break;
    case "hero-next": clearInterval(heroState.timer); goHero(heroState.current + 1); startHeroAuto(); break;
    case "hero-dot": clearInterval(heroState.timer); goHero(Number(trigger.dataset.index)); startHeroAuto(); break;
  }
}

function handleSaveSettings() {
  const regionEl = document.getElementById("setRegion");
  const autoEl = document.getElementById("setAutoNext");
  const themeEl = document.getElementById("setTheme");
  settings.region = regionEl ? regionEl.value : settings.region;
  settings.autoNext = autoEl ? autoEl.checked : settings.autoNext;
  settings.theme = themeEl && themeEl.checked ? "light" : "dark";
  saveSettings();
  TMDB_API_KEY = HARDCODED_TMDB_KEY || settings.tmdbKey || "";
  document.documentElement.setAttribute("data-theme", settings.theme);
  closeOverlay();
  showToast("Settings saved.", "success");
  if (hasKey()) {
    // reset caches and reload current/home page
    Object.keys(catalog).forEach((p) => { catalog[p].status = "idle"; catalog[p].rows = []; catalog[p].recRows = []; });
    loadGenres();
    loadPage(["home", "movies", "tv", "animation"].includes(uiState.tab) ? uiState.tab : "home");
    if (!["home", "movies", "tv", "animation"].includes(uiState.tab)) renderApp();
  }
}

function handleInput(event) {
  const t = event.target;
  if (t.id === "navSearchInput") {
    uiState.search.focus = true;
    if (uiState.tab !== "search") { uiState.tab = "search"; renderApp(); }
    scheduleSearch(t.value);
  } else if (t.id === "librarySearchInput") {
    uiState.library.query = t.value;
    const grid = document.querySelector(".mylist .grid") || document.querySelector(".mylist .state-msg");
    // light re-render of just the list
    renderApp();
  }
}

function handleChange(event) {
  const t = event.target;
  if (t.id === "librarySortSelect") { uiState.library.sort = t.value; renderApp(); }
  else if (t.id === "seasonSelect") { switchSeason(Number(t.value)); }
  else if (t.id === "importFile") { importData(event); }
}

function handleFocusOut(event) {
  if (event.target.id === "notesField") {
    const key = event.target.dataset.key;
    const entry = getEntry(key);
    if (entry) { entry.notes = event.target.value; saveData(); }
  }
}

function handleKeydown(event) {
  if (event.key === "Escape") {
    if (uiState.overlay) { closeOverlay(); return; }
    if (uiState.watch) { closeWatch(); return; }
  }
  // card activation via keyboard
  if ((event.key === "Enter" || event.key === " ") && document.activeElement && document.activeElement.classList && document.activeElement.classList.contains("card")) {
    event.preventDefault();
    openDetail(document.activeElement.dataset.key);
    return;
  }
  if (!uiState.watch) return;
  const media = resolveMedia(uiState.watch.key);
  if (event.target.matches("input, textarea, select")) return;
  if (event.key === "ArrowRight" || (event.shiftKey && event.key.toLowerCase() === "n")) { if (media && media.mediaType === "tv") { event.preventDefault(); nextEpisode(); } }
  else if (event.key === "ArrowLeft") { if (media && media.mediaType === "tv") { event.preventDefault(); prevEpisode(); } }
  else if (event.shiftKey && event.key.toLowerCase() === "p") { event.preventDefault(); setProvider((uiState.watch.provider + 1) % STREAM_PROVIDERS.length); }
  else if (event.key.toLowerCase() === "f") { event.preventDefault(); toggleFullscreen(); }
}

/* Provider postMessage: best-effort auto-next when a player reports "ended". */
function handleMessage(event) {
  if (!uiState.watch || !settings.autoNext) return;
  const data = event.data;
  if (!data || typeof data !== "object") return;
  const type = data.type || data.event || "";
  const isEnded = /ended|complete|finish/i.test(String(type)) || (data.data && /ended/i.test(String(data.data.event || "")));
  if (isEnded) {
    const media = resolveMedia(uiState.watch.key);
    if (media && media.mediaType === "tv") nextEpisode();
    else markMovieWatched();
  }
}

/* --------------------------------------------------------------- init */
function init() {
  loadSettings();
  loadData();
  app.addEventListener("click", handleClick);
  app.addEventListener("input", handleInput);
  app.addEventListener("change", handleChange);
  app.addEventListener("focusout", handleFocusOut);
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("message", handleMessage);
  window.addEventListener("resize", () => document.querySelectorAll("[data-row-track]").forEach((el) => syncScrollButtons(el.id)));
  renderApp();
  if (hasKey()) { loadGenres(); loadPage("home"); }
}

if (typeof document !== "undefined" && app) init();

/* Exports for tests (no-op in browser) */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { normalizeEntry, normalizeLibrary, normalizeMedia, STREAM_PROVIDERS, buildStreamUrl, STATUS_OPTIONS };
}
