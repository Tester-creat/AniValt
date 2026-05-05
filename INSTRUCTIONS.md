Fix layout overflow issues, hover behavior bugs, scrolling conflicts, and incomplete data handling in the streaming UI.

IMPORTANT:
Focus on clean layout boundaries, correct layering, and complete data representation. Avoid fragile UI behavior.

---

# 1. FIX ADD BUTTON DROPDOWN WIDTH & TEXT WRAPPING

Problem:
The dropdown that appears after clicking "Add" is constrained to the small button width, causing text wrapping.

Fix:

* Ensure dropdown width is NOT tied to the button size
* Set a minimum width for the dropdown

Implementation:

* Use `min-width: 180px` (or appropriate size)
* Use `white-space: nowrap` for options
* Use padding for readability

Goal:
Dropdown should appear as a proper menu, not squeezed into a button.

---

# 2. FIX HOVER PANEL DETACHING / FLOATING BUG

Problem:
Anime details (hover panel) appear detached or “hanging” when scrolling.

Cause:
The hover panel is likely using `position: absolute` without proper parent anchoring.

Fix:

* Ensure hover panel is positioned relative to the card container
* Use `position: relative` on the card
* Keep hover content inside the card bounds OR properly layered above it

Alternative:

* Convert hover panel into a controlled overlay instead of CSS-only hover

Goal:
Hover details should stay visually attached to the card at all times.

---

# 3. REMOVE DOUBLE SCROLLBAR (CRITICAL UX ISSUE)

Problem:
There are two vertical scrollbars:

* One inside a container (unnecessary)
* One on the page (correct)

Fix:

* Remove internal vertical scrolling unless absolutely necessary
* Only ONE main page scroll should exist

Implementation:

* Remove `overflow-y: auto` from unnecessary containers
* Keep scrolling only on:

  * episode list (if needed)
  * main page

Goal:
No nested scroll confusion. Scrolling should feel natural.

---

# 4. FIX HOVER CONTENT VISIBILITY ON SCROLL

Problem:
Hover content remains visible or misaligned when scrolling.

Fix:

* Hide hover state when scrolling starts
* Or convert hover to click-based interaction (especially for mobile)

Implementation:

* Add scroll listener to reset hover state
* Or toggle hover via JS instead of pure CSS

Goal:
No floating or stuck UI elements during scroll.

---

# 5. ADD COMPLETE ANIME TAG SYSTEM

Problem:
Only a limited set of tags is available.

Fix:

* Fetch and display ALL available tags from API (AniList or equivalent)

Implementation:

* Use full tag query (e.g., `MediaTagCollection` in AniList)
* Store tags in state
* Display tags dynamically

Goal:
User should see full genre/tag coverage (e.g., Ecchi, Mecha, Isekai, etc.)

---

# 6. FIX EPISODE COUNT (CRITICAL DATA ISSUE)

Problem:
Anime like One Piece only show 1 episode.

Likely Cause:

* API query only returns limited or incorrect episode data

Fix:

* Ensure correct API fields are requested:

  * total episodes
  * episode list or streaming episodes

AniList note:

* `episodes` field gives total count
* detailed episode lists may require external source (e.g., streaming provider)

Implementation:

* Use total episode count if full list unavailable
* Generate episode placeholders if needed

Example:
If episodes = 1160:
Generate:
Episode 1 → Episode 1160

---

# 7. HANDLE LARGE EPISODE COUNTS PROPERLY

* Combine with existing grouping logic (1–50, 51–100, etc.)
* Ensure full episode range is available

---

# 8. IMPROVE DATA FALLBACKS

If API does not provide:

* episode list → generate sequential list
* tags → fallback to genre list

Goal:
No anime should appear incomplete.

---

# 9. GENERAL LAYOUT STABILITY

* Ensure all floating elements have proper z-index
* Avoid overflow clipping
* Keep UI visually contained and predictable

---


⏳ Next Steps
Before we add any features, we need to fix the current errors:
Fix the type="module" CORS issue — I recommend using a local server
Clean up the broken app.js string formatting — The template literals have syntax errors from the upload
Fix escapeHtml function — The spaces inside quotes are breaking it
Fix arrow function syntax — (tab) = > should be (tab) =>

# OUTPUT EXPECTATION

Refactor layout and data handling to:

* Fix dropdown sizing and readability
* Anchor hover panels correctly
* Remove duplicate scrollbars
* Ensure hover UI behaves correctly during scroll
* Fetch and display complete anime tags
* Fix episode count issues for long-running series

Final result should be visually stable, data-complete, and free of layout glitches.
