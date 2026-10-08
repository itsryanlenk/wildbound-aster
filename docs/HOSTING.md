# Hosting

## Static hosting

Run `npm run build`, then upload the contents of `dist/` to an HTTPS static host. Keep `assets/`, `art/`, `audio/`, `sw.js`, `offline-release.json`, and `index.html` together. Keep `LICENSE`, `NOTICE.md`, and `licenses/` with the distribution too.

There are no server-side gameplay credentials or database requirements. Relative imports allow a root or subdirectory deployment. Open the directory URL with a trailing slash. Do not strip notices or delete assets that appear unused: later regions, cries and lazy JavaScript chunks are loaded during play.

## GitHub Pages

The included workflow builds a static directory and deploys **only `dist/`**, not the full repository, trailer sources, release staging area or local files. In repository **Settings → Pages**, select **GitHub Actions** as the source. The publisher attempts this configuration automatically; organizational permissions may require it to be set manually.

A Pages deployment is not considered successful until GitHub Actions reports success. The currently branded game address and a later Pages address are separate origins, so players must export/import saves when switching.

## Releases

Use the publisher from [PUBLISHING.md](PUBLISHING.md). Finished ZIP/MP4/MP3 files belong in GitHub Releases rather than Git history. The `_release/` directory in the starter bundle is ignored by Git and is attached by the publish script.

## Local testing

`npm start` serves the game on `127.0.0.1:8080`. Override the port with `PORT=8081` in your environment. This does not make your computer public. A static host is required for a permanent public address.
