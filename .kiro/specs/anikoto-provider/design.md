# Design Document: Anikoto Provider

## Overview

This feature adds Anikoto as a fourth streaming provider in AniVault's `STREAM_PROVIDERS` array in `app.js`. Unlike the three existing providers (MegaPlay, Cinetaro, VidPlus), which build embed URLs synchronously from the AniList ID, Anikoto requires a two-step asynchronous lookup: first resolve an episode embed ID from the Anikoto API using the AniList ID and episode number, then construct the stream URL from that embed ID.

The resolved embed IDs are cached in a new in-memory `episodeEmbedCache` object to avoid redundant network requests within a browser session. The provider participates in the existing provider-switching and auto-fallback mechanisms without any changes to those systems.

### Key Design Decisions

**Async `buildUrl` with synchronous return**: The existing `buildStreamUrl()` call site in `setupWatchPlayer()` expects a synchronous string return from `buildUrl`. Anikoto's `buildUrl` must therefore return synchronously (returning `""` on a cache miss while the async lookup runs in the background), then trigger a re-render once the embed ID resolves. This is consistent with how the auto-fallback timer already handles providers that initially return empty or broken URLs.

**Separate embed cache**: A new `episodeEmbedCache` object (distinct from the existing `episodeCache` and `franchiseCache`) stores `"{anilistId}-{episode}"` → `embedId` mappings. This keeps concerns separated and avoids polluting the episode metadata cache.

---

## Architecture

The Anikoto provider integrates into the existing provider array pattern with one addition: an async side-effect inside `buildUrl` that populates a module-level cache and triggers a re-render.

```mermaid
sequenceDiagram
    participant WV as Watch View
    participant BSU as buildStreamUrl()
    participant AP as Anikoto buildUrl()
    participant EC as episodeEmbedCache
    participant API as Anikoto API

    WV->>BSU: buildStreamUrl(entry, ep, lang, providerIdx)
    BSU->>AP: provider.buildUrl(entry, ep, lang)

    alt Cache hit
        AP->>EC: get("{anilistId}-{ep}")
        EC-->>AP: embedId
        AP-->>BSU: "https://anikoto.to/stream/s-2/{embedId}/{lang}"
    else Cache miss
        AP->>EC: get("{anilistId}-{ep}") → undefined
        AP-->>BSU: "" (synchronous return)
        AP->>API: GET /api/episode?anilistId={id}&ep={ep}
        alt API success
            API-->>AP: { embedId: "abc123" }
            AP->>EC: set("{anilistId}-{ep}", "abc123")
            AP->>WV: queueRender() [triggers re-render]
        else API failure
            API-->>AP: error / no embedId
            AP->>WV: (no re-render; auto-fallback timer handles it)
        end
    end
```

The auto-fallback timer in `setupWatchPlayer()` fires after 30 seconds if no `postMessage` success signal arrives. On a cache miss, `buildUrl` returns `""`, the iframe renders with an empty `src`, and the fallback timer advances to the next provider — no changes needed to `setupWatchPlayer()`.

---

## Components and Interfaces

### `STREAM_PROVIDERS` array (modified)

The Anikoto entry is appended as the fourth element:

```javascript
{
  name: "Anikoto",
  active: true,
  idType: "anilist",
  buildUrl: (entry, ep, lang) => { /* async lookup + cache */ },
  notes: "Requires async embed ID lookup via Anikoto API. Returns '' on cache miss; re-renders on resolution."
}
```

### `episodeEmbedCache` (new module-level variable)

```javascript
const episodeEmbedCache = {};
// Key format: "{anilistId}-{episode}"  →  embedId string
```

Declared alongside the existing `episodeCache` and `franchiseCache` objects. Cleared on page reload (in-memory only, not persisted to `localStorage`).

### `buildUrl` function (Anikoto-specific)

```javascript
buildUrl: (entry, ep, lang) => {
  const key = `${entry.anilistId}-${ep}`;
  if (episodeEmbedCache[key]) {
    return `https://anikoto.to/stream/s-2/${episodeEmbedCache[key]}/${lang}`;
  }
  // Async lookup — returns "" synchronously while fetch is in flight
  fetch(`https://anikoto.to/api/episode?anilistId=${entry.anilistId}&ep=${ep}`)
    .then(r => r.json())
    .then(data => {
      const embedId = data && data.embedId;
      if (embedId) {
        episodeEmbedCache[key] = embedId;
        queueRender(); // trigger re-render so the iframe picks up the resolved URL
      }
    })
    .catch(() => {
      // Silently fail; auto-fallback timer will advance to next provider
    });
  return "";
}
```

### Anikoto API endpoint

- **URL**: `https://anikoto.to/api/episode?anilistId={anilistId}&ep={episode}`
- **Method**: GET
- **Success response**: JSON object containing an `embedId` string field
- **Failure modes**: Network error, non-200 status, missing/null `embedId` field

---

## Data Models

### Provider object schema (unchanged)

```typescript
interface Provider {
  name: string;          // non-empty
  active: boolean;       // true = included in rotation
  idType: "anilist" | "slug";
  buildUrl: (entry: AnimeEntry, ep: number, lang: "sub" | "dub") => string;
  notes: string;
}
```

### Embed cache entry

```typescript
// Key: `${anilistId}-${episode}`  (e.g. "21-5")
// Value: embedId string           (e.g. "abc123xyz")
type EpisodeEmbedCache = Record<string, string>;
```

### Anikoto API response

```typescript
interface AnikotoApiResponse {
  embedId: string;  // opaque identifier for the streamable episode
  // other fields may be present but are ignored
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Anikoto provider satisfies the schema invariant

*For any* call to `buildUrl` on the Anikoto provider object with a valid entry, episode number, and language token, the provider object SHALL have `name === "Anikoto"`, `active === true`, `idType === "anilist"`, a callable `buildUrl`, a non-empty `notes` string, and `buildUrl` SHALL return a value of type `string`.

**Validates: Requirements 1.1, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

---

### Property 2: Provider cycling is a round-trip

*For any* starting provider index in `[0, N-1]` where N is the number of active providers (4 after Anikoto is added), applying the modulo rotation `(index + 1) % N` exactly N times SHALL return the original starting index.

**Validates: Requirements 1.3, 1.4**

---

### Property 3: Fetch uses `anilistId` and result is cached under composite key

*For any* anime entry with a positive `anilistId` and any episode number, when `buildUrl` is called on a cache miss, the outgoing fetch request URL SHALL contain `entry.anilistId` (not `entry.id`), and after the fetch resolves successfully with an `embedId`, the `episodeEmbedCache` SHALL contain that `embedId` under the key `"{anilistId}-{episode}"`.

**Validates: Requirements 2.1, 2.2, 2.5, 3.2**

---

### Property 4: Resolved stream URL matches the documented pattern

*For any* `embedId` string and any language token (`"sub"` or `"dub"`), the stream URL constructed by the Anikoto provider SHALL be exactly `https://anikoto.to/stream/s-2/{embedId}/{lang}` — beginning with `"https://"` and including the literal language token in the path.

**Validates: Requirements 2.3, 4.1, 4.2, 4.3, 4.4**

---

### Property 5: API failure always returns empty string

*For any* failure mode of the Anikoto API (network error, non-200 response, missing `embedId` field, null response), `buildUrl` SHALL return `""` — never throwing an exception and never returning a non-string value.

**Validates: Requirements 2.4**

---

### Property 6: Cache hit avoids re-fetch

*For any* `anilistId`-and-episode combination that already exists in `episodeEmbedCache`, calling `buildUrl` SHALL return the cached stream URL immediately and SHALL NOT initiate a new fetch request.

**Validates: Requirements 3.1, 3.3**

---

## Error Handling

| Failure scenario | Behavior |
|---|---|
| Anikoto API network error | `fetch` `.catch()` swallows the error; `buildUrl` already returned `""`; auto-fallback timer advances to next provider |
| Anikoto API returns non-200 | `r.json()` may throw or return error body; `.catch()` handles it; same outcome as network error |
| API response missing `embedId` | `data.embedId` is falsy; cache is not written; no re-render; auto-fallback advances |
| API response is malformed JSON | `.then(r => r.json())` rejects; `.catch()` handles it |
| `entry.anilistId` is falsy | `buildUrl` constructs a URL with `undefined` in the path; the fetch will likely 404; treated as API failure |
| `queueRender` called after component unmount | Harmless — `renderApp()` is idempotent and checks current state |

No new error states are introduced. All failures degrade gracefully to the existing auto-fallback path.

---

## Testing Strategy

### Unit tests (example-based)

- Verify the Anikoto provider object has all required schema fields with correct types and values
- Verify `STREAM_PROVIDERS` has exactly 4 entries after Anikoto is added
- Verify `buildUrl` returns `""` synchronously on a cache miss (mock `fetch`)
- Verify `buildUrl` returns the correct URL synchronously on a cache hit
- Verify the provider label displayed in the watch view is `"Anikoto"` when `currentProvider` points to the Anikoto index
- Verify provider index 0 is not Anikoto (reset behavior is unaffected)

### Property-based tests (fast-check, minimum 100 iterations each)

The project uses [fast-check](https://fast-check.dev/) for property-based testing. Each property test below corresponds to a Correctness Property above.

**Feature: anikoto-provider, Property 1: Anikoto provider satisfies the schema invariant**
- Generate: random `(entry, ep, lang)` tuples using `arbAnimeEntry`, `fc.integer({ min: 1 })`, `fc.oneof(fc.constant("sub"), fc.constant("dub"))`
- Assert: Anikoto provider object fields have correct types/values; `buildUrl(entry, ep, lang)` returns a string

**Feature: anikoto-provider, Property 2: Provider cycling is a round-trip**
- Generate: random starting index in `[0, 3]`
- Assert: `(startIdx + 4) % 4 === startIdx` (cycling 4 times returns to start)
- Note: This extends the existing P5 test to cover 4 providers

**Feature: anikoto-provider, Property 3: Fetch uses anilistId and result is cached under composite key**
- Generate: random `(anilistId, episode)` pairs where `anilistId !== id` (to distinguish the two fields)
- Mock: `fetch` to return `{ embedId: generatedEmbedId }`
- Assert: fetch URL contains `anilistId`; after resolution, `episodeEmbedCache["{anilistId}-{episode}"] === generatedEmbedId`

**Feature: anikoto-provider, Property 4: Resolved stream URL matches the documented pattern**
- Generate: random `embedId` strings and `lang` values (`"sub"` | `"dub"`)
- Assert: constructed URL equals `https://anikoto.to/stream/s-2/${embedId}/${lang}`

**Feature: anikoto-provider, Property 5: API failure always returns empty string**
- Generate: various failure scenarios (rejected fetch, missing embedId, null response)
- Assert: `buildUrl` returns `""` in all cases; no exception is thrown

**Feature: anikoto-provider, Property 6: Cache hit avoids re-fetch**
- Generate: random `(anilistId, episode, embedId)` triples
- Setup: pre-populate `episodeEmbedCache["{anilistId}-{episode}"] = embedId`
- Mock: `fetch` as a spy
- Assert: `buildUrl` returns the cached URL; `fetch` is never called

### Integration considerations

The async re-render path (cache miss → fetch → `queueRender`) is not covered by unit or property tests because it depends on the browser's `requestAnimationFrame` and the full `renderApp()` pipeline. Manual testing in the browser is required to verify the iframe updates after the embed ID resolves.
