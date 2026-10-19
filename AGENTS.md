# Versioning

Apply semantic versioning to launcher changes using `MAJOR.MINOR.PATCH`.

- Bug fixes, hotfixes, and small compatible improvements: patch (`1.0.0` -> `1.0.1`).
- New features and compatible additions: minor (`1.0.1` -> `1.1.0`).
- Breaking changes, incompatible saved data, or required migration: major (`1.1.0` -> `2.0.0`).
- Documentation-only, formatting-only, and test-only changes do not need a version bump.

For each completed batch of launcher changes, choose the highest applicable level and bump once. Do not bump for each edited file or intermediate correction in the same batch. Keep `package.json`, the root version in `package-lock.json`, and `packages[""].version` synchronized using the npm version commands documented in README.md. Do not manually change dependency versions as part of a launcher version bump.

Add a matching entry to CHANGELOG.md describing the player-visible changes. Report the version and validation results when handing off the work. Launcher versions are independent of Minecraft and modpack versions.

Packaging uses the package version. Published stable GitHub Releases use tag `v<version>` and must contain the matching installer and updater metadata. Do not publish, push, or tag merely because a version was bumped; do so when requested.

# Build reliability

- Keep `package-lock.json` tracked. Use npm 10.9.4 when changing dependencies or regenerating the lockfile; do not regenerate it from an existing `node_modules` tree.
- Run `npm run validate` before handing off launcher or packaging changes. It checks release metadata and the lockfile, then runs unit tests, the renderer build, and desktop/console checks.
- For installer or build-workflow changes, also build an installer and verify the output. Production builds use `npm run dist` followed by `npm run check:installer`; preview packaging uses `npm run dist:preview`.
- Keep CI and production releases on the shared `.github/actions/setup-launcher` toolchain. Changes to workflows must pass actionlint or equivalent GitHub Actions validation.
- Report the checks actually run and any failure. Do not claim a GitHub-hosted run passed based only on local checks.
