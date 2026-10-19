# Changelog

## 1.9.7 - 2026-10-19

### Fixed

- Java paths managed by Patilanci are now disabled. Browse selects a custom executable and enables its field; Reset returns the row to disabled automatic management.

## 1.9.6 - 2026-10-19

### Improved

- Pull requests and branch pushes now validate the launcher and build a downloadable test installer. Production releases use the same pinned build tools and validation checks.
- Production installers and updater metadata are checked for matching versions, filenames, sizes, and SHA-512 before publication. Build artifacts and failure diagnostics are retained in GitHub Actions.
- Added `npm run validate` to run release checks, tests, the renderer build, and desktop/console checks before pushing.

## 1.9.5 - 2026-10-19

### Fixed

- Fixed installer builds failing with npm's “Invalid Version” error by regenerating malformed optional dependency entries without changing existing pinned dependency versions.
- GitHub builds now use npm 10.9.4 and validate dependency versions before installing, with a clear error if a malformed lockfile is committed.

## 1.9.4 - 2026-10-19

### Fixed

- Restored the npm dependency lockfile to version control so GitHub Actions can cache and install the launcher dependencies when building installers.

## 1.9.3 - 2026-10-19

### Improved

- Refresh status now shows a spinning icon and “Refreshing…” while checking. The server badge shows “Checking server,” and both status and player-list refresh buttons stay disabled until the request finishes. Repeated refresh requests share the same check.

## 1.9.2 - 2026-10-19

### Changed

- Disabled text selection across the launcher interface. Text fields remain editable and game console output remains selectable for copying logs.

## 1.9.1 - 2026-10-19

### Changed

- Updated the launcher company metadata, installer legal notice, and copyright to MADEARC LTD.

## 1.9.0 - 2026-10-19

### Added

- Home and Modpack show Minecraft's installed size, including mods, maps, and saves. Modpack also shows managed Java usage and offers a size refresh. Size calculations run asynchronously and are cached.

### Improved

- Faster repeat launches avoid redundant mod-JAR scans and reuse successful asset and library checksums when file identity, size, timestamps, and expected hashes are unchanged. Changed files are verified again.
- Java preparation overlaps the fresh latest-release check; either failing still blocks launch. The game console reports launcher preparation time.
- Pack updates reuse downloaded assets and libraries without replacing files supplied by the new pack, reducing repeated downloads. Player maps and settings retain their preservation rules.

## 1.8.2 - 2026-10-19

### Fixed

- Modpack updates now retain existing player files and folders beyond the previous fixed list, including newer Xaero map locations and other mod settings stored outside `config`.
- Existing player files take precedence over pack defaults, while new files from the pack are added. Launcher-managed mods, game files, caches, and installation metadata still update normally.

## 1.8.0 - 2026-10-19

### Added

- Closing the launcher window on Windows now keeps it running in the system tray, leaving Minecraft and its game console active.
- Click the Patilanci tray icon to reopen the launcher, or right-click it to open the launcher, open the game console, or quit completely. Explicit Quit stops Minecraft and cancels Java preparation before exiting.

## 1.7.0 - 2026-10-19

### Added

- The launcher detects the modpack's required Java version and automatically downloads and reuses a matching runtime. Java preparation runs in the background with download progress in the game console.
- Settings now includes separate Java 8, 17, 21, and 25 executable paths with Browse and Reset to automatic controls. Custom executables are checked before launching, with a clear message when the version does not match.
- Existing custom Java paths are retained in the matching version row. Managed Java installs need no administrator access or changes to the system Java installation.

## 1.6.0 - 2026-10-19

### Added

- Production installers and GitHub Releases can now be built without a code-signing certificate. Signing remains optional when explicitly configured.
- Unsigned production builds retain automatic updates and the public download service; preview builds remain separate.

## 1.5.0 - 2026-10-19

### Added

- Discord Rich Presence shows launcher, Minecraft preparation, and playing Patilanci SMP activity with elapsed time.
- Activity reconnects automatically when Discord opens or restarts, clears when the launcher quits, and never blocks launching if Discord is unavailable.

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
