Build a modern dark-themed movie streaming website UI inspired by ShuttleTV / 123Movies clones.

The design should feel:
- Minimal, cinematic, and immersive
- Fast-loading, content-first
- Similar to Netflix but simpler and more compact
- Slightly “underground/free streaming” aesthetic (less corporate polish, more raw utility)

---

## 🧱 HTML STRUCTURE

Create a layout with the following hierarchy:

1. ROOT LAYOUT
- <body>
  - fixed top navigation bar
  - main content container
  - floating video modal/player (hidden by default)
  - footer (minimal or none)

---

2. NAVBAR (sticky, top)
- Left: Logo (text-based, bold, simple)
- Center: Search bar (live search, expands on focus)
- Right:
  - Genre dropdown
  - Trending / Movies / TV tabs
  - Optional profile or settings icon

Behavior:
- Sticky position
- Slight blur or translucent background
- On scroll: becomes darker and more opaque

---

3. HERO / FEATURED SECTION
- Large banner (full width)
- Background image (movie poster blurred + dark overlay)
- Content:
  - Title
  - Short description
  - Play button (primary CTA)
  - Optional “Add to list”

---

4. CONTENT ROWS (CORE LAYOUT)
- Multiple horizontal scroll sections:
  - Trending
  - Latest Movies
  - Popular
  - Genre-based rows

Each row:
- Title on left
- Horizontal scroll container
- Cards inside (movie thumbnails)

---

5. MOVIE CARD COMPONENT
Each card contains:
- Poster image
- Hover overlay:
  - Play button
  - Quick info (year, rating)
  - Add button

Hover behavior:
- Scale up slightly
- Shadow/glow effect
- Overlay fades in

---

6. SEARCH SYSTEM
- Input field expands when clicked
- Real-time filtering (no page reload)
- Dropdown results:
  - Thumbnail + title list
- Focus issue to avoid:
  - Must NOT lose focus after typing a character

---

7. VIDEO PLAYER MODAL
- Fullscreen overlay
- Embedded player (iframe or custom)
- Close button (top right)
- Background dimmed
- Optional:
  - server switch buttons
  - episode selector

---

## 🎨 CSS STYLE GUIDE

### COLORS
- Background: #0b0b0b or #111
- Cards: #1a1a1a
- Accent: red (#e50914 style) or neon blue
- Text:
  - Primary: #fff
  - Secondary: #aaa

---

### TYPOGRAPHY
- Sans-serif (Inter / Poppins / system UI)
- Bold headings
- Tight spacing for compact feel

---

### EFFECTS
- Smooth hover transitions (0.2–0.3s ease)
- Subtle glow or shadow on hover
- Backdrop blur on navbar and modals
- Fade-in animations for content rows

---

### LAYOUT BEHAVIOR
- Responsive grid:
  - Desktop: 5–6 cards per row
  - Tablet: 3–4
  - Mobile: 2

- Horizontal scroll:
  - Hidden scrollbar
  - Smooth scroll snapping

---

## 🧠 UX PATTERNS

- Content-first: users see movies immediately (no login wall)
- Fast interaction: minimal clicks to play
- Infinite browsing feel (rows keep going)
- No heavy menus or clutter
- Slightly “hacky” UX typical of free streaming sites:
  - lightweight
  - direct
  - less polished but efficient

---

## ⚙️ JS INTERACTIONS

- Search:
  - Debounced input
  - Live filtering

- Cards:
  - Hover animations
  - Click opens modal player

- Player:
  - Toggle visibility
  - Load selected movie dynamically

- Optional:
  - Lazy loading images
  - Infinite scroll rows

---

## ⚠️ IMPORTANT DETAILS (BASED ON ANALYSIS)

- The site emphasizes:
  - speed and smooth playback experience :contentReference[oaicite:1]{index=1}
  - customizable player behavior (e.g. server switching) :contentReference[oaicite:2]{index=2}

- Likely uses:
  - external APIs (movie DB images, streaming hosts) :contentReference[oaicite:3]{index=3}
  - CDN (Cloudflare) for fast delivery :contentReference[oaicite:4]{index=4}

---

## 🎯 DESIGN GOAL

The final UI should feel like:
- A lightweight Netflix clone
- Built for speed over perfection
- Dark, immersive, and scroll-heavy
- Focused entirely on watching content quickly

---

## 🚫 AVOID

- Complex dashboards
- Bright/light themes
- Heavy animations
- Multi-step navigation flows

---

Return:
- Clean HTML structure
- Modular CSS (or Tailwind-style classes)
- Minimal JS for interactions