Refine and fix the streaming UI to resolve interaction bugs, improve layout stability, and complete missing core features.

IMPORTANT:
This is a streaming platform UI. Focus on stability, accessibility, and continuous user flow. Avoid fragile UI behavior.

---

# 1. SEARCH INPUT BUG (CRITICAL)

Problem:
Typing a single character removes focus from the search input, forcing the user to click again.

Fix:

* Preserve input focus during typing
* Prevent unnecessary re-renders while typing
* Do NOT recreate the input element on every keystroke

Implementation guidance:

* Use debouncing for search (e.g., 300ms delay)
* Update results without replacing the input field
* Avoid full component re-render on input change

Goal:
User should type continuously without interruption.

---

# 2. STICKY EPISODE GROUP SELECTOR

Problem:
Episode group selector scrolls away.

Fix:

* Make episode group selector sticky at the top of the episode panel

Implementation:

* Use `position: sticky; top: 0;`
* Add background to prevent overlap issues
* Maintain z-index so it stays above episode list

Goal:
User can switch episode groups anytime without scrolling up.

---

# 3. STICKY SUB/DUB + RATING BAR (TOP & BOTTOM LOCK)

Fix layout into 3 zones:

TOP (sticky):

* Sub/Dub selector
* Episode group selector

MIDDLE (scrollable):

* Episode list

BOTTOM (sticky):

* Rating system
* Status selector (Watching / Completed / Dropped / Paused / Plan)

Implementation:

* Use flex column layout
* Middle section: `overflow-y: auto`
* Bottom bar: `position: sticky; bottom: 0;`

Goal:
Controls are always accessible without scrolling extremes.

---

# 4. FIX DROPDOWN BEING CUT OFF (CRITICAL UI BUG)

Problem:
Dropdown menus are clipped inside anime cards.

Cause:
Parent containers likely use `overflow: hidden`

Fix:

* Allow dropdown to escape card boundaries

Implementation options:

1. Set parent containers to `overflow: visible`
2. OR render dropdown as a floating layer using `position: absolute` or `fixed`
3. Use high `z-index` for dropdown
4. Ensure dropdown is not nested inside clipped container

Goal:
Dropdown should fully expand and be visible above all UI elements.

---

# 5. ADD STATUS MANAGEMENT SYSTEM (MISSING CORE FEATURE)

Add full status control:

Statuses:

* Watching
* Completed
* Paused
* Dropped
* Plan to Watch

Requirements:

* Show current status on card
* Allow changing status anytime
* Update state instantly
* Reflect changes across UI

UI:

* Use dropdown or bottom sheet (mobile-friendly)

---

# 6. IMPROVE ANIME CARD ACTIONS

Fix behavior:

* Do NOT hide actions inside fragile dropdowns
* Primary actions should be visible:

  * Add / In Library
  * Status indicator

Enhancements:

* Show “In Library” state clearly
* Show progress (Episode X)
* Optional: show rating

Goal:
User understands state without opening dropdowns.

---

# 7. ADD NETFLIX-STYLE RECOMMENDATION ROWS

Add dynamic rows:

* “Because You Watched [Title]”
* “Recommended For You”
* “Continue Watching”
* “Trending For You”

Requirements:

* Rows should reuse existing data (no need for real ML)
* Use simple logic:

  * same genre
  * related titles
  * recently watched

---

# 8. ALLOW SECTION REPETITION (IMPORTANT)

Problem:
UI feels static and predictable

Fix:

* Allow multiple recommendation rows
* Repeat patterns with different data sources

Example:

* Because You Watched Naruto
* Because You Watched Bleach

Goal:
Make the homepage feel alive and personalized.

---

# 9. MOBILE-FIRST INTERACTION IMPROVEMENTS

* Ensure all controls are thumb-friendly
* Avoid tiny buttons
* Use spacing generously
* Use bottom sheets for complex actions (optional)

---

# 10. PERFORMANCE & STABILITY

* Avoid full re-renders on small interactions
* Update only necessary parts of UI
* Keep state consistent across components

---

# OUTPUT EXPECTATION

Refactor layout, state usage, and interaction logic to:

* Fix input focus issues
* Keep important controls sticky and accessible
* Ensure dropdowns render correctly above UI
* Add missing streaming features (status, recommendations)
* Improve overall usability and flow

Final result should feel stable, responsive, and comparable to a modern streaming platform experience.
