# Licensing and attribution

The original Wildbound project code and documentation are licensed under the root **MIT License**, copyright © 2026 Ryan Lenk. This permission also covers the project-original generated artwork and locally synthesized audio included here, to the extent the owner holds rights in that material. No exclusive rights in AI-generated output or clearance against all third-party similarities are asserted.

Third-party libraries embedded in `game/assets/` are **not relicensed** by the root MIT file. They retain their own terms. React, Motion, PixiJS, Radix UI and other supporting libraries are represented in `licenses/`; Lucide/Feather and Earcut have their own retained notices. Preserve this document and that directory when redistributing the compiled game.

**Remotion is not MIT-licensed.** Its player is present in the prebuilt game, and the optional trailer composition uses Remotion 4.0.531. See `licenses/remotion.md` and https://www.remotion.dev/docs/license before using the dependency commercially or in a product. The root MIT license does not remove those restrictions. The native Canvas/FFmpeg trailer path does not use Remotion for its final render.

## Scope and provenance limitations

This is a recovered distribution repository, not the original game-source checkout. The original package lock and unbundled game source were not included in the recovered files. React 19.2.6 and Remotion 4.0.531 are identifiable in the bundle; versions for every transitive dependency cannot be established from it. Upstream notices were gathered for identifiable libraries and likely supporting runtime dependencies. This is not a certified, complete software bill of materials. Recover the original dependency lock and generate an exact license report before claiming one.

The trailer source has a dependency manifest of its own. Downloaded npm/Python packages keep their own licenses, whether or not mentioned above. Install dependencies through their official registries; no `node_modules` or third-party executables are shipped. FFmpeg is an external tool, not part of this repository.

No font binaries are distributed. Re-rendering uses system fonts by default; optional font paths can be supplied locally. Original rendered pixels are retained in the finished media.

Wildbound is an independent creature-collecting adventure and is not affiliated with Nintendo, Game Freak, or The Pokémon Company. No ownership of those names is claimed.
