# Saves and offline play

The game stores progress in the current browser profile for the current website origin. It does not upload a shared adventure to a backend. A public game site does not mean a public save.

Export in Settings before clearing browser data, moving to another device, or changing a host address. Import on the destination site. A different hostname, port or protocol is a different browser origin. Incognito/private sessions and storage cleanup can remove saves.

A player name is stored inside the adventure. Do not put a real address, password, email or other private information into it. Save JSON is not encrypted. Do not attach it to a public GitHub issue.

Interrupted encounters use the game's existing checkpoint behavior; do not assume an active battle resumes at the exact animation frame.

On HTTPS or localhost, Settings can download the runtime assets for offline play. Wait for the completion message while online. Close old game tabs to allow an offline update to activate safely. Offline assets and adventure data are separate browser stores, and either can be removed by the browser or user.

The publishing scripts never read or upload your browser save. Test profiles used during recovery are temporary and are excluded from the repository.
