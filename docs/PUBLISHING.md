# Publish the complete repository and release

The supplied package is staged locally; it is not evidence that a GitHub repository already exists. This publisher creates **itsryanlenk/wildbound-aster** with a clean initial commit, uploads the release downloads, and attempts to enable Pages and private vulnerability reporting.

## Prerequisites

Install Node.js 22+, Git, and the official GitHub CLI (`gh`). On your own computer, sign in securely:

```sh
gh auth login --hostname github.com --web --scopes workflow
```

Use the `itsryanlenk` account. Do not paste tokens, passwords or authentication codes into chat. The script refuses to publish through a different account. Repository creation, code/workflow push, release upload and Pages configuration require the corresponding GitHub permissions.

## Publish

Extract the complete starter ZIP, open a terminal in its `wildbound-aster` folder, then run:

```sh
node scripts/publish.mjs --publish
```

The two ZIP release assets are assembled automatically from the included game and trailer directories. The original finished MP4, MP3, poster, and expected hashes are included; no download is needed to assemble them. This avoids duplicating large assets in the starter ZIP.

Without `--publish`, the same script performs a local preflight and shows the intended operation without creating anything. It does not run `npm install`, clone private repos, copy your global Git history, or publish your `_release/` staging directory as repository files.

The clean commit uses the GitHub **no-reply** email derived from the authenticated account's public ID/login, not its personal contact email. The original private working history is not copied. Only manifest-listed source/distribution files are staged. Only the release-manifest-listed files are attached to the release.

The script refuses an existing target repository unless resuming its own recorded operation. It never force-pushes or deletes an existing repository or release. If a run stops after creating the repo, address the reported error and run `node scripts/publish.mjs --publish --resume` from the same unchanged folder. The local state file contains only public repository metadata and the clean commit ID, not credentials.

## What is filled in

Repository description, branded homepage, topics, MIT file, README, documentation, contribution and security policy, issue/PR templates, verification workflow, Pages workflow, clean initial commit, a version tag, release notes, game ZIP, trailer MP4, score MP3, poster, editable trailer ZIP and checksum file.

After upload, the publisher verifies public visibility, release attachment names/sizes and server-side digests when available. It prints the actual returned repository/release URLs and writes a local receipt. Pages is reported separately: a workflow request is not the same as a completed deployment. Check Actions for its final result.

The existing branded hosted game remains a separate deployment. No user profile settings, previous repositories, or old game hosting settings are changed.
