!include "${BUILD_RESOURCES_DIR}\..\setup\bridge.nsh"

!macro customInit
  ${StdUtils.GetParameter} $setupState "patilanci-state" ""
  ; Older launchers send --updated without /S. Keep those upgrades silent too.
  ; Silent installation and updater command lines never open the custom UI.
  ${if} ${isUpdated}
    SetSilent silent
    Banner::show /NOUNLOAD /set 76 "Applying launcher update..." /set 1030 "Please wait. Patilanci will reopen automatically." "Patilanci Launcher - Updating"
  ${elseIfNot} ${Silent}
    !insertmacro launchPatilanciSetup "install"
  ${endif}
!macroend

!macro customInstall
  ${if} $setupState != ""
    ; A manual setup explicitly applies both shortcut choices. Automatic
    ; updates retain the existing electron-builder shortcut behavior.
    ReadINIStr $setupOption "$setupState\options.ini" "setup" "desktop"
    ${if} $setupOption == "1"
      CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0
      WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
    ${else}
      Delete "$newDesktopLink"
    ${endif}
    ReadINIStr $setupOption "$setupState\options.ini" "setup" "startMenu"
    ${if} $setupOption == "1"
      !insertmacro createMenuDirectory
      CreateShortCut "$newStartMenuLink" "$appExe" "" "$appExe" 0
      WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
    ${else}
      Delete "$newStartMenuLink"
    ${endif}
  ${endif}
  ; Updates preserve existing shortcuts. Notify Explorer that their executable
  ; and icon changed even when those shortcut files were kept in place.
  ; SHCNE_UPDATEITEM with SHCNF_PATHW | SHCNF_FLUSH.
  System::Call 'shell32::SHChangeNotify(i 0x00002000, i 0x00001005, w "$appExe", p 0)'
  ${if} ${FileExists} "$newStartMenuLink"
    System::Call 'shell32::SHChangeNotify(i 0x00002000, i 0x00001005, w "$newStartMenuLink", p 0)'
  ${endif}
  ${if} ${FileExists} "$newDesktopLink"
    System::Call 'shell32::SHChangeNotify(i 0x00002000, i 0x00001005, w "$newDesktopLink", p 0)'
  ${endif}
  ; Invalidate cached shell icons without restarting Explorer or changing pins.
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0x00001000, p 0, p 0)'
  ${if} ${isUpdated}
    Banner::destroy
  ${endif}
  ${if} $setupState != ""
    WriteINIStr "$setupState\progress.ini" "progress" "percent" "100"
    WriteINIStr "$setupState\progress.ini" "progress" "complete" "1"
  ${endif}
!macroend

!define MUI_BGCOLOR "0B0B0D"
!define MUI_TEXTCOLOR "F4E7CF"
!define MUI_HEADER_TRANSPARENT_TEXT
!define MUI_WELCOMEFINISHPAGE_BITMAP_STRETCH AspectFitHeight
!define MUI_UNWELCOMEFINISHPAGE_BITMAP_STRETCH AspectFitHeight
!define MUI_HEADERIMAGE_BITMAP_STRETCH AspectFitHeight
!define MUI_INSTFILESPAGE_COLORS "F4E7CF 171719"
!define PATILANCI_LEGAL_NOTICE "Made by Hristrix.$\r$\nCopyright © 2026 Hristrix. All rights reserved."
!define MUI_FINISHPAGE_LINK "Made by Hristrix - hristrix.com"
!define MUI_FINISHPAGE_LINK_LOCATION "https://hristrix.com"
!define MUI_FINISHPAGE_LINK_COLOR "F2B632"
!define MUI_FINISHPAGE_TITLE "You're ready for Patilanci."
!define MUI_FINISHPAGE_TEXT "Patilanci Launcher is installed.$\r$\n$\r$\nOpen the launcher to sign in and download the latest modpack. Internet access and Java 21 are required to play.$\r$\n$\r$\nPack updates keep your Minecraft settings, worlds, shaders, and personal mods.$\r$\n$\r$\n${PATILANCI_LEGAL_NOTICE}"
!define MUI_UNFINISHPAGE_TITLE "We will miss you."
!define MUI_UNFINISHPAGE_TEXT "Patilanci Launcher has been removed.$\r$\n$\r$\nThank you for being part of Patilanci. Your next adventure will be waiting whenever you return.$\r$\n$\r$\nYour saved sessions, profiles, worlds, mods, shaders, and Minecraft settings are kept for a future reinstall.$\r$\n$\r$\n${PATILANCI_LEGAL_NOTICE}"

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Your next adventure starts here."
  !define MUI_WELCOMEPAGE_TEXT "Welcome to Patilanci Launcher.$\r$\n$\r$\nJoin Patilanci with a Microsoft account or an offline profile. Your sessions and Minecraft settings are remembered.$\r$\n$\r$\nSetup installs the launcher. Minecraft and the modpack download in the app. Internet access and Java 21 are required.$\r$\n$\r$\n${PATILANCI_LEGAL_NOTICE}"
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customUnWelcomePage
  !define MUI_UNWELCOMEPAGE_TITLE "We will miss you."
  !define MUI_UNWELCOMEPAGE_TEXT "Thank you for being part of Patilanci.$\r$\n$\r$\nThis wizard removes Patilanci Launcher. Your settings, saved sessions, profiles, worlds, mods, and shaders are kept for a future reinstall.$\r$\n$\r$\nClose the launcher, then choose Next to continue.$\r$\n$\r$\n${PATILANCI_LEGAL_NOTICE}"
  !insertmacro MUI_UNPAGE_WELCOME
!macroend
