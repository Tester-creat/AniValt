# Bugfix Requirements Document

## Introduction

AniVault is a vanilla JS / HTML / CSS streaming platform that uses a full-DOM-replacement rendering strategy: every state change calls `renderApp()`, which sets `app.innerHTML` to a freshly generated string. This approach is simple but creates three categories of observable bugs:

1. **Search input loses cursor focus** — every keystroke triggers `renderApp()`, which destroys and recreates the `<input>` element, causing the browser to drop focus mid-typing.
2. **Browse tab has no infinite scroll** — the browse grid loads a fixed 30-item page once and never appends more results; scrolling to the bottom does nothing, so the user cannot discover additional anime.
3. **General unnecessary re-renders across all tabs** — several patterns in the codebase cause the entire page to re-render when only a small part of the UI needs to change, degrading performance and causing visible flicker.

---

## Bug Analysis

### Current Behavior (Defect)

**Problem 1 — Search input loses focus**

1.1 WHEN a user types any character into the search input (`#searchPageInput`, `#navSearchInput`, or `#mobileNavSearchInput`) THEN the system calls `renderApp()` synchronously, which replaces `app.innerHTML` entirely and destroys the focused `<input>` element, causing the cursor to disappear mid-typing.

1.2 WHEN `renderApp()` runs after a keystroke THEN the system attempts to restore focus via `afterRender()` only if `uiState.focusInputId` is set, but the restored element is a brand-new DOM node with no cursor position, so the user's caret is placed at the end rather than at the position where they were typing.

1.3 WHEN the AniList search debounce timer fires (350 ms after the last keystroke) and `runAniListSearch()` resolves THEN the system calls `queueRender()` → `renderApp()`, which again destroys and recreates the input, losing focus a second time even if the user is still typing.

**Problem 2 — Browse tab has no infinite scroll**

1.4 WHEN a user navigates to the Browse tab THEN the system fetches exactly 30 items from AniList (`perPage: 30`) and renders them as a static grid with no sentinel element, no scroll listener, and no mechanism to load additional pages.

1.5 WHEN a user scrolls to the bottom of the browse grid THEN the system does nothing — no additional fetch is triggered, no loading indicator appears, and the grid remains frozen at the initial 30 results.

1.6 WHEN `loadBrowse()` is called (e.g. when switching browse modes or genres) THEN the system replaces `uiState.browse.results` entirely (`uiState.browse.results = data.Page.media.map(...)`) rather than appending, so any previously loaded items are discarded.

**Problem 3 — General unnecessary re-renders**

1.7 WHEN a user types in the library filter input (`#librarySearchInput`) THEN the system calls `renderApp()` on every keystroke, re-rendering the entire library grid (potentially hundreds of cards) for each character typed.

1.8 WHEN `handleInput()` processes any input event THEN the system calls `renderApp()` unconditionally, even for inputs that only affect a small isolated section of the UI.

1.9 WHEN the hero carousel auto-advances via `setInterval` THEN the system calls `goTo()` which manipulates DOM class names directly — this part is correct — but `initHeroCarousel()` is called inside `afterRender()` on every `renderApp()` call, which clears and restarts the interval timer, causing the carousel progress animation to reset on every unrelated state change.

1.10 WHEN `renderApp()` runs while the user is on the Search tab THEN the system re-renders the entire page including the nav, all sections, and the results grid, even when only the search results list needs to update.

---

### Expected Behavior (Correct)

**Problem 1 — Search input must never lose focus**

2.1 WHEN a user types any character into the search input THEN the system SHALL update `uiState.search.query` and schedule the AniList debounce without calling `renderApp()`, so the `<input>` element is never destroyed while the user is typing.

2.2 WHEN the AniList debounce timer fires and results are received THEN the system SHALL update only the results section of the DOM (surgical DOM update) rather than calling `renderApp()`, so the search input retains focus and cursor position throughout.

2.3 WHEN the search page is first rendered or the user navigates to it THEN the system SHALL render the full search page including the input, and subsequent keystrokes SHALL NOT trigger a full re-render of that page.

**Problem 2 — Browse tab must support infinite scroll**

2.4 WHEN the browse grid is rendered THEN the system SHALL include an invisible sentinel `<div>` at the bottom of the results list that is observed by an `IntersectionObserver`.

2.5 WHEN the sentinel element enters the viewport THEN the system SHALL fetch the next page of results from AniList (incrementing the page number) and append the new items to `uiState.browse.results` using `uiState.browse.results = [...uiState.browse.results, ...newItems]`, preserving all previously loaded items.

2.6 WHEN new browse results are being fetched THEN the system SHALL display a loading spinner below the last card (not replacing the grid) so the user can see that more content is loading.

2.7 WHEN new browse results are appended and the DOM is updated THEN the system SHALL preserve the current scroll position so the user's viewport does not jump.

2.8 WHEN the user switches browse mode or genre THEN the system SHALL reset `uiState.browse.results` to an empty array, reset the page counter to 1, and disconnect any active `IntersectionObserver` before starting a fresh load.

**Problem 3 — General re-renders must be scoped**

2.9 WHEN a user types in the library filter input THEN the system SHALL update only the library grid section of the DOM rather than calling `renderApp()`, so the filter input retains focus and the rest of the page is not re-rendered.

2.10 WHEN `runAniListSearch()` resolves with new results THEN the system SHALL update only the AniList results section of the search page DOM, not the entire page.

2.11 WHEN `initHeroCarousel()` is called THEN the system SHALL check whether the carousel DOM element already exists and its interval is already running before clearing and restarting the timer, so unrelated state changes do not reset the carousel progress.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user types a search query of fewer than 2 characters THEN the system SHALL CONTINUE TO suppress the AniList API call and show the "type at least two characters" prompt.

3.2 WHEN a user types a search query and waits 350 ms THEN the system SHALL CONTINUE TO fire the AniList search exactly once (debounce behavior verified by existing test P6).

3.3 WHEN a user navigates between tabs (Home, Library, Browse, Search, Stats) THEN the system SHALL CONTINUE TO render the correct full page for each tab.

3.4 WHEN a user adds an anime to their library from the Browse or Search tab THEN the system SHALL CONTINUE TO save the entry to `localStorage` and reflect the updated library state.

3.5 WHEN a user switches browse mode (Seasonal / Top Rated / Most Popular) or selects a genre THEN the system SHALL CONTINUE TO fetch fresh results from AniList and display them, replacing the previous result set.

3.6 WHEN the browse tab is first visited THEN the system SHALL CONTINUE TO auto-load the seasonal browse results without requiring a manual action from the user.

3.7 WHEN a user is on the Search tab and the library filter input (`#librarySearchInput`) is on the Library tab THEN the system SHALL CONTINUE TO keep those two inputs independent — typing in one SHALL NOT affect the other.

3.8 WHEN the hero carousel is displayed on the Home tab THEN the system SHALL CONTINUE TO auto-advance slides on a 7-second interval and respond to manual dot/thumb/arrow navigation.

3.9 WHEN a user scrolls a horizontal media row (Continue Watching, Queue, etc.) THEN the system SHALL CONTINUE TO sync the scroll arrow button states correctly.

3.10 WHEN the existing property-based tests (P1 through P8) are run THEN the system SHALL CONTINUE TO pass all of them without modification.

---

## Bug Condition Pseudocode

### Problem 1 — Search Focus Loss

```pascal
FUNCTION isBugCondition_SearchFocus(event)
  INPUT: event of type InputEvent
  OUTPUT: boolean

  RETURN event.target.id IN {"searchPageInput", "navSearchInput", "mobileNavSearchInput"}
         AND handleInput() calls renderApp() synchronously
END FUNCTION

// Property: Fix Checking
FOR ALL event WHERE isBugCondition_SearchFocus(event) DO
  activeElementBefore ← document.activeElement
  handleInput'(event)
  ASSERT document.activeElement = activeElementBefore
  ASSERT document.getElementById(event.target.id) IS SAME NODE as before
END FOR

// Property: Preservation Checking
FOR ALL event WHERE NOT isBugCondition_SearchFocus(event) DO
  ASSERT handleInput'(event) produces same observable state as handleInput(event)
END FOR
```

### Problem 2 — Browse Infinite Scroll

```pascal
FUNCTION isBugCondition_BrowseScroll(scrollEvent)
  INPUT: scrollEvent — user scrolls to bottom of browse grid
  OUTPUT: boolean

  RETURN currentTab = "browse"
         AND sentinel element is in viewport
         AND uiState.browse.loading = false
         AND no IntersectionObserver is attached
END FUNCTION

// Property: Fix Checking
FOR ALL scrollEvent WHERE isBugCondition_BrowseScroll(scrollEvent) DO
  countBefore ← uiState.browse.results.length
  onSentinelIntersect'(scrollEvent)
  ASSERT uiState.browse.results.length > countBefore
  ASSERT uiState.browse.results[0..countBefore-1] = original items  // no replacement
END FOR

// Property: Preservation Checking
FOR ALL scrollEvent WHERE NOT isBugCondition_BrowseScroll(scrollEvent) DO
  ASSERT F(scrollEvent) = F'(scrollEvent)  // no spurious fetches
END FOR
```

### Problem 3 — General Re-renders

```pascal
FUNCTION isBugCondition_UnnecessaryRerender(event)
  INPUT: event of type InputEvent on #librarySearchInput
  OUTPUT: boolean

  RETURN event.target.id = "librarySearchInput"
         AND renderApp() is called, replacing entire DOM
END FUNCTION

// Property: Fix Checking
FOR ALL event WHERE isBugCondition_UnnecessaryRerender(event) DO
  navNodeBefore ← document.querySelector(".topnav")
  handleInput'(event)
  ASSERT document.querySelector(".topnav") IS SAME NODE as navNodeBefore
  ASSERT document.activeElement = event.target
END FOR

// Property: Preservation Checking
FOR ALL event WHERE NOT isBugCondition_UnnecessaryRerender(event) DO
  ASSERT handleInput'(event) produces same observable state as handleInput(event)
END FOR
```
