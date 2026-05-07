# Implementation Plan

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - Search Focus Loss, Browse Infinite Scroll Missing, Library Filter Full Re-render
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior — they will validate the fix when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate each bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope each property to the concrete failing case(s) to ensure reproducibility
  - Create `tests/p9_streaming_rerender_bugs.test.js`
  - **Bug 1 — Search Focus Loss**: Simulate an `input` event on `#searchPageInput` (isBugCondition: `event.target.id IN {"searchPageInput", "navSearchInput", "mobileNavSearchInput"} AND handleInput() calls renderApp() synchronously`). Assert `document.activeElement` is still the input after `handleInput()` returns and the DOM node identity (`===`) is preserved. Use fast-check to generate random search query strings and verify the node identity holds for all of them.
  - **Bug 2 — Browse Sentinel Missing**: Render the browse tab with `uiState.browse.results` populated and `uiState.browse.hasMore = true`. Assert that `document.getElementById("browseSentinel")` is not null. (isBugCondition: `currentTab = "browse" AND scrolledToBottom = true AND observerAttached = false AND uiState.browse.loading = false`)
  - **Bug 3 — Library Filter Full Re-render**: Simulate an `input` event on `#librarySearchInput` (isBugCondition: `event.target.id = "librarySearchInput" AND handleInput() calls renderApp() synchronously`). Assert that the `.topnav` DOM node reference is the same object before and after the call, and `document.activeElement` remains the library filter input.
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found:
    - Bug 1: `document.activeElement` is `document.body` after `handleInput()` — confirms DOM node was destroyed
    - Bug 2: `document.getElementById("browseSentinel")` returns `null` — confirms no sentinel is rendered
    - Bug 3: `.topnav` node reference changes — confirms `renderApp()` replaced the entire DOM
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.9_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Input Events, Browse Mode/Genre Switch, Carousel Stability
  - **IMPORTANT**: Follow observation-first methodology
  - **Observe on UNFIXED code** for inputs where the bug condition does NOT hold:
    - Observe: `#librarySortSelect` change event still triggers `renderApp()` and re-renders the library in the correct sort order
    - Observe: Tab switch clicks still call `renderTab()` and render the correct full page
    - Observe: `loadBrowse(mode, genre)` with a different mode resets `uiState.browse.results` to `[]` and fetches fresh data
    - Observe: `initHeroCarousel()` sets `heroState.timer` to a non-null value on first call
  - Create preservation tests in `tests/p9_streaming_rerender_bugs.test.js` (additional `describe` block)
  - **Preservation 1 — Non-buggy inputs unchanged**: Use fast-check to generate random `InputEvent` targets that are NOT one of the four affected inputs (`#searchPageInput`, `#navSearchInput`, `#mobileNavSearchInput`, `#librarySearchInput`). Verify `handleInput_fixed` produces the same `uiState` snapshot as `handleInput_original` for all such inputs. (Preservation: `NOT isBugCondition_SearchFocus AND NOT isBugCondition_LibraryRerender`)
  - **Preservation 2 — Browse mode/genre switch resets results**: Verify that calling `loadBrowse(newMode, genre)` where `newMode !== uiState.browse.mode` resets `uiState.browse.results` to `[]` and `uiState.browse.page` to `1`. (Preservation: Requirements 3.5, 3.6)
  - **Preservation 3 — Debounce still fires once per burst**: Verify the AniList search debounce still fires exactly once after 350 ms for queries of 2+ characters (complements existing test P6). (Preservation: Requirements 3.1, 3.2)
  - **Preservation 4 — Carousel timer not reset on unrelated re-render**: Observe `heroState.timer` value before and after an unrelated `renderApp()` call while on the home tab. Record the timer ID. Write property asserting the timer ID is unchanged. (Preservation: Requirements 3.8)
  - Verify all preservation tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.8, 3.10_

- [x] 3. Fix streaming re-render bugs in app.js

  - [x] 3.1 Add `page` and `hasMore` fields to `uiState.browse` (Change 1)
    - Add `page: 1` to the `uiState.browse` object initializer
    - Add `hasMore: true` to the `uiState.browse` object initializer
    - These fields track which page to fetch next and whether more results exist
    - _Bug_Condition: isBugCondition_BrowseScroll — `currentTab = "browse" AND scrolledToBottom = true AND observerAttached = false AND uiState.browse.loading = false`_
    - _Expected_Behavior: `uiState.browse.results.length > countBefore` after sentinel fires; first N items identical to originals_
    - _Preservation: Browse mode/genre switch must reset page to 1 and hasMore to true_
    - _Requirements: 2.4, 2.5, 2.7, 2.8_

  - [x] 3.2 Fix `loadBrowse()` to support pagination (Change 2)
    - Accept an optional `page` parameter (default `1`)
    - When `page === 1` (mode/genre switch): replace `uiState.browse.results`, reset `uiState.browse.page = 1`, set `uiState.browse.hasMore = true`, disconnect any active `IntersectionObserver`
    - When `page > 1` (sentinel triggered): append to `uiState.browse.results` using spread (`[...existing, ...newItems]`), increment `uiState.browse.page`
    - Set `uiState.browse.hasMore = false` when returned item count is less than `perPage`
    - _Bug_Condition: isBugCondition_BrowseScroll — no page counter, results replaced not appended_
    - _Expected_Behavior: `uiState.browse.results` is a superset of previous results when `page > 1`; first N items identical_
    - _Preservation: `loadBrowse(mode, genre)` with page 1 must produce same first-page result set as original_
    - _Requirements: 2.5, 2.6, 2.7, 2.8, 3.5, 3.6_

  - [x] 3.3 Add sentinel element to `renderBrowse()` (Change 3)
    - Append `<div id="browseSentinel" class="browse-sentinel"></div>` after the results grid when `uiState.browse.hasMore` is true and results are present
    - Do NOT render the sentinel when `uiState.browse.hasMore` is false (no more pages)
    - Do NOT render the sentinel when results are empty (initial load or error state)
    - _Bug_Condition: isBugCondition_BrowseScroll — no sentinel element exists in the DOM_
    - _Expected_Behavior: `document.getElementById("browseSentinel")` is not null when hasMore is true_
    - _Requirements: 2.4_

  - [x] 3.4 Attach `IntersectionObserver` for browse sentinel in `afterRender()` (Change 4)
    - After rendering the browse tab, check for `#browseSentinel` and attach an `IntersectionObserver`
    - Observer callback calls `loadBrowse(uiState.browse.mode, uiState.browse.genre, uiState.browse.page + 1)` when sentinel enters viewport
    - Store the observer reference (e.g., `window._browseObserver`) so it can be disconnected on mode/genre switch
    - Guard against attaching multiple observers: disconnect existing observer before attaching a new one
    - _Bug_Condition: isBugCondition_BrowseScroll — no IntersectionObserver attached_
    - _Expected_Behavior: sentinel intersection triggers append of next page results_
    - _Preservation: observer must be disconnected and page reset when mode/genre switches_
    - _Requirements: 2.4, 2.5, 2.8_

  - [x] 3.5 Fix `handleInput()` for `#librarySearchInput` — surgical DOM update (Change 5)
    - Replace `renderApp()` call with surgical DOM update:
      1. Update `uiState.library.query = event.target.value`
      2. Find the library grid container in the DOM and replace only its `innerHTML` with filtered card HTML
      3. Do NOT call `renderApp()`
      4. Do NOT set `uiState.focusInputId` (input is never destroyed, focus is never lost)
    - _Bug_Condition: isBugCondition_LibraryRerender — `event.target.id = "librarySearchInput" AND handleInput() calls renderApp() synchronously`_
    - _Expected_Behavior: `.topnav` DOM node reference unchanged; `document.activeElement` remains the library filter input_
    - _Preservation: `#librarySortSelect` change must still trigger full `renderApp()`; library grid must show correctly filtered results_
    - _Requirements: 2.9, 3.3, 3.7_

  - [x] 3.6 Fix `runAniListSearch()` to use surgical DOM update (Change 6)
    - Replace `queueRender()` call in `runAniListSearch()` with a surgical update of only the AniList results section
    - Target the results container (`.search-layout .section:first-child` inner content or equivalent) and update its `innerHTML`
    - Do NOT call `queueRender()` or `renderApp()` after results arrive
    - This eliminates the second focus loss that occurs when the 350 ms debounce fires and results are received
    - _Bug_Condition: isBugCondition_SearchFocus — `runAniListSearch()` calls `queueRender()` after results arrive, destroying the input a second time_
    - _Expected_Behavior: `document.activeElement` is still the search input after results are rendered; DOM node identity preserved_
    - _Preservation: AniList results must still appear correctly; debounce behavior (P6) must be unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2_

  - [x] 3.7 Guard `initHeroCarousel()` against redundant restarts (Change 7)
    - Add a check in `initHeroCarousel()`: if `heroState.timer` is already set and the carousel DOM element already exists with the correct number of slides, skip the `clearInterval` / `setInterval` cycle
    - Only restart the carousel when the carousel DOM has actually changed (e.g., different number of slides)
    - _Bug_Condition: isBugCondition_LibraryRerender (and any renderApp() call on home tab) — `initHeroCarousel()` always clears and restarts the interval, resetting carousel progress_
    - _Expected_Behavior: `heroState.timer` is the same timer ID before and after an unrelated `renderApp()` call on the home tab_
    - _Preservation: carousel must still auto-advance on 7-second interval; dot/thumb/arrow navigation must still work; carousel must initialize correctly on first render_
    - _Requirements: 2.11, 3.8_

  - [x] 3.8 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Search Focus Preserved, Browse Sentinel Present, Library Filter Surgical Update
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied for all three bugs
    - Run `tests/p9_streaming_rerender_bugs.test.js` bug condition tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms all three bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.9_

  - [x] 3.9 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Inputs, Browse Mode Switch, Debounce, Carousel
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Also run the full existing test suite (`npm test`) to confirm P1–P8 all still pass
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint — Ensure all tests pass
  - Run `npm test` (or `npx vitest run`) to execute the full test suite
  - Confirm P1 through P8 all pass without modification
  - Confirm the new P9 tests (bug condition + preservation) all pass
  - Verify the three bugs are fixed by manual smoke test:
    - Type in the search input and confirm focus is never lost
    - Navigate to Browse tab, scroll to the bottom, and confirm more results load
    - Type in the library filter and confirm the nav bar does not flicker
  - Ensure all tests pass; ask the user if questions arise.
