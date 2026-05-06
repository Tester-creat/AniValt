/* RESET */
const STORAGE_KEY = "anivault_v2";
const NAV_TABS = ["home", "library", "browse", "search", "stats"];
const STATUS_OPTIONS = [
  "watching",
  "completed",
  "queued",
  "plan-to-watch",
  "dropped",
  "paused",
  "untracked",
];
const STATUS_LABELS = {
  watching: "Watching",
  completed: "Completed",
  queued: "In Queue",
  "plan-to-watch": "Plan to Watch",
  dropped: "Dropped",
  paused: "Paused",
  untracked: "Untracked",
};
const TOAST_TITLES = {
  success: "Saved",
  error: "Something went wrong",
  info: "AniVault",
};
const BROWSE_GENRES = [
  "Action", "Adventure", "Cars", "Comedy", "Dementia", "Demons", "Drama", "Dub", "Ecchi", "Fantasy", "Game", "Harem", "Hentai", "Historical", "Horror", "Josei", "Kids", "Magic", "Martial Arts", "Mecha", "Military", "Music", "Mystery", "Parody", "Police", "Psychological", "Romance", "Samurai", "School", "Sci-Fi", "Seinen", "Shoujo", "Shoujo Ai", "Shounen", "Shounen Ai", "Slice of Life", "Space", "Sports", "Super Power", "Supernatural", "Thriller", "Vampire", "Yaoi", "Yuri", "Isekai", "Mahou Shoujo", "Gourmet", "Workplace", "Suspense", "Noir", "Fortune", "Cyberpunk", "CGDCT", "Idol", "Musical", "Documentary", "News", "Cooking", "pets", "Dancing", "Vehicles", "K两块", "Soap", "Thriller", "Practical", "Gender Bender", "Harem", "Reverse Harem", "Otaku", "Cultural", "Educational", "Engineering", "Fillery"
];
const GENRE_ALPHABET = {
  A: ["Action", "Adventure", "Adult", "Animation"],
  C: ["Cars", "Comedy", "Cooking"],
  D: ["Dementia", "Demons", "Documentary", "Drama", "Dub"],
  E: ["Ecchi"],
  F: ["Fantasy", "Food"],
  G: ["Game", "Gourmet"],
  H: ["Harem", "Hentai", "Historical", "Horror"],
  I: ["Idol", "Isekai"],
  J: ["Josei"],
  K: ["Kids"],
  M: ["Magic", "Mahou Shoujo", "Martial Arts", "Mecha", "Military", "Music", "Mystery"],
  P: ["Parody", "Police", "Psychological"],
  R: ["Romance"],
  S: ["Samurai", "School", "Sci-Fi", "Seinen", "Shoujo", "Shoujo Ai", "Shounen", "Shounen Ai", "Slice of Life", "Space", "Sports", "Super Power", "Supernatural"],
  T: ["Thriller"],
  V: ["Vampire"],
  Y: ["Yaoi", "Yuri"],
};

const SEARCH_QUERY = `query ($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, type: ANIME, sort: [SEARCH_MATCH]) {
      id title { romaji english } coverImage { large } bannerImage
      episodes genres seasonYear averageScore status
    }
  }
}`;

const BROWSE_QUERY = `query (
  $page: Int, $perPage: Int, $sort: [MediaSort],
  $season: MediaSeason, $seasonYear: Int, $genre: String
) {
  Page(page: $page, perPage: $perPage) {
    media(
      type: ANIME, sort: $sort, season: $season,
      seasonYear: $seasonYear, genre: $genre
    ) {
      id title { romaji english } coverImage { large } bannerImage
      episodes genres seasonYear averageScore status
    }
  }
}`;

const EPISODE_DATA_QUERY = `query ($id: Int) {
  Media(id: $id) { duration streamingEpisodes { title thumbnail } }
}`;

const FRANCHISE_RELATIONS_QUERY = `query ($id: Int) {
  Media(id: $id, type: ANIME) {
    title { romaji }
    relations { edges {
      relationType
      node {
        id title { romaji english } coverImage { large }
        type format seasonYear startDate { year month day }
        episodes status averageScore
      }
    } }
  }
}`;

const WATCH_ORDER_RELATIONS = new Set([
  "PREQUEL", "SEQUEL", "SIDE_STORY", "ALTERNATIVE",
  "SPIN_OFF", "PARENT", "COMPILATION", "CONTAINS"
]);

const WATCH_ORDER_PRIORITY = {
  PREQUEL: 1, PARENT: 2, current: 3, SEQUEL: 4,
  SIDE_STORY: 5, SPIN_OFF: 6, CONTAINS: 7,
  COMPILATION: 8, ALTERNATIVE: 9
};

let userData = {};
let currentTab = "home";
let previousTab = "home";
let currentWatchId = null;
let currentEpisode = 1;
let currentEpisodeGroupIndex = 0;
const episodeCache = {};
const franchiseCache = {};
let currentWatchOrderSort = "recommended";
let watchViewRequestToken = 0;

const uiState = {
  theme: "dark",
  accentColor: "#7c3aed",
  compactMode: false,
  reducedMotion: false,
  navMenuOpen: false,
  navSearchOpen: false,
  focusInputId: "",
  inlineStatusPicker: null,
  volume: 1.0,
  library: { filter: "all", sort: "default", query: "" },
  browse: {
    mode: "seasonal", genre: "Action", title: "This Season",
    subtitle: "", results: [], loading: false, error: "",
    requestId: 0, initialized: false, page: 1, hasMore: true
  },
  search: { query: "", results: [], loading: false, error: "", requestId: 0, filters: { yearMin: 0, yearMax: 0, scoreMin: 0, episodesMin: 0, status: "" } },
  watch: {
    forceFallback: false, sidebarCollapsed: false,
    streamLoaded: false, lastEndedKey: "", episodeGroupIndex: 0,
    currentProvider: 0
  },
  overlay: null
};

let searchTimer = 0;
let streamFallbackTimer = 0;
let completionReturnTimer = 0;

/* FULLSCREEN API HELPERS */
function isFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement
  );
}
function requestFullscreenOn(element) {
  if (!element) return;
  const fn = element.requestFullscreen || element.webkitRequestFullscreen || element.mozRequestFullScreen;
  if (fn) fn.call(element).catch(() => {});
}
function exitFullscreenSafe() {
  const fn = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen;
  if (fn && isFullscreen()) fn.call(document).catch(() => {});
}
function toggleWatchFullscreen() {
  const container = document.querySelector(".watch-player__frame");
  if (!container) return;
  if (isFullscreen()) exitFullscreenSafe(); else requestFullscreenOn(container);
}

const app = document.getElementById("app");
const toastZone = document.getElementById("toastZone");

/* TOKENS */
function normalizeEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const id = Number(entry.id || entry.anilistId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const status = STATUS_OPTIONS.includes(entry.status) ? entry.status : "untracked";
  const episodes = Math.max(0, Number(entry.episodes) || 0);
  const episodesWatched = Math.max(0, Number(entry.episodesWatched) || 0);
  return {
    id,
    title: String(entry.title || "Untitled"),
    titleEnglish: String(entry.titleEnglish || ""),
    cover: String(entry.cover || ""),
    banner: String(entry.banner || ""),
    episodes,
    status,
    episodesWatched,
    language: entry.language === "dub" ? "dub" : "sub",
    rating: clamp(Number(entry.rating) || 0, 0, 10),
    dateAdded: Number(entry.dateAdded) || Date.now(),
    lastWatched: Number(entry.lastWatched) || 0,
    completedAt: Number(entry.completedAt) || 0,
    notes: String(entry.notes || ""),
    genres: Array.isArray(entry.genres) ? entry.genres.map(String) : [],
    year: Number(entry.year) || 0,
    anilistId: Number(entry.anilistId || id) || id,
    sessionLog: Array.isArray(entry.sessionLog) ? entry.sessionLog.map((item) => Number(item) || 0).filter(Boolean) : [],
    averageScore: Number(entry.averageScore) || 0
  };
}

function normalizeLibrary(raw) {
  const next = {};
  if (!raw || typeof raw !== "object") {
    next.__meta = { theme: "dark" };
    return next;
  }
  Object.entries(raw).forEach(([key, value]) => {
    if (key === "__meta") return;
    const normalized = normalizeEntry(value);
    if (normalized) next[String(normalized.id)] = normalized;
  });
  next.__meta = {
    theme: raw.__meta && raw.__meta.theme === "light" ? "light" : "dark"
  };
  return next;
}

function isAnimeEntry(value) {
  return Boolean(value && typeof value === "object" && Number.isFinite(Number(value.id)));
}
function getAnimeEntries() { return Object.values(userData).filter(isAnimeEntry); }
function getEntry(id) { return userData[String(id)] || null; }
function getDisplayTitle(entry) { return entry.titleEnglish || entry.title; }
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
function getSeasonFromDate(date = new Date()) {
  const month = date.getMonth();
  if (month <= 2) return "WINTER";
  if (month <= 5) return "SPRING";
  if (month <= 8) return "SUMMER";
  return "FALL";
}
function getStatusClass(status) {
  if (status === "paused") return "badge badge--paused";
  return `badge badge--${status}`;
}
function getPlayableEpisodeCount(entry) {
  /* FIX #6: Use total episode count from AniList. Fall back to episodesWatched+1 so
     at minimum the user can access the next unwatched episode. For ongoing series
     (episodes===0 or null) use a sensible fallback so the list isn't stuck at 1. */
  const total = Number(entry.episodes) || 0;
  const watched = Number(entry.episodesWatched) || 0;
  if (total > 0) return total;
  /* No total known: give at least watched+10 so user can continue exploring */
  return Math.max(1, watched + 10);
}
function getRatingLabel(score) {
  const labels = {
    1: "Appalling", 2: "Horrible", 3: "Very Bad", 4: "Bad", 5: "Average",
    6: "Fine", 7: "Good", 8: "Very Good", 9: "Great", 10: "Masterpiece"
  };
  return labels[score] || "Rate this anime";
}
function getRatingColor(score) {
  if (score <= 0) return "";
  if (score <= 2) return "#ef4444";
  if (score <= 4) return "#f97316";
  if (score <= 6) return "#eab308";
  if (score <= 8) return "#22c55e";
  return "#a855f7";
}
function getStatusChipHtml(status) {
  return `<span class="${getStatusClass(status)} in-library-chip">&#10003; In Library - ${escapeHtml(STATUS_LABELS[status])}</span>`;
}
function getEntryByAnimeId(id) {
  return Object.values(userData).find((entry) => isAnimeEntry(entry) && Number(entry.id) === Number(id)) || null;
}
function parseEpisodeTitle(title) {
  const raw = String(title || "").trim();
  if (!raw.toLowerCase().startsWith("episode")) return null;
  const [left, ...rest] = raw.split(" - ");
  const number = Number.parseInt(left.replace(/episode\s*/i, "").trim(), 10);
  if (!Number.isFinite(number)) return null;
  return { number, name: rest.join(" - ").trim() || `Episode ${number}` };
}
function getDateWeight(startDate) {
  if (!startDate || !startDate.year) return Number.POSITIVE_INFINITY;
  const year = Number(startDate.year) || 0;
  const month = Number(startDate.month) || 0;
  const day = Number(startDate.day) || 0;
  return year * 10000 + month * 100 + day;
}
function formatRelationLabel(item) {
  if (item.relationType === "current") return "Current";
  if (item.relationType === "SIDE_STORY") return "Side story";
  if (item.relationType === "SPIN_OFF") return "Spin off";
  return String(item.relationType || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (match) => match.toUpperCase());
}
function getFormatBadgeColor(format) {
  if (format === "MOVIE") return "var(--accent2)";
  if (format === "OVA" || format === "ONA" || format === "SPECIAL") return "var(--badge-queued)";
  return "var(--badge-watching)";
}
function getProgressPercent(entry) {
  if (!entry.episodes) return 0;
  return clamp(Math.round((entry.episodesWatched / entry.episodes) * 100), 0, 100);
}
function formatEpisodeLabel(entry) { return `Episode ${entry.episodesWatched || 0} of ${entry.episodes || "?"}`; }
function formatDate(timestamp) {
  if (!timestamp) return "Never";
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function formatCount(value, noun) { return `${value} ${noun}${value === 1 ? "" : "s"}`; }
function filterByText(entries, query) {
  const value = query.trim().toLowerCase();
  if (!value) return entries;
  return entries.filter((entry) => {
    const haystack = [entry.title, entry.titleEnglish, entry.notes, ...(entry.genres || [])].join(" ").toLowerCase();
    return haystack.includes(value);
  });
}

/* LAYOUT */
const VOLUME_KEY = "anivault_volume";
const SETTINGS_KEY = "anivault_settings";
function loadData() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    userData = normalizeLibrary(raw);
  } catch (error) {
    userData = normalizeLibrary({});
    showToast("Saved data could not be read. AniVault started with an empty library.", "error");
  }
  uiState.theme = userData.__meta && userData.__meta.theme === "light" ? "light" : "dark";
  uiState.volume = parseFloat(localStorage.getItem(VOLUME_KEY) || "1.0");
  const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  uiState.accentColor = settings.accentColor || "#7c3aed";
  uiState.compactMode = settings.compactMode || false;
  uiState.reducedMotion = settings.reducedMotion || false;
  document.documentElement.style.setProperty("--accent", uiState.accentColor);
  document.documentElement.style.setProperty("--accent-bright", uiState.accentColor);
  document.documentElement.setAttribute("data-theme", uiState.theme);
  document.body.classList.toggle("compact-mode", uiState.compactMode);
  document.body.classList.toggle("reduced-motion", uiState.reducedMotion);
  reconcileLibrary();
}
function saveData() {
  userData.__meta = { theme: uiState.theme };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  localStorage.setItem(VOLUME_KEY, String(uiState.volume));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    accentColor: uiState.accentColor,
    compactMode: uiState.compactMode,
    reducedMotion: uiState.reducedMotion
  }));
}
function reconcileLibrary() {
  let changed = false;
  getAnimeEntries().forEach((entry) => {
    if (!STATUS_OPTIONS.includes(entry.status)) {
      entry.status = "untracked";
      changed = true;
    }
    if (entry.episodes > 0 && entry.episodesWatched >= entry.episodes) {
      entry.episodesWatched = entry.episodes;
      if (entry.status !== "completed") {
        entry.status = "completed";
        entry.completedAt = entry.completedAt || Date.now();
        changed = true;
      }
    }
  });
  if (changed) saveData();
}
function toggleTheme() {
  uiState.theme = uiState.theme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", uiState.theme);
  saveData();
  renderApp();
}
function renderTab(tab) {
  if (!NAV_TABS.includes(tab)) return;
  currentTab = tab;
  currentWatchId = null;
  uiState.overlay = null;
  uiState.navMenuOpen = false;
  renderApp();
}
function queueRender() { window.requestAnimationFrame(() => renderApp()); }

/* NAV */
function renderTopNav() {
  const tabs = NAV_TABS.map((tab) => {
    const label = tab.charAt(0).toUpperCase() + tab.slice(1);
    const active = currentTab === tab && !currentWatchId ? "is-active" : "";
    return `<button type="button" class="tab-link ${active}" data-action="tab" data-tab="${tab}">${label}</button>`;
  }).join("");
  return `
  <header class="topnav">
    <div class="topnav__inner">
      <div class="nav-brand">
        <div class="nav-brand__logo">AniVault</div>
        <div class="nav-brand__tagline">Your private stream</div>
      </div>
      <nav class="nav-center" aria-label="Primary navigation">${tabs}</nav>
      <div class="nav-actions">
        <div class="nav-search-inline ${uiState.navSearchOpen ? "is-open" : ""}">
          <span class="icon-search" aria-hidden="true"></span>
          <input id="navSearchInput" class="input" type="search" placeholder="Search AniList" value="${escapeHtml(uiState.search.query)}">
        </div>
        <button type="button" class="icon-button" data-action="toggle-nav-search" aria-label="Open search"><span class="icon-search" aria-hidden="true"></span></button>
        <button type="button" class="nav-button" data-action="export">Export</button>
        <button type="button" class="nav-button" data-action="import">Import</button>
        <button type="button" class="nav-button" data-action="toggle-theme">${uiState.theme === "dark" ? "Light" : "Dark"}</button>
        <button type="button" class="icon-button" data-action="open-settings" aria-label="Settings" title="Settings">⚙</button>
      </div>
      <button type="button" class="icon-button topnav__hamburger" data-action="toggle-menu" aria-label="Open menu"><span class="hamburger"><span></span></span></button>
    </div>
    <div class="nav-mobile-panel ${uiState.navMenuOpen ? "is-open" : ""}">
      <div class="nav-mobile-panel__card">
        <div class="nav-mobile-panel__tabs">${tabs}</div>
        <div class="nav-mobile-panel__actions">
          <input id="mobileNavSearchInput" class="input" type="search" placeholder="Search AniList" value="${escapeHtml(uiState.search.query)}">
          <button type="button" class="nav-button" data-action="export">Export Backup</button>
          <button type="button" class="nav-button" data-action="import">Import Backup</button>
          <button type="button" class="nav-button" data-action="toggle-theme">Switch to ${uiState.theme === "dark" ? "Light" : "Dark"}</button>
        </div>
      </div>
    </div>
  </header>`;
}
function renderMobileTabs() {
  if (currentWatchId) return "";
  return `<nav class="mobile-tabs" aria-label="Mobile navigation">
    ${NAV_TABS.map((tab) => {
      const label = tab.charAt(0).toUpperCase() + tab.slice(1);
      const active = currentTab === tab ? "is-active" : "";
      return `<button type="button" class="mobile-tab ${active}" data-action="tab" data-tab="${tab}">${label}</button>`;
    }).join("")}
  </nav>`;
}

/* HOME */
function getLibraryStats() {
  return getAnimeEntries().reduce((stats, entry) => {
    stats.total += 1;
    stats.episodesWatched += entry.episodesWatched || 0;
    if (entry.status === "watching") stats.watching += 1;
    if (entry.status === "completed") stats.completed += 1;
    return stats;
  }, { total: 0, watching: 0, completed: 0, episodesWatched: 0 });
}
function getContinueWatchingEntries() {
  return getAnimeEntries()
    .filter((entry) => entry.status === "watching" && (!entry.episodes || entry.episodesWatched < entry.episodes))
    .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
}
function getEntriesByStatus(status) {
  return getAnimeEntries()
    .filter((entry) => entry.status === status)
    .sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
}
function getRecentlyCompletedEntries() {
  return getAnimeEntries()
    .filter((entry) => entry.status === "completed")
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, 20);
}
function getRecentlyWatchedEntries(limit = 5) {
  return getAnimeEntries()
    .filter((entry) => entry.lastWatched > 0)
    .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0))
    .slice(0, limit);
}
function getRecommendationsForAnime(animeEntry, limit = 10) {
  if (!animeEntry.genres.length) return [];
  const otherEntries = getAnimeEntries().filter((e) => e.id !== animeEntry.id);
  const scored = otherEntries.map((entry) => {
    const matchCount = entry.genres.filter((g) => animeEntry.genres.includes(g)).length;
    return { entry, score: matchCount };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}
function getTrendingRecommendations(limit = 10) {
  return getAnimeEntries()
    .filter((e) => e.averageScore > 0)
    .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
    .slice(0, limit);
}
function getGenreBasedRecommendations(limit = 10) {
  const genreCount = new Map();
  getAnimeEntries().forEach((entry) => {
    entry.genres.forEach((g) => genreCount.set(g, (genreCount.get(g) || 0) + 1));
  });
  const topGenres = Array.from(genreCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g);
  if (topGenres.length === 0) return [];
  return getAnimeEntries()
    .filter((e) => e.genres.some((g) => topGenres.includes(g)))
    .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
    .slice(0, limit);
}
function renderEmptyState(icon, title, text) {
  return `<div class="empty-state"><div class="empty-state__inner"><div class="empty-state__icon">${icon}</div><div class="empty-state__title">${escapeHtml(title)}</div><p class="empty-state__text">${escapeHtml(text)}</p></div></div>`;
}
function renderScrollControls(trackId, visible) {
  if (!visible) return "";
  return `<div class="section__controls">
    <button type="button" class="scroll-btn" data-action="row-scroll" data-target="${trackId}" data-dir="prev" aria-label="Scroll left">&lt;</button>
    <button type="button" class="scroll-btn" data-action="row-scroll" data-target="${trackId}" data-dir="next" aria-label="Scroll right">&gt;</button>
  </div>`;
}
function renderContinueCard(entry) {
  const image = entry.banner || entry.cover;
  const poster = entry.cover || entry.banner;
  return `<button type="button" class="continue-card" data-action="open-watch" data-id="${entry.id}">
    <div class="continue-card__bg">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(getDisplayTitle(entry))}">` : ""}</div>
    <div class="continue-card__content">
      <div class="continue-card__poster">${poster ? `<img src="${escapeHtml(poster)}" alt="${escapeHtml(getDisplayTitle(entry))}">` : ""}</div>
      <div class="continue-card__meta">
        <div class="continue-card__title">${escapeHtml(getDisplayTitle(entry))}</div>
        <div class="continue-card__progress">${escapeHtml(formatEpisodeLabel(entry))}</div>
        <div class="continue-card__button">&#9654; Resume</div>
      </div>
    </div>
    <div class="continue-card__bar"><span style="width:${getProgressPercent(entry)}%"></span></div>
  </button>`;
}
function renderPosterCard(entry, options = {}) {
  const { action = "open-watch", context = "library", showBadge = true, showProgress = true } = options;
  const badge = showBadge ? `<span class="${getStatusClass(entry.status)}">${escapeHtml(STATUS_LABELS[entry.status])}</span>` : "";
  const year = entry.year ? String(entry.year) : "Unknown year";
  const episodes = entry.episodes ? formatCount(entry.episodes, "episode") : "Episode total unknown";
  const rating = entry.rating ? `Your rating ${entry.rating}/10` : entry.averageScore ? `AniList score ${entry.averageScore}` : "";
  const metaParts = [episodes, year, rating].filter(Boolean);
  const meta = metaParts.slice(0, 2).join(" • ");
  const footerLabel = context === "queue" ? "In Queue" : context === "plan" ? episodes : context === "completed" ? rating || "Completed" : meta || STATUS_LABELS[entry.status];
  const showScoreChip = context === "grid" || context === "completed";
  const scoreChip = showScoreChip && entry.rating ? `<span class="chip-chip">&#11088; ${entry.rating} - ${escapeHtml(getRatingLabel(entry.rating))}</span>` : "";
  return `<button type="button" class="poster-card ${context === "grid" ? "poster-card--grid" : ""}" data-action="${action}" data-id="${entry.id}">
    <div class="poster-card__media">${entry.cover ? `<img src="${escapeHtml(entry.cover)}" alt="${escapeHtml(getDisplayTitle(entry))}">` : ""}</div>
    <div class="poster-card__body">
      <div class="poster-card__meta-row">${badge}${entry.averageScore ? `<span class="chip-chip">Score ${entry.averageScore}</span>` : ""}</div>
      <div class="poster-card__title">${escapeHtml(getDisplayTitle(entry))}</div>${scoreChip}
      <div class="poster-card__meta">${escapeHtml(footerLabel)}</div>
      ${showProgress ? `<div class="progress-rail" aria-hidden="true"><span style="width:${getProgressPercent(entry)}%"></span></div>` : ""}
    </div>
  </button>`;
}
function renderMediaRowSection({ sectionId, title, subtitle, entries, emptyIcon, emptyTitle, emptyText, context, action }) {
  const hasEntries = entries.length > 0;
  return `<section class="section">
    <div class="section__head">
      <div class="section__copy">
        <div class="section__title">${escapeHtml(title)}</div>
        <div class="section__sub">${escapeHtml(subtitle)}</div>
      </div>
      ${renderScrollControls(sectionId, hasEntries && entries.length > 3)}
    </div>
    ${hasEntries ? `<div class="media-row"><div class="media-row__viewport" id="${sectionId}" data-row-track="${sectionId}"><div class="media-row__track">
      ${entries.map((entry) => renderPosterCard(entry, { context, action, showBadge: context !== "plan" })).join("")}
    </div></div></div>` : renderEmptyState(emptyIcon, emptyTitle, emptyText)}
  </section>`;
}
function renderStatsStrip() {
  const stats = getLibraryStats();
  return `<section class="surface-strip stats-strip">
    <div class="stat-chip"><div class="stat-chip__label">Total in library</div><div class="stat-chip__value">${stats.total}</div></div>
    <div class="stat-chip"><div class="stat-chip__label">Currently watching</div><div class="stat-chip__value">${stats.watching}</div></div>
    <div class="stat-chip"><div class="stat-chip__label">Completed</div><div class="stat-chip__value">${stats.completed}</div></div>
    <div class="stat-chip"><div class="stat-chip__label">Episodes watched</div><div class="stat-chip__value">${stats.episodesWatched}</div></div>
  </section>`;
}
function renderHome() {
  const continueWatching = getContinueWatchingEntries();
  const queueEntries = getEntriesByStatus("queued");
  const planEntries = getEntriesByStatus("plan-to-watch");
  const completedEntries = getRecentlyCompletedEntries();
  const recentlyWatched = getRecentlyWatchedEntries(5);
  const recommendationRows = [];
  for (const watched of recentlyWatched) {
    const recs = getRecommendationsForAnime(watched, 10);
    if (recs.length > 0) recommendationRows.push({ title: `Because you watched ${getDisplayTitle(watched)}`, entries: recs, id: `rec-${watched.id}` });
  }
  const trendingRecs = getTrendingRecommendations(10);
  const genreRecs = getGenreBasedRecommendations(10);
  let recommendationHtml = "";
  if (trendingRecs.length > 0) {
    recommendationHtml += renderMediaRowSection({ sectionId: "trendingRow", title: "Trending For You", subtitle: "Popular among viewers like you", entries: trendingRecs, emptyIcon: "🔥", emptyTitle: "No trending titles yet", emptyText: "Watch more to get personalized picks.", context: "grid", action: "open-watch" });
  }
  if (genreRecs.length > 0) {
    recommendationHtml += renderMediaRowSection({ sectionId: "genreRecRow", title: "Recommended For You", subtitle: "Based on your favorite genres", entries: genreRecs, emptyIcon: "✨", emptyTitle: "No recommendations yet", emptyText: "Add more anime to your library to improve recommendations.", context: "grid", action: "open-watch" });
  }
  for (const row of recommendationRows.slice(0, 3)) {
    recommendationHtml += renderMediaRowSection({ sectionId: row.id, title: row.title, subtitle: "", entries: row.entries, emptyIcon: "🎬", emptyTitle: "No recommendations", emptyText: "Watch more to get personalized suggestions.", context: "grid", action: "open-watch" });
  }
  return `
  <div class="page page--home">
    <section class="section">
      <div class="section__head">
        <div class="section__copy">
          <div class="section__title">Continue Watching</div>
        </div>
        ${renderScrollControls("continueRow", continueWatching.length > 1)}
      </div>
      ${continueWatching.length ? `<div class="media-row"><div class="media-row__viewport" id="continueRow" data-row-track="continueRow"><div class="media-row__track">${continueWatching.map(renderContinueCard).join("")}</div></div></div>` : renderEmptyState("TV", "Nothing playing yet - add something to your watchlist to get started.", "Start watching something to see it here.")}
    </section>
    ${renderMediaRowSection({ sectionId: "queueRow", title: "Next Up For You", subtitle: "", entries: queueEntries, emptyIcon: "Q", emptyTitle: "Nothing queued - add anime to your queue from Browse", emptyText: "Your queue stays focused and easy to pick from once you add titles.", context: "queue", action: "open-watch" })}
    ${renderMediaRowSection({ sectionId: "planRow", title: "Saved For Later", subtitle: "", entries: planEntries, emptyIcon: "P", emptyTitle: "No future picks yet", emptyText: "Use Browse or Search to save shows for later.", context: "plan", action: "open-detail" })}
    ${renderMediaRowSection({ sectionId: "completedRow", title: "Already Watched", subtitle: "", entries: completedEntries, emptyIcon: "C", emptyTitle: "No finished series yet", emptyText: "Completed anime will show up here as soon as you finish them.", context: "completed", action: "open-watch" })}
    ${recommendationHtml}
  </div>`;
}

/* LIBRARY */
function getFilteredLibraryEntries() {
  const allEntries = getAnimeEntries();
  const byFilter = uiState.library.filter === "all" ? allEntries : allEntries.filter((entry) => entry.status === uiState.library.filter);
  const bySearch = filterByText(byFilter, uiState.library.query);
  const sorters = {
    default: (a, b) => (b.dateAdded || 0) - (a.dateAdded || 0),
    alpha: (a, b) => getDisplayTitle(a).localeCompare(getDisplayTitle(b)),
    "alpha-desc": (a, b) => getDisplayTitle(b).localeCompare(getDisplayTitle(a)),
    newest: (a, b) => (b.dateAdded || 0) - (a.dateAdded || 0),
    "rating-desc": (a, b) => (b.rating || 0) - (a.rating || 0),
    "progress-desc": (a, b) => getProgressPercent(b) - getProgressPercent(a)
  };
  const sorter = sorters[uiState.library.sort] || sorters.default;
  return [...bySearch].sort(sorter);
}
function renderLibrary() {
  const entries = getFilteredLibraryEntries();
  return `
  <div class="page page--library">
    <div class="page-hero"><div class="page-title">Your Library</div><div class="page-subtitle">Everything saved locally in your browser, ready to browse offline-first.</div></div>
    <section class="library-toolbar">
      <div class="toolbar-row">
        <div class="chip-group">
          ${[["all", "All"], ["watching", "Watching"], ["completed", "Completed"], ["queued", "Queue"], ["plan-to-watch", "Plan"], ["paused", "Paused"], ["dropped", "Dropped"], ["untracked", "Untracked"]].map(([value, label]) => {
            const active = uiState.library.filter === value ? "is-active" : "";
            return `<button type="button" class="chip ${active}" data-action="set-library-filter" data-filter="${value}">${label}</button>`;
          }).join("")}
        </div>
      </div>
      <div class="toolbar-grid">
        <input id="librarySearchInput" class="input" type="search" placeholder="Filter your library" value="${escapeHtml(uiState.library.query)}">
        <select id="librarySortSelect" class="select">
          <option value="default" ${uiState.library.sort === "default" ? "selected" : ""}>Default</option>
          <option value="alpha" ${uiState.library.sort === "alpha" ? "selected" : ""}>A-Z</option>
          <option value="alpha-desc" ${uiState.library.sort === "alpha-desc" ? "selected" : ""}>Z-A</option>
          <option value="newest" ${uiState.library.sort === "newest" ? "selected" : ""}>Newest</option>
          <option value="rating-desc" ${uiState.library.sort === "rating-desc" ? "selected" : ""}>Highest Rated</option>
          <option value="progress-desc" ${uiState.library.sort === "progress-desc" ? "selected" : ""}>Most Progress</option>
        </select>
      </div>
    </section>
    ${entries.length ? `<section class="library-grid">${entries.map((entry) => renderPosterCard(entry, { context: "grid", action: "open-watch" })).join("")}</section>` : renderEmptyState("AV", "Your library is empty - head to Browse or Search to add anime", "Once you add titles, this grid becomes your full local catalog.")}
  </div>`;
}

/* BROWSE */
async function fetchAniList(query, variables) {
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables })
  });
  if (!response.ok) throw new Error(`AniList request failed with ${response.status}`);
  const payload = await response.json();
  if (payload.errors && payload.errors.length) throw new Error(payload.errors[0].message || "AniList request failed");
  return payload.data;
}
async function fetchEpisodeData(anilistId) {
  if (!anilistId) return { duration: null, episodes: {} };
  if (episodeCache[anilistId]) return episodeCache[anilistId];
  const data = await fetchAniList(EPISODE_DATA_QUERY, { id: Number(anilistId) });
  const media = data && data.Media ? data.Media : {};
  const episodes = {};
  (media.streamingEpisodes || []).forEach((streamingEpisode) => {
    const parsed = parseEpisodeTitle(streamingEpisode.title);
    if (!parsed) return;
    episodes[parsed.number] = { name: parsed.name, thumbnail: streamingEpisode.thumbnail || "" };
  });
  episodeCache[anilistId] = { duration: Number.isFinite(Number(media.duration)) ? Number(media.duration) : null, episodes };
  return episodeCache[anilistId];
}
async function fetchFranchiseRelations(anilistId) {
  if (!anilistId) return [];
  if (franchiseCache[anilistId]) return franchiseCache[anilistId];
  const data = await fetchAniList(FRANCHISE_RELATIONS_QUERY, { id: Number(anilistId) });
  const media = data && data.Media ? data.Media : null;
  const currentEntry = getEntryByAnimeId(anilistId);
  const relations = [];
  if (currentEntry) {
    relations.push({ id: currentEntry.id, title: { romaji: currentEntry.title, english: currentEntry.titleEnglish }, coverImage: { large: currentEntry.cover }, type: "ANIME", format: "", seasonYear: currentEntry.year || 0, startDate: { year: currentEntry.year || 0, month: 0, day: 0 }, episodes: currentEntry.episodes || 0, status: currentEntry.status, averageScore: currentEntry.averageScore || 0, relationType: "current", isCurrent: true });
  } else if (media) {
    relations.push({ id: Number(anilistId), title: { romaji: media.title && media.title.romaji ? media.title.romaji : "Current Anime", english: "" }, coverImage: { large: "" }, type: "ANIME", format: "", seasonYear: 0, startDate: { year: 0, month: 0, day: 0 }, episodes: 0, status: "", averageScore: 0, relationType: "current", isCurrent: true });
  }
  (((media || {}).relations || {}).edges || []).forEach((edge) => {
    const node = edge && edge.node ? edge.node : null;
    if (!node || node.type !== "ANIME" || !WATCH_ORDER_RELATIONS.has(edge.relationType)) return;
    relations.push({ ...node, relationType: edge.relationType, isCurrent: false });
  });
  franchiseCache[anilistId] = relations;
  return relations;
}
function adaptAniListMedia(media) {
  return {
    id: Number(media.id),
    title: { romaji: media.title && media.title.romaji ? media.title.romaji : "Untitled", english: media.title && media.title.english ? media.title.english : "" },
    coverImage: { large: media.coverImage && media.coverImage.large ? media.coverImage.large : "" },
    bannerImage: media.bannerImage || "",
    episodes: Number(media.episodes) || 0,
    genres: Array.isArray(media.genres) ? media.genres : [],
    seasonYear: Number(media.seasonYear) || 0,
    averageScore: Number(media.averageScore) || 0,
    status: media.status || ""
  };
}
async function loadBrowse(mode, genre = uiState.browse.genre) {
  uiState.browse.mode = mode; uiState.browse.genre = genre;
  uiState.browse.loading = true; uiState.browse.error = ""; queueRender();
  const requestId = ++uiState.browse.requestId;
  const season = getSeasonFromDate(new Date()), seasonYear = new Date().getFullYear();
  let variables = { page: 1, perPage: 30, sort: ["POPULARITY_DESC"] };
  let title = "This Season", subtitle = `${season.charAt(0)}${season.slice(1).toLowerCase()} releases, sorted by popularity.`;
  if (mode === "top") { variables = { page: 1, perPage: 30, sort: ["SCORE_DESC"] }; title = "Top Rated"; subtitle = "High scoring anime from AniList."; }
  else if (mode === "popular") { variables = { page: 1, perPage: 30, sort: ["POPULARITY_DESC"] }; title = "Most Popular"; subtitle = "Heavy hitters with the biggest audiences."; }
  else if (mode === "genre") { variables = { page: uiState.browse.page + 1, perPage: 30, sort: ["SCORE_DESC"], genre }; title = `${genre || "All"} Highlights`; subtitle = `Top rated picks. Page ${uiState.browse.page + 1}.`; }
  else { variables = { page: 1, perPage: 30, sort: ["POPULARITY_DESC"], season, seasonYear }; }
  try {
    const data = await fetchAniList(BROWSE_QUERY, variables);
    if (requestId !== uiState.browse.requestId) return;
    uiState.browse.results = data.Page.media.map(adaptAniListMedia);
    uiState.browse.title = title; uiState.browse.subtitle = subtitle;
    uiState.browse.loading = false; uiState.browse.initialized = true; uiState.browse.page = 1; uiState.browse.hasMore = data.Page.media.length === 30; queueRender();
  } catch (error) {
    if (requestId !== uiState.browse.requestId) return;
    uiState.browse.loading = false; uiState.browse.error = error.message; queueRender();
    showToast("AniList browse request failed. Try again when you are online.", "error");
  }
}
async function loadBrowseMore() {
  if (uiState.browse.loading || !uiState.browse.hasMore) return;
  const mode = uiState.browse.mode, genre = uiState.browse.genre;
  const requestId = ++uiState.browse.requestId;
  const season = getSeasonFromDate(new Date()), seasonYear = new Date().getFullYear();
  const nextPage = uiState.browse.page + 1;
  let variables = { page: nextPage, perPage: 30, sort: ["POPULARITY_DESC"] };
  if (mode === "top") variables = { page: nextPage, perPage: 30, sort: ["SCORE_DESC"] };
  else if (mode === "genre") variables = { page: nextPage, perPage: 30, sort: ["SCORE_DESC"], genre };
  else variables = { page: nextPage, perPage: 30, sort: ["POPULARITY_DESC"], season, seasonYear };
  uiState.browse.loading = true; uiState.browse.error = ""; queueRender();
  try {
    const data = await fetchAniList(BROWSE_QUERY, variables);
    if (requestId !== uiState.browse.requestId) return;
    const newResults = data.Page.media.map(adaptAniListMedia);
    if (newResults.length === 0) { uiState.browse.hasMore = false; }
    else { uiState.browse.results = [...uiState.browse.results, ...newResults]; uiState.browse.page = nextPage; }
    uiState.browse.loading = false; queueRender();
    showToast(`Loaded page ${nextPage}`, "info");
  } catch (error) {
    if (requestId !== uiState.browse.requestId) return;
    uiState.browse.loading = false; uiState.browse.error = error.message; queueRender();
  }
}
function renderDiscoverCard(media, source) {
  const existing = getEntry(media.id);
  const title = media.title.english || media.title.romaji;
  const meta = [media.averageScore ? `Score ${media.averageScore}` : "", media.episodes ? formatCount(media.episodes, "episode") : "Episode total unknown"].filter(Boolean).join(" • ");
  return `<article class="discover-card">
    <div class="discover-card__media">${media.coverImage.large ? `<img src="${escapeHtml(media.coverImage.large)}" alt="${escapeHtml(title)}">` : ""}</div>
    <div class="discover-card__body">
      <div class="discover-card__title">${escapeHtml(title)}</div>
      <div class="discover-card__meta">${escapeHtml(meta)}</div>
      <div class="discover-card__meta-row">${media.status ? `<span class="chip-chip">${escapeHtml(media.status.replaceAll("_", " "))}</span>` : ""}${existing ? `<button type="button" class="action-button" data-action="open-watch" data-id="${existing.id}">In Library</button>` : `<button type="button" class="action-button" data-action="open-status-picker" data-source="${source}" data-id="${media.id}">Add to Library</button>`}</div>
    </div>
  </article>`;
}
function renderInlineStatusPicker(source, id) {
  const picker = uiState.inlineStatusPicker;
  if (!picker || picker.source !== source || Number(picker.id) !== Number(id)) return "";
  return `<div class="status-picker" data-picker-id="${source}-${id}">
    <button type="button" class="status-picker-item" data-action="quick-add-status" data-source="${source}" data-id="${id}" data-status="plan-to-watch">Plan to Watch</button>
    <button type="button" class="status-picker-item" data-action="quick-add-status" data-source="${source}" data-id="${id}" data-status="queued">Queued</button>
    <button type="button" class="status-picker-item" data-action="quick-add-status" data-source="${source}" data-id="${id}" data-status="watching">Watching</button>
    <button type="button" class="status-picker-item" data-action="quick-add-status" data-source="${source}" data-id="${id}" data-status="paused">Paused</button>
    <button type="button" class="status-picker-item" data-action="quick-add-status" data-source="${source}" data-id="${id}" data-status="dropped">Dropped</button>
  </div>`;
}
function renderQuickActionCard(anime, source) {
  const existing = getEntryByAnimeId(anime.id);
  const title = anime.title && anime.title.english ? anime.title.english : anime.title.romaji;
  const meta = [anime.averageScore ? `Score ${anime.averageScore}` : "", anime.episodes ? formatCount(anime.episodes, "episode") : "Episode total unknown"].filter(Boolean).join(" • ");
  return `<article class="discover-card">
    <div class="discover-card__media">${anime.coverImage && anime.coverImage.large ? `<img src="${escapeHtml(anime.coverImage.large)}" alt="${escapeHtml(title)}">` : ""}</div>
    <div class="discover-card__body">
      <div class="discover-card__title">${escapeHtml(title)}</div>
      <div class="discover-card__meta">${escapeHtml(meta)}</div>
      <div class="discover-card__meta-row">${anime.status ? `<span class="chip-chip">${escapeHtml(String(anime.status).replaceAll("_", " "))}</span>` : ""}</div>
      <div class="card-actions">
        ${existing ? `<button type="button" class="btn-watch-now" data-action="open-watch" data-id="${existing.id}">▶ Watch</button><button type="button" class="btn-remove" data-action="remove-from-library" data-id="${existing.id}">Remove</button>` : `<button type="button" class="btn-watch-now" data-action="quick-watch-now" data-source="${source}" data-id="${anime.id}">▶ Watch Now</button><div class="card-actions__picker-wrap"><button type="button" class="btn-add" data-action="open-status-picker" data-source="${source}" data-id="${anime.id}">+ Add</button>${renderInlineStatusPicker(source, anime.id)}</div>`}
      </div>
    </div>
  </article>`;
}
function renderBrowseCard(anime) { return renderQuickActionCard(anime, "browse"); }
function renderSearchCard(anime) { return renderQuickActionCard(anime, "search"); }
function renderBrowse() {
  const alphabetLetters = Object.keys(GENRE_ALPHABET).map(letter => `<button type="button" class="chip" data-action="browse-initial" data-initial="${letter}">${letter}</button>`).join("") + `<button type="button" class="chip" data-action="browse-initial" data-initial="ALL">ALL</button>`;
  return `
  <div class="page page--browse">
    <div class="page-hero"><div class="page-title">Browse AniList</div><div class="page-subtitle">Seasonal picks, genres, top rated favorites, and audience hits.</div></div>
    <section class="browse-controls">
      <div class="toolbar-row">
        <div class="discover-modes">
          ${[["seasonal", "Seasonal"], ["top", "Top Rated"], ["popular", "Most Popular"]].map(([mode, label]) => {
            const active = uiState.browse.mode === mode ? "is-active" : "";
            return `<button type="button" class="chip ${active}" data-action="browse-mode" data-mode="${mode}">${label}</button>`;
          }).join("")}
        </div>
      </div>
      <div class="genre-picker">
        <input type="text" class="input" id="genreSearchInput" placeholder="Search genre by name..." data-action="genre-search">
        <select class="select" id="genreSelect" data-action="browse-genre-select">
          <option value="">Select Genre...</option>
          ${BROWSE_GENRES.map(g => `<option value="${g}" ${uiState.browse.genre === g ? "selected" : ""}>${g}</option>`).join("")}
        </select>
        <div class="alphabet-nav">${alphabetLetters}</div>
        <div class="genre-pills">
          ${BROWSE_GENRES.slice(0, 20).map((genre) => {
            const active = uiState.browse.mode === "genre" && uiState.browse.genre === genre ? "is-active" : "";
            return `<button type="button" class="chip ${active}" data-action="browse-genre" data-genre="${genre}">${genre}</button>`;
          }).join("")}
        </div>
      </div>
      <div class="status-line">${escapeHtml(uiState.browse.title)}${uiState.browse.subtitle ? ` - ${escapeHtml(uiState.browse.subtitle)}` : ""}</div>
    </section>
    ${uiState.browse.loading ? renderEmptyState("...", "Loading AniList results", "AniVault is pulling the latest browse results.") : uiState.browse.error ? renderEmptyState("!", "Browse is offline right now", uiState.browse.error) : uiState.browse.results.length ? `<section class="browse-results discover-grid">${uiState.browse.results.map((media) => renderBrowseCard(media)).join("")}</section>${uiState.browse.hasMore ? `<div style="text-align:center;padding:20px;"><button type="button" class="action-button" data-action="browse-load-more" ${uiState.browse.loading ? "disabled" : ""}>${uiState.browse.loading ? "Loading..." : "Load More"}</button></div>` : `<div class="muted" style="text-align:center;padding:20px;">No more results</div>`}` : renderEmptyState("0", "No results yet", "Choose a browse mode to load anime from AniList.")}
  </div>`;
}

/* SEARCH */
function getSearchLibraryMatches() {
  if (!uiState.search.query.trim()) return [];
  return filterByText(getAnimeEntries(), uiState.search.query)
    .sort((a, b) => (b.lastWatched || b.dateAdded || 0) - (a.lastWatched || a.dateAdded || 0))
    .slice(0, 12);
}
function scheduleAniListSearch(query) {
  window.clearTimeout(searchTimer);
  if (query.trim().length < 2) { uiState.search.loading = false; uiState.search.error = ""; uiState.search.results = []; return; }
  uiState.search.loading = true; uiState.search.error = "";
  searchTimer = window.setTimeout(() => runAniListSearch(query), 350);
}
async function runAniListSearch(query) {
  const requestId = ++uiState.search.requestId;
  try {
    const data = await fetchAniList(SEARCH_QUERY, { search: query, page: 1, perPage: 20 });
    if (requestId !== uiState.search.requestId) return;
    uiState.search.results = data.Page.media.map(adaptAniListMedia);
    uiState.search.loading = false; uiState.search.error = ""; queueRender();
  } catch (error) {
    if (requestId !== uiState.search.requestId) return;
    uiState.search.loading = false; uiState.search.error = error.message; queueRender();
    showToast("AniList search failed. Check your connection and try again.", "error");
  }
}
function renderStats() {
  const entries = getAnimeEntries();
  const totalAnime = entries.length;
  const watching = entries.filter(e => e.status === "watching").length;
  const completed = entries.filter(e => e.status === "completed").length;
  const queued = entries.filter(e => e.status === "queued" || e.status === "plan-to-watch").length;
  const totalEpisodesWatched = entries.reduce((sum, e) => sum + (e.episodesWatched || 0), 0);
  const totalMinutesWatched = entries.reduce((sum, e) => sum + ((e.episodesWatched || 0) * (episodeCache[e.anilistId]?.duration || 24)), 0);
  const hoursWatched = Math.round(totalMinutesWatched / 60);
  const daysWatched = Math.round(hoursWatched / 24);
  const avgScore = entries.filter(e => e.rating > 0).reduce((sum, e, _, arr) => sum + e.rating / arr.length, 0);
  const genreCounts = {};
  entries.forEach(e => (e.genres || []).forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; }));
  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return `
  <div class="page page--stats">
    <div class="page-hero"><div class="page-title">Watch Statistics</div><div class="page-subtitle">Your viewing habits, all stored locally.</div></div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${totalAnime}</div><div class="stat-label">Anime in Library</div></div>
      <div class="stat-card"><div class="stat-value">${watching}</div><div class="stat-label">Currently Watching</div></div>
      <div class="stat-card"><div class="stat-value">${completed}</div><div class="stat-label">Completed</div></div>
      <div class="stat-card"><div class="stat-value">${queued}</div><div class="stat-label">In Queue</div></div>
      <div class="stat-card"><div class="stat-value">${totalEpisodesWatched}</div><div class="stat-label">Episodes Watched</div></div>
      <div class="stat-card"><div class="stat-value">${hoursWatched}</div><div class="stat-label">Hours Watched</div></div>
    </div>
    ${entries.length > 0 ? `
    <div class="stats-section">
      <div class="stats-section-title">Top Genres</div>
      <div class="genre-bar-list">
        ${topGenres.map(([genre, count]) => `<div class="genre-bar-item"><span class="genre-name">${genre}</span><div class="genre-bar"><div class="genre-bar-fill" style="width:${(count / totalAnime) * 100}%"></div></div><span class="genre-count">${count}</span></div>`).join("")}
      </div>
    </div>
    <div class="stats-section">
      <div class="stats-section-title">Average Rating</div>
      <div class="rating-display">${avgScore > 0 ? avgScore.toFixed(1) + " / 10" : "No ratings yet"}</div>
    </div>` : ""}
  </div>`;
}
function renderSearch() {
  const libraryMatches = getSearchLibraryMatches();
  const f = uiState.search.filters;
  const filteredResults = uiState.search.results.filter(m => {
    if (f.yearMin && (!m.seasonYear || m.seasonYear < f.yearMin)) return false;
    if (f.yearMax && (!m.seasonYear || m.seasonYear > f.yearMax)) return false;
    if (f.scoreMin && (!m.averageScore || m.averageScore < f.scoreMin)) return false;
    if (f.episodesMin && (!m.episodes || m.episodes < f.episodesMin)) return false;
    if (f.status && m.status !== f.status) return false;
    return true;
  });
  const totalFiltered = filteredResults.length, totalResults = uiState.search.results.length;
  return `
  <div class="page page--search">
    <section class="search-hero">
      <div class="page-title">Search AniList</div>
      <div class="page-subtitle">Find something new, then add it straight into your private library.</div>
      <input id="searchPageInput" class="input search-hero__input" type="search" placeholder="Search anime titles" value="${escapeHtml(uiState.search.query)}">
    </section>
    <div class="search-layout">
      <aside class="search-filters">
        <div class="filter-section">
          <div class="filter-title">Year</div>
          <div class="filter-range"><input type="number" class="input filter-input" placeholder="Min" value="${uiState.search.filters.yearMin || ""}" data-filter="yearMin" min="1990" max="2026"><span>–</span><input type="number" class="input filter-input" placeholder="Max" value="${uiState.search.filters.yearMax || ""}" data-filter="yearMax" min="1990" max="2026"></div>
        </div>
        <div class="filter-section">
          <div class="filter-title">Score</div>
          <div class="filter-range"><input type="number" class="input filter-input" placeholder="Min" value="${uiState.search.filters.scoreMin || ""}" data-filter="scoreMin" min="60" max="100" step="5"></div>
        </div>
        <div class="filter-section">
          <div class="filter-title">Episodes</div>
          <div class="filter-range"><input type="number" class="input filter-input" placeholder="Min" value="${uiState.search.filters.episodesMin || ""}" data-filter="episodesMin" min="1"></div>
        </div>
        <div class="filter-section">
          <div class="filter-title">Status</div>
          <div class="filter-chips">${["", "RELEASING", "FINISHED", "NOT_YET_RELEASED"].map(s => `<button type="button" class="chip ${uiState.search.filters.status === s ? "is-active" : ""}" data-filter="status" data-value="${s}">${s || "All"}</button>`).join("")}</div>
        </div>
        <button type="button" class="action-button" data-action="clear-filters" style="width:100%;margin-top:8px;">Clear Filters</button>
      </aside>
      <section class="section">
        <div class="section__head">
          <div class="section__copy"><div class="section__title">AniList Results${totalFiltered !== totalResults ? ` (${totalFiltered}/${totalResults})` : ""}</div><div class="section__sub">Add fresh results directly into AniVault.</div></div>
        </div>
        ${uiState.search.loading ? renderEmptyState("...", "Searching AniList", "AniVault is looking for matching anime.") : uiState.search.error ? renderEmptyState("!", "Search is offline right now", uiState.search.error) : uiState.search.query.trim().length < 2 ? renderEmptyState("GO", "Search AniList", "Type at least two characters to load AniList results.") : filteredResults.length ? `<div class="browse-results">${filteredResults.map((media) => renderSearchCard(media)).join("")}</div>` : renderEmptyState("0", "No results match filters", "Try adjusting your filters.")}
      </section>
      <section class="section">
        <div class="section__head">
          <div class="section__copy"><div class="section__title">Search in My Library</div><div class="section__sub">Local matches update instantly as you type.</div></div>
        </div>
        ${libraryMatches.length ? `<div class="browse-results">${libraryMatches.map((entry) => renderSearchCard({ id: entry.id, title: { romaji: entry.title, english: entry.titleEnglish }, coverImage: { large: entry.cover }, episodes: entry.episodes, averageScore: entry.averageScore, status: entry.status })).join("")}</div>` : renderEmptyState("MY", "Nothing in your library matches yet", uiState.search.query.trim() ? "Try a different title, genre, or note keyword." : "Start typing to search your saved anime first.")}
      </section>
    </div>
  </div>`;
}

/* EPISODE GROUPING HELPERS */
function getEpisodeGroups(totalEpisodes) {
  const groups = [];
  for (let i = 1; i <= totalEpisodes; i += 50) {
    const start = i, end = Math.min(i + 49, totalEpisodes);
    groups.push({ start, end, label: `${start}–${end}` });
  }
  return groups;
}
function getGroupForEpisode(episode, groups) {
  for (let idx = 0; idx < groups.length; idx++) {
    const group = groups[idx];
    if (episode >= group.start && episode <= group.end) return idx;
  }
  return 0;
}

/* WATCH VIEW */
const STREAM_PROVIDERS = [
  { name: "MegaPlay", buildUrl: (entry, ep, lang) => `https://megaplay.buzz/stream/ani/${entry.anilistId}/${ep}/${lang}` },
  { name: "VidStream", buildUrl: (entry, ep, lang) => `https://vidstream.sh/embed/${entry.anilistId}/${ep}` },
  { name: "VidCloud", buildUrl: (entry, ep, lang) => `https://vidcloud.co/embed/${entry.anilistId}/${ep}/${lang}` },
  { name: "VidNest", buildUrl: (entry, ep, lang) => `https://vidnest.fun/anime/${entry.anilistId}/${ep}/${lang}` },
  { name: "VidPlus", buildUrl: (entry, ep, lang) => `https://player.vidplus.to/embed/anime/${entry.anilistId}/${ep}?dub=${lang === "dub"}` },
  { name: "VidLink", buildUrl: (entry, ep, lang) => `https://vidlink.pro/anime/${entry.anilistId}/${ep}/${lang}` },
  { name: "VidSrc", buildUrl: (entry, ep, lang) => `https://vidsrc.icu/embed/anime/${entry.anilistId}/${ep}/${lang === "dub" ? 1 : 0}` },
  { name: "AniSuge", buildUrl: (entry, ep, lang) => {
    const slug = (entry.titleEnglish || entry.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    return `https://www.animesuge.ltd/anime/${slug}/ep-${ep}`;
  }},
  { name: "AniSuge2", buildUrl: (entry, ep, lang) => {
    const slug = (entry.titleEnglish || entry.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    return `https://animesuge.to/anime/${slug}/ep-${ep}`;
  }},
  { name: "HiAnime", buildUrl: (entry, ep, lang) => `https://hianime.re/watch/${entry.anilistId.replace('anime/', '')}?ep=${ep}` },
];

function buildStreamUrl(entry, episode, language, providerIndex = 0) {
  if (!entry || !entry.anilistId) return "";
  const provider = STREAM_PROVIDERS[providerIndex] || STREAM_PROVIDERS[0];
  return provider.buildUrl(entry, episode, language);
}
function recordWatchTime(id, timestamp = Date.now()) {
  const entry = getEntry(id); if (!entry) return;
  entry.sessionLog = Array.isArray(entry.sessionLog) ? entry.sessionLog : [];
  entry.sessionLog.push(timestamp);
}
function updateStatus(id, status) {
  const entry = getEntry(id); if (!entry || !STATUS_OPTIONS.includes(status)) return;
  entry.status = status;
  if (status === "completed") { if (entry.episodes) entry.episodesWatched = entry.episodes; entry.completedAt = Date.now(); entry.lastWatched = Date.now(); }
  else if (status !== "completed") { entry.completedAt = 0; }
  saveData(); renderApp();
}
function setRating(id, rating) { const entry = getEntry(id); if (!entry) return; entry.rating = clamp(rating, 0, 10); saveData(); renderApp(); }
async function openWatchView(id) {
  const entry = getEntry(id); if (!entry) return;
  previousTab = currentTab; currentWatchId = id;
  uiState.watch.sidebarCollapsed = false; uiState.watch.streamLoaded = false;
  uiState.watch.forceFallback = !entry.anilistId; uiState.watch.lastEndedKey = "";
  const totalEpisodes = getPlayableEpisodeCount(entry);
  currentEpisode = entry.episodes > 0 && entry.episodesWatched >= entry.episodes ? entry.episodes : clamp((entry.episodesWatched || 0) + 1, 1, totalEpisodes);
  const groups = getEpisodeGroups(totalEpisodes);
  currentEpisodeGroupIndex = getGroupForEpisode(currentEpisode, groups);
  uiState.watch.episodeGroupIndex = currentEpisodeGroupIndex;
  uiState.overlay = null; uiState.inlineStatusPicker = null; uiState.navMenuOpen = false;
  currentWatchOrderSort = "recommended";
  const requestToken = ++watchViewRequestToken;
  renderApp(); renderRatingComponent(id, "watchViewRatingContainer"); paintEpisodeList(id); renderWatchOrder(entry.anilistId || entry.id, "recommended");
  if (entry.anilistId) {
    fetchEpisodeData(entry.anilistId).then(() => { if (currentWatchId === id && requestToken === watchViewRequestToken) paintEpisodeList(id); }).catch(() => {});
    fetchFranchiseRelations(entry.anilistId).then(() => { if (currentWatchId === id && requestToken === watchViewRequestToken) renderWatchOrder(entry.anilistId, "recommended"); }).catch(() => { if (currentWatchId === id && requestToken === watchViewRequestToken) renderWatchOrder(entry.anilistId, "recommended"); });
  } else renderWatchOrder(entry.id, "recommended");
}
function closeWatchView(targetTab = previousTab || "home") {
  currentWatchId = null; uiState.watch.forceFallback = false; uiState.watch.streamLoaded = false;
  uiState.watch.lastEndedKey = ""; currentEpisodeGroupIndex = 0;
  currentTab = NAV_TABS.includes(targetTab) ? targetTab : "home"; renderApp();
}
function switchEpisode(id, episode) {
  const entry = getEntry(id); if (!entry) return;
  const totalEpisodes = getPlayableEpisodeCount(entry);
  currentEpisode = clamp(episode, 1, totalEpisodes);
  const groups = getEpisodeGroups(totalEpisodes);
  const newGroupIndex = getGroupForEpisode(currentEpisode, groups);
  if (newGroupIndex !== currentEpisodeGroupIndex) { currentEpisodeGroupIndex = newGroupIndex; uiState.watch.episodeGroupIndex = currentEpisodeGroupIndex; }
  uiState.watch.forceFallback = !entry.anilistId; uiState.watch.streamLoaded = false; uiState.watch.lastEndedKey = "";
  const shouldRestoreFullscreen = isFullscreen(); if (shouldRestoreFullscreen) exitFullscreenSafe();
  renderApp();
  if (shouldRestoreFullscreen) requestAnimationFrame(() => { const container = document.querySelector(".watch-player__frame"); if (container) requestFullscreenOn(container); });
}
function switchLanguage(id, language) { const entry = getEntry(id); if (!entry) return; entry.language = language === "dub" ? "dub" : "sub"; saveData(); uiState.watch.streamLoaded = false; renderApp(); }
function markEpisodeWatched(id, episode, options = {}) {
  const entry = getEntry(id); if (!entry) return null;
  const now = Date.now(); const totalEpisodes = getPlayableEpisodeCount(entry);
  const targetEpisode = clamp(episode, 1, totalEpisodes);
  entry.episodesWatched = Math.max(entry.episodesWatched || 0, targetEpisode); entry.lastWatched = now; recordWatchTime(id, now);
  if (["plan-to-watch", "queued", "dropped", "paused", "untracked"].includes(entry.status)) entry.status = "watching";
  let completed = false;
  if (entry.episodes > 0 && entry.episodesWatched >= entry.episodes) { entry.episodesWatched = entry.episodes; completed = true; }
  else if (entry.status === "completed") { entry.status = "watching"; entry.completedAt = 0; }
  saveData(); if (options.render !== false) renderApp();
  if (!options.silent && !completed) showToast(`Marked episode ${targetEpisode} watched.`, "success");
  if (completed) showCompletionRatingPrompt(id);
  return { completed, entry };
}
function handlePlaybackEnded() {
  const entry = getEntry(currentWatchId); if (!entry) return;
  const endedKey = `${currentWatchId}:${currentEpisode}`;
  if (uiState.watch.lastEndedKey === endedKey) return;
  uiState.watch.lastEndedKey = endedKey;
  const result = markEpisodeWatched(currentWatchId, currentEpisode, { silent: true, render: false });
  if (!result) return; if (result.completed) return;
  const totalEpisodes = getPlayableEpisodeCount(entry);
  const shouldRestoreFullscreen = isFullscreen(); if (shouldRestoreFullscreen) exitFullscreenSafe();
  if (currentEpisode < totalEpisodes) {
    currentEpisode += 1;
    const groups = getEpisodeGroups(totalEpisodes);
    const newGroupIndex = getGroupForEpisode(currentEpisode, groups);
    if (newGroupIndex !== currentEpisodeGroupIndex) { currentEpisodeGroupIndex = newGroupIndex; uiState.watch.episodeGroupIndex = currentEpisodeGroupIndex; }
  }
  renderApp(); showToast("Episode finished. Loading the next one.", "info");
  if (shouldRestoreFullscreen) requestAnimationFrame(() => { const container = document.querySelector(".watch-player__frame"); if (container) requestFullscreenOn(container); });
}
function renderEpisodeGroupSelector(entry, currentGroupIndex) {
  const totalEpisodes = getPlayableEpisodeCount(entry); const groups = getEpisodeGroups(totalEpisodes);
  if (groups.length <= 1) return "";
  const chips = groups.map((group, idx) => `<button type="button" class="group-chip ${idx === currentGroupIndex ? "active" : ""}" data-action="switch-episode-group" data-group-index="${idx}">${escapeHtml(group.label)}</button>`).join("");
  return `<div class="episode-group-selector"><div class="group-chips">${chips}</div></div>`;
}
function renderEpisodeListHtml(entry, groupIndex) {
  const cachedEpisodeData = episodeCache[entry.anilistId] || { duration: null, episodes: {} };
  const totalEpisodes = getPlayableEpisodeCount(entry); const groups = getEpisodeGroups(totalEpisodes);
  const group = groups[groupIndex] || groups[0]; if (!group) return '<div class="empty-state">No episodes</div>';
  const durationLabel = cachedEpisodeData.duration ? `${cachedEpisodeData.duration}m` : "--";
  const episodesInGroup = []; for (let ep = group.start; ep <= group.end; ep++) episodesInGroup.push(ep);
  return episodesInGroup.map(episodeNumber => {
    const isCurrent = episodeNumber === currentEpisode, isWatched = episodeNumber <= (entry.episodesWatched || 0);
    const episodeMeta = cachedEpisodeData.episodes[episodeNumber] || {};
    const episodeName = episodeMeta.name || `Episode ${episodeNumber}`;
    const thumbnail = episodeMeta.thumbnail || "";
    return `<button type="button" class="ep-row ${isCurrent ? "current" : ""} ${isWatched ? "watched" : ""}" data-action="set-episode" data-ep="${episodeNumber}"><span class="ep-num">${isWatched ? " &#10003; " : ""}${episodeNumber}</span><span class="ep-name">${escapeHtml(episodeName)}</span><span class="ep-dur">${escapeHtml(durationLabel)}</span>${thumbnail ? `<div class="ep-thumbnail-preview"><img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(episodeName)}"></div>` : ""}</button>`;
  }).join("");
}
function paintEpisodeList(id) {
  const entry = getEntry(id); const groupSelector = document.getElementById("episodeGroupSelector"); const list = document.getElementById("episodeList");
  if (!entry || !list) return;
  const groups = getEpisodeGroups(getPlayableEpisodeCount(entry));
  if (groupSelector && groups.length > 1) { const selectorHtml = renderEpisodeGroupSelector(entry, currentEpisodeGroupIndex); groupSelector.innerHTML = selectorHtml; }
  list.innerHTML = renderEpisodeListHtml(entry, currentEpisodeGroupIndex);
  const currentRow = list.querySelector(".ep-row.current"); if (currentRow) currentRow.scrollIntoView({ block: "nearest" });
}
async function renderWatchOrder(anilistId, sortMode = "recommended") {
  currentWatchOrderSort = sortMode; const mount = document.getElementById("watchOrderMount"); if (!mount) return;
  const relations = franchiseCache[anilistId] || [];
  const currentLibraryEntry = getEntryByAnimeId(anilistId);
  const currentFranchiseTitle = (currentLibraryEntry && getDisplayTitle(currentLibraryEntry)) || ((relations[0] && relations[0].title && (relations[0].title.english || relations[0].title.romaji)) || "This Franchise");
  if (!relations.length) { mount.innerHTML = `<section class="watch-order-section"><div class="wo-header"><div><div class="wo-title">Watch Order</div><div class="wo-subtitle">${escapeHtml(currentFranchiseTitle)} - Complete Guide</div></div><div class="wo-toggle"><button type="button" class="wo-toggle-btn ${sortMode === "recommended" ? "active" : ""}" data-action="set-watch-order-sort" data-sort="recommended">Recommended</button><button type="button" class="wo-toggle-btn ${sortMode === "release" ? "active" : ""}" data-action="set-watch-order-sort" data-sort="release">Release Order</button></div></div>${renderEmptyState("...", "Loading watch order...", "AniVault is fetching the franchise guide from AniList.")}</section>`; return; }
  const sorted = [...relations].sort((left, right) => {
    if (sortMode === "release") return getDateWeight(left.startDate) - getDateWeight(right.startDate);
    const priorityDiff = (WATCH_ORDER_PRIORITY[left.relationType] || 99) - (WATCH_ORDER_PRIORITY[right.relationType] || 99);
    if (priorityDiff !== 0) return priorityDiff;
    return getDateWeight(left.startDate) - getDateWeight(right.startDate);
  });
  const cards = sorted.length <= 1 ? renderEmptyState("WO", "No related entries found for this franchise on AniList.", "AniList did not return more connected anime for this title.") : `<div class="wo-cards">${sorted.map(item => {
    const libraryEntry = getEntryByAnimeId(item.id);
    const title = (item.title && (item.title.english || item.title.romaji)) || "Untitled";
    const relationLabel = formatRelationLabel(item);
    const year = item.startDate && item.startDate.year ? item.startDate.year : (item.seasonYear || "Unknown");
    return `<button type="button" class="wo-card" data-action="watch-order-card" data-id="${item.id}"><div class="wo-cover-wrap">${item.coverImage && item.coverImage.large ? `<img class="wo-cover" src="${escapeHtml(item.coverImage.large)}" alt="${escapeHtml(title)}">` : `<div class="wo-cover"></div>`}${item.format ? `<span class="wo-format-badge" style="background:${getFormatBadgeColor(item.format)}">${escapeHtml(item.format.replaceAll("_", " "))}</span>` : ""}${item.isCurrent ? `<span class="wo-now-badge">&#9679; NOW WATCHING</span>` : ""}</div><div class="wo-card-title">${escapeHtml(title)}</div><div class="wo-card-meta">${escapeHtml(String(year))}</div><div class="wo-card-relation">${escapeHtml(relationLabel)}</div>${item.averageScore ? `<div class="wo-card-meta">&#11088; ${item.averageScore}</div>` : ""}${libraryEntry ? `<div class="wo-card-progress">${libraryEntry.episodesWatched || 0}/${libraryEntry.episodes || "?"} ep</div>` : `<div class="wo-card-meta">Not Added</div>`}</button>`;
  }).join("")}</div>`;
  mount.innerHTML = `<section class="watch-order-section"><div class="wo-header"><div><div class="wo-title">Watch Order</div><div class="wo-subtitle">${escapeHtml(currentFranchiseTitle)} - Complete Guide</div></div><div class="wo-toggle"><button type="button" class="wo-toggle-btn ${sortMode === "recommended" ? "active" : ""}" data-action="set-watch-order-sort" data-sort="recommended">Recommended</button><button type="button" class="wo-toggle-btn ${sortMode === "release" ? "active" : ""}" data-action="set-watch-order-sort" data-sort="release">Release Order</button></div></div>${cards}</section>`;
}
function renderRatingComponent(id, containerId) {
  const labels = { 1: "Appalling", 2: "Horrible", 3: "Very Bad", 4: "Bad", 5: "Average", 6: "Fine", 7: "Good", 8: "Very Good", 9: "Great", 10: "Masterpiece" };
  const entry = getEntry(id); const container = document.getElementById(containerId); if (!entry || !container) return;
  const deferredMode = container.dataset.ratingMode === "deferred";
  const savedRating = deferredMode ? Number(container.dataset.selectedRating || entry.rating || 0) : Number(entry.rating || 0);
  container.innerHTML = `<div class="rating-component"><div class="rating-blocks">${Array.from({ length: 10 }, (_, index) => `<button type="button" class="rating-block" data-score="${index + 1}">${index + 1}</button>`).join("")}</div><div class="rating-label"></div></div>`;
  const blocksRow = container.querySelector(".rating-blocks"), blocks = Array.from(container.querySelectorAll(".rating-block")), label = container.querySelector(".rating-label");
  function updateDisplay(score) {
    const activeColor = getRatingColor(score);
    blocks.forEach((block, index) => {
      const blockScore = index + 1, filled = score > 0 && blockScore <= score;
      block.classList.toggle("filled", filled); block.style.background = filled ? activeColor : ""; block.style.borderColor = filled ? "transparent" : ""; block.style.color = filled ? "#ffffff" : "";
    });
    label.textContent = score > 0 ? labels[score] : "Rate this anime"; label.style.color = score > 0 ? activeColor : "";
  }
  updateDisplay(savedRating);
  blocks.forEach(block => {
    const score = Number(block.dataset.score);
    block.addEventListener("mouseenter", () => updateDisplay(score));
    block.addEventListener("click", () => {
      const currentScore = deferredMode ? Number(container.dataset.selectedRating || 0) : Number(getEntry(id)?.rating || 0);
      const nextScore = currentScore === score ? 0 : score;
      if (deferredMode) { container.dataset.selectedRating = String(nextScore); updateDisplay(nextScore); return; }
      const latestEntry = getEntry(id); if (!latestEntry) return; latestEntry.rating = nextScore; saveData(); updateDisplay(nextScore);
    });
  });
  blocksRow.addEventListener("mouseleave", () => { const resetScore = deferredMode ? Number(container.dataset.selectedRating || 0) : Number(getEntry(id)?.rating || 0); updateDisplay(resetScore); });
}
function finalizeCompletion(id) {
  const entry = getEntry(id); if (!entry) return;
  entry.status = "completed"; entry.completedAt = Date.now(); saveData(); renderApp();
  showToast(`🎉 ${entry.title} marked complete!`, "success");
  window.clearTimeout(completionReturnTimer); completionReturnTimer = window.setTimeout(() => renderTab("home"), 3000);
}
function showCompletionRatingPrompt(id) {
  const entry = getEntry(id); if (!entry) return;
  if (entry.rating > 0) { finalizeCompletion(id); return; }
  const existingOverlay = document.querySelector(".rating-overlay"); if (existingOverlay) existingOverlay.remove();
  const overlay = document.createElement("div"); overlay.className = "rating-overlay";
  overlay.innerHTML = `<div class="rating-overlay-box">${entry.cover ? `<img class="rating-overlay-cover" src="${escapeHtml(entry.cover)}" alt="${escapeHtml(getDisplayTitle(entry))}">` : ""}<div class="rating-overlay-title">${escapeHtml(getDisplayTitle(entry))}</div><div class="rating-overlay-sub">You finished it! How would you rate it?</div><div id="completionRatingContainer" data-rating-mode="deferred" data-selected-rating="0"></div><button type="button" class="rating-save-btn" data-action="save-completion-rating" data-id="${id}">Save Rating</button><button type="button" class="rating-skip-link" data-action="skip-completion-rating" data-id="${id}">Skip</button></div>`;
  document.body.appendChild(overlay); renderRatingComponent(id, "completionRatingContainer");
  overlay.querySelector(".rating-save-btn")?.addEventListener("click", () => {
    const overlayRating = document.getElementById("completionRatingContainer");
    const score = Number((overlayRating && overlayRating.dataset.selectedRating) || 0);
    const latestEntry = getEntry(id);
    if (latestEntry && score > 0 && latestEntry.rating === 0) { latestEntry.rating = score; saveData(); showToast(`⭐ ${score}/10 - ${getRatingLabel(score)}`, "success"); }
    overlay.remove(); finalizeCompletion(id);
  });
  overlay.querySelector(".rating-skip-link")?.addEventListener("click", () => { overlay.remove(); finalizeCompletion(Number(overlay.dataset.id)); });
}
async function handleWatchOrderCardClick(anilistId, cardData) {
  const existing = getEntryByAnimeId(anilistId);
  if (existing) openWatchView(existing.id); else { await addToLibrary(cardData, "watching", { toast: false, render: false }); showToast(`Added ${cardData.title.romaji} to your library`, "info"); openWatchView(cardData.id); }
}
function quickWatchNow(anilistData) {
  const existing = getEntryByAnimeId(anilistData.id);
  if (existing) openWatchView(existing.id); else { addToLibrary(anilistData, "watching", { toast: false, render: false }); showToast(`Added ${anilistData.title.romaji} - opening player`, "info"); openWatchView(anilistData.id); }
}
function removeFromLibrary(id) {
  const entry = getEntry(id); if (!entry) { showToast("Title not found in library.", "error"); return; }
  const title = getDisplayTitle(entry); delete userData[String(id)]; saveData();
  if (currentWatchId === id) closeWatchView();
  if (uiState.overlay && uiState.overlay.id === id) uiState.overlay = null;
  if (uiState.inlineStatusPicker && uiState.inlineStatusPicker.id === id) uiState.inlineStatusPicker = null;
  renderApp(); showToast(`Removed "${title}" from your library.`, "info");
}
function renderWatchView() {
  const entry = getEntry(currentWatchId); if (!entry) return renderEmptyState("!", "Title missing", "This anime is no longer in your library.");
  const totalEpisodes = getPlayableEpisodeCount(entry);
  const currentUrl = buildStreamUrl(entry, currentEpisode, entry.language, uiState.watch.currentProvider);
  const provider = STREAM_PROVIDERS[uiState.watch.currentProvider] || STREAM_PROVIDERS[0];
  const fallbackUrl = `https://hianime.re/search?keyword=${encodeURIComponent(getDisplayTitle(entry))}`;
  const progressLabel = `${entry.episodesWatched || 0} / ${entry.episodes || "?"} episodes watched`;
  const cachedEpisodeData = episodeCache[entry.anilistId] || { episodes: {} };
  const currentEpMeta = cachedEpisodeData.episodes[currentEpisode] || {};
  const episodeSynopsis = currentEpMeta.synopsis || "";
  return `<div class="page page--watch"><div class="watch-layout" id="watchViewContainer">
    <aside class="watch-sidebar watch-sidebar--left">
      <div class="watch-meta"><div class="watch-title">${escapeHtml(getDisplayTitle(entry))}</div><div class="watch-meta__row"><span class="${getStatusClass(entry.status)}">${escapeHtml(STATUS_LABELS[entry.status])}</span>${entry.averageScore ? `<span class="watch-badge">AniList ${entry.averageScore}</span>` : ""}${entry.year ? `<span class="watch-badge">${entry.year}</span>` : ""}</div></div>
      <div class="watch-language-sticky"><div class="language-toggle" role="group" aria-label="Audio language"><button type="button" class="${entry.language === "sub" ? "is-active" : ""}" data-action="switch-language" data-lang="sub">SUB</button><button type="button" class="${entry.language === "dub" ? "is-active" : ""}" data-action="switch-language" data-lang="dub">DUB</button></div></div>
      <div class="watch-sidebar__body watch-sidebar__body--compact"><div class="current-episode-synopsis">${episodeSynopsis ? `<div class="ep-synopsis-label">Ep ${currentEpisode}: ${escapeHtml(currentEpMeta.name || "")}</div><div class="ep-synopsis-text">${escapeHtml(episodeSynopsis)}</div>` : `<div class="ep-synopsis-label">Episode ${currentEpisode}</div><div class="ep-synopsis-text muted">No synopsis available</div>`}</div></div>
      <div class="watch-sidebar-bottom"><div class="watch-progress-label">${escapeHtml(progressLabel)}</div><div id="watchViewRatingContainer"></div><div><label class="muted" for="watchStatusSelect">Status</label><select id="watchStatusSelect" class="select" data-status-select="${entry.id}">${STATUS_OPTIONS.map(status => `<option value="${status}" ${entry.status === status ? "selected" : ""}>${STATUS_LABELS[status]}</option>`).join("")}</select></div></div>
    </aside>
    <section class="watch-player">
      <div class="watch-player__frame">${currentUrl && !uiState.watch.forceFallback ? `<iframe src="${escapeHtml(currentUrl)}" title="${escapeHtml(getDisplayTitle(entry))}" allow="autoplay; fullscreen" allowfullscreen data-watch-iframe></iframe>` : `<div class="watch-player__fallback"><div class="watch-player__fallback-card"><div class="watch-title">No stream available for this title via ${provider.name}</div><div class="muted">Try switching providers below or search manually.</div><a class="action-button" href="${escapeHtml(fallbackUrl)}" target="_blank" rel="noopener">Search on HiAnime -&gt;</a></div></div>`}</div>
      <div class="watch-player__controls"><button type="button" class="secondary-button" data-action="watch-prev" ${currentEpisode <= 1 ? "disabled" : ""}>&larr; Prev</button><strong class="watch-player__ep-label">Ep ${currentEpisode} / ${entry.episodes || "?"}</strong><button type="button" class="secondary-button" data-action="watch-next" ${currentEpisode >= totalEpisodes ? "disabled" : ""}>Next &rarr;</button><button type="button" class="secondary-button" data-action="switch-provider" ${STREAM_PROVIDERS.length <= 1 ? "disabled" : ""} title="Switch provider">${provider.name}</button><button type="button" class="secondary-button watch-fs-btn" data-action="toggle-fullscreen" title="Fullscreen (F)">&#x26F6;</button></div>
    </section>
    <aside class="watch-sidebar watch-sidebar--right">
      <div class="watch-sidebar__body"><div id="episodeGroupSelector"></div><div class="episode-list" id="episodeList"></div></div>
      <div class="watch-sidebar-footer-buttons"><button type="button" class="action-button" data-action="watch-mark">Mark Watched</button><button type="button" class="secondary-button" data-action="remove-from-library" data-id="${entry.id}">Remove</button><button type="button" class="secondary-button" data-action="watch-back"> &larr; Back</button></div>
    </aside>
  </div><div id="watchOrderMount"></div></div>`;
}

/* CARDS */
function addToLibrary(anilistData, status, options = {}) {
  const media = adaptAniListMedia(anilistData);
  const existing = getEntry(media.id);
  const next = normalizeEntry({ ...(existing || {}), id: media.id, title: media.title.romaji || (existing && existing.title) || "Untitled", titleEnglish: media.title.english || (existing && existing.titleEnglish) || "", cover: media.coverImage.large || (existing && existing.cover) || "", banner: media.bannerImage || (existing && existing.banner) || "", episodes: media.episodes || (existing && existing.episodes) || 0, status: status || (existing && existing.status) || "untracked", episodesWatched: (existing && existing.episodesWatched) || 0, language: (existing && existing.language) || "sub", rating: (existing && existing.rating) || 0, dateAdded: (existing && existing.dateAdded) || Date.now(), lastWatched: (existing && existing.lastWatched) || 0, completedAt: (existing && existing.completedAt) || 0, notes: (existing && existing.notes) || "", genres: media.genres || (existing && existing.genres) || [], year: media.seasonYear || (existing && existing.year) || 0, anilistId: media.id, sessionLog: (existing && existing.sessionLog) || [], averageScore: media.averageScore || (existing && existing.averageScore) || 0 });
  if (!next) return;
  userData[String(next.id)] = next; saveData(); uiState.inlineStatusPicker = null; uiState.overlay = null;
  if (options.render !== false) renderApp(); if (options.toast !== false) showToast(`${getDisplayTitle(next)} added to your library.`, "success");
}
function getAniListResultBySource(source, id) { const bucket = source === "browse" ? uiState.browse.results : uiState.search.results; return bucket.find((item) => Number(item.id) === Number(id)) || null; }
function openStatusPicker(source, id) {
  const media = getAniListResultBySource(source, id); if (!media) return;
  if (uiState.inlineStatusPicker && uiState.inlineStatusPicker.source === source && Number(uiState.inlineStatusPicker.id) === Number(id)) { uiState.inlineStatusPicker = null; renderApp(); return; }
  uiState.inlineStatusPicker = { source, id: Number(id) }; renderApp();
  const closeHandler = (clickEvent) => {
    const pickerElement = document.querySelector(`.status-picker[data-picker-id="${source}-${id}"]`);
    if (pickerElement && !pickerElement.contains(clickEvent.target)) { uiState.inlineStatusPicker = null; renderApp(); document.removeEventListener("click", closeHandler); }
  };
  setTimeout(() => document.addEventListener("click", closeHandler), 0);
}
function openDetailOverlay(id) { const entry = getEntry(id); if (!entry) return; uiState.overlay = { type: "detail", id }; renderApp(); }

/* MODALS */
function renderOverlay() {
  if (!uiState.overlay) return "";
  if (uiState.overlay.type === "status-picker") {
    const media = getAniListResultBySource(uiState.overlay.source, uiState.overlay.id); if (!media) return "";
    const title = media.title.english || media.title.romaji;
    return `<div class="overlay" data-action="close-overlay"><div class="overlay-card" role="dialog" aria-modal="true" aria-label="Add to library" data-overlay-card><div class="overlay-card__meta"><div class="overlay-card__title">Add ${escapeHtml(title)}</div><div class="muted">Choose how this title should enter your private library.</div></div><div class="status-picker"><button type="button" class="action-button" data-action="picker-status" data-source="${uiState.overlay.source}" data-id="${media.id}" data-status="watching">Start Watching</button><button type="button" class="secondary-button" data-action="picker-status" data-source="${uiState.overlay.source}" data-id="${media.id}" data-status="queued">Add to Queue</button><button type="button" class="secondary-button" data-action="picker-status" data-source="${uiState.overlay.source}" data-id="${media.id}" data-status="plan-to-watch">Save for Later</button><button type="button" class="nav-button" data-action="close-overlay">Cancel</button></div></div></div>`;
  }
  if (uiState.overlay.type === "detail") {
    const entry = getEntry(uiState.overlay.id); if (!entry) return "";
    return `<div class="overlay" data-action="close-overlay"><div class="overlay-card" role="dialog" aria-modal="true" aria-label="Anime details" data-overlay-card><div class="overlay-card__hero"><div class="overlay-card__cover">${entry.cover ? `<img src="${escapeHtml(entry.cover)}" alt="${escapeHtml(getDisplayTitle(entry))}">` : ""}</div><div class="overlay-card__meta"><div class="overlay-card__title">${escapeHtml(getDisplayTitle(entry))}</div><div class="muted">${escapeHtml(formatCount(entry.episodes || 0, "episode"))}${entry.year ? ` • ${entry.year}` : ""}</div><div class="watch-meta__row"><span class="${getStatusClass(entry.status)}">${escapeHtml(STATUS_LABELS[entry.status])}</span>${entry.averageScore ? `<span class="watch-badge">AniList ${entry.averageScore}</span>` : ""}</div><select class="select" data-status-select="${entry.id}">${STATUS_OPTIONS.map(status => `<option value="${status}" ${entry.status === status ? "selected" : ""}>${STATUS_LABELS[status]}</option>`).join("")}</select></div></div><div class="overlay-card__actions"><button type="button" class="action-button" data-action="open-watch" data-id="${entry.id}"> &#9654; Start Watching</button><button type="button" class="secondary-button" data-action="remove-from-library" data-id="${entry.id}">Remove from Library</button><button type="button" class="nav-button" data-action="close-overlay">Close</button></div></div></div>`;
  }
  if (uiState.overlay.type === "settings") {
    const accentColors = [
      { name: "Violet", value: "#7c3aed" },
      { name: "Blue", value: "#2563eb" },
      { name: "Cyan", value: "#0891b2" },
      { name: "Emerald", value: "#059669" },
      { name: "Orange", value: "#ea580c" },
      { name: "Pink", value: "#db2777" },
      { name: "Red", value: "#dc2626" },
      { name: "Yellow", value: "#ca8a04" }
    ];
    return `<div class="overlay" data-action="close-overlay"><div class="overlay-card" role="dialog" aria-modal="true" aria-label="Settings" data-overlay-card>
      <div class="overlay-card__meta" style="padding-bottom:16px;border-bottom:1px solid var(--glass-border);margin-bottom:16px;">
        <div class="overlay-card__title">Settings</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div><div class="muted" style="margin-bottom:8px;font-weight:600;">Accent Color</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${accentColors.map(c => `<button type="button" class="chip ${uiState.accentColor === c.value ? "is-active" : ""}" data-action="set-accent" data-color="${c.value}" style="width:32px;height:32px;border-radius:50%;background:${c.value};border:2px solid ${uiState.accentColor === c.value ? "white" : "transparent"};"></button>`).join("")}
          </div>
        </div>
        <div><div class="muted" style="margin-bottom:8px;font-weight:600;">Volume</div>
          <input type="range" min="0" max="1" step="0.1" value="${uiState.volume}" data-action="set-volume" style="width:100%;accent-color:var(--accent);">
        </div>
        <div style="display:flex;gap:12px;align-items:center;">
          <label style="display:flex;gap:8px;align-items:center;cursor:pointer;">
            <input type="checkbox" ${uiState.compactMode ? "checked" : ""} data-action="toggle-compact" style="accent-color:var(--accent);">
            <span class="muted">Compact Mode</span>
          </label>
          <label style="display:flex;gap:8px;align-items:center;cursor:pointer;">
            <input type="checkbox" ${uiState.reducedMotion ? "checked" : ""} data-action="toggle-reduced-motion" style="accent-color:var(--accent);">
            <span class="muted">Reduced Motion</span>
          </label>
        </div>
      </div>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--glass-border);text-align:right;">
        <button type="button" class="nav-button" data-action="close-overlay">Close</button>
      </div>
    </div></div>`;
  }
  return "";
}

/* TOAST */
function showToast(message, type = "info") {
  const toast = document.createElement("div"); toast.className = `toast toast--${type}`;
  toast.innerHTML = `<div class="toast__title">${escapeHtml(TOAST_TITLES[type] || TOAST_TITLES.info)}</div><div class="toast__body">${escapeHtml(message)}</div>`;
  toastZone.appendChild(toast); window.setTimeout(() => toast.remove(), 3000);
}

/* UTILITIES */
function exportData() {
  const payload = JSON.stringify(userData, null, 2); const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url; anchor.download = `anivault-backup-${stamp}.json`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  showToast("Backup exported.", "success");
}
function importData(event) {
  const file = event.target.files && event.target.files[0]; if (!file) return;
  const reader = new FileReader(); reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}")); const normalized = normalizeLibrary(parsed); let count = 0;
      Object.values(normalized).forEach(entry => { if (isAnimeEntry(entry)) { userData[String(entry.id)] = entry; count += 1; } });
      saveData(); renderApp(); showToast(`Imported ${count} ${count === 1 ? "title" : "titles"}.`, "success");
    } catch (error) { showToast("That backup file could not be imported.", "error"); } finally { event.target.value = ""; }
  }; reader.readAsText(file);
}
function renderCurrentPage() {
  if (currentWatchId) return renderWatchView();
  if (currentTab === "library") return renderLibrary();
  if (currentTab === "browse") return renderBrowse();
  if (currentTab === "search") return renderSearch();
  if (currentTab === "stats") return renderStats();
  return renderHome();
}
function renderApp() {
  app.innerHTML = `<div class="app-shell">${renderTopNav()}<main class="app-main"><div class="content-shell">${renderCurrentPage()}</div></main>${renderOverlay()}${renderMobileTabs()}<input id="importInput" class="visually-hidden" type="file" accept=".json"></div>`;
  afterRender();
}
function afterRender() {
  document.querySelectorAll("[data-row-track]").forEach(track => { syncScrollButtons(track.id); track.addEventListener("scroll", () => syncScrollButtons(track.id), { passive: true }); });
  if (uiState.navSearchOpen) { const input = document.getElementById("navSearchInput"); if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); } }
  if (uiState.focusInputId) { const focusTarget = document.getElementById(uiState.focusInputId); if (focusTarget) { focusTarget.focus(); if (typeof focusTarget.setSelectionRange === "function") focusTarget.setSelectionRange(focusTarget.value.length, focusTarget.value.length); } uiState.focusInputId = ""; }
  if (currentTab === "search" && !currentWatchId) { const pageInput = document.getElementById("searchPageInput"); if (pageInput && document.activeElement !== pageInput && uiState.search.query) pageInput.setSelectionRange(pageInput.value.length, pageInput.value.length); }
  if (currentTab === "browse" && !uiState.browse.initialized && !uiState.browse.loading) loadBrowse("seasonal");
  if (currentWatchId) { const activeEpisode = document.querySelector(".ep-row.current"); if (activeEpisode) activeEpisode.scrollIntoView({ block: "nearest" }); renderRatingComponent(currentWatchId, "watchViewRatingContainer"); paintEpisodeList(currentWatchId); const currentEntry = getEntry(currentWatchId); if (currentEntry && franchiseCache[currentEntry.anilistId || currentEntry.id]) renderWatchOrder(currentEntry.anilistId || currentEntry.id, currentWatchOrderSort); setupWatchPlayer(); } else window.clearTimeout(streamFallbackTimer);
}
function setupWatchPlayer() {
  window.clearTimeout(streamFallbackTimer); const iframe = document.querySelector("[data-watch-iframe]"); if (!iframe) return;
  uiState.watch.streamLoaded = false;
  iframe.addEventListener("load", () => { uiState.watch.streamLoaded = true; window.clearTimeout(streamFallbackTimer); }, { once: true });
  streamFallbackTimer = window.setTimeout(() => { 
    if (!uiState.watch.streamLoaded && currentWatchId) {
      const currentIdx = uiState.watch.currentProvider;
      const nextIdx = (currentIdx + 1) % STREAM_PROVIDERS.length;
      if (nextIdx !== currentIdx) {
        showToast(`${STREAM_PROVIDERS[currentIdx]?.name || "Stream"} failed. Trying ${STREAM_PROVIDERS[nextIdx]?.name}...`, "info");
        uiState.watch.currentProvider = nextIdx;
        uiState.watch.streamLoaded = false;
        uiState.watch.forceFallback = false;
        renderApp();
      } else {
        uiState.watch.forceFallback = true;
        renderApp();
        showToast("All providers failed. Anime may not be available.", "error");
      }
    } 
  }, 120000);
}
function syncScrollButtons(trackId) {
  const track = document.getElementById(trackId); if (!track) return;
  const prevButton = document.querySelector(`[data-target="${trackId}"][data-dir="prev"]`), nextButton = document.querySelector(`[data-target="${trackId}"][data-dir="next"]`);
  if (!prevButton || !nextButton) return;
  const maxScroll = track.scrollWidth - track.clientWidth; const atStart = track.scrollLeft <= 4; const atEnd = maxScroll <= 4 || track.scrollLeft >= maxScroll - 4;
  prevButton.disabled = atStart; nextButton.disabled = atEnd;
}
function scrollRow(trackId, direction) {
  const track = document.getElementById(trackId); if (!track) return;
  const amount = Math.max(track.clientWidth * 0.8, 220);
  track.scrollBy({ left: direction === "next" ? amount : -amount, behavior: "smooth" });
}

/* EVENTS */
function handleClick(event) {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) {
    if (uiState.inlineStatusPicker && !event.target.closest(".card-actions__picker-wrap")) { uiState.inlineStatusPicker = null; renderApp(); return; }
    if (event.target.hasAttribute("data-overlay-card") || event.target.closest("[data-overlay-card]")) return;
    if (event.target.classList.contains("overlay")) { uiState.overlay = null; renderApp(); }
    return;
  }
  const action = actionTarget.dataset.action;
  if (action === "tab") { renderTab(actionTarget.dataset.tab); return; }
  if (action === "toggle-menu") { uiState.navMenuOpen = !uiState.navMenuOpen; renderApp(); return; }
  if (action === "toggle-nav-search") { uiState.navSearchOpen = !uiState.navSearchOpen; if (uiState.navSearchOpen) currentTab = "search"; renderApp(); return; }
  if (action === "export") { exportData(); return; }
  if (action === "import") { const input = document.getElementById("importInput"); if (input) input.click(); return; }
  if (action === "toggle-theme") { toggleTheme(); return; }
  if (action === "row-scroll") { scrollRow(actionTarget.dataset.target, actionTarget.dataset.dir); return; }
  if (action === "open-watch") { openWatchView(Number(actionTarget.dataset.id)); return; }
  if (action === "open-detail") { openDetailOverlay(Number(actionTarget.dataset.id)); return; }
  if (action === "close-overlay") { uiState.overlay = null; renderApp(); return; }
  if (action === "open-settings") { uiState.overlay = { type: "settings" }; renderApp(); return; }
  if (action === "set-accent") { uiState.accentColor = actionTarget.dataset.color; document.documentElement.style.setProperty("--accent", uiState.accentColor); document.documentElement.style.setProperty("--accent-bright", actionTarget.dataset.color); saveData(); renderApp(); return; }
  if (action === "set-volume") { uiState.volume = parseFloat(actionTarget.value); saveData(); return; }
  if (action === "toggle-compact") { uiState.compactMode = !uiState.compactMode; document.body.classList.toggle("compact-mode", uiState.compactMode); saveData(); renderApp(); return; }
  if (action === "toggle-reduced-motion") { uiState.reducedMotion = !uiState.reducedMotion; document.body.classList.toggle("reduced-motion", uiState.reducedMotion); saveData(); renderApp(); return; }
  if (action === "open-status-picker") { openStatusPicker(actionTarget.dataset.source, Number(actionTarget.dataset.id)); return; }
  if (action === "quick-watch-now") { const media = getAniListResultBySource(actionTarget.dataset.source, Number(actionTarget.dataset.id)); if (media) quickWatchNow(media); return; }
  if (action === "quick-add-status") { event.stopPropagation(); const media = getAniListResultBySource(actionTarget.dataset.source, Number(actionTarget.dataset.id)); if (media) addToLibrary(media, actionTarget.dataset.status); return; }
  if (action === "picker-status") { const media = getAniListResultBySource(actionTarget.dataset.source, Number(actionTarget.dataset.id)); if (media) addToLibrary(media, actionTarget.dataset.status); return; }
  if (action === "set-library-filter") { uiState.library.filter = actionTarget.dataset.filter; renderApp(); return; }
  if (action === "browse-mode") { loadBrowse(actionTarget.dataset.mode); return; }
  if (action === "browse-genre") { loadBrowse("genre", actionTarget.dataset.genre); return; }
  if (action === "browse-genre-select") { 
    const value = event.target.value;
    if (value === "CLEAR" || value === "") { uiState.browse.page = 1; uiState.browse.hasMore = true; loadBrowse("seasonal"); }
    else { loadBrowse("genre", value); }
    return; 
  }
  if (action === "genre-search") {
    const query = event.target.value.toLowerCase();
    const selectEl = document.getElementById("genreSelect");
    let options = [];
    if (query.length >= 1) {
      const existing = BROWSE_GENRES.filter(g => g.toLowerCase().includes(query));
      if (query.length >= 2 && existing.length === 0) options.push(`<option value="${event.target.value.toUpperCase()}">Search: "${event.target.value}"</option>`);
      options = options.concat(existing.map(g => `<option value="${g}">${g}</option>`));
    }
    if (options.length === 0) options = BROWSE_GENRES.map(g => `<option value="${g}">${g}</option>`);
    selectEl.innerHTML = `<option value="CLEAR">🔄 Show All Anime (No Filter)</option>${options.join("")}`;
    selectEl.focus();
    return;
  }
  if (action === "browse-initial") { const initial = actionTarget.dataset.initial; const genresForLetter = GENRE_ALPHABET[initial] || []; if (genresForLetter.length || initial === "ALL") { loadBrowse(initial === "ALL" ? "seasonal" : "genre", genresForLetter[0] || ""); } return; }
  if (action === "browse-load-more") { loadBrowseMore(); return; }
  if (action === "watch-back") { closeWatchView(); return; }
  if (action === "watch-prev") { if (currentWatchId) switchEpisode(currentWatchId, currentEpisode - 1); return; }
  if (action === "watch-next") { if (currentWatchId) switchEpisode(currentWatchId, currentEpisode + 1); return; }
  if (action === "watch-mark") { if (currentWatchId) markEpisodeWatched(currentWatchId, currentEpisode); return; }
  if (action === "toggle-fullscreen") { toggleWatchFullscreen(); return; }
  if (action === "switch-provider") { 
    const nextProvider = (uiState.watch.currentProvider + 1) % STREAM_PROVIDERS.length; 
    uiState.watch.currentProvider = nextProvider; 
    uiState.watch.streamLoaded = false; 
    uiState.watch.forceFallback = false;
    renderApp(); 
    showToast(`Switched to ${STREAM_PROVIDERS[nextProvider].name}`, "info");
    return; 
  }
  if (action === "switch-language") { if (currentWatchId) switchLanguage(currentWatchId, actionTarget.dataset.lang); return; }
  if (action === "set-episode") { if (currentWatchId) switchEpisode(currentWatchId, Number(actionTarget.dataset.ep)); return; }
  if (action === "set-rating") { if (currentWatchId) setRating(currentWatchId, Number(actionTarget.dataset.rating)); return; }
  if (action === "set-watch-order-sort") { const entry = getEntry(currentWatchId); if (entry) renderWatchOrder(entry.anilistId || entry.id, actionTarget.dataset.sort); return; }
  if (action === "watch-order-card") { const entry = getEntry(currentWatchId); if (entry) { const relations = franchiseCache[entry.anilistId || entry.id] || []; const cardData = relations.find((item) => Number(item.id) === Number(actionTarget.dataset.id)); if (cardData) handleWatchOrderCardClick(cardData.id, cardData); } return; }
  if (action === "save-completion-rating") { const overlayRating = document.getElementById("completionRatingContainer"); const score = Number((overlayRating && overlayRating.dataset.selectedRating) || 0); const targetId = Number(actionTarget.dataset.id); const entry = getEntry(targetId); if (entry && score > 0 && entry.rating === 0) { entry.rating = score; saveData(); showToast(`⭐ ${score}/10 - ${getRatingLabel(score)}`, "success"); } document.querySelector(".rating-overlay")?.remove(); finalizeCompletion(targetId); return; }
  if (action === "skip-completion-rating") { document.querySelector(".rating-overlay")?.remove(); finalizeCompletion(Number(actionTarget.dataset.id)); return; }
  if (action === "remove-from-library") { removeFromLibrary(Number(actionTarget.dataset.id)); return; }
  if (action === "switch-episode-group") { const newGroupIndex = parseInt(actionTarget.dataset.groupIndex, 10); if (!isNaN(newGroupIndex) && currentWatchId) { currentEpisodeGroupIndex = newGroupIndex; uiState.watch.episodeGroupIndex = currentEpisodeGroupIndex; renderApp(); } return; }
  if (action === "clear-filters") { uiState.search.filters = { yearMin: 0, yearMax: 0, scoreMin: 0, episodesMin: 0, status: "" }; renderApp(); return; }
  if (actionTarget.dataset.filter === "status") { uiState.search.filters.status = actionTarget.dataset.value; renderApp(); return; }
}
function handleInput(event) {
  if (event.target.id === "librarySearchInput") { uiState.library.query = event.target.value; uiState.focusInputId = "librarySearchInput"; renderApp(); return; }
  if (event.target.dataset.filter) { const key = event.target.dataset.filter; uiState.search.filters[key] = parseInt(event.target.value, 10) || 0; return; }
  if (["searchPageInput", "navSearchInput", "mobileNavSearchInput"].includes(event.target.id)) {
    uiState.search.query = event.target.value; currentTab = "search";
    uiState.navSearchOpen = event.target.id === "navSearchInput";
    uiState.focusInputId = event.target.id;
    scheduleAniListSearch(uiState.search.query);
    /* FIX: Do NOT call renderApp() here — it destroys the input and loses focus.
       scheduleAniListSearch → runAniListSearch → queueRender handles the results update.
       We only need to sync library matches immediately (no API call needed). */
    const libraryResults = document.querySelector(".search-layout .section");
    if (libraryResults) {
      /* partial re-render just for library matches row — no full re-render */
      window.requestAnimationFrame(() => {
        const matches = getSearchLibraryMatches();
        const track = document.getElementById("searchLibraryRow");
        if (track) {
          track.innerHTML = matches.map((entry) => renderSearchCard({ id: entry.id, title: { romaji: entry.title, english: entry.titleEnglish }, coverImage: { large: entry.cover }, episodes: entry.episodes, averageScore: entry.averageScore, status: entry.status })).join("");
          syncScrollButtons("searchLibraryRow");
        }
        /* keep focus */
        const focusTarget = document.getElementById(uiState.focusInputId);
        if (focusTarget && document.activeElement !== focusTarget) {
          focusTarget.focus();
          if (typeof focusTarget.setSelectionRange === "function") focusTarget.setSelectionRange(focusTarget.value.length, focusTarget.value.length);
        }
      });
    }
  }
}
function handleChange(event) {
  if (event.target.id === "librarySortSelect") { uiState.library.sort = event.target.value; renderApp(); return; }
  if (event.target.id === "importInput") { importData(event); return; }
  if (event.target.dataset.statusSelect) updateStatus(Number(event.target.dataset.statusSelect), event.target.value);
}
function handleFocusOut(event) {
  if (!event.target.dataset.notesField) return;
  const entry = getEntry(Number(event.target.dataset.notesField)); if (!entry) return;
  entry.notes = event.target.value.trim(); saveData(); showToast("Notes saved.", "success");
}
function handleKeydown(event) {
  const tag = document.activeElement && document.activeElement.tagName ? document.activeElement.tagName.toLowerCase() : "";
  const isTyping = tag === "input" || tag === "textarea" || tag === "select" || (document.activeElement && document.activeElement.isContentEditable);
  if (event.key === "Escape") { if (uiState.overlay) { uiState.overlay = null; renderApp(); return; } if (currentWatchId) closeWatchView(); return; }
  if (!currentWatchId || isTyping) return;
  if (event.key === "ArrowLeft") { event.preventDefault(); switchEpisode(currentWatchId, currentEpisode - 1); return; }
  if (event.key === "ArrowRight") { event.preventDefault(); switchEpisode(currentWatchId, currentEpisode + 1); return; }
  if (event.key.toLowerCase() === "m") { event.preventDefault(); markEpisodeWatched(currentWatchId, currentEpisode); return; }
  if (event.key.toLowerCase() === "f") { event.preventDefault(); toggleWatchFullscreen(); return; }
  if (event.shiftKey && event.key.toLowerCase() === "n") { event.preventDefault(); switchEpisode(currentWatchId, currentEpisode + 1); return; }
  if (event.shiftKey && event.key.toLowerCase() === "p") { event.preventDefault(); switchEpisode(currentWatchId, currentEpisode - 1); return; }
  if (event.key === " ") { const iframe = document.querySelector("[data-watch-iframe]"); if (iframe) { event.preventDefault(); iframe.focus(); } }
  if (event.key.toLowerCase() === "w") { event.preventDefault(); const entry = getEntry(currentWatchId); if (entry) { uiState.watch.currentProvider = (uiState.watch.currentProvider + 1) % STREAM_PROVIDERS.length; uiState.watch.streamLoaded = false; uiState.watch.forceFallback = false; renderApp(); showToast(`Switched to ${STREAM_PROVIDERS[uiState.watch.currentProvider].name}`, "info"); } return; }
}
function handleMessage(event) {
  if (!event.origin.includes("megaplay.buzz") || !currentWatchId) return;
  const payload = typeof event.data === "string" ? safeParse(event.data) : event.data;
  if (!payload || typeof payload !== "object") return;
  if (payload.event === "ended" || payload.type === "ended") handlePlaybackEnded();
}
function safeParse(value) { try { return JSON.parse(value); } catch (error) { return null; } }
function init() {
  loadData(); renderApp();
  app.addEventListener("click", handleClick); app.addEventListener("input", handleInput); app.addEventListener("change", handleChange); app.addEventListener("focusout", handleFocusOut);
  window.addEventListener("keydown", handleKeydown); window.addEventListener("message", handleMessage);
  window.addEventListener("resize", () => document.querySelectorAll("[data-row-track]").forEach(track => syncScrollButtons(track.id)));
  if (uiState.search.query.trim().length >= 2) scheduleAniListSearch(uiState.search.query);

  /* Notification system: check every 6 hours for new episodes */
  if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  setInterval(async () => {
    const airing = getAnimeEntries().filter(e => e.status === "watching");
    for (const entry of airing.slice(0, 5)) {
      try {
        const data = await fetch(`https://graphql.anilist.co`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: `query($id: Int) { Media(id: $id) { id episodes status } }`, variables: { id: entry.anilistId } }) });
        const json = await data.json();
        const media = json.data?.Media;
        if (media && media.episodes > entry.episodes && media.status === "RELEASING") {
          new Notification("New episode available!", { body: `${entry.title} now has ${media.episodes} episodes!`, icon: entry.cover });
        }
      } catch (e) {}
    }
  }, 6 * 60 * 60 * 1000);

  /* Touch gestures: swipe left/right on episode list to mark watched */
  let touchStartX = 0, touchStartY = 0;
  document.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (!currentWatchId) return;
    const touchEndX = e.changedTouches[0].clientX, touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX, deltaY = touchEndY - touchStartY;
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < -50) { markEpisodeWatched(currentWatchId, currentEpisode); showToast("Marked episode " + currentEpisode + " as watched", "success"); }
      else if (deltaX > 50 && currentEpisode > 1) { switchEpisode(currentWatchId, currentEpisode - 1); showToast("Previous episode", "info"); }
    }
  }, { passive: true });

  /* FIX #4: is-scrolling class hides hover panels while scrolling */
  let _scrollTimeout = 0;
  document.addEventListener("scroll", () => {
    document.body.classList.add("is-scrolling");
    window.clearTimeout(_scrollTimeout);
    _scrollTimeout = window.setTimeout(() => document.body.classList.remove("is-scrolling"), 200);
  }, { passive: true, capture: true });
}
init();