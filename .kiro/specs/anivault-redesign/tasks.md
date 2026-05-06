# Implementation Plan: AniVault Redesign

## Overview

This implementation plan transforms AniVault with a glassmorphism visual redesign, replaces broken streaming providers with verified functional ones, and introduces a cinematic hero section — all while preserving the existing localStorage schema and single-file architecture. The implementation follows an incremental approach: provider system first, then visual enhancements, then testing.

## Tasks

- [x] 1. Refactor streaming provider system to modular configuration
  - [x] 1.1 Create new STREAM_PROVIDERS array with modular schema
    - Replace existing STREAM_PROVIDERS array in app.js with new schema: `{ name, active, idType, buildUrl, notes }`
    - Add MegaPlay, VidLink, VidSrc, and AniPlay providers with their buildUrl functions
    - Remove broken providers: VidStream, VidCloud, VidNest, VidPlus, AniSuge (.ltd), AniSuge2 (.to), HiAnime
    - Document each provider with inline comments explaining URL patterns and limitations
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.3, 11.1, 11.2, 11.3_
  
  - [x] 1.2 Update buildStreamUrl() to use new provider schema
    - Modify buildStreamUrl() function to read from new STREAM_PROVIDERS schema
    - Ensure function calls provider.buildUrl(entry, ep, lang) for each active provider
    - Handle provider.active flag to skip inactive providers
    - Preserve existing fallback logic and 120s timer behavior
    - _Requirements: 6.5, 7.1, 7.5_
  
  - [x] 1.3 Write unit tests for provider URL generation
    - Test each provider's buildUrl function with sample anime entries
    - Test sub/dub language parameter handling for each provider
    - Test edge cases: missing episode numbers, invalid IDs, out-of-bounds provider index
    - Verify all active providers return HTTPS URLs
    - _Requirements: 5.3, 6.5_

- [x] 2. Implement hero section component
  - [x] 2.1 Create renderHero() function in app.js
    - Write new renderHero() function that selects a featured anime (most recently watched or random "watching" entry)
    - Use entry.banner or entry.cover as background image with CSS object-fit: cover
    - Render large title (≥2.5em, font-weight 900), genre tags, year, episode count subtitle
    - Add two CTA buttons: "▶ Watch Now" (opens watch view) and "＋ Add to Library" (if not in library)
    - Apply gradient overlay for text readability
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 2.2 Add hero section CSS to styles.css
    - Create .hero-section class with min-height 400px desktop, 300px mobile
    - Add background image styles with gradient overlay (bottom-to-top dark fade)
    - Style hero title, subtitle, and CTA buttons
    - Ensure WCAG AA contrast ratio (4.5:1) for all text on hero background
    - Add responsive breakpoints for mobile (< 768px)
    - _Requirements: 2.1, 2.4, 2.6, 15.3_
  
  - [x] 2.3 Integrate hero section into renderHome()
    - Call renderHero() at the top of renderHome() function
    - Insert hero HTML before "Continue Watching" section
    - Ensure hero only appears on home page, not other tabs
    - _Requirements: 2.1_
  
  - [x] 2.4 Write unit tests for hero section rendering
    - Test hero renders with valid anime entry (has banner, cover, title, genres)
    - Test hero fallback when no banner image available (uses cover or gradient)
    - Test hero does not render when library is empty
    - Test CTA button data attributes point to correct anime ID
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Apply glassmorphism visual redesign to CSS
  - [x] 3.1 Update card components with glassmorphism effects
    - Add backdrop-filter: blur(12px-20px) to .continue-card, .poster-card, .discover-card, .stats-strip, .library-toolbar, .watch-sidebar
    - Update background colors to translucent rgba values (e.g., rgba(14, 14, 24, 0.60))
    - Add border: 1px solid rgba(255, 255, 255, 0.07) to all glass cards
    - Ensure all glass effects work in both dark and light themes
    - _Requirements: 1.1, 1.2, 1.5_
  
  - [x] 3.2 Implement hover effects for all card components
    - Add transform: scale(1.03-1.05) translateY(-4px) on :hover for all cards
    - Add box-shadow: 0 20px 50px rgba(0,0,0,0.65), 0 0 0 1px rgba(124,58,237,0.3) on :hover
    - Add border-color: rgba(124,58,237,0.4) on :hover
    - Set transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1) for smooth animations
    - _Requirements: 1.3, 1.5_
  
  - [x] 3.3 Verify responsive layout behavior across breakpoints
    - Test layout at 320px (mobile), 768px (tablet), 1024px (desktop), 1440px (large desktop)
    - Ensure hero section, cards, and navigation adapt correctly at each breakpoint
    - Verify no horizontal overflow or layout breaks at any viewport width
    - _Requirements: 1.4, 13.1, 13.2, 13.3, 13.4_
  
  - [x] 3.4 Write visual regression tests for glassmorphism effects
    - Snapshot test for hero section at 320px, 768px, 1440px viewports
    - Snapshot test for card hover states (continue-card, poster-card, discover-card)
    - Snapshot test for dark and light themes
    - Verify backdrop-filter is applied correctly in all browsers
    - _Requirements: 1.1, 1.2, 1.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Set up property-based testing framework
  - [x] 5.1 Install fast-check library for JavaScript
    - Add fast-check as a dev dependency (npm install --save-dev fast-check)
    - Create test setup file that imports fast-check
    - Configure test runner (Jest, Mocha, or Vitest) to run property tests
    - _Requirements: N/A (testing infrastructure)_
  
  - [x] 5.2 Create test utilities and generators
    - Write arbitrary generators for anime entry objects (valid, malformed, partial)
    - Write generators for provider configurations
    - Write generators for random color pairs (for contrast testing)
    - Create helper functions for test assertions
    - _Requirements: N/A (testing infrastructure)_

- [ ] 6. Implement property-based tests for data layer
  - [x] 6.1 Write property test for library round-trip preservation (P1)
    - **Property 1: Library data round-trip preservation**
    - **Validates: Requirements 12.1, 12.2, 12.4**
    - Generate random anime entry objects with all valid fields
    - Serialize to JSON, deserialize via normalizeLibrary(), compare all fields
    - Run 100+ iterations with varied entry structures
    - _Requirements: 12.1, 12.2, 12.4_
  
  - [-] 6.2 Write property test for normalization idempotence (P2)
    - **Property 2: Entry normalization is idempotent**
    - **Validates: Requirements 12.2, 12.3**
    - Generate arbitrary objects (malformed, partial, over-populated)
    - Apply normalizeEntry() twice, verify results are deeply equal
    - Test with null, undefined, missing fields, invalid types
    - _Requirements: 12.2, 12.3_
  
  - [~] 6.3 Write property test for status coercion (P7)
    - **Property 7: Status normalization rejects invalid values**
    - **Validates: Requirements 12.2, 12.4**
    - Generate random strings as status values (empty, numeric, special chars)
    - Verify normalizeEntry() coerces invalid status to "untracked"
    - Test with all valid STATUS_OPTIONS to ensure they pass through unchanged
    - _Requirements: 12.2, 12.4_

- [ ] 7. Implement property-based tests for provider system
  - [~] 7.1 Write property test for provider schema invariant (P3)
    - **Property 3: Provider schema invariant**
    - **Validates: Requirements 4.1, 6.1, 6.3**
    - Iterate over STREAM_PROVIDERS array
    - Verify each provider has non-empty name, boolean active, callable buildUrl, notes string
    - Test after adding/removing providers from array
    - _Requirements: 4.1, 6.1, 6.3_
  
  - [~] 7.2 Write property test for provider URL validity (P4)
    - **Property 4: Provider buildUrl returns valid HTTPS URL**
    - **Validates: Requirements 5.3, 6.5**
    - Generate random anime entries with positive anilistId
    - Test all active providers × ["sub", "dub"] × random episode numbers ≥ 1
    - Verify all returned URLs start with "https://"
    - Run 100+ iterations with varied inputs
    - _Requirements: 5.3, 6.5_
  
  - [~] 7.3 Write property test for provider fallback cycling (P5)
    - **Property 5: Provider fallback cycles through all active providers**
    - **Validates: Requirements 7.1, 7.4**
    - Generate random starting provider index
    - Simulate N consecutive fallback events (N = number of active providers)
    - Verify index wraps back to original starting value after N steps
    - Test with different numbers of active providers
    - _Requirements: 7.1, 7.4_

- [ ] 8. Implement property-based tests for UI behavior
  - [~] 8.1 Write property test for search debounce (P6)
    - **Property 6: Search debounce fires exactly once per input burst**
    - **Validates: Requirements 9.4**
    - Generate random keystroke sequences with timing simulation (use fake timers)
    - Verify AniList API called exactly once after 350ms timer expires
    - Test with multiple bursts separated by > 350ms (should fire multiple times)
    - _Requirements: 9.4_
  
  - [~] 8.2 Write property test for text contrast (P8)
    - **Property 8: Text contrast meets WCAG AA**
    - **Validates: Requirements 2.4, 15.3**
    - Generate random text/background color pairs from CSS variables
    - Calculate contrast ratio for each pair
    - Verify ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text (≥18px or ≥14px bold)
    - Test in both dark and light themes
    - _Requirements: 2.4, 15.3_

- [ ] 9. Implement accessibility enhancements
  - [~] 9.1 Add ARIA labels to icon-only buttons
    - Add aria-label attributes to all icon-only buttons (search, settings, hamburger menu, scroll controls)
    - Add aria-label to fullscreen toggle, provider switch buttons
    - Ensure all interactive icons have descriptive labels
    - _Requirements: 15.2_
  
  - [~] 9.2 Add keyboard navigation support
    - Ensure all interactive elements are keyboard accessible (tab order, enter/space activation)
    - Add visible focus indicators to all focusable elements
    - Test tab navigation through all pages (home, library, browse, search, watch view)
    - _Requirements: 15.1_
  
  - [~] 9.3 Add alt text to all images
    - Add alt attributes to all <img> elements (anime covers, banners, posters)
    - Use getDisplayTitle(entry) for alt text on anime images
    - Add aria-label to decorative images or use alt=""
    - _Requirements: 15.4_
  
  - [~] 9.4 Run automated accessibility audit
    - Run axe-core or similar tool on all pages
    - Fix any ARIA, contrast, or label coverage issues reported
    - Verify keyboard navigation works for all interactive elements
    - Test with screen reader (manual verification)
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [ ] 10. Final integration and wiring
  - [~] 10.1 Verify provider fallback mechanism works end-to-end
    - Test 120s timer triggers fallback to next provider
    - Test toast notification appears on provider switch
    - Test all providers exhausted scenario shows fallback card
    - Test manual provider switch resets timer
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [~] 10.2 Verify library data preservation
    - Load existing library from localStorage
    - Verify all entries render correctly with new design
    - Verify no data loss after redesign (status, episodesWatched, rating, notes, sessionLog)
    - Test export/import functionality preserves all fields
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [~] 10.3 Test responsive behavior across devices
    - Test on mobile (320px-767px), tablet (768px-1023px), desktop (1024px+)
    - Verify hero section, cards, navigation adapt correctly
    - Verify touch targets are ≥44x44px on mobile
    - Test watch view layout collapses to single column on mobile
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [~] 10.4 Run performance audit
    - Run Lighthouse audit targeting ≥90 Performance score
    - Verify CSS animations use transform/opacity only (no layout-triggering properties)
    - Verify images outside viewport are lazy-loaded
    - Verify debounce applied to scroll event handlers
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [~] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from design document
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation
- All changes are in-place to index.html, app.js, and styles.css — no build tools required
- Zero changes to localStorage schema (anivault_v2) — data preservation guaranteed
