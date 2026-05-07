# Requirements Document

## Introduction

This feature adds Anikoto as a 4th streaming provider in AniVault's `STREAM_PROVIDERS` array in `app.js`. Unlike the existing three providers (MegaPlay, Cinetaro, VidPlus), which build embed URLs directly from the AniList ID, Anikoto requires a two-step lookup: first resolve an episode embed ID from the Anikoto API using the AniList ID and episode number, then construct the stream URL using that embed ID. The resolved embed URLs are cached to avoid redundant network requests. The provider participates in the existing provider-switching and auto-fallback mechanisms without modification to those systems.

## Glossary

- **AniList_ID**: The integer identifier assigned to an anime title by the AniList GraphQL API. Used as the primary key for all existing providers.
- **Anikoto_API**: The external HTTP API operated by Anikoto that maps AniList IDs and episode numbers to episode embed IDs.
- **Episode_Embed_ID**: An opaque string identifier returned by the Anikoto API that uniquely identifies a streamable episode on the Anikoto platform.
- **Embed_Cache**: The in-memory key-value store (`episodeEmbedCache`) that maps `"{anilistId}-{episode}"` keys to resolved `Episode_Embed_ID` values, persisting for the lifetime of the browser session.
- **Stream_URL**: The final iframe-embeddable URL constructed from an `Episode_Embed_ID` and a language token, following the pattern `/stream/s-2/{episode_embed_id}/{lang}`.
- **Provider**: An entry in the `STREAM_PROVIDERS` array with `name`, `active`, `idType`, `buildUrl`, and `notes` fields, as validated by the existing provider schema tests.
- **Lang**: A language token string — either `"sub"` (subtitled) or `"dub"` (dubbed) — passed to all provider `buildUrl` functions.
- **Auto-Fallback**: The existing 30-second timeout mechanism in `setupWatchPlayer()` that automatically advances `uiState.watch.currentProvider` to the next provider when no postMessage success signal is received.

---

## Requirements

### Requirement 1: Anikoto Provider Registration

**User Story:** As a viewer, I want Anikoto available as a provider option, so that I have an additional streaming source when other providers fail.

#### Acceptance Criteria

1. THE `STREAM_PROVIDERS` array SHALL contain an Anikoto entry with `name` equal to `"Anikoto"`, `active` equal to `true`, `idType` equal to `"anilist"`, a callable `buildUrl` function, and a non-empty `notes` string.
2. THE `STREAM_PROVIDERS` array SHALL contain exactly 4 entries after the Anikoto provider is added.
3. WHEN the `switch-provider` action is triggered, THE Provider_Switcher SHALL cycle through all 4 providers including Anikoto using the existing modulo rotation logic.
4. WHEN the auto-fallback timer expires on any provider, THE Auto-Fallback SHALL advance to the next provider in the array, including Anikoto, without requiring changes to `setupWatchPlayer()`.

---

### Requirement 2: Asynchronous Episode Embed ID Lookup

**User Story:** As a viewer, I want the app to automatically resolve the correct Anikoto stream for the episode I selected, so that I don't have to manually find embed IDs.

#### Acceptance Criteria

1. WHEN `buildUrl` is called for the Anikoto provider with a valid `entry.anilistId`, episode number, and language, THE Anikoto_Provider SHALL initiate an asynchronous HTTP GET request to the Anikoto API to resolve the `Episode_Embed_ID` for that `anilistId` and episode combination.
2. WHEN the Anikoto API returns a successful response containing an `Episode_Embed_ID`, THE Anikoto_Provider SHALL store the resolved `Episode_Embed_ID` in the `Embed_Cache` under the key `"{anilistId}-{episode}"`.
3. WHEN the Anikoto API returns a successful response, THE Anikoto_Provider SHALL return a `Stream_URL` of the form `https://anikoto.to/stream/s-2/{episode_embed_id}/{lang}`.
4. IF the Anikoto API request fails or returns no usable embed ID, THEN THE Anikoto_Provider SHALL return an empty string so the existing fallback mechanism can advance to the next provider.
5. THE Anikoto_Provider SHALL use the `anilistId` field from the entry object (not the `id` field) when constructing the API lookup request, consistent with all other providers.

---

### Requirement 3: Embed URL Caching

**User Story:** As a viewer, I want previously resolved Anikoto embed IDs to be reused without additional network requests, so that switching back to an already-loaded episode is instant.

#### Acceptance Criteria

1. WHEN `buildUrl` is called for an `anilistId`-and-episode combination that already exists in the `Embed_Cache`, THE Anikoto_Provider SHALL return the cached `Stream_URL` immediately without making a new API request.
2. THE `Embed_Cache` SHALL use the composite key `"{anilistId}-{episode}"` to store and retrieve `Episode_Embed_ID` values.
3. WHEN a new `Episode_Embed_ID` is successfully resolved from the Anikoto API, THE Anikoto_Provider SHALL write it to the `Embed_Cache` before returning the `Stream_URL`.
4. THE `Embed_Cache` SHALL persist for the duration of the browser session and SHALL be cleared when the page is reloaded, consistent with the existing `episodeCache` and `franchiseCache` objects.

---

### Requirement 4: Stream URL Format

**User Story:** As a developer, I want the Anikoto stream URL to follow the documented format, so that the iframe embed renders correctly.

#### Acceptance Criteria

1. WHEN an `Episode_Embed_ID` is available, THE Anikoto_Provider SHALL construct the `Stream_URL` using the pattern `https://anikoto.to/stream/s-2/{episode_embed_id}/{lang}`.
2. WHEN `lang` is `"sub"`, THE Anikoto_Provider SHALL include the literal string `"sub"` in the `Stream_URL` path.
3. WHEN `lang` is `"dub"`, THE Anikoto_Provider SHALL include the literal string `"dub"` in the `Stream_URL` path.
4. THE `Stream_URL` SHALL begin with `"https://"` whenever an `Episode_Embed_ID` is available, consistent with the HTTPS requirement enforced by the existing provider schema tests.

---

### Requirement 5: Provider Schema Compliance

**User Story:** As a developer, I want the Anikoto provider object to satisfy the existing provider schema, so that no existing property-based tests break.

#### Acceptance Criteria

1. THE Anikoto provider object SHALL have a `name` field of type `string` with length greater than 0.
2. THE Anikoto provider object SHALL have an `active` field of type `boolean` set to `true`.
3. THE Anikoto provider object SHALL have an `idType` field equal to `"anilist"`.
4. THE Anikoto provider object SHALL have a `buildUrl` field that is a callable function accepting `(entry, ep, lang)` arguments.
5. THE Anikoto provider object SHALL have a `notes` field of type `string`.
6. WHEN `buildUrl` is called with a valid entry, episode, and language, THE Anikoto_Provider SHALL return a value of type `string` (either a valid `Stream_URL` or an empty string), satisfying the return-type contract expected by `buildStreamUrl()`.

---

### Requirement 6: Integration with Existing Watch View

**User Story:** As a viewer, I want Anikoto to appear in the provider switcher button in the watch view, so that I can manually select it like any other provider.

#### Acceptance Criteria

1. WHEN `uiState.watch.currentProvider` points to the Anikoto provider index, THE Watch_View SHALL display `"Anikoto"` as the label on the provider switcher button.
2. WHEN `uiState.watch.currentProvider` is reset to `0` on episode change or title open, THE Watch_View SHALL start with the first provider in `STREAM_PROVIDERS`, not necessarily Anikoto, consistent with existing behavior.
3. WHILE the Anikoto provider is active and the embed ID lookup is pending, THE Watch_View SHALL render the iframe with whatever URL `buildUrl` returns synchronously (which may be empty, triggering the auto-fallback timer), consistent with how all other providers behave.
