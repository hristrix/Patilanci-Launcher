# Changelog

## 2.0.2 - 2026-10-26

### Improved

- Началната страница е изцяло статична: пейзажът, панелите и бутоните са без анимации и преходи. Премахнат е бутонът за спиране на движението.

## 2.0.1 - 2026-10-26

### Fixed

- Restored release validation for the current Bulgarian interface so new Windows installers and automatic-update files can be published together.
- Added manual release retries on master and saved validation logs with failure diagnostics.

## 2.0.0 - 2026-10-26

### Improved

- Версията на приложението е 2.0.0. Новият облик, екранът за подготовка и разделите на пакета са включени в тази версия; запазените настройки и данни за играта остават съвместими.

### Fixed

- Иконите на приложението, прозореца с логовете, инсталацията и премахването използват новото прозрачно лого „P“ вместо старото SMP изображение.
- След обновяване Windows получава известие да опресни иконите на приложението и запазените преки пътища.

## 1.17.0 - 2026-10-26

### Improved

- Екранът за подготовка следва новия облик с панорамното село, голямо лого, последователни проверки на приложението, акаунта и Patilanci Adventures и червена лента за напредъка.
- При изтегляне се показват действителният брой готови файлове, прехвърлените данни и скоростта, когато са налични. Без избран акаунт подготовката продължава, а входът остава достъпен след стартиране.

### Added

- Бутонът „Виж лога“ отваря текущите съобщения за подготовката, без да прекъсва проверките и изтеглянията.

## 1.16.1 - 2026-10-26

### Fixed

- Разделите „Общ преглед“, „Включени добавки“ и „Активност на приложението“ вече показват собствено съдържание в страницата на пакета, без да отварят „Моите добавки“.
- Включените добавки могат да се разглеждат и търсят в пакета, а активността показва текущите съобщения на приложението. Разделите поддържат и навигация с клавиатура.

## 1.16.0 - 2026-10-26

### Improved

- Преведени са екраните, бутоните, подсказките, настройките, изборът на външен вид, подготовката на играта, обновяванията и прозорците за избор на файлове на ясен български език.
- Съобщенията за грешки и напредък вече дават разбираеми указания на български. Имената на играчите, файловете, добавките и оригиналните съобщения от Minecraft се запазват.
- Общността, управлението на профила, изборът на външен вид и екраните за подготовка и обновяване използват тъмните повърхности, светлите заглавия и червените акценти на новия облик.
- Инсталацията, премахването и прозорецът за обновяване са на български. Изображенията на инсталацията следват новия облик.

## 1.15.1 - 2026-10-26

### Fixed

- Signed-out Home now fills the entire content area with the village wallpaper, with the login panel floating over the scene on the right.

## 1.15.0 - 2026-10-26

### Added

- Settings now include saved game-window dimensions, fullscreen, restore defaults, and an option to hide the launcher after Minecraft starts and show it again when the game exits.
- The notification bell opens current launcher and modpack notices.

### Improved

- Matched the supplied screens more closely across the dashboard, sign-in, modpack, Settings, and console: spacing, sidebar, bottom launch bar, installation facts, local-profile card, and console actions.
- Settings show a compact Java selector for all four supported versions and a memory dropdown with a matching slider; memory warnings remain visible when needed.
- Home shows the actual last update-check time and game folder, and console lines show 24-hour timestamps and severity levels.

## 1.14.0 - 2026-10-26

### Added

- Personal mods can now be enabled or disabled with the status switches. Disabled mods remain installed, stay disabled after restart and modpack updates, and can still be removed from the row menu.
- Mod rows show descriptions and PNG icons from local Fabric metadata when available, with source and status columns, All/Active/Disabled filters, and per-mod menus for filenames, versions, and removal.

### Improved

- Rebuilt My Mods to follow the supplied mod-management reference: Add mod beside the page heading, a compact search and filter toolbar, a four-column table, and a single information strip below the list.
- My Mods opens personal additions by default. Included pack mods remain accessible from Modpack and the link below the table, with backend protection against removal or disabling.

## 1.13.1 - 2026-10-26

### Fixed

- Mod and console search fields now have a single border, aligned text and search icons, and a focus outline around the whole control.
- Clicking the mod search icon focuses its input.

## 1.13.0 - 2026-10-26

### Added

- Play and Stop Minecraft are available from a persistent bottom bar on every page, with shortcuts to memory settings and the modpack.
- A Console tab shows the same live, redacted game logs as the separate Minecraft console, with search, filters, copy, clear, autoscroll, and log export.
- Settings now group game preferences, launcher updates, and account management into tabs.

### Improved

- Rebuilt the launcher around the supplied UI references: a compact sidebar, Bulgarian navigation, dark panels, cream headings, and red actions.
- Home and Modpack use the supplied Bulgarian mountain village panorama, with optional subtle motion that respects reduced-motion preferences.
- Sign-in shows Microsoft and local profile entry together. Local PIN protection, remembered sessions, skin settings, protected pack mods, storage information, Java overrides, and automatic updates remain available.

## 1.12.7 - 2026-10-25

### Fixed

- Offline skin settings now offer **Save for launcher**, remembering the selected Ely.by name, Minecraft name, or public PNG URL and model for each signed-in profile.
- Saved skins refresh both the Home character and sidebar head immediately and remain available after restart, including without a skin-service connection.
- Reopening skin settings restores the saved source. **Reset launcher skin** returns to the player-name lookup; server skins still require the copied command in Minecraft.

## 1.12.6 - 2026-10-25

### Improved

- Launcher and installer attribution now credit Hristrix, including the Windows executable copyright metadata.
- The footer's **Made by Hristrix** credit opens hristrix.com in your default browser. Installer finish pages also provide a website link.

## 1.12.5 - 2026-10-25

### Improved

- Update notification banners, including the successful-update confirmation, now disappear automatically after seven seconds. Update actions remain available in Settings and Modpack.

## 1.12.4 - 2026-10-25

### Improved

- **Restart and update** now shows a dedicated restart screen before closing. A compact update status window stays visible while the launcher files are replaced, without reopening the setup wizard.
- After reopening, the startup splash acknowledges the update and Home confirms the running version.
- Repeated update clicks share one restart attempt. If preparation fails, the launcher returns to the downloaded update so you can retry.

## 1.12.3 - 2026-10-25

### Improved

- Home now has one larger hero combining the animated landscape, Play controls, and player sign-in area over a shared background.
- The hero expands on larger windows and keeps account and PIN controls together at compact sizes. Short windows hide the dashboard caption along with its cards.

## 1.12.2 - 2026-10-25

### Fixed

- **Restart and update** now applies downloaded launcher updates silently and reopens the launcher automatically, without taking players through setup again.
- The installer also skips setup pages when an older launcher starts it as an update. Manual first-time installations keep the normal setup flow.

## 1.12.1 - 2026-10-25

### Maintenance

- Reorganized the launcher interface into focused components and hooks for accounts, launch feedback, Home, settings, and shared layout. This is an internal readability improvement; player-facing layout and behavior are preserved.

## 1.12.0 - 2026-10-25

### Added

- Home's voxel landscape now has drifting clouds, chimney smoke, warm house lighting, and fireflies. Pause the scenery with its corner control; reduced-motion preferences disable ambient animation, and movement pauses while the launcher is hidden.
- Launch feedback now follows Preparing, Starting, and Running, with measured or indeterminate progress during preparation. Completed progress bars disappear once ready or running.

### Improved

- The player card has a softly lit character stage and more balanced spacing.
- Home uses one connection-status indicator and two dashboard cards for community activity and pack/setup details, with direct shortcuts to the modpack, mods, and settings.
- Dashboard cards and links respond more smoothly to hover and keyboard focus while compact layouts keep launch and account controls visible.

## 1.11.0 - 2026-10-25

### Added

- Signed-in players can open Set skin from the shirt button beside their player name.
- Premium accounts can preview a PNG, choose Classic or Slim, and upload it to their Minecraft Java account without exposing account tokens.
- Offline and premium players can prepare and copy Mojang, Ely.by, and PNG URL commands for Lionarius's SkinRestorer server mod, with an Ely.by upload shortcut and reset command. Run the copied command in Minecraft chat to apply the server skin.

## 1.10.1 - 2026-10-20

### Fixed

- Closing the launcher now exits completely instead of hiding in the Windows system tray. Minecraft is stopped and pending Java preparation is cancelled before shutdown.
- Removed the system tray icon and tray update notifications; update notices remain available inside the launcher.

## 1.10.0 - 2026-10-19

### Added

- Background checks every minute and on window focus notify you about new launcher and modpack releases, including while Minecraft is running or the launcher is in the Windows tray.
- Compact in-app notices show launcher download progress, restart and modpack update actions. Windows tray notifications announce new releases once per session while the launcher is hidden; clicking restores it.
- Update actions wait until Minecraft closes. Dismissed notices stay hidden for that release during the session, with update actions still available in Settings and Modpack.

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

- Updated the launcher company metadata, installer legal notice, and copyright.

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
