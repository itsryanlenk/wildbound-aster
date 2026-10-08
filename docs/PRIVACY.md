# Privacy and public identity

Ryan Lenk / itsryanlenk and the branded Wildbound play address are intentional public branding approved by the project owner. This repository is not anonymous.

Do not publish credentials, tokens, private contact details, personal saves, browser profiles, environment files, original development histories, machine-specific paths, or unrelated screenshots. Use a GitHub no-reply author email for new local commits. Never put a token into a Git remote URL, issue, release attachment, or workflow log.

## Commit metadata is separate from file content

The owner-created initial commit contains an account email. Connector-created setup and documentation commits also inherit the account's configured commit identity: the available connector does not expose an author-email override. These commits have not been rewritten or deleted. Sanitizing project files does not remove existing Git metadata.

The automated screenshot-gallery commit explicitly uses the project's GitHub no-reply email. Changing email-privacy settings does not retroactively change prior commits, and a history rewrite would be a separate operation requiring review. Nothing here claims to erase previously public information or copies held elsewhere.

## Screenshot gallery

The README images were captured from the public game in fresh anonymous browser contexts. The player name is the synthetic value **Ranger**. No personal save, connected-account browser session, real player's progress, or unrelated browser tabs were used. The reviewed JPEGs contain no EXIF entries. The capture manifest records the public game address, image hashes, viewport sizes, and capture method, not cookies or saved gameplay data.

Mobile images use browser emulation, not a person's phone or a private device screenshot. The capture step has no GitHub write token in its environment; the separate commit step stages only the gallery directory and uses the repository's temporary Actions token.

## Player saves

The standalone game uses browser-local saves. Exported save JSON can include player-chosen names and progress. Keep it private and use a fabricated test adventure for a public bug report.

## Review limits

Automated scans reduce risk but cannot certify complete anonymity or inspect every visual or audible detail. Public profile information, prior commits, external links, future contributions, and downloaded dependencies have separate privacy implications.
