Project Context
This is a school vibe coding project where I was asked to build a streaming platform clone of my choice. I chose to build an anime streaming platform, inspired by the feel of Netflix and ShuttleTV (https://shuttletv.su/). This is an educational project — not for commercial use or distribution.

Design Direction
Do not copy or replicate any existing site's layout, UI, or sections. Instead, build a completely original design from scratch, loosely inspired by the following aesthetic cues:

Glassmorphism / glassy card sections — frosted glass panels, translucent backgrounds, blur effects (as seen on ShuttleTV)
Bold hero section — a large, cinematic title displayed prominently when the page first loads (similar to Netflix's hero banner)
Dark, immersive theme — dark backgrounds that make content pop, consistent with anime streaming platforms
Modern, polished UI — clean typography, smooth transitions, responsive layout

You have full creative freedom — redesign everything from scratch if needed. The goal is a visually impressive, original anime streaming platform UI.

Platform Purpose
This platform is anime-only. All content, branding, search, and streaming integrations should be focused exclusively on anime titles.

Streaming Provider Integration — CRITICAL

Audit all currently integrated streaming/embed providers. Identify which ones:

Are correctly configured and functional for anime
Are broken, misconfigured, or simply don't support anime content
Are returning errors or empty results


Currently confirmed working: MegaPlay — keep this one.
For all non-working providers: remove them and replace with verified, functional anime streaming embed providers that:

Support searching and streaming anime by title
Have publicly accessible embed/iframe URLs
Work without requiring authentication or API keys (or document clearly if keys are needed)
Examples to consider and verify: Gogo Anime embeds, Zoro/Aniwatch, AniPlay, 9anime embeds, VidSrc (anime), AllAnime — only include ones you can confirm work


Make the provider system modular — so providers can be swapped or toggled easily without breaking the rest of the app.


Deliverables Expected

Full redesigned frontend (HTML/CSS/JS or React — your choice)
Working anime search that queries across all functional providers
Streaming/embed player that loads the correct anime from the selected provider
Clean, documented provider configuration so broken ones can be identified and swapped