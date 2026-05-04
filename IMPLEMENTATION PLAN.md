You are rebuilding AniVault from scratch. AniVault is a private, single-user, 
offline-first anime streaming and tracking site hosted on Netlify as a static 
site (HTML + CSS + vanilla JS, no build step, no backend, no npm). All data 
is stored in localStorage. The existing codebase has three files: index.html, 
styles.css, app.js. You will completely replace all three files.

═══════════════════════════════════════════════════════
SECTION 1 — WHAT TO WIPE COMPLETELY
═══════════════════════════════════════════════════════

1. Delete the entire pre-seeded animeDB array. AniVault starts with zero 
   anime. The user adds everything themselves.

2. Delete all hardcoded sample data, placeholder entries, and demo content.

3. Delete the old dashboard layout (hero-panel, dashboard-grid, dash-card 
   sections). Replace with the new layout described in Section 3.

4. Delete all references to the old modal system. Replace with the new 
   watch view described in Section 4.

5. Keep the following logic intact, just refactored into the new structure:
   - AniList API search (fetch from https://graphql.anilist.co)
   - localStorage save/load (saveData, loadData)
   - Export/import JSON backup
   - Status system: watching, completed, plan-to-watch, queued, dropped, 
     untracked
   - episodesWatched tracking and increment logic
   - Genre tagging and filter
   - Toast notification system
   - Theme toggle (dark/light)

═══════════════════════════════════════════════════════
SECTION 2 — VISUAL DESIGN SYSTEM
═══════════════════════════════════════════════════════

Design direction: cinematic dark streaming service. Think premium — like 
Crunchyroll or a high-end Netflix clone. Not anime-cute, not purple gamer 
aesthetic. Sophisticated, dark, immersive.

COLOR TOKENS (define as CSS custom properties on :root):
  --bg:          #0a0a0f        (near-black page background)
  --surface:     #111118        (card/panel background)
  --surface2:    #1a1a24        (elevated surfaces)
  --border:      #ffffff0f      (subtle borders)
  --border2:     #ffffff18      (slightly more visible borders)
  --accent:      #e85d26        (primary orange — action buttons, highlights)
  --accent2:     #c44bff        (secondary purple — badges, gradients)
  --accent-glow: #e85d2640      (accent with opacity for glows)
  --text1:       #f0f0f5        (primary text)
  --text2:       #a0a0b0        (secondary text)
  --text3:       #606070        (muted/placeholder text)
  --badge-watching:   #3b9eff
  --badge-completed:  #22c55e
  --badge-dropped:    #ef4444
  --badge-queued:     #f59e0b
  --badge-plan:       #a78bfa
  --radius:      12px
  --radius-sm:   8px
  --transition:  0.2s ease

TYPOGRAPHY:
  - Import Inter from Google Fonts (weights 400, 600, 700, 800)
  - Base font size: 15px
  - Use font-feature-settings: "cv02","cv03","cv04","cv11" for Inter
  - Headings: 800 weight, tight letter-spacing (-0.03em)

VISUAL EFFECTS:
  - Subtle noise texture overlay on --bg using an SVG data URI filter
  - Cards use backdrop-filter: blur(12px) on hover for depth
  - Cover images always fill cards with object-fit: cover
  - Hover on anime cards: scale(1.03), box-shadow with accent-glow
  - Gradient text on the site logo: linear-gradient(135deg, #e85d26, #c44bff)
  - Page background: pure --bg with two radial gradient orbs (orange top-right, 
    purple bottom-left) at 25% opacity, fixed position

LAYOUT:
  - Full-width single column, no persistent sidebar
  - Top navigation bar (fixed, 60px height, blur backdrop)
  - Content sections stack vertically with generous spacing (48px between sections)
  - Anime cards: 180px wide, poster aspect ratio (2:3), border-radius 10px
  - Cards in horizontal scrollable rows per section (no wrapping grid on homepage)
  - A standard browsable grid view is available via the Library tab

═══════════════════════════════════════════════════════
SECTION 3 — PAGE STRUCTURE & SECTIONS
═══════════════════════════════════════════════════════

NAVIGATION BAR (fixed top):
  Left:   AniVault logo (gradient text) + tagline "Your private stream"
  Center: Tab links — Home | Library | Browse | Search
  Right:  Search icon (opens inline search bar), Export, Import, Theme toggle
  Mobile: Hamburger menu collapses center + right items

─────────────────────────────────
TAB: HOME
─────────────────────────────────

[A] CONTINUE WATCHING — hero row at top, most prominent section
  - Shows all anime with status = 'watching', sorted by lastWatched DESC
  - Each card is wider than standard (320px wide, 16:9 aspect ratio for 
    landscape feel) and shows:
      * Cover image (blurred background + sharp centered poster overlay)
      * Anime title
      * "Episode X of Y" progress label
      * A bold "▶ Resume" button
      * A thin progress bar at the bottom of the card (episodesWatched / 
        totalEpisodes as percentage, colored with --accent)
  - When an anime reaches episodesWatched === totalEpisodes, it is 
    automatically moved to status = 'completed' and removed from this row
  - If no anime is currently watching, show a friendly empty state:
    "Nothing playing yet — add something to your watchlist to get started."
  - This row auto-refreshes after any episode is marked watched

[B] UP NEXT IN QUEUE — horizontal scroll row
  - Shows anime with status = 'queued', sorted by dateAdded DESC
  - Standard poster cards (180×270px)
  - Shows title + "In Queue" badge
  - Click opens the watch view

[C] PLAN TO WATCH — horizontal scroll row  
  - Shows anime with status = 'plan-to-watch'
  - Standard poster cards
  - Shows title + episode count
  - Click opens the add/detail modal, not the player (since not started yet)

[D] RECENTLY COMPLETED — horizontal scroll row
  - Shows anime with status = 'completed', sorted by completedAt DESC
  - Shows title + star rating if rated
  - Max 20 shown in this row; rest accessible in Library

[E] STATS BAR — a slim horizontal stats strip between sections
  - Total in library | Currently watching | Completed | Episodes watched
  - Single line, subtle, not a big dashboard card

─────────────────────────────────
TAB: LIBRARY
─────────────────────────────────
  - Full browsable grid of all anime in the user's localStorage
  - Filter bar: All | Watching | Completed | Queue | Plan | Dropped | Untracked
  - Sort: Default | A-Z | Z-A | Newest | Highest Rated | Most Progress
  - Search bar filters the grid in real time
  - Standard poster cards in a responsive CSS grid 
    (auto-fill, minmax(160px, 1fr))
  - Each card shows: cover, title, status badge, episode progress bar
  - Click any card opens the watch view (Section 4)

─────────────────────────────────
TAB: BROWSE
─────────────────────────────────
  - Calls the AniList API to browse anime by:
      * Seasonal (current season auto-detected from current date)
      * Genre (grid of genre pills to click)
      * Top Rated (allTime)
      * Most Popular
  - Each result card shows AniList data: cover, title, score, episode count
  - "Add to Library" button on each card — opens a small status picker 
    (watching / plan-to-watch / queued) then saves to localStorage
  - If anime is already in library, show "In Library" chip instead of 
    the Add button, clicking it opens the watch view

─────────────────────────────────
TAB: SEARCH
─────────────────────────────────
  - Full-page AniList search with a prominent search input
  - Results shown as cards (same style as Browse)
  - Same "Add to Library" / "In Library" behaviour as Browse tab
  - Also show a secondary section: "Search in My Library" that filters 
    localStorage results in real time as a separate row above AniList results

═══════════════════════════════════════════════════════
SECTION 4 — WATCH VIEW (the player experience)
═══════════════════════════════════════════════════════

Trigger: clicking "▶ Resume", "▶ Watch", or any anime card that is in 
watching/queued status.

The watch view REPLACES the current tab content entirely (not a modal). 
It is a full-page layout with two panels side by side:

LEFT PANEL (episode list, 280px wide, fixed height, scrollable):
  - Anime title at top (large, bold)
  - Sub/Dub toggle buttons (SUB | DUB) — persisted per anime in localStorage 
    as userData[id].language, defaults to 'sub'
  - Scrollable list of episode buttons:
      * Format: "Ep 1", "Ep 2", ... "Ep N"
      * Currently playing episode: highlighted with --accent background
      * Watched episodes: dimmed with a ✓ checkmark
      * Unwatched episodes: default style
      * Click any episode to load it in the right panel
  - At the bottom of the left panel:
      * "← Back" button to return to previous tab/view
      * "Mark Watched" button for current episode
      * Progress label: "X / Y episodes watched"

RIGHT PANEL (player, fills remaining width):
  - MegaPlay iframe embed:
      URL format: https://megaplay.buzz/stream/ani/{anilistId}/{epNumber}/{lang}
      where lang is 'sub' or 'dub'
  - The iframe fills the entire right panel with no borders (aspect-ratio: 16/9, 
    width: 100%, then fill remaining height)
  - Below the iframe, a slim control bar:
      * ← Previous Episode button (disabled on ep 1)
      * Current episode label "Episode X of Y"  
      * Next Episode → button (disabled on last ep)
  - AUTO-PLAY BEHAVIOUR:
      * Listen for window postMessage events from megaplay.buzz
      * When event.data.event === 'ended' OR event.data.type === 'ended':
          1. Call markEpisodeWatched(id, currentEp)
          2. If currentEp < totalEpisodes: auto-load next episode 
             (update iframe src, update left panel highlight)
          3. If currentEp === totalEpisodes: mark anime status = 'completed',
             update lastWatched, show a toast "🎉 Series complete!", 
             return to Home tab after 3 seconds
  - FALLBACK (no AniList ID or MegaPlay returns no content):
      * Show a centered panel inside the right panel area:
          - Message: "No stream available for this title via MegaPlay"
          - A button: "Search on HiAnime →" that opens 
            https://hianime.re/search?keyword={encodeURIComponent(title)} 
            in a new tab
          - A note: "Come back and mark episodes watched manually using 
            the list on the left"
      * The left panel episode list still works normally for manual tracking

SMART TRACKING LOGIC (this is critical — build it carefully):
  - Every time an episode is marked watched (manually or via postMessage):
      * Set userData[id].episodesWatched = Math.max(current, newEp)
      * Set userData[id].lastWatched = Date.now()
      * Call recordWatchTime(id) to log a session timestamp
      * If episodesWatched >= anime.episodes:
          - Set status = 'completed'
          - Set userData[id].completedAt = Date.now()
          - Remove from Continue Watching row
          - Add to Recently Completed row
          - Show completion toast
      * If status was 'plan-to-watch' or 'queued' and user starts watching:
          - Auto-set status = 'watching'
          - Add to Continue Watching row immediately
      * Always call saveData() after any mutation
      * Always re-render the Continue Watching row after any status change

═══════════════════════════════════════════════════════
SECTION 5 — DATA MODEL
═══════════════════════════════════════════════════════

localStorage key: 'anivault_v2' (new key — do not read 'anivault_v1' or 
any old keys, fresh start)

userData object shape (keyed by anime ID):
{
  [animeId]: {
    id: number,              // AniList ID
    title: string,           // romaji title
    titleEnglish: string,    // english title (may be null)
    cover: string,           // AniList cover image URL (large)
    banner: string,          // AniList banner image URL (may be null)
    episodes: number,        // total episode count
    status: string,          // 'watching'|'completed'|'plan-to-watch'|
                             // 'queued'|'dropped'|'untracked'
    episodesWatched: number, // 0 to episodes
    language: string,        // 'sub' or 'dub', default 'sub'
    rating: number,          // 1-10, user rating, 0 = unrated
    dateAdded: number,       // Date.now() timestamp
    lastWatched: number,     // Date.now() timestamp, 0 if never
    completedAt: number,     // Date.now() timestamp, 0 if not complete
    notes: string,           // optional user notes
    genres: string[],        // from AniList
    year: number,            // from AniList
    anilistId: number,       // same as id, explicit for clarity
    sessionLog: number[],    // array of Date.now() timestamps per session
  }
}

saveData(): JSON.stringify the entire userData object to 
  localStorage.setItem('anivault_v2', ...)
loadData(): JSON.parse from localStorage.getItem('anivault_v2') || {}

═══════════════════════════════════════════════════════
SECTION 6 — ANILIST API USAGE
═══════════════════════════════════════════════════════

Endpoint: POST https://graphql.anilist.co
Content-Type: application/json
No API key required — AniList is public for read queries.

Use these queries:

1. SEARCH query (for Search tab and adding anime):
   Query variables: { search: string, page: 1, perPage: 20 }
   Fields to request: id, title{romaji, english}, coverImage{large}, 
   bannerImage, episodes, genres, seasonYear, averageScore, status

2. BROWSE — Seasonal:
   Query variables: { season: SPRING|SUMMER|FALL|WINTER, 
   seasonYear: number, page: 1, perPage: 30, sort: [POPULARITY_DESC] }

3. BROWSE — By genre:
   Query variables: { genre: string, page: 1, perPage: 30, 
   sort: [SCORE_DESC] }

4. BROWSE — Top rated / Popular:
   sort: [SCORE_DESC] or [POPULARITY_DESC]

Detect current season from new Date().getMonth():
  0-2 → WINTER, 3-5 → SPRING, 6-8 → SUMMER, 9-11 → FALL

═══════════════════════════════════════════════════════
SECTION 7 — EXTRA FEATURES TO INCLUDE
═══════════════════════════════════════════════════════

1. TOAST SYSTEM
   - Bottom-right toast notifications, 3 second auto-dismiss
   - Types: success (green), error (red), info (blue)
   - Slide-in animation from the right

2. EXPORT / IMPORT BACKUP
   - Export: download userData as anivault-backup-{date}.json
   - Import: file picker accepts .json, merges with existing data 
     (existing entries are overwritten by imported ones if IDs match)
   - Show success toast after import with count of imported titles

3. RATING SYSTEM
   - In the left panel of the watch view, show a 1-10 star/number rating 
     input that saves to userData[id].rating
   - Show average score in Library card and Completed row cards

4. NOTES FIELD
   - Simple textarea in the watch view left panel for personal notes
   - Auto-saves on blur

5. KEYBOARD SHORTCUTS
   - Left arrow: previous episode
   - Right arrow: next episode  
   - M: mark current episode watched
   - Escape: back to previous view

6. RESPONSIVE / MOBILE
   - On screens < 768px: watch view stacks vertically 
     (episode list above player, collapsible)
   - Navigation becomes a bottom tab bar on mobile
   - Continue Watching cards stack vertically on mobile
   - All touch targets minimum 44px

7. SCROLL BEHAVIOUR
   - Each horizontal row (Continue Watching, Queue, etc.) has 
     left/right arrow buttons for scrolling on desktop
   - Smooth scroll, hide arrows when at start/end of row

8. EMPTY STATES
   - Every section has a styled empty state with an icon and helpful text
   - Continue Watching empty: "Start watching something to see it here"
   - Library empty: "Your library is empty — head to Browse or Search to add anime"
   - Queue empty: "Nothing queued — add anime to your queue from Browse"

═══════════════════════════════════════════════════════
SECTION 8 — FILE OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════

Output exactly three files:

1. index.html
   - Clean semantic HTML5
   - Link to styles.css and app.js
   - Import Inter from Google Fonts
   - No inline styles except CSS custom property overrides on :root
   - Include a <div id="app"> as the main mount point
   - Include <div id="toastZone"> for toasts
   - No other script tags — all logic in app.js

2. styles.css
   - All CSS custom properties defined on :root and [data-theme="light"]
   - Mobile-first responsive with breakpoints at 480px, 768px, 1024px, 1280px
   - No CSS frameworks — pure CSS only
   - Smooth transitions on all interactive elements
   - No !important unless absolutely necessary
   - Organized in sections with comments:
     RESET | TOKENS | LAYOUT | NAV | HOME | LIBRARY | BROWSE | 
     SEARCH | WATCH VIEW | CARDS | MODALS | TOAST | UTILITIES

3. app.js
   - Pure vanilla JS, no dependencies, no imports
   - Organized in sections with comments matching CSS sections
   - No animeDB pre-seeded array — userData starts empty from localStorage
   - All functions named clearly: renderHome(), renderLibrary(), 
     renderBrowse(), renderSearch(), openWatchView(id), 
     closeWatchView(), markEpisodeWatched(id, ep), switchEpisode(id, ep),
     switchLanguage(id, lang), saveData(), loadData(), showToast(msg, type),
     exportData(), importData(event), addToLibrary(anilistData, status)
   - Single-page app routing via a simple currentTab variable and 
     renderTab(tab) function
   - Event delegation where possible (one listener on a parent, 
     not individual listeners per card)
   - No use of localStorage keys from the old version 
     ('anivault_data', 'anivault_v1', etc.)
   - Use 'anivault_v2' as the only localStorage key

═══════════════════════════════════════════════════════
SECTION 9 — THINGS TO EXPLICITLY NOT DO
═══════════════════════════════════════════════════════

- Do NOT pre-seed any anime data
- Do NOT use any npm packages or CDN libraries
- Do NOT use React, Vue, or any framework
- Do NOT use a build step or bundler
- Do NOT add a login/auth system (single user, no gate needed)
- Do NOT use fetch for anything other than AniList and MegaPlay 
  (no other external APIs)
- Do NOT use localStorage keys from old versions
- Do NOT leave TODO comments or placeholder functions — 
  every function must be fully implemented
- Do NOT use alert() or confirm() — use toasts and inline UI instead
- Do NOT use jQuery
- Do NOT add any anime to the database by default