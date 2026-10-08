# Wildbound launch trailer — editable production

50 seconds · 1280 × 720 · 30 fps · H.264 / AAC in the supplied master.

The trailer uses actual-engine source clips, animated project artwork, editorial titles, original effects and creature cries, and **Aster Takes Flight**, an adventurous locally synthesized orchestral score. The final MP4 and standalone score are supplied as release downloads; editing does not require the original game checkout.

## Native Canvas / FFmpeg render

Prerequisites: Node.js 22+, FFmpeg/ffprobe, Python 3, and the dependencies below. This repository does not install executables for you.

```sh
cd trailer
npm install --omit=optional
python -m pip install -r requirements.txt
python render-all.py
```

Use `python render-all.py --regenerate-score` to regenerate the orchestral WAV, or `node render-trailer.mjs --scene opener` for a short silent preview. The normal full render remixes sounds, renders the storyboard, muxes the soundtrack, and produces fresh measurement reports.

`storyboard.json` controls copy and timing. `trailer-art.mjs` draws titles; `splash-motion.mjs` animates the original artwork. `compose-orchestral-score.py` is the score's synthesis source. `build-audio.py` synchronizes events with the clips.

## Fonts

No font files are included. System sans-serif and monospace fonts are used by default. Native renders can use your own locally installed files through `WILDBOUND_FONT_REGULAR`, `WILDBOUND_FONT_BOLD`, and `WILDBOUND_FONT_MONO`. These paths are never added to the repo. Default system metrics can make a re-render differ visually from the supplied master, so review title wrapping before releasing a new film.

## Optional Remotion render

The composition under `remotion/` shares the storyboard and editorial drawing. Install optional dependencies, supply your own Chrome executable, then run:

```sh
npm install
npm run typecheck
# Set REMOTION_BROWSER_EXECUTABLE to your installed Chrome executable.
node render-remotion.mjs
```

Remotion has separate licensing terms; see `../licenses/remotion.md`. The delivered master used the native path, not a claimed completed Remotion render.

## Source-clip provenance

Seven MP4 clips, their recorded events and sanitized capture manifests are in `clips/`. They were captured from the original game engine with controlled fixtures, not a continuous browser playthrough. React HUD overlays are not in the Canvas captures; editorial titles are added afterward. `node verify-clips.mjs` validates clip properties and recorded capture/evolution events with ffprobe.

`render-gameplay.mjs` is the recapture recipe. It requires the **original unbundled game checkout**, which is not part of this recovered repository. Set `WILDBOUND_GAME_SOURCE` only when that checkout is available and use a runtime supporting TypeScript (for example a separately installed `tsx`). Do not confuse this optional recapture requirement with editing the included clips.

## Output hygiene

Intermediate `work/` output and rebuilt masters are ignored by Git. No stale private render logs are shipped. Do not commit local fonts, credentials, browser executables, or personal gameplay fixtures. Original production materials are MIT-covered as described in the root NOTICE; downloaded dependencies keep their own licenses.
