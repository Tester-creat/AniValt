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
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mecha",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
];

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
    title { romaji english }
    format
    seasonYear
    startDate { year month day }
    coverImage { large }
    averageScore
    episodes
    status
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
let currentWatchOrderSort = "release";
let watchViewRequestToken = 0;

const uiState = {
  theme: "dark",
  accentColor: "#7c3aed",
  compactMode: false,
  reducedMotion: false,
  colorIntensity: 100,
  compactView: false,
  disableAnimations: false,
  navMenuOpen: false,
  navSearchOpen: false,
  focusInputId: "",
  inlineStatusPicker: null,
  volume: 1.0,
  library: { filter: "all", sort: "default", query: "" },
  browse: {
    mode: "seasonal", genre: "Action", title: "This Season",
    subtitle: "", results: [], loading: false, error: "",
    requestId: 0, initialized: false,
    page: 1, hasMore: true
  },
  search: { query: "", results: [], loading: false, error: "", requestId: 0 },
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

/* HERO CAROUSEL STATE */
const heroState = { current: 0, total: 0, timer: null, rafId: null, start: null, dur: 7000 };

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
function getDateWeight(startDate, seasonYear = 0) {
  // Use startDate if it has a valid year, otherwise fall back to seasonYear
  const year = (startDate && startDate.year) ? Number(startDate.year) : Number(seasonYear || 0);
  if (!year) return Number.POSITIVE_INFINITY;
  const month = (startDate && startDate.month) ? Number(startDate.month) : 0;
  const day = (startDate && startDate.day) ? Number(startDate.day) : 0;
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
  // New settings keys
  uiState.colorIntensity = (settings.colorIntensity !== undefined) ? Number(settings.colorIntensity) : 100;
  uiState.compactView    = settings.compactView    || false;
  uiState.disableAnimations = settings.disableAnimations || false;
  document.documentElement.style.setProperty("--accent", uiState.accentColor);
  document.documentElement.style.setProperty("--accent-bright", uiState.accentColor);
  document.documentElement.style.setProperty("--accent-opacity", String(uiState.colorIntensity / 100));
  document.documentElement.setAttribute("data-theme", uiState.theme);
  document.body.classList.toggle("compact-mode", uiState.compactMode);
  document.body.classList.toggle("reduced-motion", uiState.reducedMotion);
  document.body.classList.toggle("compact-view", uiState.compactView);
  document.body.classList.toggle("no-animations", uiState.disableAnimations);
  reconcileLibrary();
}
function saveData() {
  userData.__meta = { theme: uiState.theme };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  localStorage.setItem(VOLUME_KEY, String(uiState.volume));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    accentColor: uiState.accentColor,
    compactMode: uiState.compactMode,
    reducedMotion: uiState.reducedMotion,
    colorIntensity: uiState.colorIntensity,
    compactView: uiState.compactView,
    disableAnimations: uiState.disableAnimations
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
    <!-- ShuttleTV-style: single floating pill centered on screen -->
    <div class="topnav__pill">
      <!-- Logo: rocket icon + wordmark -->
      <div class="nav-brand">
        <span class="nav-brand__icon" aria-hidden="true">🚀</span>
        <span class="nav-brand__logo">AniVault</span>
      </div>

      <!-- Nav tabs inline inside the pill -->
      <nav class="nav-center" aria-label="Primary navigation">${tabs}</nav>

      <!-- Icon actions on the right inside the pill -->
      <div class="nav-actions">
        <button type="button" class="nav-pill-icon" data-action="toggle-nav-search" aria-label="Search" title="Search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
        <button type="button" class="nav-pill-icon" data-action="toggle-theme" aria-label="Toggle theme" title="${uiState.theme === "dark" ? "Light mode" : "Dark mode"}">
          ${uiState.theme === "dark"
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
          }
        </button>
        <button type="button" class="nav-pill-icon" data-action="open-settings" aria-label="Settings" title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
        <button type="button" class="nav-pill-icon nav-pill-icon--more" data-action="toggle-menu" aria-label="More options" title="More">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
      </div>
    </div>

    <!-- ⋮ dropdown — appears below the pill when more button is clicked -->
    <div class="nav-more-dropdown ${uiState.navMenuOpen ? "is-open" : ""}">
      <button type="button" class="nav-more-item" data-action="export">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Export Backup
      </button>
      <button type="button" class="nav-more-item" data-action="import">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Import Backup
      </button>
    </div>

    <!-- Search bar — drops below pill when open -->
    <div class="nav-search-drop ${uiState.navSearchOpen ? "is-open" : ""}">
      <input id="navSearchInput" type="search" placeholder="Search anime on AniList…" value="${escapeHtml(uiState.search.query)}" aria-label="Search AniList">
    </div>

    <!-- Mobile/overflow panel -->
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
    <input id="importInput" style="display:none" type="file" accept=".json">
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

/* ══ HERO CAROUSEL ══════════════════════════════════════════════ */
function renderHeroCarousel(entries) {
  if (!entries.length) return "";
  const items = entries.slice(0, 5);
  const slides = items.map((entry, i) => {
    const title = getDisplayTitle(entry);
    const bg = entry.banner || entry.cover || "";
    const progress = getProgressPercent(entry);
    const genres = (entry.genres || []).slice(0, 3);
    const nextEp = (entry.episodesWatched || 0) + 1;
    const totalEp = entry.episodes || "?";
    const desc = entry.notes ? entry.notes : `Continue watching from episode ${nextEp}`;
    return `<div class="hc-slide${i === 0 ? " is-active" : ""}" data-hc-slide="${i}">
      ${bg ? `<div class="hc-bg" style="background-image:url('${escapeHtml(bg)}')"></div>` : `<div class="hc-bg hc-bg--fallback"></div>`}
      <div class="hc-overlay"></div>
      <div class="hc-overlay2"></div>
      <div class="hc-content">
        ${genres.length ? `<div class="hc-genres">${genres.map(g => `<span class="hc-genre-pill">${escapeHtml(g)}</span>`).join("")}</div>` : ""}
        <div class="hc-title">${escapeHtml(title)}</div>
        <div class="hc-meta-row">
          ${entry.averageScore ? `<span class="hc-score">★ ${entry.averageScore}</span><span class="hc-sep"></span>` : ""}
          <span>Ep ${nextEp} / ${totalEp}</span>
          ${entry.year ? `<span class="hc-sep"></span><span>${entry.year}</span>` : ""}
          ${entry.language ? `<span class="hc-sep"></span><span class="hc-lang">${String(entry.language).toUpperCase()}</span>` : ""}
        </div>
        <div class="hc-desc">${escapeHtml(desc)}</div>
        <div class="hc-progress-track"><div class="hc-progress-fill" style="width:${progress}%"></div></div>
        <div class="hc-actions">
          <button type="button" class="hc-btn-primary" data-action="open-watch" data-id="${entry.id}">&#9654; Resume</button>
          <button type="button" class="hc-btn-secondary" data-action="open-detail" data-id="${entry.id}">Details</button>
        </div>
      </div>
    </div>`;
  }).join("");

  const dots = items.map((_, i) =>
    `<div class="hc-dot${i === 0 ? " is-active" : ""}" data-hc-dot="${i}"><div class="hc-dot-progress"></div></div>`
  ).join("");

  const thumbs = items.length > 1 ? `<div class="hc-thumbs">${items.map((entry, i) => {
    const bg = entry.cover || entry.banner || "";
    return `<button type="button" class="hc-thumb${i === 0 ? " is-active" : ""}" data-hc-thumb="${i}" aria-label="${escapeHtml(getDisplayTitle(entry))}">${bg ? `<img src="${escapeHtml(bg)}" alt="">` : ""}</button>`;
  }).join("")}</div>` : "";

  const navBtns = items.length > 1 ? `<button type="button" class="hc-nav hc-nav--prev" id="hcPrev" aria-label="Previous">&#8249;</button><button type="button" class="hc-nav hc-nav--next" id="hcNext" aria-label="Next">&#8250;</button>` : "";

  return `<div class="hero-carousel" id="heroCarousel">
    ${slides}
    ${navBtns}
    <div class="hc-dots">${dots}</div>
    ${thumbs}
  </div>`;
}

function initHeroCarousel() {
  const carousel = document.getElementById("heroCarousel");
  if (!carousel) return;

  // Change 7 — Guard against redundant restarts.
  // If the timer is already running and the carousel DOM has the same number of
  // slides as the last initialisation, the carousel is already in a good state —
  // skip the clearInterval / setInterval cycle so unrelated renderApp() calls
  // (e.g. opening a status picker while on the Home tab) do not reset progress.
  const slides = Array.from(carousel.querySelectorAll(".hc-slide"));
  if (heroState.timer && slides.length === heroState.total && heroState.total > 1) {
    return; // carousel is already running with the same DOM — nothing to do
  }

  clearInterval(heroState.timer);
  cancelAnimationFrame(heroState.rafId);

  const dots   = Array.from(carousel.querySelectorAll(".hc-dot"));
  const thumbs = Array.from(carousel.querySelectorAll(".hc-thumb"));
  heroState.total = slides.length;
  if (heroState.total <= 1) return;

  function goTo(idx) {
    slides[heroState.current].classList.remove("is-active");
    dots[heroState.current]  && dots[heroState.current].classList.remove("is-active");
    thumbs[heroState.current] && thumbs[heroState.current].classList.remove("is-active");
    heroState.current = ((idx % heroState.total) + heroState.total) % heroState.total;
    slides[heroState.current].classList.add("is-active");
    dots[heroState.current]  && dots[heroState.current].classList.add("is-active");
    thumbs[heroState.current] && thumbs[heroState.current].classList.add("is-active");
    dots.forEach(d => { const f = d.querySelector(".hc-dot-progress"); if (f) f.style.width = "0%"; });
    startProgress();
  }

  function startProgress() {
    cancelAnimationFrame(heroState.rafId);
    heroState.start = performance.now();
    const fill = dots[heroState.current] && dots[heroState.current].querySelector(".hc-dot-progress");
    (function step(now) {
      if (!fill) return;
      const pct = Math.min(100, ((now - heroState.start) / heroState.dur) * 100);
      fill.style.width = pct + "%";
      if (pct < 100) heroState.rafId = requestAnimationFrame(step);
    })(performance.now());
  }

  function startAuto() {
    clearInterval(heroState.timer);
    heroState.timer = setInterval(() => goTo(heroState.current + 1), heroState.dur);
  }

  const prevBtn = document.getElementById("hcPrev");
  const nextBtn = document.getElementById("hcNext");
  if (prevBtn) prevBtn.addEventListener("click", e => { e.stopPropagation(); clearInterval(heroState.timer); goTo(heroState.current - 1); startAuto(); });
  if (nextBtn) nextBtn.addEventListener("click", e => { e.stopPropagation(); clearInterval(heroState.timer); goTo(heroState.current + 1); startAuto(); });

  dots.forEach(dot => dot.addEventListener("click", e => {
    e.stopPropagation();
    clearInterval(heroState.timer);
    goTo(parseInt(dot.dataset.hcDot, 10));
    startAuto();
  }));

  thumbs.forEach(thumb => thumb.addEventListener("click", e => {
    const idx = parseInt(thumb.dataset.hcThumb, 10);
    if (idx !== heroState.current) {
      e.stopPropagation();
      clearInterval(heroState.timer);
      goTo(idx);
      startAuto();
    }
  }));

  heroState.current = 0;
  goTo(0);
  startAuto();
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
  const genreTag = entry.genres && entry.genres[0] ? `<span class="poster-card__genre-tag">${escapeHtml(entry.genres[0])}</span>` : "";
  return `<button type="button" class="poster-card ${context === "grid" ? "poster-card--grid" : ""}" data-action="${action}" data-id="${entry.id}">
    <div class="poster-card__media">
      ${entry.cover ? `<img src="${escapeHtml(entry.cover)}" alt="${escapeHtml(getDisplayTitle(entry))}">` : ""}
      <div class="poster-card__play-overlay"><span class="play-icon">&#9654;</span></div>
      ${genreTag}
    </div>
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
      <div class="section__head-right">
        ${hasEntries && entries.length > 3 ? `<button type="button" class="section__see-all" data-action="tab" data-tab="library">See all</button>` : ""}
        ${renderScrollControls(sectionId, hasEntries && entries.length > 3)}
      </div>
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
    ${continueWatching.length > 0 ? `<div class="home-hero-layout">
      ${renderHeroCarousel(continueWatching)}
      <div class="cw-list">
        <div class="cw-list__header">Continue Watching</div>
        ${continueWatching.slice(0, 4).map(entry => {
          const poster = entry.cover || entry.banner || "";
          const nextEp = (entry.episodesWatched || 0) + 1;
          const totalEp = entry.episodes || "?";
          return `<button type="button" class="cw-list-item" data-action="open-watch" data-id="${entry.id}">
            <div class="cw-list-item__poster">${poster ? `<img src="${escapeHtml(poster)}" alt="${escapeHtml(getDisplayTitle(entry))}">` : ""}</div>
            <div class="cw-list-item__info">
              <div class="cw-list-item__title">${escapeHtml(getDisplayTitle(entry))}</div>
              <div class="cw-list-item__ep">Ep ${nextEp} / ${totalEp}</div>
            </div>
            <div class="cw-list-item__play">&#9654;</div>
          </button>`;
        }).join("")}
      </div>
    </div>` : renderHeroCarousel(continueWatching)}
    <section class="section section--continue">
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

  // Build the "current" entry using AniList data for accurate startDate/format/seasonYear
  // Fall back to library data for cover/title if AniList didn't return them
  const currentStartDate = (media && media.startDate) ? media.startDate : { year: currentEntry ? (currentEntry.year || 0) : 0, month: 0, day: 0 };
  const currentFormat = (media && media.format) ? media.format : "";
  const currentSeasonYear = (media && media.seasonYear) ? media.seasonYear : (currentEntry ? (currentEntry.year || 0) : 0);
  const currentAverageScore = (media && media.averageScore) ? media.averageScore : (currentEntry ? (currentEntry.averageScore || 0) : 0);
  const currentEpisodes = (media && media.episodes) ? media.episodes : (currentEntry ? (currentEntry.episodes || 0) : 0);
  const currentStatus = (media && media.status) ? media.status : (currentEntry ? (currentEntry.status || "") : "");
  const currentTitle = {
    romaji: (media && media.title && media.title.romaji) ? media.title.romaji : (currentEntry ? currentEntry.title : "Current Anime"),
    english: (media && media.title && media.title.english) ? media.title.english : (currentEntry ? (currentEntry.titleEnglish || "") : "")
  };
  const currentCover = (media && media.coverImage && media.coverImage.large) ? media.coverImage.large : (currentEntry ? (currentEntry.cover || "") : "");

  relations.push({
    id: Number(anilistId),
    title: currentTitle,
    coverImage: { large: currentCover },
    type: "ANIME",
    format: currentFormat,
    seasonYear: currentSeasonYear,
    startDate: currentStartDate,
    episodes: currentEpisodes,
    status: currentStatus,
    averageScore: currentAverageScore,
    relationType: "current",
    isCurrent: true
  });

  // Add all related entries — filter to ANIME type and known watch-order relation types
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
async function loadBrowse(mode, genre = uiState.browse.genre, page = 1) {
  // When page === 1 (mode/genre switch): reset state and disconnect any active observer
  if (page === 1) {
    uiState.browse.mode = mode; uiState.browse.genre = genre;
    uiState.browse.page = 1; uiState.browse.hasMore = true;
    if (window._browseObserver) { window._browseObserver.disconnect(); window._browseObserver = null; }
  }
  uiState.browse.loading = true; uiState.browse.error = ""; queueRender();
  const requestId = ++uiState.browse.requestId;
  const perPage = 30;
  const season = getSeasonFromDate(new Date()), seasonYear = new Date().getFullYear();
  let variables = { page, perPage, sort: ["POPULARITY_DESC"] };
  let title = "This Season", subtitle = `${season.charAt(0)}${season.slice(1).toLowerCase()} releases, sorted by popularity.`;
  if (mode === "top") { variables = { page, perPage, sort: ["SCORE_DESC"] }; title = "Top Rated"; subtitle = "High scoring anime from AniList."; }
  else if (mode === "popular") { variables = { page, perPage, sort: ["POPULARITY_DESC"] }; title = "Most Popular"; subtitle = "Heavy hitters with the biggest audiences."; }
  else if (mode === "genre") { variables = { page, perPage, sort: ["SCORE_DESC"], genre }; title = `${genre} Highlights`; subtitle = `Top rated picks in ${genre}.`; }
  else { variables = { page, perPage, sort: ["POPULARITY_DESC"], season, seasonYear }; }
  try {
    const data = await fetchAniList(BROWSE_QUERY, variables);
    if (requestId !== uiState.browse.requestId) return;
    const newItems = data.Page.media.map(adaptAniListMedia);
    if (page === 1) {
      // Replace results on first page (mode/genre switch)
      uiState.browse.results = newItems;
    } else {
      // Append results on subsequent pages (sentinel triggered)
      uiState.browse.results = [...uiState.browse.results, ...newItems];
      uiState.browse.page = page;
    }
    // Set hasMore = false when returned item count is less than perPage
    if (newItems.length < perPage) { uiState.browse.hasMore = false; }
    uiState.browse.title = title; uiState.browse.subtitle = subtitle;
    uiState.browse.loading = false; uiState.browse.initialized = true; queueRender();
  } catch (error) {
    if (requestId !== uiState.browse.requestId) return;
    uiState.browse.loading = false; uiState.browse.error = error.message; queueRender();
    showToast("AniList browse request failed. Try again when you are online.", "error");
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
  const genreTag = anime.genres && anime.genres[0] ? `<span class="discover-card__genre-tag">${escapeHtml(anime.genres[0])}</span>` : "";

  // Status dot color for the add button when already in library
  const STATUS_DOT_COLORS = {
    watching: "#3b9eff", completed: "#22c55e", queued: "#f59e0b",
    "plan-to-watch": "#a78bfa", dropped: "#ef4444", paused: "#fbbf24", untracked: "#50506a"
  };

  // Play icon SVG
  const playIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;
  // Plus icon SVG
  const plusIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  // Remove icon SVG
  const removeIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  return `<article class="discover-card">
    <div class="discover-card__media">
      ${anime.coverImage && anime.coverImage.large ? `<img src="${escapeHtml(anime.coverImage.large)}" alt="${escapeHtml(title)}">` : ""}
      ${genreTag}
    </div>
    <div class="discover-card__body">
      <div class="discover-card__title">${escapeHtml(title)}</div>
      <div class="discover-card__meta">${escapeHtml(meta)}</div>
      <div class="discover-card__meta-row">${anime.status ? `<span class="chip-chip">${escapeHtml(String(anime.status).replaceAll("_", " "))}</span>` : ""}</div>
      <div class="card-actions">
        ${existing
          ? `<button type="button" class="btn-icon btn-icon--primary" data-action="open-watch" data-id="${existing.id}" title="Watch Now" aria-label="Watch Now">${playIcon}</button>
             <button type="button" class="btn-icon btn-icon--ghost btn-icon--added" data-action="open-add-modal" data-source="${source}" data-id="${anime.id}" title="${escapeHtml(STATUS_LABELS[existing.status] || "In Library")}" aria-label="Update status">
               ${plusIcon}
               <span class="btn-icon__dot" style="background:${STATUS_DOT_COLORS[existing.status] || "#50506a"}"></span>
             </button>`
          : `<button type="button" class="btn-icon btn-icon--primary" data-action="quick-watch-now" data-source="${source}" data-id="${anime.id}" title="Watch Now" aria-label="Watch Now">${playIcon}</button>
             <button type="button" class="btn-icon btn-icon--ghost" data-action="open-add-modal" data-source="${source}" data-id="${anime.id}" title="Add to List" aria-label="Add to List">${plusIcon}</button>`
        }
      </div>
    </div>
  </article>`;
}
function renderBrowseCard(anime) { return renderQuickActionCard(anime, "browse"); }
function renderSearchCard(anime) { return renderQuickActionCard(anime, "search"); }
function renderBrowse() {
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
        <div class="genre-pills">
          ${BROWSE_GENRES.map((genre) => {
            const active = uiState.browse.mode === "genre" && uiState.browse.genre === genre ? "is-active" : "";
            return `<button type="button" class="chip ${active}" data-action="browse-genre" data-genre="${genre}">${genre}</button>`;
          }).join("")}
        </div>
      </div>
      <div class="status-line">${escapeHtml(uiState.browse.title)}${uiState.browse.subtitle ? ` - ${escapeHtml(uiState.browse.subtitle)}` : ""}</div>
    </section>
    ${uiState.browse.loading ? renderEmptyState("...", "Loading AniList results", "AniVault is pulling the latest browse results.") : uiState.browse.error ? renderEmptyState("!", "Browse is offline right now", uiState.browse.error) : uiState.browse.results.length ? `<section class="browse-results discover-grid">${uiState.browse.results.map((media) => renderBrowseCard(media)).join("")}</section>${uiState.browse.hasMore ? `<div id="browseSentinel" class="browse-sentinel"></div>` : ""}` : renderEmptyState("0", "No results yet", "Choose a browse mode to load anime from AniList.")}
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
    uiState.search.loading = false; uiState.search.error = "";
    
    // Change 6: Surgical DOM update — replace only the AniList results section content
    // Do NOT call queueRender() or renderApp() — this preserves input focus
    const anilistSection = document.querySelector(".search-layout .section");
    if (anilistSection) {
      // Find the content area after .section__head
      const sectionHead = anilistSection.querySelector(".section__head");
      if (sectionHead) {
        // Generate the results HTML (same logic as renderSearch())
        const resultsHtml = uiState.search.results.length 
          ? `<div class="browse-results">${uiState.search.results.map((media) => renderSearchCard(media)).join("")}</div>`
          : renderEmptyState("0", "No AniList results found", "Try a different spelling or a shorter search term.");
        
        // Remove all siblings after .section__head and insert new content
        while (sectionHead.nextSibling) {
          sectionHead.nextSibling.remove();
        }
        sectionHead.insertAdjacentHTML("afterend", resultsHtml);
      }
    }
  } catch (error) {
    if (requestId !== uiState.search.requestId) return;
    uiState.search.loading = false; uiState.search.error = error.message;
    
    // Change 6: Surgical DOM update for error state
    const anilistSection = document.querySelector(".search-layout .section");
    if (anilistSection) {
      const sectionHead = anilistSection.querySelector(".section__head");
      if (sectionHead) {
        const errorHtml = renderEmptyState("!", "Search is offline right now", uiState.search.error);
        while (sectionHead.nextSibling) {
          sectionHead.nextSibling.remove();
        }
        sectionHead.insertAdjacentHTML("afterend", errorHtml);
      }
    }
    
    showToast("AniList search failed. Check your connection and try again.", "error");
  }
}
function renderSearch() {
  const libraryMatches = getSearchLibraryMatches();
  return `
  <div class="page page--search">
    <section class="search-hero">
      <div class="page-title">Search AniList</div>
      <div class="page-subtitle">Find something new, then add it straight into your private library.</div>
      <input id="searchPageInput" class="input search-hero__input" type="search" placeholder="Search anime titles" value="${escapeHtml(uiState.search.query)}">
    </section>
    <div class="search-layout">
      <section class="section">
        <div class="section__head">
          <div class="section__copy"><div class="section__title">AniList Results</div><div class="section__sub">Add fresh results directly into AniVault.</div></div>
        </div>
        ${uiState.search.loading ? renderEmptyState("...", "Searching AniList", "AniVault is looking for matching anime.") : uiState.search.error ? renderEmptyState("!", "Search is offline right now", uiState.search.error) : uiState.search.query.trim().length < 2 ? renderEmptyState("GO", "Search AniList", "Type at least two characters to load AniList results.") : uiState.search.results.length ? `<div class="browse-results">${uiState.search.results.map((media) => renderSearchCard(media)).join("")}</div>` : renderEmptyState("0", "No AniList results found", "Try a different spelling or a shorter search term.")}
      </section>
      <section class="section">
        <div class="section__head">
          <div class="section__copy"><div class="section__title">In My Library</div><div class="section__sub">Local matches update instantly as you type.</div></div>
          ${renderScrollControls("searchLibraryRow", libraryMatches.length > 3)}
        </div>
        ${libraryMatches.length ? `<div class="media-row"><div class="media-row__viewport" id="searchLibraryRow" data-row-track="searchLibraryRow"><div class="media-row__track">${libraryMatches.map((entry) => renderSearchCard({ id: entry.id, title: { romaji: entry.title, english: entry.titleEnglish }, coverImage: { large: entry.cover }, episodes: entry.episodes, averageScore: entry.averageScore, status: entry.status })).join("")}</div></div></div>` : renderEmptyState("MY", "Nothing in your library matches yet", uiState.search.query.trim() ? "Try a different title, genre, or note keyword." : "Start typing to search your saved anime first.")}
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
  { name: "HiAnime", buildUrl: (entry, ep, lang) => `https://hianime.to/watch/${entry.anilistId.replace('anime/', '')}-${entry.anilistId}?ep=${ep}` },
  { name: "GogoAnime", buildUrl: (entry, ep, lang) => `https://gogoanime.kiwi/arcade/${entry.anilistId}-episode-${ep}` },
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
  currentWatchOrderSort = "release";
  const requestToken = ++watchViewRequestToken;
  renderApp(); renderRatingComponent(id, "watchViewRatingContainer"); paintEpisodeList(id); renderWatchOrder(entry.anilistId || entry.id, "release");
  if (entry.anilistId) {
    fetchEpisodeData(entry.anilistId).then(() => { if (currentWatchId === id && requestToken === watchViewRequestToken) paintEpisodeList(id); }).catch(() => {});
    fetchFranchiseRelations(entry.anilistId).then(() => { if (currentWatchId === id && requestToken === watchViewRequestToken) renderWatchOrder(entry.anilistId, "release"); }).catch(() => { if (currentWatchId === id && requestToken === watchViewRequestToken) renderWatchOrder(entry.anilistId, "release"); });
  } else renderWatchOrder(entry.id, "release");
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
async function renderWatchOrder(anilistId, sortMode = "release") {
  currentWatchOrderSort = sortMode;
  const mount = document.getElementById("watchOrderMount");
  if (!mount) return;
  const relations = franchiseCache[anilistId] || [];
  const currentLibraryEntry = getEntryByAnimeId(anilistId);
  const currentFranchiseTitle = (currentLibraryEntry && getDisplayTitle(currentLibraryEntry))
    || ((relations[0] && relations[0].title && (relations[0].title.english || relations[0].title.romaji)) || "This Franchise");

  // Toggle buttons — Release Order first since it's the default
  const toggleHtml = `<div class="wo-toggle">
    <button type="button" class="wo-toggle-btn ${sortMode === "release" ? "active" : ""}" data-action="set-watch-order-sort" data-sort="release">Release Order</button>
    <button type="button" class="wo-toggle-btn ${sortMode === "recommended" ? "active" : ""}" data-action="set-watch-order-sort" data-sort="recommended">Recommended</button>
  </div>`;

  if (!relations.length) {
    mount.innerHTML = `<section class="watch-order-section"><div class="wo-header"><div><div class="wo-title">Watch Order</div><div class="wo-subtitle">${escapeHtml(currentFranchiseTitle)} — Complete Guide</div></div>${toggleHtml}</div>${renderEmptyState("...", "Loading watch order...", "AniVault is fetching the franchise guide from AniList.")}</section>`;
    return;
  }

  const sorted = [...relations].sort((left, right) => {
    if (sortMode === "release") {
      // Pure chronological: year → month → day, with seasonYear fallback
      const wLeft  = getDateWeight(left.startDate,  left.seasonYear);
      const wRight = getDateWeight(right.startDate, right.seasonYear);
      if (wLeft !== wRight) return wLeft - wRight;
      // Tie-break: current entry always first within same date
      if (left.isCurrent) return -1;
      if (right.isCurrent) return 1;
      return 0;
    }
    // "recommended" — story-logical order: prequel → parent → current → sequel → side stories
    const priorityDiff = (WATCH_ORDER_PRIORITY[left.relationType] || 99) - (WATCH_ORDER_PRIORITY[right.relationType] || 99);
    if (priorityDiff !== 0) return priorityDiff;
    // Within same priority group, sort by release date
    return getDateWeight(left.startDate, left.seasonYear) - getDateWeight(right.startDate, right.seasonYear);
  });

  // Only show the section if there are related entries beyond just the current one
  const hasRelated = sorted.some(item => !item.isCurrent);

  const cards = !hasRelated
    ? renderEmptyState("🔗", "No related entries found", "AniList did not return connected anime for this title. It may be a standalone series.")
    : `<div class="wo-cards">${sorted.map(item => {
        const libraryEntry = getEntryByAnimeId(item.id);
        const title = (item.title && (item.title.english || item.title.romaji)) || "Untitled";
        const relationLabel = formatRelationLabel(item);
        // Show the most precise date available
        const year = (item.startDate && item.startDate.year) ? item.startDate.year : (item.seasonYear || "Unknown");
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const monthLabel = (item.startDate && item.startDate.month && item.startDate.month > 0)
          ? monthNames[item.startDate.month - 1] + " " : "";
        const dateLabel = monthLabel + String(year);
        return `<button type="button" class="wo-card ${item.isCurrent ? "wo-card--current" : ""}" data-action="watch-order-card" data-id="${item.id}">
          <div class="wo-cover-wrap">
            ${item.coverImage && item.coverImage.large ? `<img class="wo-cover" src="${escapeHtml(item.coverImage.large)}" alt="${escapeHtml(title)}">` : `<div class="wo-cover wo-cover--empty"></div>`}
            ${item.format ? `<span class="wo-format-badge" style="background:${getFormatBadgeColor(item.format)}">${escapeHtml(item.format.replaceAll("_", " "))}</span>` : ""}
            ${item.isCurrent ? `<span class="wo-now-badge">▶ NOW</span>` : ""}
          </div>
          <div class="wo-card-title">${escapeHtml(title)}</div>
          <div class="wo-card-meta">${escapeHtml(dateLabel)}</div>
          <div class="wo-card-relation">${escapeHtml(relationLabel)}</div>
          ${item.averageScore ? `<div class="wo-card-meta">★ ${item.averageScore}</div>` : ""}
          ${libraryEntry
            ? `<div class="wo-card-progress">${libraryEntry.episodesWatched || 0}/${libraryEntry.episodes || "?"} ep</div>`
            : `<div class="wo-card-add">+ Add</div>`}
        </button>`;
      }).join("")}</div>`;

  mount.innerHTML = `<section class="watch-order-section">
    <div class="wo-header">
      <div>
        <div class="wo-title">Watch Order</div>
        <div class="wo-subtitle">${escapeHtml(currentFranchiseTitle)} — Complete Guide</div>
      </div>
      ${toggleHtml}
    </div>
    ${cards}
  </section>`;
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
  return `<div class="page page--watch"><div class="watch-layout" id="watchViewContainer">

    <!-- LEFT SIDEBAR: title, meta, rating, status, action buttons only -->
    <aside class="watch-sidebar">
      <div class="watch-meta">
        <div class="watch-title">${escapeHtml(getDisplayTitle(entry))}</div>
        <div class="watch-meta__row">
          <span class="${getStatusClass(entry.status)}">${escapeHtml(STATUS_LABELS[entry.status])}</span>
          ${entry.averageScore ? `<span class="watch-badge">AniList ${entry.averageScore}</span>` : ""}
          ${entry.year ? `<span class="watch-badge">${entry.year}</span>` : ""}
        </div>
      </div>
      <div class="watch-sidebar-bottom">
        <div class="watch-progress-label">${escapeHtml(progressLabel)}</div>
        <div id="watchViewRatingContainer"></div>
        <div>
          <label class="muted" for="watchStatusSelect">Status</label>
          <select id="watchStatusSelect" class="select" data-status-select="${entry.id}">
            ${STATUS_OPTIONS.map(status => `<option value="${status}" ${entry.status === status ? "selected" : ""}>${STATUS_LABELS[status]}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="watch-sidebar-footer-buttons">
        <button type="button" class="action-button" data-action="watch-mark">Mark Watched</button>
        <button type="button" class="secondary-button" data-action="remove-from-library" data-id="${entry.id}">Remove from Library</button>
        <button type="button" class="secondary-button" data-action="watch-back">&larr; Back</button>
      </div>
    </aside>

    <!-- CENTRE: video player + controls -->
    <section class="watch-player">
      <div class="watch-player__frame">${currentUrl && !uiState.watch.forceFallback
        ? `<iframe src="${escapeHtml(currentUrl)}" title="${escapeHtml(getDisplayTitle(entry))}" allow="autoplay; fullscreen" allowfullscreen data-watch-iframe></iframe>`
        : `<div class="watch-player__fallback"><div class="watch-player__fallback-card"><div class="watch-title">No stream available for this title via ${provider.name}</div><div class="muted">Come back and mark episodes watched manually using the episode list on the right.</div><a class="action-button" href="${escapeHtml(fallbackUrl)}" target="_blank" rel="noopener">Search on HiAnime &rarr;</a></div></div>`
      }</div>
      <div class="watch-player__controls">
        <button type="button" class="secondary-button" data-action="watch-prev" ${currentEpisode <= 1 ? "disabled" : ""}>&larr; Prev</button>
        <strong class="watch-player__ep-label">Ep ${currentEpisode} / ${entry.episodes || "?"}</strong>
        <button type="button" class="secondary-button" data-action="watch-next" ${currentEpisode >= totalEpisodes ? "disabled" : ""}>Next &rarr;</button>
        <button type="button" class="secondary-button" data-action="switch-provider" ${STREAM_PROVIDERS.length <= 1 ? "disabled" : ""} title="Switch provider">${provider.name}</button>
        <button type="button" class="secondary-button watch-fs-btn" data-action="toggle-fullscreen" title="Fullscreen (F)">&#x26F6;</button>
      </div>
    </section>

    <!-- RIGHT PANEL: SUB/DUB → episode groups → episode list -->
    <aside class="watch-episode-panel">

      <!-- 1. SUB / DUB toggle — always first -->
      <div class="watch-episode-panel__lang">
        <div class="language-toggle" role="group" aria-label="Audio language">
          <button type="button" class="${entry.language === "sub" ? "is-active" : ""}" data-action="switch-language" data-lang="sub">SUB</button>
          <button type="button" class="${entry.language === "dub" ? "is-active" : ""}" data-action="switch-language" data-lang="dub">DUB</button>
        </div>
      </div>

      <!-- 2. Episode group chips — only rendered when >50 eps (paintEpisodeList fills this) -->
      <div id="episodeGroupSelector"></div>

      <!-- 3. Episode list — numbered, named, scrollable -->
      <div class="episode-list" id="episodeList"></div>

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

  /* ── Add to List modal — centered, not tied to hover state ── */
  if (uiState.overlay.type === "add-modal") {
    const source = uiState.overlay.source;
    const id = uiState.overlay.id;
    const media = getAniListResultBySource(source, id);
    if (!media) return "";
    const title = media.title.english || media.title.romaji;
    const existing = getEntryByAnimeId(id);
    const currentStatus = existing ? existing.status : null;

    const STATUS_ICONS = {
      watching: "▶", completed: "✓", queued: "☰",
      "plan-to-watch": "🔖", dropped: "✕", paused: "⏸", untracked: "○"
    };
    const STATUS_COLORS = {
      watching: "var(--badge-watching)", completed: "var(--badge-completed)",
      queued: "var(--badge-queued)", "plan-to-watch": "var(--badge-plan)",
      dropped: "var(--badge-dropped)", paused: "var(--badge-paused)",
      untracked: "var(--text3)"
    };

    const rows = STATUS_OPTIONS.map(status => {
      const isActive = currentStatus === status;
      return `<button type="button"
        class="add-modal__row${isActive ? " add-modal__row--active" : ""}"
        data-action="quick-add-status"
        data-source="${source}"
        data-id="${id}"
        data-status="${status}">
        <span class="add-modal__row-icon" style="color:${STATUS_COLORS[status]}">${STATUS_ICONS[status] || "○"}</span>
        <span class="add-modal__row-label">${escapeHtml(STATUS_LABELS[status])}</span>
        ${isActive ? `<span class="add-modal__row-check">✓</span>` : ""}
      </button>`;
    }).join("");

    return `<div class="overlay" data-action="close-overlay">
      <div class="add-modal" role="dialog" aria-modal="true" aria-label="Add to list" data-overlay-card>
        <div class="add-modal__header">
          <div class="add-modal__cover">
            ${media.coverImage && media.coverImage.large
              ? `<img src="${escapeHtml(media.coverImage.large)}" alt="${escapeHtml(title)}">`
              : ""}
          </div>
          <div class="add-modal__info">
            <div class="add-modal__title">${escapeHtml(title)}</div>
            <div class="add-modal__sub muted">Choose a status to add to your library</div>
          </div>
          <button type="button" class="add-modal__close" data-action="close-overlay" aria-label="Close">✕</button>
        </div>
        <div class="add-modal__rows">${rows}</div>
      </div>
    </div>`;
  }

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
      { name: "Violet",  value: "#7c3aed" },
      { name: "Blue",    value: "#2563eb" },
      { name: "Cyan",    value: "#0891b2" },
      { name: "Emerald", value: "#059669" },
      { name: "Orange",  value: "#ea580c" },
      { name: "Pink",    value: "#db2777" },
      { name: "Red",     value: "#dc2626" },
      { name: "Yellow",  value: "#ca8a04" }
    ];
    const intensity = uiState.colorIntensity !== undefined ? uiState.colorIntensity : 100;
    return `<div class="overlay overlay--settings" data-action="close-overlay">
      <div class="settings-card" role="dialog" aria-modal="true" aria-label="Settings" data-overlay-card>

        <div class="settings-card__title">Settings</div>

        <!-- Accent Color -->
        <div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:6px;">
          <div class="settings-row__label">
            <div class="settings-row__label-text">Accent Color</div>
          </div>
          <div class="settings-swatches">
            ${accentColors.map(c => `<button type="button" class="settings-swatch ${uiState.accentColor === c.value ? "is-active" : ""}" data-action="set-accent" data-color="${c.value}" style="background:${c.value};" aria-label="${c.name}"></button>`).join("")}
          </div>
        </div>

        <hr class="settings-divider">

        <!-- Color Intensity -->
        <div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:6px;">
          <div class="settings-row__label">
            <div class="settings-row__label-text">Color Intensity</div>
            <div class="settings-row__hint">Adjusts how strong the accent color appears across the UI</div>
          </div>
          <div class="settings-slider-wrap" style="width:100%;">
            <input type="range" class="settings-slider" min="0" max="100" step="1" value="${intensity}" data-action="set-intensity" aria-label="Color intensity">
            <span class="settings-slider-value" id="intensityDisplay">${intensity}%</span>
          </div>
        </div>

        <hr class="settings-divider">

        <!-- Compact View -->
        <label class="settings-row" style="cursor:pointer;">
          <div class="settings-row__label">
            <div class="settings-row__label-text">Compact View</div>
            <div class="settings-row__hint">Reduces card sizes and spacing for a denser layout</div>
          </div>
          <input type="checkbox" class="settings-checkbox" ${uiState.compactView ? "checked" : ""} data-action="toggle-compact-view" aria-label="Compact View">
        </label>

        <hr class="settings-divider">

        <!-- Disable Animations -->
        <label class="settings-row" style="cursor:pointer;">
          <div class="settings-row__label">
            <div class="settings-row__label-text">Disable Animations</div>
            <div class="settings-row__hint">Turns off transitions and animated effects across the platform</div>
          </div>
          <input type="checkbox" class="settings-checkbox" ${uiState.disableAnimations ? "checked" : ""} data-action="toggle-no-animations" aria-label="Disable Animations">
        </label>

        <!-- Footer: saved flash + close button -->
        <div class="settings-footer">
          <span class="saved-flash" id="settingsSavedFlash">&#10003; Saved</span>
          <button type="button" class="nav-button" data-action="close-overlay">Close</button>
        </div>

      </div>
    </div>`;
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

/* ══ STATS ENGINE ══════════════════════════════════════════════ */

function computeStats() {
  const entries = getAnimeEntries();
  if (!entries.length) return null;

  // Status counts
  const statusCounts = {};
  STATUS_OPTIONS.forEach(s => statusCounts[s] = 0);
  entries.forEach(e => { statusCounts[e.status] = (statusCounts[e.status] || 0) + 1; });

  // Episode & time stats
  const totalEpisodes = entries.reduce((s, e) => s + (e.episodesWatched || 0), 0);
  const avgEpDuration = 24; // minutes — standard anime episode
  const totalMinutes = totalEpisodes * avgEpDuration;
  const totalDays = (totalMinutes / 1440).toFixed(1);
  const totalHours = Math.floor(totalMinutes / 60);

  // Ratings
  const rated = entries.filter(e => e.rating > 0);
  const avgRating = rated.length ? (rated.reduce((s, e) => s + e.rating, 0) / rated.length).toFixed(1) : null;
  const ratingDist = Array.from({length: 10}, (_, i) => ({
    score: i + 1,
    count: entries.filter(e => e.rating === i + 1).length
  }));
  const maxRatingCount = Math.max(...ratingDist.map(r => r.count), 1);

  // Genre counts
  const genreMap = {};
  entries.forEach(e => (e.genres || []).forEach(g => { genreMap[g] = (genreMap[g] || 0) + 1; }));
  const topGenres = Object.entries(genreMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([genre, count]) => ({ genre, count }));
  const maxGenreCount = topGenres.length ? topGenres[0].count : 1;

  // Year distribution
  const yearMap = {};
  entries.forEach(e => { if (e.year > 0) yearMap[e.year] = (yearMap[e.year] || 0) + 1; });
  const yearDist = Object.entries(yearMap)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([year, count]) => ({ year: Number(year), count }));
  const maxYearCount = yearDist.length ? Math.max(...yearDist.map(y => y.count)) : 1;

  // Activity heatmap — last 365 days from sessionLog
  const now = Date.now();
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  const dayMap = {};
  entries.forEach(e => {
    (e.sessionLog || []).forEach(ts => {
      if (ts > 0 && now - ts < oneYear) {
        const d = new Date(ts);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        dayMap[key] = (dayMap[key] || 0) + 1;
      }
    });
  });
  const maxDayCount = Math.max(...Object.values(dayMap), 1);

  // Streak calculation
  let currentStreak = 0, longestStreak = 0, streak = 0;
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (dayMap[key]) {
      streak++;
      if (i === 0 || i === 1) currentStreak = streak;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      if (i > 1) streak = 0;
    }
  }

  // Completion rate
  const started = entries.filter(e => ['watching','completed','dropped','paused'].includes(e.status)).length;
  const completed = statusCounts['completed'] || 0;
  const completionRate = started > 0 ? Math.round((completed / started) * 100) : 0;

  // Top anime by episodes watched
  const topByEpisodes = [...entries]
    .filter(e => e.episodesWatched > 0)
    .sort((a, b) => (b.episodesWatched || 0) - (a.episodesWatched || 0))
    .slice(0, 5);

  // Score vs AniList comparison
  const bothScored = entries.filter(e => e.rating > 0 && e.averageScore > 0);
  const avgAniList = bothScored.length ? (bothScored.reduce((s, e) => s + e.averageScore, 0) / bothScored.length / 10).toFixed(1) : null;
  const scoreDiff = (avgRating && avgAniList) ? (parseFloat(avgRating) - parseFloat(avgAniList)).toFixed(1) : null;

  // Most active month this year
  const thisYear = new Date().getFullYear();
  const monthMap = {};
  entries.forEach(e => {
    (e.sessionLog || []).forEach(ts => {
      if (ts > 0) {
        const d = new Date(ts);
        if (d.getFullYear() === thisYear) {
          const key = d.getMonth();
          monthMap[key] = (monthMap[key] || 0) + 1;
        }
      }
    });
  });
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mostActiveMonth = Object.keys(monthMap).length
    ? monthNames[Number(Object.entries(monthMap).sort((a,b) => b[1]-a[1])[0][0])]
    : null;

  // Episodes this year
  const episodesThisYear = Object.entries(dayMap)
    .filter(([k]) => k.startsWith(String(thisYear)))
    .reduce((s, [, v]) => s + v, 0);

  return {
    total: entries.length, statusCounts, totalEpisodes, totalDays, totalHours,
    avgRating, ratingDist, maxRatingCount, topGenres, maxGenreCount,
    yearDist, maxYearCount, dayMap, maxDayCount,
    currentStreak, longestStreak, completionRate,
    topByEpisodes, avgAniList, scoreDiff, bothScored: bothScored.length,
    mostActiveMonth, episodesThisYear, rated: rated.length
  };
}

function renderHeatmap(dayMap, maxDayCount) {
  const weeks = [];
  const today = new Date(); today.setHours(0,0,0,0);
  // Start from 52 weeks ago, aligned to Sunday
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  const dayOfWeek = start.getDay();
  start.setDate(start.getDate() - dayOfWeek);

  const monthLabels = [];
  let lastMonth = -1;
  let weekIndex = 0;

  const d = new Date(start);
  while (d <= today) {
    const week = [];
    for (let dow = 0; dow < 7; dow++) {
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const count = dayMap[key] || 0;
      const isFuture = d > today;
      const intensity = isFuture ? 0 : count === 0 ? 0 : Math.ceil((count / maxDayCount) * 4);
      week.push({ key, count, intensity, isFuture, month: d.getMonth(), date: d.getDate() });
      if (d.getMonth() !== lastMonth && dow === 0) {
        monthLabels.push({ index: weekIndex, label: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] });
        lastMonth = d.getMonth();
      }
      d.setDate(d.getDate() + 1);
    }
    weeks.push(week);
    weekIndex++;
  }

  const totalSessions = Object.values(dayMap).reduce((s, v) => s + v, 0);
  const activeDays = Object.keys(dayMap).length;

  const monthRow = `<div class="heatmap-months">${monthLabels.map(m => `<span style="grid-column:${m.index + 1}">${m.label}</span>`).join('')}</div>`;
  const dayLabels = `<div class="heatmap-days"><span>Mon</span><span>Wed</span><span>Fri</span></div>`;
  const grid = `<div class="heatmap-grid">${weeks.map(week =>
    `<div class="heatmap-week">${week.map(cell =>
      `<div class="heatmap-cell heatmap-cell--${cell.intensity}${cell.isFuture ? ' heatmap-cell--future' : ''}" title="${cell.isFuture ? '' : cell.count > 0 ? cell.count + ' session' + (cell.count > 1 ? 's' : '') + ' on ' + cell.key : 'No activity on ' + cell.key}"></div>`
    ).join('')}</div>`
  ).join('')}</div>`;

  return `<div class="heatmap-wrap">
    ${monthRow}
    <div class="heatmap-body">${dayLabels}${grid}</div>
    <div class="heatmap-legend">
      <span class="muted">Less</span>
      <div class="heatmap-cell heatmap-cell--0"></div>
      <div class="heatmap-cell heatmap-cell--1"></div>
      <div class="heatmap-cell heatmap-cell--2"></div>
      <div class="heatmap-cell heatmap-cell--3"></div>
      <div class="heatmap-cell heatmap-cell--4"></div>
      <span class="muted">More</span>
    </div>
    <div class="heatmap-summary muted">${totalSessions} sessions across ${activeDays} active days in the last year</div>
  </div>`;
}

function renderDonutChart(statusCounts, total) {
  const STATUS_COLORS = {
    watching: '#3b9eff', completed: '#22c55e', queued: '#f59e0b',
    'plan-to-watch': '#a78bfa', dropped: '#ef4444', paused: '#fbbf24', untracked: '#50506a'
  };
  const r = 54, cx = 64, cy = 64, circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = STATUS_OPTIONS
    .filter(s => statusCounts[s] > 0)
    .map(s => {
      const pct = statusCounts[s] / total;
      const dash = pct * circumference;
      const seg = { status: s, count: statusCounts[s], pct: Math.round(pct * 100), dash, offset, color: STATUS_COLORS[s] };
      offset += dash;
      return seg;
    });

  const arcs = segments.map(seg =>
    `<circle class="donut-seg" cx="${cx}" cy="${cy}" r="${r}"
      fill="none" stroke="${seg.color}" stroke-width="18"
      stroke-dasharray="${seg.dash} ${circumference - seg.dash}"
      stroke-dashoffset="${circumference - seg.offset}"
      transform="rotate(-90 ${cx} ${cy})"
      style="transition: stroke-dasharray 0.8s ease">
      <title>${STATUS_LABELS[seg.status]}: ${seg.count} (${seg.pct}%)</title>
    </circle>`
  ).join('');

  const legend = segments.map(seg =>
    `<div class="donut-legend-item">
      <span class="donut-legend-dot" style="background:${seg.color}"></span>
      <span class="donut-legend-label">${STATUS_LABELS[seg.status]}</span>
      <span class="donut-legend-count">${seg.count}</span>
    </div>`
  ).join('');

  return `<div class="donut-wrap">
    <svg class="donut-svg" viewBox="0 0 128 128">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="18"/>
      ${arcs}
      <text x="${cx}" y="${cy - 6}" text-anchor="middle" class="donut-center-num">${total}</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" class="donut-center-label">Total</text>
    </svg>
    <div class="donut-legend">${legend}</div>
  </div>`;
}

function renderStats() {
  const s = computeStats();
  if (!s) {
    return `<div class="page page--stats">
      <div class="stats-empty">
        <div class="stats-empty__icon">📊</div>
        <div class="stats-empty__title">No data yet</div>
        <p class="stats-empty__text">Add anime to your library and start watching to see your personal analytics here.</p>
        <button type="button" class="action-button" data-action="tab" data-tab="browse">Browse Anime</button>
      </div>
    </div>`;
  }

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // ── Hero stat cards ──────────────────────────────────────────
  const heroCards = [
    { value: s.total, label: 'Total Anime', icon: '🎌', color: 'var(--accent-bright)' },
    { value: s.totalEpisodes.toLocaleString(), label: 'Episodes Watched', icon: '▶', color: '#3b9eff' },
    { value: s.totalHours.toLocaleString() + 'h', label: 'Time Watched', icon: '⏱', color: '#22c55e' },
    { value: s.totalDays + 'd', label: 'Days of Anime', icon: '📅', color: '#f59e0b' },
    { value: s.avgRating ? '★ ' + s.avgRating : '—', label: 'Avg Your Rating', icon: '⭐', color: '#fbbf24' },
    { value: s.completionRate + '%', label: 'Completion Rate', icon: '✓', color: '#a78bfa' },
  ].map(c => `<div class="stat-hero-card" style="--card-color:${c.color}">
    <div class="stat-hero-card__icon">${c.icon}</div>
    <div class="stat-hero-card__value" style="color:${c.color}">${escapeHtml(String(c.value))}</div>
    <div class="stat-hero-card__label">${escapeHtml(c.label)}</div>
  </div>`).join('');

  // ── Rating distribution bar chart ────────────────────────────
  const ratingBars = s.ratingDist.map(r => {
    const h = s.maxRatingCount > 0 ? Math.round((r.count / s.maxRatingCount) * 100) : 0;
    const isAvg = s.avgRating && Math.round(parseFloat(s.avgRating)) === r.score;
    return `<div class="rating-bar-col">
      <div class="rating-bar-count">${r.count > 0 ? r.count : ''}</div>
      <div class="rating-bar-track">
        <div class="rating-bar-fill${isAvg ? ' rating-bar-fill--avg' : ''}" style="height:${h}%" title="${r.count} anime rated ${r.score}"></div>
      </div>
      <div class="rating-bar-label">${r.score}</div>
    </div>`;
  }).join('');

  // ── Genre horizontal bars ─────────────────────────────────────
  const genreBars = s.topGenres.map((g, i) => {
    const w = Math.round((g.count / s.maxGenreCount) * 100);
    const hue = (i * 28) % 360;
    return `<div class="genre-bar-row">
      <div class="genre-bar-name">${escapeHtml(g.genre)}</div>
      <div class="genre-bar-track">
        <div class="genre-bar-fill" style="width:${w}%;background:hsl(${hue},65%,60%)" title="${g.count} anime"></div>
      </div>
      <div class="genre-bar-count">${g.count}</div>
    </div>`;
  }).join('');

  // ── Year distribution sparkline ───────────────────────────────
  const yearBars = s.yearDist.map(y => {
    const h = Math.round((y.count / s.maxYearCount) * 100);
    return `<div class="year-bar-col" title="${y.year}: ${y.count} anime">
      <div class="year-bar-fill" style="height:${h}%"></div>
      <div class="year-bar-label">${String(y.year).slice(2)}</div>
    </div>`;
  }).join('');

  // ── Top anime by episodes ─────────────────────────────────────
  const topEpCards = s.topByEpisodes.map(e => {
    const pct = e.episodes > 0 ? Math.round((e.episodesWatched / e.episodes) * 100) : 100;
    return `<button type="button" class="top-ep-card" data-action="open-watch" data-id="${e.id}">
      <div class="top-ep-card__cover">${e.cover ? `<img src="${escapeHtml(e.cover)}" alt="">` : ''}</div>
      <div class="top-ep-card__info">
        <div class="top-ep-card__title">${escapeHtml(getDisplayTitle(e))}</div>
        <div class="top-ep-card__eps">${e.episodesWatched} / ${e.episodes || '?'} episodes</div>
        <div class="top-ep-card__bar"><div class="top-ep-card__fill" style="width:${pct}%"></div></div>
      </div>
      <div class="top-ep-card__pct">${pct}%</div>
    </button>`;
  }).join('');

  // ── Critic card ───────────────────────────────────────────────
  let criticHtml = '';
  if (s.scoreDiff !== null && s.bothScored >= 3) {
    const diff = parseFloat(s.scoreDiff);
    const label = diff > 0.5 ? 'Generous Rater 😊' : diff < -0.5 ? 'Harsh Critic 🧐' : 'Aligned with Community 🎯';
    const desc = diff > 0.5
      ? `You rate anime ${s.scoreDiff} points higher than the AniList community average.`
      : diff < -0.5
      ? `You rate anime ${Math.abs(diff).toFixed(1)} points lower than the AniList community average.`
      : `Your ratings closely match the AniList community consensus.`;
    criticHtml = `<div class="critic-card">
      <div class="critic-card__label">${label}</div>
      <div class="critic-card__row">
        <div class="critic-card__score"><span class="critic-card__num">${s.avgRating}</span><span class="muted">Your avg</span></div>
        <div class="critic-card__vs">vs</div>
        <div class="critic-card__score"><span class="critic-card__num">${s.avgAniList}</span><span class="muted">AniList avg</span></div>
      </div>
      <div class="muted" style="font-size:0.8em;margin-top:8px">${escapeHtml(desc)}</div>
      <div class="muted" style="font-size:0.72em;margin-top:4px">Based on ${s.bothScored} rated anime</div>
    </div>`;
  }

  // ── Streak card ───────────────────────────────────────────────
  const streakHtml = `<div class="streak-card">
    <div class="streak-item">
      <div class="streak-item__num" style="color:var(--accent-bright)">${s.currentStreak}</div>
      <div class="streak-item__label">Current Streak</div>
      <div class="muted" style="font-size:0.72em">days</div>
    </div>
    <div class="streak-divider"></div>
    <div class="streak-item">
      <div class="streak-item__num" style="color:#f59e0b">${s.longestStreak}</div>
      <div class="streak-item__label">Longest Streak</div>
      <div class="muted" style="font-size:0.72em">days</div>
    </div>
    ${s.mostActiveMonth ? `<div class="streak-divider"></div>
    <div class="streak-item">
      <div class="streak-item__num" style="color:#22c55e">${escapeHtml(s.mostActiveMonth)}</div>
      <div class="streak-item__label">Most Active Month</div>
      <div class="muted" style="font-size:0.72em">${new Date().getFullYear()}</div>
    </div>` : ''}
  </div>`;

  return `<div class="page page--stats">

    <div class="stats-header">
      <div class="stats-header__title">Your Anime Stats</div>
      <div class="stats-header__sub">A deep dive into your watching history and habits</div>
    </div>

    <!-- Hero number cards -->
    <div class="stat-hero-grid">${heroCards}</div>

    <!-- Row 1: Donut + Rating dist -->
    <div class="stats-row stats-row--2col">
      <div class="stats-card">
        <div class="stats-card__title">Library Breakdown</div>
        <div class="stats-card__sub">Status distribution across all ${s.total} titles</div>
        ${renderDonutChart(s.statusCounts, s.total)}
      </div>
      <div class="stats-card">
        <div class="stats-card__title">Your Rating Distribution</div>
        <div class="stats-card__sub">${s.rated} rated anime · avg ${s.avgRating || '—'} / 10</div>
        <div class="rating-bars">${ratingBars}</div>
      </div>
    </div>

    <!-- Row 2: Genre bars -->
    <div class="stats-card">
      <div class="stats-card__title">Top Genres in Your Library</div>
      <div class="stats-card__sub">Ranked by number of anime per genre</div>
      <div class="genre-bars">${genreBars}</div>
    </div>

    <!-- Row 3: Activity heatmap -->
    <div class="stats-card">
      <div class="stats-card__title">Watch Activity — Last 12 Months</div>
      <div class="stats-card__sub">Each cell is one day · darker = more sessions</div>
      ${renderHeatmap(s.dayMap, s.maxDayCount)}
    </div>

    <!-- Row 4: Streak + Critic + Year dist -->
    <div class="stats-row stats-row--3col">
      <div class="stats-card">
        <div class="stats-card__title">Watching Streaks</div>
        <div class="stats-card__sub">Consecutive days with watch sessions</div>
        ${streakHtml}
      </div>
      ${criticHtml ? `<div class="stats-card">
        <div class="stats-card__title">Critic Profile</div>
        <div class="stats-card__sub">How your taste compares to AniList</div>
        ${criticHtml}
      </div>` : ''}
      <div class="stats-card">
        <div class="stats-card__title">Anime by Release Year</div>
        <div class="stats-card__sub">Which eras you watch most</div>
        <div class="year-bars">${yearBars}</div>
      </div>
    </div>

    <!-- Row 5: Top anime by episodes -->
    ${s.topByEpisodes.length ? `<div class="stats-card">
      <div class="stats-card__title">Most Watched Anime</div>
      <div class="stats-card__sub">By episodes watched</div>
      <div class="top-ep-list">${topEpCards}</div>
    </div>` : ''}

  </div>`;
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
  app.innerHTML = `<div class="app-shell">${renderTopNav()}<main class="app-main"><div class="content-shell">${renderCurrentPage()}</div></main>${renderOverlay()}${renderMobileTabs()}</div>`;
  afterRender();
}
function afterRender() {
  document.querySelectorAll("[data-row-track]").forEach(track => { syncScrollButtons(track.id); track.addEventListener("scroll", () => syncScrollButtons(track.id), { passive: true }); });
  if (!currentWatchId && currentTab === "home") initHeroCarousel();
  if (uiState.navSearchOpen) { const input = document.getElementById("navSearchInput"); if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); } }
  if (uiState.focusInputId) { const focusTarget = document.getElementById(uiState.focusInputId); if (focusTarget) { focusTarget.focus(); if (typeof focusTarget.setSelectionRange === "function") focusTarget.setSelectionRange(focusTarget.value.length, focusTarget.value.length); } uiState.focusInputId = ""; }
  if (currentTab === "search" && !currentWatchId) { const pageInput = document.getElementById("searchPageInput"); if (pageInput && document.activeElement !== pageInput && uiState.search.query) pageInput.setSelectionRange(pageInput.value.length, pageInput.value.length); }
  if (currentTab === "browse" && !uiState.browse.initialized && !uiState.browse.loading) loadBrowse("seasonal");
  if (currentTab === "browse") {
    const sentinel = document.getElementById("browseSentinel");
    if (sentinel) {
      // Disconnect any existing observer before attaching a new one
      if (window._browseObserver) {
        window._browseObserver.disconnect();
        window._browseObserver = null;
      }
      window._browseObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !uiState.browse.loading) {
          loadBrowse(uiState.browse.mode, uiState.browse.genre, uiState.browse.page + 1);
        }
      }, { threshold: 0.1 });
      window._browseObserver.observe(sentinel);
    }
  }
  // Re-apply settings modal focus trap and scroll lock after any re-render while settings is open
  if (uiState.overlay && uiState.overlay.type === "settings") {
    document.body.style.overflow = "hidden";
  }
  if (currentWatchId) { const activeEpisode = document.querySelector(".ep-row.current"); if (activeEpisode) activeEpisode.scrollIntoView({ block: "nearest" }); renderRatingComponent(currentWatchId, "watchViewRatingContainer"); paintEpisodeList(currentWatchId); const currentEntry = getEntry(currentWatchId); if (currentEntry && franchiseCache[currentEntry.anilistId || currentEntry.id]) renderWatchOrder(currentEntry.anilistId || currentEntry.id, currentWatchOrderSort); setupWatchPlayer(); } else window.clearTimeout(streamFallbackTimer);
}
function setupWatchPlayer() {
  window.clearTimeout(streamFallbackTimer);
  const iframe = document.querySelector("[data-watch-iframe]");
  if (!iframe) return;
  
  uiState.watch.streamLoaded = false;
  
  // Check if iframe loaded successfully (contentDocument check for cross-origin)
  const checkIframeLoaded = () => {
    try {
      // Try to access iframe content - will throw if cross-origin
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      if (doc && doc.body && doc.body.innerHTML.trim().length > 0) {
        uiState.watch.streamLoaded = true;
        window.clearTimeout(streamFallbackTimer);
        return true;
      }
    } catch (e) {
      // Cross-origin - we can't check content, so rely on load event
    }
    return false;
  };
  
  // Primary: listen for load event
  iframe.addEventListener("load", () => {
    if (checkIframeLoaded()) return;
    // If load fired but content is empty, still mark as loaded (provider loaded, just no content)
    uiState.watch.streamLoaded = true;
    window.clearTimeout(streamFallbackTimer);
  }, { once: true });
  
  // Fallback: 60-second timeout for provider failure detection
  // This gives providers ample time to load while still catching failures
  streamFallbackTimer = window.setTimeout(() => {
    if (!uiState.watch.streamLoaded && currentWatchId) {
      // Check one more time if iframe actually loaded
      if (!checkIframeLoaded()) {
        uiState.watch.forceFallback = true;
        renderApp();
        showToast(`${STREAM_PROVIDERS[uiState.watch.currentProvider]?.name || "Stream"} did not load. Try switching providers.`, "error");
      }
    }
  }, 60000); // 60 seconds as requested
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
  if (action === "toggle-menu") {
    uiState.navMenuOpen = !uiState.navMenuOpen;
    renderApp();
    if (uiState.navMenuOpen) {
      // Close dropdown when clicking anywhere outside it
      const closeDropdown = (e) => {
        if (!e.target.closest(".nav-more-dropdown") && !e.target.closest("[data-action='toggle-menu']")) {
          uiState.navMenuOpen = false;
          renderApp();
          document.removeEventListener("click", closeDropdown);
        }
      };
      setTimeout(() => document.addEventListener("click", closeDropdown), 0);
    }
    return;
  }
  if (action === "toggle-nav-search") { uiState.navSearchOpen = !uiState.navSearchOpen; if (uiState.navSearchOpen) currentTab = "search"; renderApp(); return; }
  if (action === "export") { exportData(); return; }
  if (action === "import") { const input = document.getElementById("importInput"); if (input) input.click(); return; }
  if (action === "toggle-theme") { toggleTheme(); return; }
  if (action === "row-scroll") { scrollRow(actionTarget.dataset.target, actionTarget.dataset.dir); return; }
  if (action === "open-watch") { openWatchView(Number(actionTarget.dataset.id)); return; }
  if (action === "open-detail") { openDetailOverlay(Number(actionTarget.dataset.id)); return; }
  if (action === "close-overlay") {
    const wasSettings = uiState.overlay && uiState.overlay.type === "settings";
    uiState.overlay = null;
    renderApp();
    if (wasSettings) settingsOnClose();
    return;
  }
  if (action === "open-settings") { uiState.overlay = { type: "settings" }; renderApp(); settingsAfterRender(); return; }
  if (action === "set-accent") {
    uiState.accentColor = actionTarget.dataset.color;
    document.documentElement.style.setProperty("--accent", uiState.accentColor);
    document.documentElement.style.setProperty("--accent-bright", uiState.accentColor);
    saveData(); renderApp(); settingsAfterRender(); flashSettingsSaved(); return;
  }
  if (action === "set-volume") { uiState.volume = parseFloat(actionTarget.value); saveData(); return; }
  if (action === "toggle-compact") { uiState.compactMode = !uiState.compactMode; document.body.classList.toggle("compact-mode", uiState.compactMode); saveData(); renderApp(); return; }
  if (action === "toggle-reduced-motion") { uiState.reducedMotion = !uiState.reducedMotion; document.body.classList.toggle("reduced-motion", uiState.reducedMotion); saveData(); renderApp(); return; }
  if (action === "toggle-compact-view") {
    uiState.compactView = actionTarget.checked;
    document.body.classList.toggle("compact-view", uiState.compactView);
    saveData(); flashSettingsSaved(); return;
  }
  if (action === "toggle-no-animations") {
    uiState.disableAnimations = actionTarget.checked;
    document.body.classList.toggle("no-animations", uiState.disableAnimations);
    saveData(); flashSettingsSaved(); return;
  }
  if (action === "open-status-picker") { openStatusPicker(actionTarget.dataset.source, Number(actionTarget.dataset.id)); return; }
  if (action === "open-add-modal") {
    const source = actionTarget.dataset.source;
    const id = Number(actionTarget.dataset.id);
    const media = getAniListResultBySource(source, id);
    if (media) { uiState.overlay = { type: "add-modal", source, id }; renderApp(); }
    return;
  }
  if (action === "quick-watch-now") { const media = getAniListResultBySource(actionTarget.dataset.source, Number(actionTarget.dataset.id)); if (media) quickWatchNow(media); return; }
  if (action === "quick-add-status") { event.stopPropagation(); const media = getAniListResultBySource(actionTarget.dataset.source, Number(actionTarget.dataset.id)); if (media) { addToLibrary(media, actionTarget.dataset.status); uiState.overlay = null; } return; }
  if (action === "picker-status") { const media = getAniListResultBySource(actionTarget.dataset.source, Number(actionTarget.dataset.id)); if (media) addToLibrary(media, actionTarget.dataset.status); return; }
  if (action === "set-library-filter") { uiState.library.filter = actionTarget.dataset.filter; renderApp(); return; }
  if (action === "browse-mode") { loadBrowse(actionTarget.dataset.mode); return; }
  if (action === "browse-genre") { loadBrowse("genre", actionTarget.dataset.genre); return; }
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
}
function handleInput(event) {
  // Settings: Color Intensity slider — live update, no re-render needed
  if (event.target.dataset.action === "set-intensity") {
    const val = parseInt(event.target.value, 10);
    uiState.colorIntensity = val;
    document.documentElement.style.setProperty("--accent-opacity", String(val / 100));
    const display = document.getElementById("intensityDisplay");
    if (display) display.textContent = val + "%";
    saveData();
    flashSettingsSaved();
    return;
  }
  if (event.target.id === "librarySearchInput") {
    // Change 5: Surgical DOM update — do NOT call renderApp() to avoid destroying the input
    uiState.library.query = event.target.value;
    // Do NOT set uiState.focusInputId — input is never destroyed, focus is never lost
    const libraryGrid = document.querySelector(".library-grid");
    if (libraryGrid) {
      const entries = getFilteredLibraryEntries();
      libraryGrid.innerHTML = entries.map((entry) => renderPosterCard(entry, { context: "grid", action: "open-watch" })).join("");
    } else {
      // Grid doesn't exist yet (empty state shown) — need a full re-render to switch from empty state to grid
      renderApp();
    }
    return;
  }
  if (["searchPageInput", "navSearchInput", "mobileNavSearchInput"].includes(event.target.id)) {
    uiState.search.query = event.target.value; currentTab = "search";
    uiState.navSearchOpen = false; /* nav search is always visible now */
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
  if (event.key === "Escape") {
    if (uiState.overlay) {
      const wasSettings = uiState.overlay.type === "settings";
      uiState.overlay = null;
      renderApp();
      if (wasSettings) settingsOnClose();
      return;
    }
    if (currentWatchId) closeWatchView();
    return;
  }
  if (!currentWatchId || isTyping) return;
  if (event.key === "ArrowLeft") { event.preventDefault(); switchEpisode(currentWatchId, currentEpisode - 1); return; }
  if (event.key === "ArrowRight") { event.preventDefault(); switchEpisode(currentWatchId, currentEpisode + 1); return; }
  if (event.key.toLowerCase() === "m") { event.preventDefault(); markEpisodeWatched(currentWatchId, currentEpisode); return; }
  if (event.key.toLowerCase() === "f") { event.preventDefault(); toggleWatchFullscreen(); return; }
  if (event.shiftKey && event.key.toLowerCase() === "n") { event.preventDefault(); switchEpisode(currentWatchId, currentEpisode + 1); return; }
  if (event.shiftKey && event.key.toLowerCase() === "p") { event.preventDefault(); switchEpisode(currentWatchId, currentEpisode - 1); return; }
  if (event.key === " ") { const iframe = document.querySelector("[data-watch-iframe]"); if (iframe) { event.preventDefault(); iframe.focus(); } }
  if (event.key.toLowerCase() === "w") { 
    event.preventDefault(); 
    const entry = getEntry(currentWatchId); 
    if (entry) { 
      uiState.watch.currentProvider = (uiState.watch.currentProvider + 1) % STREAM_PROVIDERS.length; 
      uiState.watch.streamLoaded = false; 
      uiState.watch.forceFallback = false;
      renderApp(); 
      showToast(`Switched to ${STREAM_PROVIDERS[uiState.watch.currentProvider].name}`, "info"); 
    } 
    return; 
  }
}
function handleMessage(event) {
  if (!event.origin.includes("megaplay.buzz") || !currentWatchId) return;
  const payload = typeof event.data === "string" ? safeParse(event.data) : event.data;
  if (!payload || typeof payload !== "object") return;
  if (payload.event === "ended" || payload.type === "ended") handlePlaybackEnded();
}
function safeParse(value) { try { return JSON.parse(value); } catch (error) { return null; } }
/* ══ SETTINGS MODAL HELPERS ══════════════════════════════════════ */

/**
 * Called after the settings modal is rendered.
 * - Locks body scroll
 * - Traps focus inside the modal
 * - Wires up Escape key and backdrop click-outside
 */
function settingsAfterRender() {
  const card = document.querySelector(".settings-card");
  if (!card) return;

  // Scroll lock
  document.body.style.overflow = "hidden";

  // Focus the first focusable element inside the modal
  const focusable = card.querySelectorAll(
    'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length) focusable[0].focus();

  // Focus trap: keep Tab/Shift+Tab inside the modal
  function trapFocus(e) {
    if (!uiState.overlay || uiState.overlay.type !== "settings") {
      document.removeEventListener("keydown", trapFocus);
      return;
    }
    if (e.key !== "Tab") return;
    const els = Array.from(card.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
    if (!els.length) return;
    const first = els[0];
    const last  = els[els.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener("keydown", trapFocus);
}

/**
 * Restores body scroll when the settings modal closes.
 * Called from the close-overlay action when overlay was settings.
 */
function settingsOnClose() {
  document.body.style.overflow = "";
}

/**
 * Briefly shows the "✓ Saved" flash badge inside the settings modal.
 */
function flashSettingsSaved() {
  const el = document.getElementById("settingsSavedFlash");
  if (!el) return;
  el.classList.add("is-visible");
  clearTimeout(el._flashTimer);
  el._flashTimer = setTimeout(() => el.classList.remove("is-visible"), 1500);
}

function init() {
  loadData(); renderApp();
  app.addEventListener("click", handleClick); app.addEventListener("input", handleInput); app.addEventListener("change", handleChange); app.addEventListener("focusout", handleFocusOut);
  window.addEventListener("keydown", handleKeydown); window.addEventListener("message", handleMessage);
  window.addEventListener("resize", () => document.querySelectorAll("[data-row-track]").forEach(track => syncScrollButtons(track.id)));
  if (uiState.search.query.trim().length >= 2) scheduleAniListSearch(uiState.search.query);

  /* FIX #4: is-scrolling class hides hover panels while scrolling */
  let _scrollTimeout = 0;
  document.addEventListener("scroll", () => {
    document.body.classList.add("is-scrolling");
    window.clearTimeout(_scrollTimeout);
    _scrollTimeout = window.setTimeout(() => document.body.classList.remove("is-scrolling"), 200);
  }, { passive: true, capture: true });
}
init();