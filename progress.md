# AniVault Project Progress

## Project Overview
AniVault is a privacy-first, offline-capable anime streaming and tracking platform that runs entirely in the browser. No accounts, no servers, no subscriptions - your library lives in `localStorage`.

---

## Current Features Implemented

### 1. Library Management
- **Status Tracking**: Watching, Completed, Queued, Plan to Watch, Paused, Dropped, Untracked
- **Episode Progress**: Tracks episodes watched per title, auto-updates status on completion
- **Rating System**: 1-10 score with labels (Average, Good, Masterpiece, etc.)
- **Notes Field**: Free-text notes per entry
- **Export/Import**: Full JSON backup and restore
- **Sub/Dub Toggle**: Switch audio language per anime

### 2. Discovery (Browse Page)
- **AniList Browse**: Seasonal, Top Rated, Most Popular, and genre filters
- **Genre Search**: Type custom genre, shows option if not in pre-existing list
- **"Show All Anime"**: Clear any genre filter
- **Infinite Scroll**: "Load More" button loads additional pages
- **100+ Genres**: Alphabet navigation (A-Z) + dropdown picker

### 3. Search
- **AniList Search**: Live search with 350ms debounce
- **Advanced Filters**: Year range, score range, episodes, status
- **Library Search**: Local matches update instantly
- **AniList Results First**: Results show at top, library matches at bottom

### 4. Streaming & Playback
- **10 Stream Providers**:
  1. MegaPlay (AniList ID)
  2. VidStream
  3. VidCloud
  4. VidNest
  5. VidPlus
  6. VidLink
  7. VidSrc
  8. AniSuge (.ltd - title slug)
  9. AniSuge2 (.to - title slug)
  10. HiAnime

- **Auto-Fallback**: If one provider fails, automatically tries next after 2 minutes
- **Fullscreen Persistence**: Fullscreen mode preserved across episode switches
- **Sub/Dub Toggle**: Switch audio language instantly

### 5. Two-Sidebar Watch Layout
- **Left Sidebar**: Meta info, DUB/SUB toggle, episode synopsis, rating, progress, status
- **Player**: In the middle - fills available space
- **Right Sidebar**: Episode groups (50 per group), episode list

### 6. Watch Statistics
- Total anime in library
- Currently watching count
- Completed count
- In queue count
- Total episodes watched
- Hours watched
- Top 5 genres chart
- Average rating

### 7. Keyboard Shortcuts (Watch View)
- `←` / `→`: Previous / Next episode
- `Shift+N`: Next episode
- `Shift+P`: Previous episode
- `M`: Mark current episode watched
- `F`: Toggle fullscreen
- `Space`: Focus player iframe
- `Escape`: Close overlay or exit watch view
- `W`: Switch provider

### 8. Touch Gestures (Mobile)
- Swipe left: Mark episode watched
- Swipe right: Previous episode

### 9. Theme Customization
- Dark/Light theme toggle
- Accent color picker (8 colors)
- Compact mode
- Reduced motion toggle
- Volume memory (persists per device)

### 10. Notification System
- Checks every 6 hours for new episodes on "watching" anime
- Browser notifications when new episodes available

---

## File Structure
```
anivalt/
├── index.html      # Main HTML file
├── app.js        # All JavaScript application logic (1575 lines)
├── styles.css    # All CSS styles (1124 lines)
├── progress.md   # Project documentation
├── README.md     # documentation
└── netlify.toml # Netlify configuration
```

---

## Stream Provider URLs

### AniList ID-based (may fail for unmapped anime/movies/OVAs):
- MegaPlay: `https://megaplay.buzz/stream/ani/{anilistId}/{ep}/{lang}`
- VidNest: `https://vidnest.fun/anime/{anilistId}/{ep}/{lang}`
- VidPlus: `https://player.vidplus.to/embed/anime/{anilistId}?dub={}`
- VidLink: `https://vidlink.pro/anime/{anilistId}/{ep}/{lang}`
- VidSrc: `https://vidsrc.icu/embed/anime/{anilistId}/{ep}/{dub}`

### Title Slug-based (better for movies/OVAs):
- AniSuge: `https://www.animesuge.ltd/anime/{slug}/ep-{ep}`
- AniSuge2: `https://animesuge.to/anime/{slug}/ep-{ep}`

### Direct:
- HiAnime: `https://hianime.to/watch/{id}?ep={ep}`

---

## Auto-Fallback Logic
- Wait 120 seconds (2 minutes) before trying next provider
- Cycles through all 10 providers
- Shows toast notifications for each switch
- Last provider shows "All providers failed" error

---

## Data Storage
- **Library**: `localStorage` key `anivault_v2`
- **Volume**: `localStorage` key `anivault_volume`
- **Settings**: `localStorage` key `anivault_settings`

---

## Known Limitations

### Can't Implement (require streaming provider APIs):
1. **Skip Intro/Outro**: Native player controls work if provider supports them
2. **Playback Speed Control**: Cross-origin iframe restriction
3. **Resume Timestamp**: Requires provider postMessage support
4. **Picture-in-Picture**: Cross-origin iframe restriction

### Providers Not Working:
- VidStream, VidCloud - speculative URLs, may not exist
- AniSuge domains may block embeds or have CORS issues

---

## API Sources Used
- **AniList GraphQL API**: `https://graphql.anilist.co`
- **Megaplay API**: `https://megaplay.buzz/api`
- **Jikan API** (not integrated): MyAnimeList metadata only

---

## GitHub Repository
https://github.com/Tester-creat/AniValt

---

## Last Updated
May 2026