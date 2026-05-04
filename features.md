.

🔥 CRITICAL FEATURES (Immediate UX improvement)
1. Auto‑next episode with fullscreen persistence
Current state: handlePlaybackEnded() listens for a postMessage event from MegaPlay (ended). It marks the episode watched and increments currentEpisode. However, changing the iframe src exits fullscreen on most browsers.

Required solution:

Before updating the iframe, detect whether the document is in fullscreen mode.

After loading the new episode’s URL, re‑enter fullscreen programmatically on the iframe or its parent container.

Use the Fullscreen API (requestFullscreen on the element, and check fullscreenElement on exit).

Why it matters: Losing fullscreen every 20 minutes destroys immersion.

2. Resume playback position (timestamp tracking) per episode
Current state: Only episode number and watch count are saved. No timestamp.

Required solution:

Add episodeProgress object in userData[entry.id] (e.g., { "1": 125, "2": 0 } meaning 125 seconds into episode 1).

Periodically save the current playback time (every 5 seconds) using the iframe’s postMessage API (if MegaPlay supports sending time updates).

If MegaPlay does not send time updates, this feature is not feasible without direct access to the video element. But you can still store manual resume points via “Save progress” button.

Why it matters: Users expect to continue exactly where they left off, even mid‑episode.

3. Playback speed control (0.5x – 2x)
Current state: Not available.

Required solution:

Request MegaPlay to expose a setPlaybackRate method via postMessage. If they do not support it, the feature is impossible because the iframe’s video element is inaccessible (cross‑origin).

Workaround: Overlay a custom HTML5 video player for your own hosted content, but that contradicts using MegaPlay.

Why it matters: Power users and language learners heavily rely on speed control.

4. Persistent fullscreen mode across all UI interactions
Current state: Fullscreen is lost when switching episodes, closing overlay, or navigating away.

Required solution:

Store a global isFullscreen state in uiState.

On any action that changes the view (episode switch, watch order card click, back button), restore fullscreen if it was active before.

Use the Fullscreen API’s fullscreenchange event to listen for manual toggles.

Why it matters: Users expect fullscreen to be a mode, not a temporary state.


🧠 MEDIUM PRIORITY – Polished streaming feel
6. Keyboard shortcuts (Space = play/pause, F = fullscreen, Shift+N = next, etc.)
Current state: Only left/right arrows and ‘m’.

Required solution:

Add handleKeydown for ' ' (prevent default, send postMessage for play/pause), 'f' (toggle fullscreen on the iframe container), 'Shift+N' (next episode), 'Shift+P' (previous).

MegaPlay must support play/pause messaging. If not, fallback to clicking on the iframe (inconsistent).

Why it matters: Streamers rarely use the mouse.

7. Picture‑in‑Picture (PiP) mode
Current state: Not available.

Required solution:

Use the standard document.exitPictureInPicture() and requestPictureInPicture() on the <video> element inside the iframe – impossible due to cross‑origin.

Alternative: Overlay your own video player for local files, but not for MegaPlay.

Why it matters: Users want to browse other tabs while watching.

8. Episode thumbnail preview on hover (in episode list)
Current state: Only text.

Required solution:

Use the thumbnail from cachedEpisodeData.episodes[episodeNumber].thumbnail (if provided by AniList streamingEpisodes).

On .ep-row hover, display a small floating image with that thumbnail.

Why it matters: Quickly identify scenes without playing.

9. Volume memory per device (localStorage)
Current state: Not stored.

Required solution:

Save volume level when changed (via postMessage if MegaPlay supports volume queries).

Restore on episode load.

Why it matters: No one wants to adjust volume every episode.

