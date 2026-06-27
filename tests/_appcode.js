/**
 * Pure logic mirrored from app.js for tests.
 *
 * app.js touches the DOM at module load (it's a browser script, not a module),
 * so — following the repo convention — the pure, browser-free functions are
 * re-declared here. Keep these in sync with app.js if that logic changes.
 */

export const STATUS_OPTIONS = ["watching", "completed", "watchlist", "paused", "dropped"];

export function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
export function mediaKey(type, id) { return `${type}-${id}`; }

export function normalizeEntry(entry) {
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

export function normalizeLibrary(raw) {
  const result = {};
  if (!raw || typeof raw !== "object") return result;
  Object.values(raw).forEach((value) => {
    const entry = normalizeEntry(value);
    if (entry.id > 0) result[entry.key] = entry;
  });
  return result;
}

export const STREAM_PROVIDERS = [
  { name: "VidLink", movie: (id) => `https://vidlink.pro/movie/${id}`, tv: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}` },
  { name: "VidSrc", movie: (id) => `https://vidsrc.to/embed/movie/${id}`, tv: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}` },
  { name: "2Embed", movie: (id) => `https://www.2embed.cc/embed/${id}`, tv: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}` },
  { name: "AutoEmbed", movie: (id) => `https://player.autoembed.cc/embed/movie/${id}`, tv: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}` },
];

export function buildStreamUrl(entry, providerIndex = 0, season = 1, episode = 1) {
  if (!entry || !entry.id) return "";
  const provider = STREAM_PROVIDERS[providerIndex] || STREAM_PROVIDERS[0];
  return entry.mediaType === "tv" ? provider.tv(entry.id, season, episode) : provider.movie(entry.id);
}

/** Debounce helper mirroring the search scheduler's timing contract. */
export function makeDebouncer(fn, delay) {
  let timer = null;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}
