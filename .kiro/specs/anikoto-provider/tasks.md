# Implementation Plan: Anikoto Provider

## Overview

Add Anikoto as the fourth streaming provider in `app.js`. This involves declaring a new `episodeEmbedCache` object, appending the Anikoto entry to `STREAM_PROVIDERS`, and updating the existing test files that hard-code the provider array so they include the new provider.

## Tasks

- [x] 1. Declare `episodeEmbedCache` in `app.js`
  - Add `const episodeEmbedCache = {};` alongside the existing `episodeCache` and `franchiseCache` declarations (around line 110)
  - The cache is in-memory only — no `localStorage` persistence
  - _Requirements: 3.2, 3.4_

- [x] 2. Add the Anikoto provider to `STREAM_PROVIDERS`
  - [x] 2.1 Append the Anikoto provider object to the `STREAM_PROVIDERS` array in `app.js`
    - Set `name: "Anikoto"`, `active: true`, `idType: "anilist"`, and a non-empty `notes` string
    - Implement `buildUrl` to check `episodeEmbedCache` first; on a cache hit return `https://anikoto.to/stream/s-2/${embedId}/${lang}` immediately
    - On a cache miss, return `""` synchronously and fire an async `fetch` to `https://anikoto.to/api/episode?anilistId=${entry.anilistId}&ep=${ep}`
    - On a successful fetch response, store `data.embedId` in `episodeEmbedCache[key]` and call `queueRender()`
    - Wrap the fetch chain in `.catch(() => {})` so all failure modes are silently swallowed
    - Use `entry.anilistId` (not `entry.id`) when constructing the API request URL
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 5.1–5.6_

  - [~] 2.2 Write property test for Anikoto provider schema invariant (Property 1) — *skipped (optional)*
    - Would create `tests/anikoto_p1_schema.test.js`
    - Schema invariant is already covered by the updated `tests/p3_provider_schema.test.js`

  - [~] 2.3 Write property test for resolved stream URL pattern (Property 4) — *skipped (optional)*
    - Would create `tests/anikoto_p4_url_pattern.test.js`
    - URL pattern is already covered by `tests/anikoto_p6_cache_hit.test.js` (cache hit returns exact URL)

- [x] 3. Checkpoint — verify schema and URL tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement and test the async fetch path
  - [x] 4.1 Write property test for API failure always returns empty string (Property 5)
    - Create `tests/anikoto_p5_failure.test.js`
    - Mock `fetch` using `vi.stubGlobal` to simulate: rejected promise, non-200 response, missing `embedId` field, null response body
    - For each failure mode, call `buildUrl` with a fresh cache and assert the synchronous return value is `""`
    - Assert no exception is thrown in any case
    - **Property 5: API failure always returns empty string**
    - **Validates: Requirements 2.4**

  - [x] 4.2 Write property test for fetch using `anilistId` and caching under composite key (Property 3)
    - Create `tests/anikoto_p3_fetch_cache.test.js`
    - Generate random `(anilistId, id, episode, embedId)` tuples where `anilistId !== id` to distinguish the two fields
    - Mock `fetch` using `vi.stubGlobal` to return `{ embedId }` and capture the URL it was called with
    - Call `buildUrl` on a cache miss, await the microtask queue (use `await Promise.resolve()` or `vi.runAllMicrotasks`)
    - Assert: the fetch URL contains `entry.anilistId` (not `entry.id`); `episodeEmbedCache["{anilistId}-{episode}"]` equals the resolved `embedId`
    - **Property 3: Fetch uses `anilistId` and result is cached under composite key**
    - **Validates: Requirements 2.1, 2.2, 2.5, 3.2**

  - [x] 4.3 Write property test for cache hit avoiding re-fetch (Property 6)
    - Create `tests/anikoto_p6_cache_hit.test.js`
    - Generate random `(anilistId, episode, embedId)` triples
    - Pre-populate `episodeEmbedCache["{anilistId}-{episode}"] = embedId`
    - Spy on `fetch` using `vi.stubGlobal`
    - Call `buildUrl` and assert: return value equals `https://anikoto.to/stream/s-2/${embedId}/${lang}`; `fetch` was never called
    - **Property 6: Cache hit avoids re-fetch**
    - **Validates: Requirements 3.1, 3.3**

- [x] 5. Checkpoint — verify all async path tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update existing test files to include the Anikoto provider
  - [x] 6.1 Update `tests/providers.test.js`
    - Add the Anikoto provider entry to the local `STREAM_PROVIDERS` copy in this file
    - Update the `"should have exactly 4 active providers"` assertion (already expects 4 — verify it still passes)
    - Add a `describe('Anikoto provider')` block with unit tests:
      - `buildUrl` returns `""` synchronously on a cache miss (mock `fetch`)
      - `buildUrl` returns the correct `https://anikoto.to/stream/s-2/{embedId}/{lang}` URL on a cache hit
      - URL starts with `"https://"` when a cache hit is present
    - _Requirements: 1.2, 5.1–5.6_

  - [x] 6.2 Update `tests/p3_provider_schema.test.js`
    - Add the Anikoto provider to the local `STREAM_PROVIDERS` copy in this file
    - The existing `"should have exactly 4 providers"` assertion already expects 4 — verify it passes with the new entry
    - Note: Anikoto's `buildUrl` returns `""` on a cache miss; update the schema test's `buildUrl` call to pre-populate `episodeEmbedCache` or adjust the assertion to accept `""` as a valid string return
    - _Requirements: 5.1–5.6_

  - [x] 6.3 Update `tests/p4_provider_url_validity.test.js`
    - Add the Anikoto provider to the local `STREAM_PROVIDERS` copy in this file
    - Because Anikoto returns `""` on a cache miss, pre-populate `episodeEmbedCache` before the property loop so the URL validity assertion (`startsWith("https://")`) holds for Anikoto
    - _Requirements: 4.4, 5.6_

  - [x] 6.4 Update `tests/p5_provider_fallback.test.js`
    - Add the Anikoto provider to the local `STREAM_PROVIDERS` copy in this file
    - The existing cycling tests already use `STREAM_PROVIDERS.length` dynamically — verify they pass with 4 providers
    - Update the `"should cycle through all 4 active providers in order"` unit test's expected sequence if needed
    - _Requirements: 1.3, 1.4_

- [x] 7. Final checkpoint — ensure all tests pass
  - Run `npx vitest --run` and confirm the full suite is green
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The Anikoto `buildUrl` must be exported or accessible from test files; since the test files copy the provider array inline (as all existing test files do), copy the Anikoto entry — including the `episodeEmbedCache` reference — into each test file that needs it
- `episodeEmbedCache` must be declared in the same scope as the copied `buildUrl` in each test file so the closure resolves correctly
- Property tests validate universal correctness properties; unit tests in `providers.test.js` validate specific examples and edge cases
- The async re-render path (cache miss → fetch → `queueRender`) requires manual browser testing and is not covered by automated tests
