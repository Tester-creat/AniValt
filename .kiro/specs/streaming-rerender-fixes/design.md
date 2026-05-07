# Streaming Re-render Fixes Bugfix Design

## Overview

AniVault uses a full-DOM-replacement rendering strategy: every state change calls `renderApp()`, which sets `app.innerHTML` to a freshly generated string. This is simple but creates three observable bugs:

1. **Search input loses cursor focus** — `handleInput()` calls `renderApp()` synchronously on every keystroke, destroying the `<input>` DOM node and dropping browser focus mid-typing.
2. **Browse tab has no infinite scroll** — `loadBrowse()` fetches exactly 30 items once with `page: 1`, renders them as a static grid, and never loads more; there is no sentinel element, no `IntersectionObserver`, and no page counter.
3. **General unnecessary re-renders** — the library filter input (`#librarySearchInput`) triggers a full `renderApp()` on every keystroke, and `initHeroCarousel()` is called unconditionally inside `afterRender()`, resetting the carousel interval timer on every unrelated state change.

The fix strategy is **surgical DOM updates**: instead of replacing the entire page, each affected code path will update only the minimal DOM subtree that needs to change, leaving the rest of the page — and any focused inputs — untouched.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers a bug — the specific input or event that causes incorrect behavior.
- **Property (P)**: The desired correct behavior when the bug condition holds.
- **Preservation**: Existing behaviors that must remain unchanged after the fix is applied.
- **`renderApp()`**: The function in `app.js` that replaces `app.innerHTML` entirely and calls `afterRender()`. This is the root cause of all three bugs when called unnecessarily.
- **`handleInput(event)`**: The delegated `input` event handler in `app.js` that processes keystrokes for all `<input>` elements. Currently calls `renderApp()` for both `#librarySearchInput` and the search inputs.
- **`loadBrowse(mode, genre)`**: The async function in `app.js` that fetches browse results from AniList. Currently always uses `page: 1` and replaces `uiState.browse.results` entirely.
- **`afterRender()`**: The post-render hook in `app.js` that re-attaches scroll listeners, restores focus, and calls `initHeroCarousel()`. Currently called on every `renderApp()` invocation.
- **`initHeroCarousel()`**: The function in `app.js` that sets up the hero carousel interval and RAF animation. Currently clears and restarts the interval on every call, causing progress resets.
- **`uiState.browse`**: The browse slice of application state, containing `results`, `loading`, `error`, `requestId`, `initialized`, `mode`, `genre`, `title`, `subtitle`.
- **Sentinel element**: An invisible `<div>` placed at the bottom of the browse grid, observed by an `IntersectionObserver` to trigger the next page load.
- **Surgical DOM update**: Updating only the specific DOM subtree that needs to change, rather than replacing the entire page via `renderApp()`.

---

## Bug Details

### Bug Condition 1 — Search Input Focus Loss

The bug manifests when a user types into any of the three search inputs. `handleInput()` calls `renderApp()` synchronously, which replaces `app.innerHTML`, destroying the focused `<input>` node. The browser drops focus because the element no longer exists. `afterRender()` attempts to restore focus via `uiState.focusInputId`, but the restored element is a brand-new DOM node with the cursor placed at the end, not at the user's original caret position. A second focus loss occurs when the 350 ms AniList debounce fires and `runAniListSearch()` calls `queueRender()` → `renderApp()`.

**Formal Specification:**
```
FUNCTION isBugCondition_SearchFocus(event)
  INPUT: event of type InputEvent
  OUTPUT: boolean

  RETURN event.target.id IN {"searchPageInput", "navSearchInput", "mobileNavSearchInput"}
         AND handleInput(event) calls renderApp() synchronously
END FUNCTION
```

**Examples:**
- User types "N" into `#searchPageInput` → `renderApp()` fires → input is destroyed → cursor disappears → user must click the input again to continue typing.
- User types "Na" quickly → debounce fires after 350 ms → `runAniListSearch()` resolves → `queueRender()` → `renderApp()` → input is destroyed a second time while user is still typing.
- User opens the nav search bar and types "One" → each character triggers a full re-render → the nav search bar loses focus after every keystroke.

### Bug Condition 2 — Browse Infinite Scroll Missing

The bug manifests when a user scrolls to the bottom of the browse grid. `loadBrowse()` always passes `page: 1` and `perPage: 30` to AniList, then replaces `uiState.browse.results` entirely. There is no sentinel element, no `IntersectionObserver`, and no page counter in `uiState.browse`. Scrolling to the bottom does nothing.

**Formal Specification:**
```
FUNCTION isBugCondition_BrowseScroll(context)
  INPUT: context — { currentTab, browseResultsCount, scrolledToBottom, observerAttached }
  OUTPUT: boolean

  RETURN context.currentTab = "browse"
         AND context.scrolledToBottom = true
         AND context.observerAttached = false
         AND uiState.browse.loading = false
END FUNCTION
```

**Examples:**
- User navigates to Browse tab → 30 seasonal anime load → user scrolls to the bottom → nothing happens, no spinner, no new cards.
- User switches to "Top Rated" mode → 30 items load → user scrolls to the bottom → grid is frozen at 30 items.
- User selects "Action" genre → 30 items load → user scrolls to the bottom → no additional items are fetched.

### Bug Condition 3 — Library Filter Triggers Full Re-render

The bug manifests when a user types in `#librarySearchInput`. `handleInput()` calls `renderApp()` on every keystroke, re-rendering the entire page (nav, all sections, all library cards) for each character. Additionally, `initHeroCarousel()` is called unconditionally inside `afterRender()` on every `renderApp()` call, clearing and restarting the carousel interval timer even when the user is on the Library tab.

**Formal Specification:**
```
FUNCTION isBugCondition_LibraryRerender(event)
  INPUT: event of type InputEvent
  OUTPUT: boolean

  RETURN event.target.id = "librarySearchInput"
         AND handleInput(event) calls renderApp() synchronously
END FUNCTION
```

**Examples:**
- User types "att" into `#librarySearchInput` → three full `renderApp()` calls → entire page re-renders three times → visible flicker, focus lost after each character.
- User is on the Home tab with the hero carousel playing → unrelated state change triggers `renderApp()` → `afterRender()` calls `initHeroCarousel()` → carousel progress bar resets to 0% mid-slide.
- User types in the library filter while the hero carousel is on slide 3 → carousel jumps back to slide 1 and restarts the 7-second timer.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Mouse clicks on all buttons (add to library, open watch, status picker, browse mode chips, genre pills) must continue to work exactly as before.
- Tab navigation between Home, Library, Browse, Search, and Stats must continue to trigger a full `renderApp()` and render the correct page.
- The AniList search debounce (350 ms, minimum 2 characters) must continue to work as verified by existing test P6.
- The hero carousel must continue to auto-advance on a 7-second interval and respond to dot/thumb/arrow navigation.
- Switching browse mode (Seasonal / Top Rated / Most Popular) or selecting a genre must continue to fetch fresh results and replace the previous result set.
- The browse tab must continue to auto-load seasonal results on first visit without a manual action.
- The library sort dropdown (`#librarySortSelect`) must continue to trigger a full re-render when changed.
- All existing property-based tests (P1 through P8) must continue to pass without modification.
- The `#librarySearchInput` and `#searchPageInput` must remain independent — typing in one must not affect the other.

**Scope:**
All inputs that do NOT match the three bug conditions above should be completely unaffected by this fix. This includes:
- Mouse clicks on any element.
- The library sort dropdown (`#librarySortSelect`).
- The import file input (`#importInput`).
- Keyboard shortcuts in the watch view (Arrow keys, M, F, W, Space).
- Any `renderApp()` call triggered by non-input events (tab switches, overlay opens, status changes, etc.).

---

## Hypothesized Root Cause

### Bug 1 — Search Focus Loss

1. **Unconditional `renderApp()` in `handleInput()`**: The current code for `#librarySearchInput` calls `renderApp()` directly. For the search inputs, a partial fix was already attempted (the comment `/* FIX: Do NOT call renderApp() here */` exists in the code), but the library input path was not fixed. The `runAniListSearch()` → `queueRender()` path still calls `renderApp()` after results arrive, which destroys the input a second time.

2. **`afterRender()` focus restoration is lossy**: Even when `uiState.focusInputId` is set, `afterRender()` calls `setSelectionRange(value.length, value.length)`, which always moves the cursor to the end. If the user typed in the middle of the string, their caret position is lost.

3. **`runAniListSearch()` calls `queueRender()`**: After the debounce fires and results arrive, `queueRender()` → `renderApp()` replaces the entire page including the search input, causing a second focus loss even if the first was avoided.

### Bug 2 — Browse Infinite Scroll Missing

1. **`loadBrowse()` always uses `page: 1`**: The page number is hardcoded. There is no `uiState.browse.page` counter to track which page to fetch next.

2. **`uiState.browse.results` is replaced, not appended**: `uiState.browse.results = data.Page.media.map(...)` discards all previously loaded items on every call.

3. **No sentinel element in `renderBrowse()`**: The browse grid HTML does not include a sentinel `<div>` at the bottom, so there is nothing for an `IntersectionObserver` to watch.

4. **No `IntersectionObserver` setup**: `afterRender()` does not create or attach an `IntersectionObserver` for the browse sentinel.

5. **No disconnect on mode/genre switch**: If an observer were added, it would need to be disconnected and the page counter reset when the user switches modes or genres.

### Bug 3 — General Unnecessary Re-renders

1. **`handleInput()` calls `renderApp()` for `#librarySearchInput`**: The library filter input path is `uiState.library.query = event.target.value; renderApp();` — a full page replacement for a filter that only affects the library grid section.

2. **`initHeroCarousel()` is called unconditionally in `afterRender()`**: The guard `if (!currentWatchId && currentTab === "home")` only prevents the call when not on the home tab, but any `renderApp()` call while on the home tab (e.g., opening a status picker, toggling compact mode) will reset the carousel interval.

---

## Correctness Properties

Property 1: Bug Condition — Search Input Retains Focus During Typing

_For any_ `InputEvent` where `event.target.id` is one of `{"searchPageInput", "navSearchInput", "mobileNavSearchInput"}`, the fixed `handleInput()` function SHALL NOT destroy the `<input>` DOM node, so `document.activeElement` after the call is the same element as before, and the element's identity (`===` reference) is preserved.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Bug Condition — Browse Grid Appends on Scroll

_For any_ scroll event where the browse sentinel enters the viewport and `uiState.browse.loading` is false, the fixed sentinel observer callback SHALL fetch the next page and append new items so that `uiState.browse.results.length` after the call is strictly greater than before, and the first `N` items (where `N` is the count before the call) are identical to the original items.

**Validates: Requirements 2.4, 2.5, 2.6, 2.7**

Property 3: Bug Condition — Library Filter Does Not Re-render the Full Page

_For any_ `InputEvent` where `event.target.id` is `"librarySearchInput"`, the fixed `handleInput()` function SHALL update only the library grid DOM subtree, so the `.topnav` DOM node reference is the same object before and after the call, and `document.activeElement` remains the library filter input.

**Validates: Requirements 2.9**

Property 4: Preservation — Non-Buggy Input Events Produce Identical Observable State

_For any_ `InputEvent` where the bug condition does NOT hold (i.e., the target is not one of the four affected inputs), the fixed `handleInput()` function SHALL produce exactly the same observable application state and DOM mutations as the original `handleInput()` function.

**Validates: Requirements 3.1, 3.2, 3.3, 3.7, 3.10**

Property 5: Preservation — Browse Mode/Genre Switch Resets and Reloads

_For any_ call to `loadBrowse(mode, genre)` where the mode or genre differs from the current `uiState.browse.mode` / `uiState.browse.genre`, the fixed implementation SHALL reset `uiState.browse.results` to an empty array, reset the page counter to 1, disconnect any active `IntersectionObserver`, and fetch a fresh first page — producing the same first-page result set as the original `loadBrowse()`.

**Validates: Requirements 2.8, 3.5, 3.6**

---

## Fix Implementation

### Changes Required

**File**: `app.js`

#### Change 1 — Add `browse.page` to `uiState`

Add a `page` counter to the `uiState.browse` object so `loadBrowse()` and the sentinel observer can track which page to fetch next.

```
uiState.browse = {
  ...,
  page: 1,          // NEW: current page number
  hasMore: true,    // NEW: false when AniList returns fewer than perPage items
  ...
}
```

#### Change 2 — Fix `loadBrowse()` to support pagination

- Accept an optional `page` parameter (default `1`).
- When `page === 1` (mode/genre switch): replace `uiState.browse.results`, reset `uiState.browse.page = 1`, set `uiState.browse.hasMore = true`, disconnect any active `IntersectionObserver`.
- When `page > 1` (sentinel triggered): append to `uiState.browse.results` using spread (`[...existing, ...newItems]`), increment `uiState.browse.page`.
- Set `uiState.browse.hasMore = false` when the returned item count is less than `perPage`.

#### Change 3 — Add sentinel element to `renderBrowse()`

Append an invisible `<div id="browseSentinel" class="browse-sentinel"></div>` after the results grid when `uiState.browse.hasMore` is true and results are present.

#### Change 4 — Attach `IntersectionObserver` in `afterRender()`

After rendering the browse tab, check for `#browseSentinel` and attach an `IntersectionObserver` that calls `loadBrowse(uiState.browse.mode, uiState.browse.genre, uiState.browse.page + 1)` when the sentinel enters the viewport. Store the observer reference so it can be disconnected on mode/genre switch.

#### Change 5 — Fix `handleInput()` for `#librarySearchInput`

Replace the `renderApp()` call with a surgical DOM update:
1. Update `uiState.library.query = event.target.value`.
2. Re-render only the library grid section: find the `.library-grid` (or equivalent container) in the DOM and replace its `innerHTML` with the filtered card HTML.
3. Do NOT call `renderApp()`.
4. Do NOT set `uiState.focusInputId` (the input is never destroyed, so focus is never lost).

#### Change 6 — Fix `handleInput()` for search inputs (complete the partial fix)

The comment `/* FIX: Do NOT call renderApp() here */` already exists, but `runAniListSearch()` still calls `queueRender()` after results arrive. Fix `runAniListSearch()` to perform a surgical update of only the AniList results section (`.search-layout .section:first-child` inner content) instead of calling `queueRender()`.

#### Change 7 — Guard `initHeroCarousel()` against redundant restarts

Add a check in `initHeroCarousel()`: if `heroState.timer` is already set and the carousel DOM element already exists with the correct number of slides, skip the `clearInterval` / `setInterval` cycle. This prevents unrelated `renderApp()` calls from resetting the carousel progress.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on the unfixed code to confirm the root cause analysis; then verify the fix works correctly and preserves all existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate `InputEvent`s on the affected inputs and assert the expected post-condition. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Search Input Focus Test**: Simulate an `input` event on `#searchPageInput` and assert that `document.activeElement` is still the input after `handleInput()` returns. (Will fail on unfixed code — `renderApp()` destroys the element.)
2. **Library Filter Focus Test**: Simulate an `input` event on `#librarySearchInput` and assert that the `.topnav` DOM node reference is unchanged and `document.activeElement` is still the input. (Will fail on unfixed code — `renderApp()` replaces the entire DOM.)
3. **Browse Sentinel Test**: Render the browse tab with results and assert that a `#browseSentinel` element exists in the DOM. (Will fail on unfixed code — no sentinel is rendered.)
4. **Browse Append Test**: Call the sentinel observer callback and assert that `uiState.browse.results.length` increases and the first N items are unchanged. (Will fail on unfixed code — no observer exists.)
5. **Carousel Reset Test**: Trigger an unrelated `renderApp()` call while on the home tab and assert that `heroState.timer` is the same timer ID before and after. (Will fail on unfixed code — `initHeroCarousel()` always clears and restarts the timer.)

**Expected Counterexamples**:
- `document.activeElement` is `document.body` (not the input) after `handleInput()` — confirms the DOM node was destroyed.
- `#browseSentinel` is `null` — confirms no sentinel is rendered.
- `heroState.timer` changes value — confirms the carousel interval is being reset.

### Fix Checking

**Goal**: Verify that for all inputs where each bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
// Property 1: Search focus
FOR ALL event WHERE isBugCondition_SearchFocus(event) DO
  nodeBefore := document.getElementById(event.target.id)
  handleInput_fixed(event)
  ASSERT document.getElementById(event.target.id) IS SAME NODE as nodeBefore
  ASSERT document.activeElement = nodeBefore
END FOR

// Property 2: Browse append
FOR ALL page WHERE page > 1 AND uiState.browse.loading = false DO
  countBefore := uiState.browse.results.length
  itemsBefore := [...uiState.browse.results]
  triggerSentinelObserver()
  ASSERT uiState.browse.results.length > countBefore
  ASSERT uiState.browse.results.slice(0, countBefore) deep-equals itemsBefore
END FOR

// Property 3: Library filter surgical update
FOR ALL event WHERE isBugCondition_LibraryRerender(event) DO
  navBefore := document.querySelector(".topnav")
  handleInput_fixed(event)
  ASSERT document.querySelector(".topnav") IS SAME NODE as navBefore
  ASSERT document.activeElement = event.target
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL event WHERE NOT isBugCondition_SearchFocus(event)
                AND NOT isBugCondition_BrowseScroll(event)
                AND NOT isBugCondition_LibraryRerender(event) DO
  stateBefore := snapshot(uiState)
  domBefore := app.innerHTML
  handleInput_original(event)
  stateAfter_original := snapshot(uiState)
  domAfter_original := app.innerHTML

  restore(stateBefore, domBefore)
  handleInput_fixed(event)
  stateAfter_fixed := snapshot(uiState)
  domAfter_fixed := app.innerHTML

  ASSERT stateAfter_original deep-equals stateAfter_fixed
  ASSERT domAfter_original = domAfter_fixed
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain.
- It catches edge cases that manual unit tests might miss.
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs.

**Test Cases**:
1. **Library Sort Preservation**: Verify that changing `#librarySortSelect` still triggers `renderApp()` and re-renders the library in the correct sort order.
2. **Tab Switch Preservation**: Verify that clicking a tab still calls `renderTab()` and renders the correct full page.
3. **Debounce Preservation**: Verify that the AniList search debounce still fires exactly once after 350 ms for queries of 2+ characters (existing test P6 covers this).
4. **Browse Mode Switch Preservation**: Verify that clicking a browse mode chip still calls `loadBrowse()` with `page: 1`, resets results, and fetches fresh data.
5. **Carousel Auto-advance Preservation**: Verify that the hero carousel still advances slides on a 7-second interval after the `initHeroCarousel()` guard is added.

### Unit Tests

- Test that `handleInput()` for `#searchPageInput` does not call `renderApp()` and does not destroy the input DOM node.
- Test that `handleInput()` for `#librarySearchInput` does not call `renderApp()`, updates only the library grid, and preserves the `.topnav` node reference.
- Test that `renderBrowse()` includes `#browseSentinel` when `uiState.browse.hasMore` is true and results are present.
- Test that `renderBrowse()` does NOT include `#browseSentinel` when `uiState.browse.hasMore` is false.
- Test that `loadBrowse()` with `page: 1` replaces `uiState.browse.results` and resets `uiState.browse.page`.
- Test that `loadBrowse()` with `page > 1` appends to `uiState.browse.results` and increments `uiState.browse.page`.
- Test that `initHeroCarousel()` does not reset `heroState.timer` when called a second time with the same carousel DOM.

### Property-Based Tests

- Generate random search query strings and verify that simulating an `input` event on `#searchPageInput` never changes the identity of the input DOM node (Property 1).
- Generate random library filter strings and verify that simulating an `input` event on `#librarySearchInput` never changes the `.topnav` DOM node reference (Property 3).
- Generate random sequences of browse page loads and verify that `uiState.browse.results` is always a superset of the previous results when `page > 1`, and that the first N items are always identical (Property 2).
- Generate random non-buggy `InputEvent` targets and verify that `handleInput_fixed` produces the same `uiState` snapshot as `handleInput_original` (Property 4).

### Integration Tests

- Test the full search flow: navigate to Search tab → type a query → verify input retains focus throughout → verify AniList results appear without focus loss.
- Test the full browse infinite scroll flow: navigate to Browse tab → wait for initial 30 results → simulate sentinel intersection → verify 30+ results are shown and scroll position is preserved.
- Test the library filter flow: navigate to Library tab → type in the filter input → verify the library grid updates and the input retains focus.
- Test the carousel stability: navigate to Home tab → verify carousel starts → trigger an unrelated state change (e.g., open settings overlay) → verify carousel slide and timer are unchanged.
- Test browse mode switch: load Browse tab → scroll down to load page 2 → switch to "Top Rated" mode → verify results reset to page 1 of Top Rated (not a mix of Seasonal page 2 + Top Rated page 1).
