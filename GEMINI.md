You are redesigning AniVault's UI/UX from a structured 
library-management tool into a fluid, cinematic, 
Netflix-style private streaming platform. The goal is 
NOT to add features — it is to completely rethink how 
the existing features FEEL and FLOW.

The three files are attached: index.html, styles.css, 
app.js. Rewrite styles.css almost entirely. Make 
targeted structural changes to app.js and index.html 
as described below. Do NOT change any business logic, 
data model, event handlers, API calls, or localStorage 
behaviour — only layout, rendering, and visual style.

═══════════════════════════════════════════════════════
PART 1 — THE CORE PHILOSOPHY SHIFT
═══════════════════════════════════════════════════════

OLD MINDSET (remove this):
  Organising a collection. Sections with headers.
  Cards inside bordered containers. Explicit category 
  labels. App-like tabs with equal visual weight.
  Content is secondary to structure.

NEW MINDSET (build this):
  Guiding a continuous viewing journey. The background 
  dominates. Images are the primary UI. Text is 
  secondary and minimal. Structure is invisible — 
  content rows float on the background with no 
  containing boxes. The platform anticipates what the 
  user wants next.

This affects every visual decision throughout.

═══════════════════════════════════════════════════════
PART 2 — CSS DESIGN SYSTEM (full rewrite of styles.css)
═══════════════════════════════════════════════════════

Keep ALL existing CSS custom property names exactly — 
only change their values and add new ones. This is 
critical because app.js reads class names and 
data-attributes that must remain unchanged.

COLOR TOKENS — update :root values to:
  --bg:            #080810
  --surface:       #0f0f1a
  --surface2:      #161625
  --border:        rgba(255,255,255,0.06)
  --border2:       rgba(255,255,255,0.12)
  --accent:        #e85d26
  --accent2:       #c44bff
  --accent-glow:   rgba(232,93,38,0.3)
  --accent2-glow:  rgba(196,75,255,0.2)
  --text1:         #f2f2f8
  --text2:         #9090a8
  --text3:         #55556a
  --badge-watching:  #3b9eff
  --badge-completed: #22c55e
  --badge-dropped:   #ef4444
  --badge-queued:    #f59e0b
  --badge-plan:      #a78bfa
  --radius:        10px
  --radius-sm:     6px
  --transition:    0.2s ease

Add new tokens:
  --nav-h:         64px    (fixed nav height)
  --mob-nav-h:     60px    (mobile bottom bar)

PAGE BACKGROUND:
  html, body — background: var(--bg), overflow-x hidden
  body::before — fixed pseudo-element, full viewport,
    background: 
      radial-gradient(ellipse 60% 40% at 80% 10%, 
        rgba(232,93,38,0.08) 0%, transparent 60%),
      radial-gradient(ellipse 50% 50% at 10% 90%, 
        rgba(196,75,255,0.06) 0%, transparent 60%)
    pointer-events none, z-index 0
  All content sits above this with position relative, 
  z-index 1

TYPOGRAPHY:
  Base: Inter, 15px, line-height 1.6, color var(--text1)
  font-feature-settings: "cv02","cv03","cv04","cv11"
  Headings: font-weight 800, letter-spacing -0.03em

───────────────────────────────────────────
TOP NAVIGATION (.topnav)
───────────────────────────────────────────
  Position: fixed, top 0, left 0, right 0
  Height: var(--nav-h)
  Background: rgba(8,8,16,0.85)
  backdrop-filter: blur(20px) saturate(180%)
  border-bottom: 1px solid var(--border)
  z-index: 100

.topnav__inner:
  Max-width: 1400px, margin 0 auto
  Display: flex, align-items center, gap 24px
  Height: 100%, padding: 0 24px

.nav-brand__logo:
  Font-size: 1.3em, font-weight: 800
  Background: linear-gradient(135deg, var(--accent), 
    var(--accent2))
  -webkit-background-clip: text
  -webkit-text-fill-color: transparent
  background-clip: text
  Letter-spacing: -0.04em

.nav-brand__tagline: display none (hidden always)

.nav-center:
  Display: flex, gap: 4px
  Margin: 0 auto (centers in the flex row)

.tab-link:
  Padding: 6px 14px, border-radius: 20px
  Border: none, background: transparent
  Color: var(--text2), font-size: 0.875em
  font-weight: 600, cursor: pointer
  Transition: color var(--transition), 
    background var(--transition)

.tab-link:hover:
  Color: var(--text1)
  Background: rgba(255,255,255,0.06)

.tab-link.is-active:
  Color: var(--text1)
  Background: rgba(255,255,255,0.1)

.nav-actions:
  Display: flex, align-items center, gap: 8px

.nav-button:
  Padding: 6px 12px, border-radius: var(--radius-sm)
  Border: 1px solid var(--border2)
  Background: transparent, color: var(--text2)
  Font-size: 0.8em, cursor: pointer
  Transition: all var(--transition)
.nav-button:hover:
  Color: var(--text1), border-color: rgba(255,255,255,0.25)

.icon-button:
  Width: 36px, height: 36px, border-radius: 50%
  Border: none, background: transparent
  Color: var(--text2), cursor: pointer
  Display: flex, align-items center, justify-content center
  Transition: background var(--transition), color var(--transition)
.icon-button:hover:
  Background: rgba(255,255,255,0.08), color: var(--text1)

.topnav__hamburger:
  Display: none (shown only on mobile via media query)

.nav-mobile-panel:
  Display: none (mobile only — handled in mobile section)

.nav-search-inline:
  Display: none (remove the inline search from nav — 
  search is accessed via the Search tab only)

───────────────────────────────────────────
MAIN CONTENT AREA (.app-main)
───────────────────────────────────────────
  Padding-top: var(--nav-h)
  Padding-bottom: 0 (desktop) / var(--mob-nav-h) (mobile)
  Min-height: 100vh

.content-shell:
  Max-width: 1400px
  Margin: 0 auto
  Padding: 0 24px 48px
  (mobile: padding 0 16px 24px)

.page:
  Animation: fadeInUp 0.3s ease
  @keyframes fadeInUp: 
    from { opacity:0; transform:translateY(12px) }
    to   { opacity:1; transform:none }

───────────────────────────────────────────
HOME PAGE ROW SECTIONS (.section)
───────────────────────────────────────────
CRITICAL DESIGN RULE:
  Sections have NO background, NO border, NO box-shadow.
  They float directly on the page background.
  Only the content (images, text) is visible.

.section:
  Margin-bottom: 48px

.section__head:
  Display: flex, align-items center, 
  justify-content space-between
  Margin-bottom: 16px
  Padding: 0 (no horizontal padding — content bleeds 
  to the left edge of the content-shell)

.section__eyebrow:
  Font-size: 0.7em, font-weight: 700
  Color: var(--accent), letter-spacing: 0.1em
  Text-transform: uppercase, margin-bottom: 4px

.section__title:
  Font-size: 1.15em, font-weight: 700
  Color: var(--text1)

.section__sub:
  Font-size: 0.82em, color: var(--text3)
  Margin-top: 2px

.section__controls (scroll buttons):
  Display: flex, gap: 6px

.scroll-btn:
  Width: 32px, height: 32px, border-radius: 50%
  Border: 1px solid var(--border2)
  Background: rgba(255,255,255,0.05)
  Color: var(--text2), cursor: pointer
  Font-size: 0.8em
  Transition: all var(--transition)
.scroll-btn:hover:
  Background: rgba(255,255,255,0.12), color: var(--text1)
.scroll-btn:disabled:
  Opacity: 0.25, cursor: not-allowed

───────────────────────────────────────────
CONTINUE WATCHING CARDS (.continue-card)
───────────────────────────────────────────
  These are the HERO cards at the top of Home.
  They must be large, cinematic, image-dominant.

.media-row:
  Overflow: hidden (clips the viewport)
  
.media-row__viewport:
  Overflow-x: auto, overflow-y: hidden
  Scrollbar-width: none
  -webkit-overflow-scrolling: touch
  Scroll-snap-type: x mandatory
  
.media-row__viewport::-webkit-scrollbar: display none

.media-row__track:
  Display: flex, gap: 16px
  Width: max-content
  Padding-bottom: 4px

.continue-card:
  Position: relative
  Width: 340px, flex-shrink: 0
  Aspect-ratio: 16/9
  Border-radius: var(--radius)
  Overflow: hidden, cursor: pointer
  Scroll-snap-align: start
  Border: none, padding: 0
  Background: var(--surface2)
  Transition: transform var(--transition), 
    box-shadow var(--transition)

.continue-card:hover:
  Transform: scale(1.02)
  Box-shadow: 0 16px 40px rgba(0,0,0,0.5),
    0 0 0 1px rgba(255,255,255,0.08)

.continue-card__bg:
  Position: absolute, inset: 0
  Z-index: 0
.continue-card__bg img:
  Width: 100%, height: 100%, object-fit: cover
  Transition: transform 0.4s ease
.continue-card:hover .continue-card__bg img:
  Transform: scale(1.06)

The gradient overlay (add as ::after on .continue-card):
  Position: absolute, inset: 0, z-index: 1
  Background: linear-gradient(
    to top,
    rgba(0,0,0,0.88) 0%,
    rgba(0,0,0,0.4) 50%,
    rgba(0,0,0,0.1) 100%
  )
  Content: ""

.continue-card__content:
  Position: absolute, inset: 0, z-index: 2
  Display: flex, flex-direction: column
  Justify-content: flex-end
  Padding: 16px

.continue-card__poster:
  Display: none (hide the small poster thumbnail 
  inside the landscape card — the background IS the 
  visual)

.continue-card__meta:
  Display: flex, flex-direction: column, gap: 6px

.continue-card__title:
  Font-size: 1em, font-weight: 700
  Color: white, line-height: 1.2
  Text-shadow: 0 1px 4px rgba(0,0,0,0.8)

.continue-card__progress:
  Font-size: 0.75em, color: rgba(255,255,255,0.7)

.continue-card__button:
  Display: inline-flex, align-items: center
  Gap: 6px, padding: 7px 16px
  Background: rgba(255,255,255,0.15)
  Backdrop-filter: blur(8px)
  Border: 1px solid rgba(255,255,255,0.2)
  Border-radius: 20px, color: white
  Font-size: 0.8em, font-weight: 700
  Width: fit-content
  Transition: background var(--transition)

.continue-card:hover .continue-card__button:
  Background: var(--accent)
  Border-color: var(--accent)

.continue-card__bar:
  Position: absolute, bottom: 0, left: 0, right: 0
  Height: 3px, background: rgba(255,255,255,0.15)
  Z-index: 3
.continue-card__bar span:
  Display: block, height: 100%
  Background: var(--accent)
  Border-radius: 0 2px 2px 0
  Transition: width 0.3s ease

───────────────────────────────────────────
STANDARD POSTER CARDS (.poster-card)
───────────────────────────────────────────
  Used in Queue, Plan, Completed, Library rows.
  Poster-dominant — the image is 80% of the card.

.poster-card:
  Position: relative, width: 150px, flex-shrink: 0
  Border-radius: var(--radius), overflow: hidden
  Border: none, padding: 0, cursor: pointer
  Background: var(--surface2)
  Scroll-snap-align: start
  Transition: transform var(--transition)

.poster-card:hover:
  Transform: scale(1.04)
  Z-index: 2

.poster-card__media:
  Width: 150px, height: 210px
  Overflow: hidden
.poster-card__media img:
  Width: 100%, height: 100%, object-fit: cover
  Display: block
  Transition: transform 0.4s ease
.poster-card:hover .poster-card__media img:
  Transform: scale(1.08)

.poster-card__body:
  Padding: 8px 10px 10px
  Background: linear-gradient(to bottom, 
    transparent, rgba(0,0,0,0.8))
  
  REDESIGN: Make this overlay on the image.
  Change to position: absolute on the card.
  Position: absolute, bottom: 0, left: 0, right: 0
  Z-index: 2
  Background: linear-gradient(to top, 
    rgba(0,0,0,0.9) 0%, transparent 100%)
  Padding: 24px 8px 8px

.poster-card__title:
  Font-size: 0.78em, font-weight: 700
  Color: white, line-height: 1.2
  Display: -webkit-box
  -webkit-line-clamp: 2
  -webkit-box-orient: vertical
  Overflow: hidden

.poster-card__meta:
  Font-size: 0.68em, color: rgba(255,255,255,0.6)
  Margin-top: 3px

.poster-card__meta-row:
  Display: flex, gap: 4px, flex-wrap: wrap
  Margin-bottom: 4px

.progress-rail:
  Height: 2px, background: rgba(255,255,255,0.2)
  Border-radius: 1px, margin-top: 6px
  Overflow: hidden
.progress-rail span:
  Display: block, height: 100%
  Background: var(--accent)
  Border-radius: 1px

Status badges (.badge):
  Font-size: 0.62em, font-weight: 700
  Padding: 2px 6px, border-radius: 3px
  Letter-spacing: 0.04em, text-transform: uppercase
.badge--watching:   background rgba(59,158,255,0.25), 
  color: var(--badge-watching)
.badge--completed:  background rgba(34,197,94,0.2),  
  color: var(--badge-completed)
.badge--dropped:    background rgba(239,68,68,0.2),  
  color: var(--badge-dropped)
.badge--queued:     background rgba(245,158,11,0.2), 
  color: var(--badge-queued)
.badge--plan-to-watch: background rgba(167,139,250,0.2), 
  color: var(--badge-plan)
.badge--untracked:  background rgba(255,255,255,0.08), 
  color: var(--text3)

.poster-card--grid:
  Width: 100% (fills grid cell)
.poster-card--grid .poster-card__media:
  Width: 100%, height: 0
  Padding-bottom: 140% (maintains 2:3 ratio)
  Position: relative
.poster-card--grid .poster-card__media img:
  Position: absolute, inset: 0

───────────────────────────────────────────
STATS STRIP (.stats-strip)
───────────────────────────────────────────
  Remove the .surface-strip styling entirely.
  Replace with a minimal inline strip.

.stats-strip:
  Display: flex, gap: 32px
  Padding: 16px 0, margin-bottom: 40px
  Border-bottom: 1px solid var(--border)
  Overflow-x: auto, scrollbar-width: none

.stat-chip:
  Flex-shrink: 0, min-width: 80px

.stat-chip__value:
  Font-size: 1.4em, font-weight: 800
  Color: var(--text1), line-height: 1

.stat-chip__label:
  Font-size: 0.72em, color: var(--text3)
  Margin-top: 2px

───────────────────────────────────────────
DISCOVER CARDS (.discover-card) — Browse & Search
───────────────────────────────────────────
  Remove the horizontal card layout.
  Make these poster-style cards in a grid.

.browse-results, .search-results-grid:
  Display: grid
  Grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))
  Gap: 16px

.discover-card:
  Position: relative, border-radius: var(--radius)
  Overflow: hidden, background: var(--surface2)
  Cursor: default

.discover-card__media:
  Width: 100%, aspect-ratio: 2/3
  Overflow: hidden
.discover-card__media img:
  Width: 100%, height: 100%, object-fit: cover
  Display: block
  Transition: transform 0.4s ease
.discover-card:hover .discover-card__media img:
  Transform: scale(1.05)

.discover-card__body:
  Position: absolute, bottom: 0, left: 0, right: 0
  Background: linear-gradient(to top, 
    rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 60%, 
    transparent 100%)
  Padding: 32px 10px 10px
  Transform: translateY(100%)
  Transition: transform 0.25s ease
  
.discover-card:hover .discover-card__body:
  Transform: translateY(0)

.discover-card__title:
  Font-size: 0.8em, font-weight: 700, color: white
  Display: -webkit-box, -webkit-line-clamp: 2
  -webkit-box-orient: vertical, overflow: hidden
  Margin-bottom: 4px

.discover-card__meta:
  Font-size: 0.7em, color: rgba(255,255,255,0.6)
  Margin-bottom: 6px

.discover-card__meta-row:
  Display: flex, flex-wrap: wrap, gap: 4px
  Margin-bottom: 6px

.card-actions:
  Display: flex, gap: 6px

.btn-watch-now:
  Flex: 1, padding: 7px 0
  Background: var(--accent), color: white
  Border: none, border-radius: var(--radius-sm)
  Font-size: 0.75em, font-weight: 700
  Cursor: pointer, transition: opacity var(--transition)
.btn-watch-now:hover: opacity 0.85

.btn-add:
  Padding: 7px 10px, background: transparent
  Border: 1px solid rgba(255,255,255,0.25)
  Color: white, border-radius: var(--radius-sm)
  Font-size: 0.75em, cursor: pointer
  Transition: all var(--transition)
.btn-add:hover:
  Border-color: white

.chip-chip:
  Font-size: 0.62em, font-weight: 600
  Padding: 2px 6px, border-radius: 3px
  Background: rgba(255,255,255,0.1), color: var(--text2)

.action-button:
  Padding: 8px 16px, background: var(--accent)
  Color: white, border: none
  Border-radius: var(--radius-sm)
  Font-size: 0.82em, font-weight: 700, cursor: pointer
  Transition: opacity var(--transition)
.action-button:hover: opacity 0.85

.secondary-button:
  Padding: 8px 16px, background: transparent
  Color: var(--text2), border: 1px solid var(--border2)
  Border-radius: var(--radius-sm)
  Font-size: 0.82em, font-weight: 600, cursor: pointer
  Transition: all var(--transition)
.secondary-button:hover:
  Color: var(--text1), border-color: rgba(255,255,255,0.3)
.secondary-button:disabled:
  Opacity: 0.35, cursor: not-allowed

───────────────────────────────────────────
LIBRARY PAGE (.page--library)
───────────────────────────────────────────
.page-hero:
  Padding: 48px 0 32px
  Border-bottom: 1px solid var(--border)
  Margin-bottom: 32px

.page-title:
  Font-size: 2.2em, font-weight: 800
  Color: var(--text1), letter-spacing: -0.03em

.page-subtitle:
  Font-size: 0.9em, color: var(--text3), margin-top: 6px

.library-toolbar:
  Margin-bottom: 24px

.toolbar-row:
  Display: flex, gap: 8px, flex-wrap: wrap
  Margin-bottom: 12px

.chip-group:
  Display: flex, gap: 6px, flex-wrap: wrap

.chip:
  Padding: 6px 14px, border-radius: 20px
  Border: 1px solid var(--border2)
  Background: transparent, color: var(--text2)
  Font-size: 0.8em, font-weight: 600, cursor: pointer
  Transition: all var(--transition)
.chip:hover:
  Color: var(--text1), border-color: rgba(255,255,255,0.25)
.chip.is-active:
  Background: var(--accent), border-color: var(--accent)
  Color: white

.toolbar-grid:
  Display: flex, gap: 8px, flex-wrap: wrap
  Align-items: center

.input:
  Padding: 9px 14px, background: var(--surface2)
  Border: 1px solid var(--border2), border-radius: var(--radius)
  Color: var(--text1), font-size: 0.875em
  Outline: none, transition: border-color var(--transition)
  Width: 100% (inside a flex child), or auto
.input:focus:
  Border-color: var(--accent)

.select:
  Padding: 9px 14px, background: var(--surface2)
  Border: 1px solid var(--border2), border-radius: var(--radius)
  Color: var(--text1), font-size: 0.875em
  Cursor: pointer, outline: none

.library-grid:
  Display: grid
  Grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))
  Gap: 16px

───────────────────────────────────────────
BROWSE PAGE (.page--browse)
───────────────────────────────────────────
.browse-controls:
  Padding: 32px 0 24px

.discover-modes:
  Display: flex, gap: 6px

.genre-pills:
  Display: flex, gap: 6px, flex-wrap: wrap
  Margin-top: 12px

.status-line:
  Font-size: 0.82em, color: var(--text3), margin-top: 8px

───────────────────────────────────────────
SEARCH PAGE (.page--search)
───────────────────────────────────────────
.search-hero:
  Padding: 48px 0 32px, text-align: center
  Max-width: 600px, margin: 0 auto

.search-hero__input:
  Width: 100%, max-width: 540px
  Padding: 14px 20px, font-size: 1em
  Border-radius: 40px
  Border: 1px solid var(--border2)
  Background: var(--surface2), color: var(--text1)
  Outline: none, margin-top: 20px
  Transition: border-color var(--transition), 
    box-shadow var(--transition)
.search-hero__input:focus:
  Border-color: var(--accent)
  Box-shadow: 0 0 0 3px var(--accent-glow)

.search-layout:
  Display: flex, flex-direction: column, gap: 40px

───────────────────────────────────────────
WATCH VIEW (.page--watch)
───────────────────────────────────────────
.page--watch:
  Min-height: calc(100vh - var(--nav-h))
  Padding-top: 0

.watch-layout:
  Display: grid
  Grid-template-columns: 280px 1fr
  Min-height: calc(100vh - var(--nav-h))
  (mobile: grid-template-columns: 1fr, stack vertically)

.watch-sidebar:
  Background: var(--surface)
  Border-right: 1px solid var(--border)
  Display: flex, flex-direction: column
  Height: calc(100vh - var(--nav-h))
  Position: sticky, top: var(--nav-h)
  Overflow: hidden
  (mobile: position static, height auto, 
   border-right none, border-bottom 1px solid var(--border))

.watch-meta:
  Padding: 16px 16px 12px
  Border-bottom: 1px solid var(--border), flex-shrink: 0

.watch-title:
  Font-size: 0.95em, font-weight: 700
  Color: var(--text1), line-height: 1.3

.watch-meta__row:
  Display: flex, gap: 6px, flex-wrap: wrap
  Margin-top: 8px

.watch-badge:
  Font-size: 0.7em, padding: 2px 7px
  Border-radius: 3px
  Background: rgba(255,255,255,0.08), color: var(--text2)

.watch-sidebar__toggle:
  Display: none (hide collapse button — not needed 
  in the new design, sidebar is always visible on 
  desktop and stacks on mobile)

.watch-sidebar__body:
  Flex: 1, overflow-y: auto, overflow-x: hidden
  Scrollbar-width: thin
  Scrollbar-color: var(--border2) transparent
  Padding: 12px 0

.watch-sidebar__body.is-collapsed:
  Remove this state — no collapse in new design

.language-toggle:
  Display: flex, margin: 0 12px 12px
  Background: var(--surface2)
  Border: 1px solid var(--border)
  Border-radius: 8px, overflow: hidden

.language-toggle button:
  Flex: 1, padding: 7px, border: none
  Background: transparent, color: var(--text3)
  Font-size: 0.78em, font-weight: 700
  Cursor: pointer, letter-spacing: 0.05em
  Transition: background var(--transition), 
    color var(--transition)

.language-toggle button.is-active:
  Background: var(--accent), color: white

.episode-list:
  Padding: 0 8px
  Overflow-y: auto, flex: 1

.ep-row:
  Display: flex, align-items: center, gap: 8px
  Width: 100%, padding: 0 8px
  Height: 38px, border-radius: var(--radius-sm)
  Border: none, background: transparent, cursor: pointer
  Transition: background var(--transition)
  Text-align: left

.ep-row:hover:not(.current):
  Background: var(--surface2)

.ep-row.current:
  Background: var(--accent), border-radius: var(--radius-sm)

.ep-row.watched:
  Border-left: 3px solid var(--accent)
  Opacity: 0.6, padding-left: 5px

.ep-num:
  Font-weight: 700, width: 36px, flex-shrink: 0
  Color: var(--accent), font-size: 0.82em

.ep-row.current .ep-num: color: white

.ep-name:
  Flex: 1, overflow: hidden, text-overflow: ellipsis
  White-space: nowrap, font-size: 0.8em
  Color: var(--text2)

.ep-row.current .ep-name: color: white

.ep-dur:
  Color: var(--text3), font-size: 0.72em
  Flex-shrink: 0, min-width: 28px, text-align: right

.ep-row.current .ep-dur: color: rgba(255,255,255,0.7)

.watch-progress-label:
  Font-size: 0.75em, color: var(--text3)
  Padding: 8px 16px, margin-top: 4px

.watch-sidebar__footer:
  Padding: 12px 16px, flex-shrink: 0
  Border-top: 1px solid var(--border)
  Display: flex, flex-direction: column, gap: 8px

.watch-player:
  Display: flex, flex-direction: column
  Background: #000

.watch-player__frame:
  Position: relative
  Aspect-ratio: 16/9, width: 100%
  Background: #000

.watch-player__frame iframe:
  Position: absolute, inset: 0
  Width: 100%, height: 100%, border: none

.watch-player__fallback:
  Position: absolute, inset: 0
  Display: flex, align-items: center, justify-content: center

.watch-player__fallback-card:
  Max-width: 400px, text-align: center, padding: 32px
  Display: flex, flex-direction: column, gap: 16px

.watch-player__controls:
  Display: flex, align-items: center, 
  justify-content: space-between
  Padding: 12px 20px
  Background: var(--surface)
  Border-top: 1px solid var(--border)
  Flex-shrink: 0

.watch-player__controls strong:
  Font-size: 0.875em, color: var(--text1)

.watch-order-section:
  Padding: 40px 24px
  Background: var(--surface)
  Border-top: 1px solid var(--border)
  (This is the full-width section BELOW the watch layout)

───────────────────────────────────────────
STATUS PICKER DROPDOWN
───────────────────────────────────────────
.status-picker (overlay version):
  Display: flex, flex-direction: column, gap: 8px
  Padding: 8px 0

.status-picker (inline dropdown version):
  Position: absolute, top: 100%, left: 0, right: 0
  Background: var(--surface2)
  Border: 1px solid var(--border2)
  Border-radius: var(--radius-sm), z-index: 50
  Overflow: hidden, margin-top: 4px

.status-picker-item:
  Padding: 9px 14px, width: 100%
  Background: transparent, border: none
  Color: var(--text1), font-size: 0.82em
  Cursor: pointer, text-align: left
  Transition: background var(--transition)
.status-picker-item:hover:
  Background: rgba(255,255,255,0.06)

.card-actions__picker-wrap:
  Position: relative

───────────────────────────────────────────
EMPTY STATE
───────────────────────────────────────────
.empty-state:
  Padding: 48px 24px, text-align: center

.empty-state__icon:
  Font-size: 2.5em, margin-bottom: 12px
  Opacity: 0.3

.empty-state__title:
  Font-size: 0.95em, font-weight: 700
  Color: var(--text2)

.empty-state__text:
  Font-size: 0.82em, color: var(--text3)
  Margin-top: 6px, max-width: 320px, margin-inline: auto

───────────────────────────────────────────
OVERLAY / MODAL
───────────────────────────────────────────
.overlay:
  Position: fixed, inset: 0, z-index: 200
  Background: rgba(0,0,0,0.7)
  Backdrop-filter: blur(8px)
  Display: flex, align-items: center, justify-content: center
  Padding: 24px, animation: fadeIn 0.2s ease
  @keyframes fadeIn: from { opacity:0 } to { opacity:1 }

.overlay-card:
  Background: var(--surface), border-radius: 16px
  Border: 1px solid var(--border2)
  Max-width: 440px, width: 100%
  Overflow: hidden, animation: scaleIn 0.2s ease
  @keyframes scaleIn: 
    from { transform: scale(0.95); opacity:0 }
    to   { transform: scale(1); opacity:1 }

.overlay-card__hero:
  Display: flex, gap: 16px, padding: 24px 24px 0

.overlay-card__cover img:
  Width: 80px, height: 112px, object-fit: cover
  Border-radius: var(--radius-sm)

.overlay-card__meta:
  Flex: 1, display: flex, flex-direction: column, gap: 8px

.overlay-card__title:
  Font-size: 1.1em, font-weight: 800, color: var(--text1)

.overlay-card__actions:
  Padding: 20px 24px 24px
  Display: flex, flex-direction: column, gap: 8px

───────────────────────────────────────────
RATING COMPONENT
───────────────────────────────────────────
.rating-component:
  Display: flex, flex-direction: column, gap: 8px
  Padding: 12px 16px

.rating-blocks:
  Display: flex, gap: 4px

.rating-block:
  Width: 34px, height: 34px, border-radius: 6px
  Border: 1.5px solid var(--border2)
  Background: var(--surface2)
  Color: var(--text3), font-size: 0.78em, font-weight: 700
  Cursor: pointer, display: flex
  Align-items: center, justify-content: center
  Transition: all 0.15s, transform 0.1s

.rating-block:hover: transform: scale(1.1)

.rating-block.filled:
  Color: white, border-color: transparent

.rating-label:
  Font-size: 0.82em, color: var(--text2)
  Font-weight: 600, min-height: 18px

.rating-overlay:
  Position: fixed, inset: 0
  Background: rgba(0,0,0,0.88)
  Z-index: 9999, display: flex
  Align-items: center, justify-content: center
  Padding: 24px

.rating-overlay-box:
  Background: var(--surface), border-radius: 16px
  Padding: 32px, max-width: 420px, width: 90%
  Text-align: center, border: 1px solid var(--border2)

.rating-overlay-cover:
  Width: 90px, height: 126px, object-fit: cover
  Border-radius: var(--radius), margin: 0 auto 16px

.rating-overlay-title:
  Font-size: 1.2em, font-weight: 800, margin-bottom: 4px

.rating-overlay-sub:
  Font-size: 0.85em, color: var(--text2), margin-bottom: 20px

.rating-save-btn:
  Padding: 11px 32px, background: var(--accent)
  Color: white, border: none, border-radius: var(--radius-sm)
  Font-weight: 700, font-size: 0.9em, cursor: pointer
  Width: 100%, margin-top: 16px, transition: opacity var(--transition)
.rating-save-btn:hover: opacity 0.85

.rating-skip-link:
  Display: block, margin-top: 10px
  Font-size: 0.8em, color: var(--text3)
  Cursor: pointer, background: none, border: none, width: 100%

───────────────────────────────────────────
WATCH ORDER SECTION
───────────────────────────────────────────
.wo-header:
  Display: flex, align-items: flex-start
  Justify-content: space-between, gap: 16px
  Margin-bottom: 20px

.wo-title:
  Font-size: 1.1em, font-weight: 700

.wo-subtitle:
  Font-size: 0.8em, color: var(--text3), margin-top: 2px

.wo-toggle:
  Display: flex, gap: 4px, flex-shrink: 0

.wo-toggle-btn:
  Padding: 6px 14px, border-radius: 20px
  Border: 1.5px solid var(--border2)
  Background: transparent, color: var(--text2)
  Font-size: 0.78em, cursor: pointer
  Transition: all var(--transition)

.wo-toggle-btn.active:
  Background: var(--accent), border-color: var(--accent)
  Color: white

.wo-cards:
  Display: flex, gap: 14px
  Overflow-x: auto, padding-bottom: 12px
  Scrollbar-width: thin

.wo-card:
  Width: 140px, flex-shrink: 0, cursor: pointer
  Background: none, border: none, padding: 0
  Text-align: left, transition: transform var(--transition)

.wo-card:hover: transform: scale(1.04)

.wo-cover-wrap:
  Position: relative, width: 140px, height: 196px
  Border-radius: var(--radius), overflow: hidden
  Background: var(--surface2)

.wo-cover:
  Width: 100%, height: 100%, object-fit: cover

.wo-format-badge:
  Position: absolute, top: 6px, left: 6px
  Font-size: 0.6em, font-weight: 700
  Padding: 2px 6px, border-radius: 3px, color: white

.wo-now-badge:
  Position: absolute, top: 6px, right: 6px
  Font-size: 0.58em, font-weight: 700
  Padding: 2px 5px, border-radius: 3px
  Background: var(--accent), color: white

.wo-card-title:
  Font-size: 0.78em, font-weight: 600
  Color: var(--text1), margin-top: 8px
  Display: -webkit-box, -webkit-line-clamp: 2
  -webkit-box-orient: vertical, overflow: hidden

.wo-card-meta:
  Font-size: 0.7em, color: var(--text3), margin-top: 3px

.wo-card-relation:
  Font-size: 0.68em, color: var(--text3)
  Text-transform: capitalize

.wo-card-progress:
  Font-size: 0.7em, color: var(--accent), margin-top: 2px

───────────────────────────────────────────
TOAST (.toast)
───────────────────────────────────────────
.toast-zone:
  Position: fixed, bottom: 24px, right: 24px
  Z-index: 1000, display: flex
  Flex-direction: column, gap: 8px
  (mobile: bottom: calc(var(--mob-nav-h) + 16px), 
   right: 16px, left: 16px)

.toast:
  Background: var(--surface2)
  Border: 1px solid var(--border2)
  Border-radius: var(--radius)
  Padding: 12px 16px, max-width: 320px
  Box-shadow: 0 8px 24px rgba(0,0,0,0.4)
  Animation: slideInRight 0.25s ease
  @keyframes slideInRight:
    from { transform: translateX(100%); opacity:0 }
    to   { transform: translateX(0); opacity:1 }

.toast--success: border-left: 3px solid var(--badge-completed)
.toast--error:   border-left: 3px solid var(--badge-dropped)
.toast--info:    border-left: 3px solid var(--badge-watching)

.toast__title:
  Font-size: 0.75em, font-weight: 700
  Color: var(--text2), text-transform: uppercase
  Letter-spacing: 0.06em, margin-bottom: 2px

.toast__body:
  Font-size: 0.82em, color: var(--text1)

───────────────────────────────────────────
IN-LIBRARY CHIP
───────────────────────────────────────────
.in-library-chip:
  Font-size: 0.68em, font-weight: 600
  Padding: 3px 8px, border-radius: 4px
  Background: rgba(34,197,94,0.15)
  Color: var(--badge-completed)

───────────────────────────────────────────
TEXTAREA / NOTES
───────────────────────────────────────────
.textarea:
  Width: 100%, min-height: 80px, padding: 10px 12px
  Background: var(--surface), border: 1px solid var(--border2)
  Border-radius: var(--radius-sm), color: var(--text1)
  Font-size: 0.82em, font-family: inherit
  Line-height: 1.5, resize: vertical, outline: none
  Transition: border-color var(--transition)
.textarea:focus: border-color: var(--accent)

.muted: font-size: 0.78em, color: var(--text3)

.visually-hidden:
  Position: absolute, width: 1px, height: 1px
  Padding: 0, margin: -1px, overflow: hidden
  Clip: rect(0,0,0,0), white-space: nowrap, border: 0

───────────────────────────────────────────
MOBILE BOTTOM NAV (.mobile-tabs)
───────────────────────────────────────────
  On desktop: display none
  On mobile (max-width 768px): display flex

.mobile-tabs:
  Position: fixed, bottom: 0, left: 0, right: 0
  Height: var(--mob-nav-h), z-index: 100
  Background: rgba(8,8,16,0.92)
  Backdrop-filter: blur(20px)
  Border-top: 1px solid var(--border)
  Display: none (shown on mobile only)
  Justify-content: space-around, align-items: center
  Padding: 0 8px

.mobile-tab:
  Flex: 1, height: 100%, border: none
  Background: transparent, color: var(--text3)
  Font-size: 0.72em, font-weight: 600
  Cursor: pointer, display: flex
  Flex-direction: column, align-items: center
  Justify-content: center, gap: 3px
  Transition: color var(--transition)
  Padding: 8px 4px

.mobile-tab.is-active: color: var(--accent)

───────────────────────────────────────────
DESKTOP NAV — HIDE HAMBURGER & MOBILE PANEL
───────────────────────────────────────────
On desktop (min-width 769px):
  .topnav__hamburger: display none
  .nav-mobile-panel: display none
  .mobile-tabs: display none
  .nav-center: display flex
  .nav-actions: display flex

───────────────────────────────────────────
MOBILE RESPONSIVE (max-width: 768px)
───────────────────────────────────────────
  .topnav__hamburger: display flex
  .nav-center: display none
  .nav-actions: display none (except icon-button search)
  .mobile-tabs: display flex
  .app-main: padding-bottom var(--mob-nav-h)

  .content-shell: padding 0 16px 24px

  .continue-card: width: min(340px, 85vw)

  .poster-card: width: 130px
  .poster-card__media: width: 130px, height: 182px

  .watch-layout:
    Grid-template-columns: 1fr
    (sidebar stacks above player)
  
  .watch-sidebar:
    Position: static, height: auto
    Max-height: 280px, border-right: none
    Border-bottom: 1px solid var(--border)
  
  .watch-sidebar__body:
    Max-height: 200px

  .library-grid:
    Grid-template-columns: repeat(auto-fill, minmax(130px, 1fr))
  
  .browse-results:
    Grid-template-columns: repeat(auto-fill, minmax(130px, 1fr))

  .stats-strip: gap: 20px, overflow-x: auto

  .toast-zone:
    Bottom: calc(var(--mob-nav-h) + 16px)
    Right: 16px, left: 16px

───────────────────────────────────────────
NAV MOBILE PANEL
───────────────────────────────────────────
The .nav-mobile-panel is used for the hamburger menu 
on mobile. Keep it but simplify styling:

.nav-mobile-panel:
  Display: none (hidden by default)
  
.nav-mobile-panel.is-open:
  Display: block
  Position: fixed, top: var(--nav-h), left: 0, right: 0
  Z-index: 99, padding: 16px
  Background: rgba(8,8,16,0.95)
  Backdrop-filter: blur(20px)
  Border-bottom: 1px solid var(--border)

.nav-mobile-panel__card:
  Max-width: 400px, margin: 0 auto

.nav-mobile-panel__tabs:
  Display: flex, flex-direction: column, gap: 4px
  Margin-bottom: 16px

.nav-mobile-panel__tabs .tab-link:
  Width: 100%, text-align: left, padding: 10px 14px
  Border-radius: var(--radius-sm)

.nav-mobile-panel__actions:
  Display: flex, flex-direction: column, gap: 8px
  Border-top: 1px solid var(--border)
  Padding-top: 16px

═══════════════════════════════════════════════════════
PART 3 — app.js TARGETED CHANGES
═══════════════════════════════════════════════════════

Make ONLY the following changes to app.js. 
Do not modify any other function.

─────────────────────────────────
CHANGE 1 — renderHome() row labels
─────────────────────────────────
The home page rows feel too "organized/labeled". 
Remove the .section__eyebrow and .section__sub from 
Continue Watching. Change section__title to just 
"Continue Watching" with no sub-label.

For the other rows, make the section titles feel like 
Netflix-style story rows, not category headers:

  Queue row title: "Next Up For You"
  Queue subtitle: "" (empty string)
  
  Plan row title: "Saved For Later"  
  Plan subtitle: "" (empty string)
  
  Completed row title: "Already Watched"
  Completed subtitle: "" (empty string)

─────────────────────────────────
CHANGE 2 — Remove stats strip from home
─────────────────────────────────
Remove the ${renderStatsStrip()} call from 
renderHome(). Stats between rows breaks the 
content flow. The stats strip clutters the 
viewing experience.

─────────────────────────────────
CHANGE 3 — renderBrowse() grid
─────────────────────────────────
Change the browse results container from 
class="browse-results" to 
class="browse-results discover-grid" to trigger 
the new poster grid layout.

No logic changes — only the class name on the 
wrapping div.

─────────────────────────────────
CHANGE 4 — renderHome() eyebrow
─────────────────────────────────
Remove the section__eyebrow "Home" label from 
the Continue Watching section head. Remove the 
subtitle too. Just show the title.

─────────────────────────────────
CHANGE 5 — watch view sidebar toggle button
─────────────────────────────────
Remove the entire sidebar toggle button from 
renderWatchView(). It is no longer needed since 
the new CSS always shows the sidebar on desktop 
and stacks it on mobile.

Find this block in renderWatchView() and delete it:
  <button type="button" 
    class="watch-sidebar__toggle" 
    data-action="toggle-watch-sidebar">
    ...
  </button>

Also remove the "toggle-watch-sidebar" action handler 
from handleClick() — delete those 4 lines.

─────────────────────────────────
CHANGE 6 — watch view no is-collapsed class
─────────────────────────────────
In renderWatchView(), the .watch-sidebar__body 
div currently has:
  class="watch-sidebar__body 
    ${uiState.watch.sidebarCollapsed ? 'is-collapsed' : ''}"

Change this to simply:
  class="watch-sidebar__body"

No conditional class needed anymore.

═══════════════════════════════════════════════════════
PART 4 — index.html CHANGES
═══════════════════════════════════════════════════════

Add inside <head>, after the existing meta tags:
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23e85d26'/%3E%3Cstop offset='100%25' stop-color='%23c44bff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' rx='14' fill='url(%23g)'/%3E%3Ctext x='32' y='44' font-family='Arial Black,sans-serif' font-size='28' font-weight='900' text-anchor='middle' fill='white'%3EAV%3C/text%3E%3C/svg%3E">

No other changes to index.html.

═══════════════════════════════════════════════════════
PART 5 — WHAT NOT TO CHANGE
═══════════════════════════════════════════════════════

Do NOT change:
  - Any function names in app.js
  - Any data-action attributes
  - Any class names used by JS (ep-row, current, 
    watched, is-active, is-open, is-collapsed except 
    the one instance above, rating-block, filled, 
    watch-sidebar__toggle handler — just remove the 
    button and handler)
  - localStorage key 'anivault_v2'
  - Any API calls or data logic
  - The overlay/modal system logic
  - Any event delegation in handleClick/handleInput
  - The postMessage handler
  - Export/import logic
  - The watch order fetch and render logic
  - Rating component logic
  - Episode list logic
  - Any toast logic

Output exactly three files fully written:
  index.html
  styles.css  
  app.js

After the files, print:
  UI REDESIGN CHECKLIST
  ──────────────────────────────────────
  [ ] Page background is pure dark (#080810) with 
      two subtle radial gradient orbs
  [ ] No section containers, borders, or background 
      boxes on home page rows
  [ ] Continue Watching cards are 340px wide, 
      cinematic landscape with cover as bg
  [ ] Poster cards overlay title/meta on top of image
  [ ] Browse/search results are a poster grid, 
      not a horizontal card list
  [ ] Nav is fixed, blurred, minimal — no tagline
  [ ] Mobile has bottom tab bar, not hamburger-only nav
  [ ] Stats strip removed from home page
  [ ] Watch view sidebar is fixed height, sticky, 
      scrollable, no collapse button
  [ ] Watch view stacks sidebar above player on mobile
  [ ] All class names used by JS remain unchanged
  [ ] Favicon is the AV gradient SVG
  [ ] No 'is-collapsed' conditional on sidebar body
  [ ] Row labels changed to Netflix-style story labels
  [ ] Discover card hover reveals body overlay