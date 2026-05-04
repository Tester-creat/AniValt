# AniVault

A private, offline-first anime streaming and tracking site. Powered by AniList and MegaPlay. No backend, no accounts, no ads.

## Features

- Stream anime directly in-app via MegaPlay embeds
- Browse and search AniList catalog (50,000+ titles)
- Smart tracking - auto-moves anime to Completed when finished, auto-sets to Watching when you start
- Continue Watching row with episode progress bars
- Sub/Dub toggle per anime, remembered across sessions
- Auto-play next episode with postMessage detection
- Export and import your library as a JSON backup
- Offline-first - works without internet after first load (except for streaming and AniList search)
- Zero backend - everything lives in your browser

## Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript - no frameworks
- AniList GraphQL API - metadata, search, browse
- MegaPlay - anime video embeds
- Netlify + GitHub Pages - static hosting
- localStorage - all user data stored locally

## Deployment

### GitHub Pages

1. Fork or clone this repository
2. Go to Settings -> Pages -> Source -> main branch -> / (root)
3. Your site is live at `https://{username}.github.io/anivault`

### Netlify

1. Connect your GitHub repository to Netlify
2. Build command: leave empty
3. Publish directory: `.`
4. Deploy - auto-deploys on every push to `main`

## Local Development

Since this is a pure static site, open `index.html` directly in a browser or use any static server:

```bash
npx serve .
python -m http.server 8080
```

Note: MegaPlay video embeds will not work on localhost due to referrer restrictions. Deploy to Netlify or GitHub Pages to test the full player experience.

## Data & Privacy

All watch data is stored exclusively in your browser's `localStorage` under the key `anivault_v2`. No data is sent to any server. Clearing browser data will erase your library - use Export Backup regularly.

## License

MIT
