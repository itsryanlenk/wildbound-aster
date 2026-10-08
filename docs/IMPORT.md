# Field Edition 04 repository import

The complete prebuilt game and editable launch production are now checked in. The original unbundled game source was not recovered and is not represented as present.

## What was preserved

The expanded README, seven fresh gameplay screenshots, MIT license, dependency notice, security policy, privacy record, and existing repository history were retained. The README now links to the published release attachments. The import itself uses a GitHub no-reply commit identity.

## Verification

All transferred archives and media were checked against approved SHA-256 hashes before extraction. Archive CRCs, relative paths, extraction limits, and file types were validated. Existing files were not silently overwritten. The distribution inventory, all 151 creature sprites and cries, privacy scan, package manifest, local server tests, and static build were checked before publication. Published release downloads were then fetched without authentication and verified against their expected SHA-256 hashes.

These are packaging and download checks, not a claim of a new exhaustive gameplay, accessibility, or physical-device test.

## Updating

Run `npm test`, `npm run verify`, `npm run audit:privacy`, and `npm run build` before publishing an intentional change. If reviewed repository files change, regenerate `PACKAGE-MANIFEST.json` using `npm run manifest` and rerun verification. Release media masters live in GitHub Releases rather than the Git tree. To recreate release archives, first download the media masters to `_release/`, run `npm run package:release`, then regenerate the package manifest. The legacy `publish:github` command only creates a new repository; do not run it against this existing repository.
