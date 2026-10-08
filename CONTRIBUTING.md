# Contributing

Please keep changes focused and describe both the behavior and how you tested it. No secrets, personal saves, private contact details, or diagnostic dumps belong in issues, pull requests, commits, or screenshots.

## Local workflow

1. Use Node.js 22 or newer. Run `npm start` to play, then `npm test`, `npm run verify`, and `npm run audit:privacy` before proposing a change.
2. The game is a recovered compiled distribution. Do not present minified-bundle edits as a maintainable substitute for the missing source. Restore the original source and dependency lock before undertaking engine changes.
3. The trailer is editable: follow `trailer/README.md`. Dependencies are installed only in that folder. Do not commit `node_modules`, rendered intermediate frames, font binaries, or personal files.
4. Update documentation when changing controls, saves, licensing, assets, or publish behavior. After intentional package changes run `npm run manifest` to update the content inventory.

## Pull requests

Explain the problem, scope, checks run, and known limitations. For visible changes, attach cropped screenshots that contain no personal tabs, addresses, usernames other than the approved project brand, or unrelated content. Test both portrait and landscape layouts before claiming mobile support.

Your original contributions are submitted under the project's MIT license. Keep third-party notices and the separate Remotion terms intact. Do not contribute assets you do not have rights to distribute.
