# CineVault — Your Private Cinema

CineVault is a privacy-first, premium **movies, TV series & animation** streaming and tracking platform that runs entirely in your browser. No accounts, no backend, no subscriptions — your library lives in `localStorage` and goes wherever you do. The interface is a fully Netflix-style experience: a cinematic auto-rotating hero billboard, hover-scaling carousels, rich detail pages, and an in-app player.

> **Animation, not anime.** Catalog and rows are powered by TMDB's animation genre (animated movies & series) — not an anime-specific source.

---

## Setup (60 seconds)

1. Get a **free** TMDB API key: https://www.themoviedb.org/settings/api → request a **v3 "API Key"**.
2. Run the app locally (see *How to run*) and open it.
3. Click the **gear / Settings** icon, paste your key, and save. The key is stored locally in your browser only.

That's it — the home page fills with trending titles immediately.

---

## Features

### Streaming & Playback
- **8 streaming servers** — VidLink, VidFast, VidSrc, VidSrc.cc, 2Embed, SuperEmbed, AutoEmbed, and EmbedAPI, all keyed by TMDB ID
- **Auto-provider fallback** — if a provider fails to load within 30 seconds, the next is tried automatically
- **Manual provider switching** — cycle providers from the watch view
- **Movies & episodes** — single embed for movies; season + episode selector for series
- **Auto-next episode** — advances to the next episode when playback ends
- **Fullscreen persistence** — fullscreen is preserved across episode switches

### Library & Tracking
- **Offline-first** — your library is stored in `localStorage` under `cinevault_v1`
- **Status tracking** — Watching, Completed, Watchlist, Paused, Dropped
- **Progress** — per-series season/episode progress; movies mark watched on completion
- **Rating system** — 1–10 score with labels
- **Notes** — free-text notes per title
- **Export / Import** — full JSON backup and restore

### Discovery (TMDB)
- **Home** — Trending, Popular Movies, Top Rated, Now Playing, Popular Series, Animation, and per-genre rows
- **Movies / TV Shows / Animation** — dedicated pages with curated rows
- **Search** — live multi-search (movies + series) with 350 ms debounce
- **Detail pages** — backdrop, overview, cast, trailer, genres, similar titles, and seasons for series
- **Recommendations** — "Because you watched…", trending, and genre-based rows built from your own library

### Stats
- Totals, status breakdown donut, a watch-activity heatmap, and top genres — all from your local data.

### Keyboard Shortcuts (Watch View)
| Key | Action |
|---|---|
| `←` / `→` | Previous / Next episode (series) |
| `Shift+N` | Next episode |
| `Shift+P` | Switch provider |
| `F` | Toggle fullscreen |
| `Esc` | Back |

---

## How to run

This is a static site — no build step.

```bash
# Option A (Node)
npx serve .

# Option B (Python)
python3 -m http.server 8080
# then open http://localhost:8080
```

## Tests

```bash
npm install
npm test
```

Property-based tests (vitest + fast-check) cover provider URL validity, entry
normalization idempotence, library round-trips, search debounce, and status
coercion.

---

## Tech

- Vanilla JS single-page app, zero dependencies at runtime
- TMDB v3 REST API for all catalog data and images
- TMDB-ID embed providers for playback
- `localStorage` for the entire library and settings

## Disclaimer

CineVault is a personal, self-hosted front-end. It stores no data on any server
and ships no media. Catalog metadata comes from TMDB; playback is delegated to
third-party embed providers that you choose to enable. You are responsible for
complying with the laws and terms of service applicable in your jurisdiction.

## License

See [LICENSE](LICENSE).
