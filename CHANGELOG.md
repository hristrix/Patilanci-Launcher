# Changelog

## 1.4.0 - 2026-10-19

### Changed

- Minecraft preparation and launch now run in a background worker, keeping the launcher and game console responsive.
- Closing the game console stops Minecraft or cancels a pending launch. A failed stop keeps the console open for retry.
- Closing Minecraft leaves the game console open with the final logs.

## 1.3.4 - 2026-10-19

### Fixed

- Made the signed-in account card compact with consistent spacing, balanced padding, and a full-width sign-out button instead of stretching it to the home banner's height.

## 1.3.3 - 2026-10-19

### Fixed

- Restricted Inspect Element and developer-tool shortcuts to unpackaged development runs. Packaged launcher and game console windows have developer tools disabled.

## 1.3.2 - 2026-10-19

### Added

- Enabled right-click Inspect Element and F12 / Ctrl+Shift+I developer tools in the launcher and game console windows.

## 1.3.1 - 2026-10-19

### Fixed

- Minecraft now launches without an extra Windows terminal; game output is captured by the Patilanci console window instead.

## 1.3.0 - 2026-10-19

### Added

- Play opens a separate Patilanci-styled Minecraft console with live output, timestamps, search, warning/error filters, copy, clear, and optional autoscroll.
- Reopen the console from the launcher title bar. Closing it keeps Minecraft running and retains the latest 2,000 log lines until the next launch or Clear.

## 1.2.2 - 2026-10-19

### Fixed

- Signed-out accounts now show the bundled Steve skin instead of the gray placeholder character.
- The sidebar greeting shows the signed-in player's skin head, including its overlay, with Steve as the signed-out or unavailable-skin fallback.

## 1.2.1 - 2026-10-19

### Maintenance

- Removed the duplicate Cloudflare Pages service source; the download service is maintained in the separate Landing Page repository. Launcher downloads continue to use `https://patilanci.net/launcher`.

## 1.2.0 - 2026-10-19

### Changed

- The launcher requests one release from the download service, which returns only the newest client modpack, including newer beta or alpha releases and excluding server packs.
- Fixed Cloudflare API requests using an unsupported redirect mode and added safe upstream failure diagnostics.

## 1.1.1 - 2026-10-19

### Fixed

- Fixed Cloudflare Pages configuration validation for the Patilanci download service by setting the existing `patilancinetwork` project name.

## 1.1.0 - 2026-10-18

### Added

- Cloudflare Pages download-service integration for the Patilanci website, with streamed mod downloads, bounded manifest extraction, and server-only CurseForge credentials.
- Configured the launcher to use `https://patilanci.net/launcher` after that service is deployed.

## 1.0.4 - 2026-10-18

### Maintenance

- Added Fablento LTD creator credit and copyright to the launcher footer, installer and uninstaller welcome/finish pages, and Windows executable metadata.

## 1.0.3 - 2026-10-18

### Fixed

- Uninstaller welcome and completion pages now say "We will miss you" and use removal-specific text while keeping player data for a future reinstall.
- Production installer builds now verify trusted, timestamped signatures and matching publishers on the launcher and setup executable before reporting success or publishing.

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
