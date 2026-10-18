# Changelog

## 1.0.2 - 2026-10-18

### Maintenance

- Pushes to master now build and test the signed Windows installer and publish it with updater metadata to a versioned GitHub Release.
- Validate release versions and notes before building, protect published releases from being overwritten, and allow failed draft uploads to resume for the same commit.

## 1.0.1 - 2026-10-18

### Fixed

- Offline PIN confirmation now signs in and saves the session without starting Minecraft. Launch becomes available after successful sign-in, and the session persists across launcher restarts until sign-out.

### Maintenance

- Documented patch, minor, and major version rules and added version bump commands for future changes.

## 1.0.0 - 2026-10-18

- Initial source baseline with Microsoft and offline sessions, static skin previews, Patilanci home screen, installer wizard, startup splash, and launcher/modpack update checks.
- Preserve player settings, worlds, shaders, and personal mods during modpack updates.
- Track the running Minecraft process and offer Stop Minecraft while it is running.
