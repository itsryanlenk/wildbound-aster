# Wildbound: Echoes of Aster — Field Edition 04

A complete standalone browser adventure with 151 original creatures, eight beacon badges, nine regions, real-time combat and capture, original music and creature cries, and your own local save.

## Publish for anyone to play

Unzip this release and upload its **contents** to a static web host. The folder containing `index.html` must also contain `assets`, `art`, `audio`, `sw.js`, and `offline-release.json`. Keep these names and their relative positions.

The game works at a domain root or in a subfolder. Open the folder URL with a trailing slash, or open its `index.html`. No database, account, ChatGPT session, API key, build command, or application server is required for the published game. Use HTTPS to enable optional offline play.

The ZIP contains a prebuilt release. The JavaScript, CSS, artwork, music, effects and all 151 creature cries are included; runtime game files do not depend on an external CDN.

## Play a downloaded copy locally

If Node.js is installed, open a terminal in this extracted folder and run:

```sh
node serve.mjs
```

Then open **http://localhost:8080**. The included server binds only to your own computer. Keep the terminal open while using this local server.

Alternatively, if Python 3 is installed:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open http://localhost:8080 in that case too. Serve the folder over HTTP(S); directly double-clicking the HTML file is not a supported launch path for this module build.

## Your local adventure

The game saves automatically in this browser. Each browser profile and host has its own save. There is no shared server save and no sign-in.

Use **Settings → Export save backup** to keep a JSON backup. Use **Import save backup** to restore that backup on another browser, device or host. Import validates the entire file before replacing the current adventure. Clearing this website's browser data or using a temporary private session can remove local progress, so keep a backup you care about.

Encounter checkpoints preserve your companions' current health and supplies and return you to the trail position before the encounter. A half-finished battle is not resumed after reloading.

## Offline play

On an HTTPS host or localhost, open **Settings → Download for offline play**. The game shows download progress and confirms when all files are ready. Allow the download to finish while connected; then open the same game address offline. This downloads the complete release, including every region and sound.

Updates wait until existing game tabs close, keeping the current adventure's files consistent during play. Browser storage limits and clearing site data can remove an offline copy. The ZIP remains an independent copy you can host or serve again.

## Controls

| Action | Keyboard / mouse | Touch |
|---|---|---|
| Move | WASD, arrows, or click a destination | Direction pad or tap a destination |
| Talk / encounter | E, or click a character or creature | Interact or tap a character or creature |
| Attack | 1–4; Space uses the first move | Four attack cards beside or below the arena |
| Dodge | Shift | Dodge button |
| Capture | C or capture control | Choose a prism and tap Capture |
| Switch companion | Q or team controls | Team or the companion switch row |
| Use a tonic | H or Bag | Tonic button or Bag |
| Retreat | R or retreat control | Retreat button |
| Pause | Escape | Pause button |
| Region map / Bag | M / B | Navigation buttons |

The opening field lesson safely teaches attacks, enemy warnings, dodging and capture. Notifications occupy a reserved strip outside the arena; conversations sit below the world. Compact landscape screens place battle controls to the right of the arena. Menus pause the world. In the Bag, choose which companion receives an item. The field guide can filter missing species and track a creature's habitat. Restore the eight beacons, face the First Beacon, and continue collecting after the ending.

## Experience and evolution

Every healthy party companion receives the full XP reward from a capture or defeated opponent, including a newly captured creature that joins the party. Fainted companions and reserves do not gain XP. Growth Candy raises only the selected healthy companion by one level outside battle. Evolution occurs at the level shown in the guide, updates its legal moves and field record, and restores health. Level 60 is the cap; capped companions display MAX LEVEL and do not accumulate extra XP. Team level-ups have one readable summary, and evolution has an animated before-and-after presentation.

## Animation and accessibility

Creature animation includes rest, locomotion, attacks, casting, hits, fainting, capture, entry and celebration, using articulated poses matched to their silhouettes. The ranger uses a new twenty-pose atlas with dedicated neutral standing poses. Foot contacts follow actual distance travelled, and idle breathing keeps the boots grounded. The existing opening painting has animated clouds, foliage, beacons, and companions. GPU-capable browsers use PixiJS meshes; a cached Canvas renderer supplies the same creature poses when GPU mesh rendering is unavailable.

Settings provides separate music, effects, cry and interface volume controls, plus reduced motion. System reduced-motion preferences are respected. The cinematic has readable phone captions and a story transcript.

## Credits

Wildbound uses original generated artwork and original local game audio. This is an original creature-collecting game. Motion provides interface transitions; Remotion provides the in-game cinematic player; PixiJS provides the GPU sprite renderer. Open-source dependencies are bundled in the compiled game.
