Perform a complete, ground-up UI/UX redesign of this anime streaming platform.
Discard the current visual design entirely — do not preserve any part of the 
existing layout, color choices, component styling, or section structure.
The new design must be a faithful aesthetic mimic of https://shuttletv.su/

Do not copy ShuttleTV's content, branding, or code — only replicate its 
visual language, layout patterns, and design system as described below.
Surprise me with how close you can get it to feel like ShuttleTV, 
but adapted for an anime platform.

---

CORE VISUAL IDENTITY TO REPLICATE:

1. COLOR SYSTEM
   - Primary background: near-black, very deep dark (#0a0a0f range)
   - All surfaces: semi-transparent dark layers, never solid opaque blocks
   - Accent color: use a single vivid accent (purple or cyan preferred) 
     for highlights, active states, and CTAs
   - Text: pure white for titles, muted grey for descriptions/metadata
   - No light mode — dark only, always

2. GLASSMORPHISM — apply to EVERY surface, card, panel, and modal:
   - background: rgba(255, 255, 255, 0.05) to rgba(255, 255, 255, 0.08)
   - backdrop-filter: blur(16px) to blur(24px)
   - border: 1px solid rgba(255, 255, 255, 0.08)
   - border-radius: 12px to 16px on all cards and panels
   - Subtle box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4)
   - Apply this consistently — navbar, cards, modals, sidebars, dropdowns, 
     search bar, player container, everything

3. NAVBAR
   - Fully transparent or ultra-thin frosted glass bar pinned to the top
   - Fades into the background — no hard visible edge
   - Logo on the left, nav links centered or right-aligned
   - Search bar inline in the navbar — glassmorphism styled, pill shape
   - On scroll: navbar gains a slightly more visible glass background

4. HERO SECTION (top of homepage)
   - Full-width, full-viewport-height cinematic banner
   - Background: featured anime artwork/poster as a blurred, darkened full-bleed image
   - Foreground: large bold title (60px+), short description, 2 CTA buttons 
     (Watch Now + Add to Library)
   - Gradient overlay: dark at bottom fading to transparent at top
   - The title must be the dominant visual element — massive, cinematic typography

5. CONTENT SECTIONS (Trending, Recently Added, Top Rated etc.)
   - Horizontal scroll rows like ShuttleTV — not a grid
   - Each row has a section title on the left with a "See All" link on the right
   - Cards: portrait anime poster, glassmorphism overlay on hover showing title, 
     episode count, rating
   - Hover effect: card lifts with scale(1.05), glows with accent color shadow
   - Smooth scroll behavior on the rows

6. TYPOGRAPHY
   - Font: use Inter, Outfit, or DM Sans from Google Fonts — clean, modern sans-serif
   - Hero title: 600-700 weight, very large (clamp(2.5rem, 6vw, 5rem))
   - Section titles: 500-600 weight, 1.2rem-1.5rem
   - Card text: 400 weight, small and clean
   - Letter-spacing: slightly wider on section headings

7. BACKGROUNDS & DEPTH
   - Use layered radial gradients behind sections for depth:
     radial-gradient(ellipse at top left, rgba(139,92,246,0.15), transparent)
   - Animated subtle particle effect or noise texture overlay on the hero (optional but preferred)
   - Cards appear to float above the background due to glass + shadow combination
   - No flat, solid-color section backgrounds anywhere

8. BUTTONS & INTERACTIVE ELEMENTS
   - Primary CTA: filled with accent color, pill-shaped (border-radius: 999px), 
     bold text, subtle glow on hover
   - Secondary CTA: transparent with accent-colored border and text, same pill shape
   - All buttons: smooth transition on hover (0.2s ease)
   - Icon buttons: glassmorphism circle, icon centered

9. SCROLLBAR
   - Custom thin scrollbar: dark track, accent-colored thumb
   - width: 4px, border-radius: 4px

10. ANIMATIONS & TRANSITIONS
    - Page load: sections fade in with a slight upward translate (opacity 0→1, 
      translateY 20px→0, staggered per section)
    - Card hover: scale + glow in 0.2s ease
    - Navbar scroll effect: blur intensifies as user scrolls down
    - All transitions: ease or cubic-bezier — no linear transitions anywhere

---

WHAT TO COMPLETELY REMOVE FROM THE CURRENT DESIGN:
- Any solid opaque white, grey, or colored backgrounds on cards or panels
- Any hard borders or visible dividers between sections
- Any non-glassmorphism styled components
- Any flat or non-layered layout sections
- The current hero/banner if it does not match the cinematic full-viewport style above
- Any component that looks like it belongs to a generic template or the old design

---

IMPLEMENTATION RULES:
- Redesign the CSS/styling layer completely — do not patch the old styles
- Every component must be re-styled from scratch using the system above
- Preserve all existing JavaScript functionality (search, player, library, 
  import/export, provider fallback) — only the visual layer changes
- Make it fully responsive — the glassmorphism layout must work on mobile too
  (cards stack, navbar collapses to a hamburger, hero scales down cleanly)
- Do not ask for approval mid-task — complete the full redesign in one pass
- When done, confirm which sections were redesigned and flag anything skipped