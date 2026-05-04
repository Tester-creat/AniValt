# AniVault — Your Private Stream

AniVault is a privacy-first, offline-capable anime streaming and tracking platform that runs entirely in your browser. No accounts, no servers, no subscriptions — your library lives in `localStorage` and goes wherever you do.

---

## Features

### Streaming & Playback
- **MegaPlay integration** — streams anime via embedded player using AniList IDs
- **Auto-next episode** — automatically advances to the next episode when playback ends
- **Fullscreen persistence** — fullscreen mode is preserved across episode switches (Fullscreen API)
- **Sub / Dub toggle** — switch audio language instantly on any title
- **Fallback mode** — if MegaPlay fails to load within 7 seconds, a manual tracking screen appears with a HiAnime search link

### Library Management
- **Offline-first** — your entire library is stored in `localStorage` under key `anivault_v2`
- **Status tracking** — Watching, Completed, Queued, Plan to Watch, Paused, Dropped, Untracked
- **Episode progress** — tracks episodes watched per title and updates status automatically on completion
- **Rating system** — 1–10 score with labels (Average, Good, Masterpiece, etc.)
- **Notes field** — free-text notes per entry, saved on blur
- **Export / Import** — full JSON backup and restore

### Discovery
- **AniList browse** — Seasonal, Top Rated, Most Popular, and 15 genre filters via AniList GraphQL
- **AniList search** — live search with 350 ms debounce, results land without disrupting your typing
- **Recommendation rows** — "Because You Watched X", "Trending For You", "Recommended For You" built from your own library data

### Watch Order
- Franchise relations fetched from AniList (Sequel, Prequel, Side Story, Spin-off, etc.)
- Sort by recommended watch order or release date
- Click any related title to jump straight into it

### Keyboard Shortcuts (Watch View)
| Key | Action |
|---|---|
| `←` / `→` | Previous / Next episode |
| `Shift+N` | Next episode |
| `Shift+P` | Previous episode |
| `M` | Mark current episode watched |
| `F` | Toggle fullscreen |
| `Space` | Focus player iframe (passes play/pause to video) |
| `Escape` | Close overlay or exit watch view |

---

## Getting Started

AniVault is a static site — no build step required.

### Local Development
```bash
# Serve with any static file server, e.g.:
npx serve .
# or
python3 -m http.server 8080
```
Open `http://localhost:8080` in your browser.

### Deploy to Netlify
The included `netlify.toml` configures security headers automatically. Push to a repo connected to Netlify and it deploys in one click.

---

## Project Structure

```
anivault/
├── index.html        # Single-page shell — minimal, no framework
├── app.js            # All application logic (~3 100 lines, vanilla JS)
├── styles.css        # Full design system and responsive layout
├── netlify.toml      # Deployment config + security headers
├── README.md         # This file
└── INSTRUCTIONS.md   # UI/UX refactor spec (bug fixes & feature targets)
```

---

## Architecture

AniVault is intentionally framework-free. The entire UI is re-rendered via `innerHTML` on state changes, with targeted DOM updates for performance-sensitive areas (episode list, rating widget, watch order panel).

### State
- `userData` — the library, keyed by AniList ID, persisted to `localStorage`
- `uiState` — ephemeral UI state (active tab, browse/search results, watch controls)
- `currentWatchId` / `currentEpisode` — active watch session

### Rendering
- `renderApp()` — full re-render into `#app`; called on major state changes
- `paintEpisodeList()` — partial DOM update for the episode panel (avoids re-rendering the sidebar)
- `renderRatingComponent()` / `renderWatchOrder()` — targeted updates for specific containers
- `afterRender()` — post-render hook for focus restoration, scroll sync, browse auto-load

### Data Flow
```
User Action → handleClick / handleInput / handleChange
    → state mutation
    → renderApp() or partial update
    → afterRender()
```

### External APIs
- **AniList GraphQL** (`https://graphql.anilist.co`) — anime metadata, search, browse, episode thumbnails, franchise relations
- **MegaPlay** (`https://megaplay.buzz/stream/ani/{id}/{episode}/{lang}`) — embedded stream player; listens for `postMessage` `ended` event for auto-next

---

## Known Limitations

| Feature | Status | Notes |
|---|---|---|
| Resume timestamp | Not available | MegaPlay doesn't expose playback time via postMessage |
| Playback speed | Not available | Cross-origin iframe; video element inaccessible |
| Picture-in-Picture | Not available | Requires direct video element access |
| Volume memory | Not available | MegaPlay iframe controls its own volume |
| Episode thumbnails on hover | Partial | Uses AniList `streamingEpisodes` data when available |

---

## Known Issues Fixed (this revision)

| Bug | Root Cause | Fix |
|---|---|---|
| Search input loses focus on every keystroke | `scheduleAniListSearch()` called `queueRender()` immediately, creating a second RAF render after `focusInputId` was already cleared | Removed immediate `queueRender()` calls from `scheduleAniListSearch()`; callers already trigger `renderApp()` |
| Episode group selector doesn't stay sticky | `.watch-sidebar` had `overflow: hidden`, which prevents `position: sticky` on any descendant | Changed `.watch-sidebar` to `overflow: visible`; flex layout handles clipping |
| Rating / status bar not locked to sidebar bottom | `position: sticky; bottom: 0` on a flex sibling of the scroll container has no effect | Changed to `flex-shrink: 0`; `flex: 1` on the body scroller pushes the bar to the bottom naturally |
| Status picker dropdown clipped by adjacent cards | `.discover-card:hover` had no `z-index`, so sibling cards could overlay the dropdown | Added `z-index: 20` to `.discover-card:hover` and bumped `.status-picker` to `z-index: 500` |
| Fullscreen lost on episode switch | `renderApp()` destroys and recreates the iframe; browser exits fullscreen | Detect fullscreen before render, exit gracefully, re-enter via Fullscreen API after RAF |
| Missing keyboard shortcuts | `handleKeydown` only handled arrows and M | Added F (fullscreen), Shift+N (next), Shift+P (prev), Space (focus player) |

---

## Configuration

All user data is stored in `localStorage` under the key `anivault_v2`. Clear this key to reset the app.

The app respects a `data-theme` attribute on `<html>` for light/dark mode. Theme preference is persisted inside the library data under `__meta.theme`.

---

## Security

The `netlify.toml` sets:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restricting geolocation, microphone, and camera

No analytics, no tracking, no external dependencies except Google Fonts and the AniList API.

---

## License

See `LICENSE` for terms.
