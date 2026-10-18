; Patilanci's artwork uses the same palette as the launcher.
; Keep the wizard's system controls for keyboard access and Windows scaling.
!define MUI_BGCOLOR "0B0B0D"
!define MUI_TEXTCOLOR "F4E7CF"
!define MUI_HEADER_TRANSPARENT_TEXT
!define MUI_WELCOMEFINISHPAGE_BITMAP_STRETCH AspectFitHeight
!define MUI_UNWELCOMEFINISHPAGE_BITMAP_STRETCH AspectFitHeight
!define MUI_HEADERIMAGE_BITMAP_STRETCH AspectFitHeight
!define MUI_INSTFILESPAGE_COLORS "F4E7CF 171719"
!define MUI_FINISHPAGE_TITLE "You're ready for Patilanci."
!define MUI_FINISHPAGE_TEXT "Patilanci Launcher is installed.$\r$\n$\r$\nOpen the launcher to sign in and download the latest modpack. Internet access and Java 21 are required to play.$\r$\n$\r$\nYour sessions are remembered on this computer. Pack updates keep your Minecraft settings, worlds, shaders, and personal mods."

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Your next adventure starts here."
  !define MUI_WELCOMEPAGE_TEXT "Welcome to Patilanci Launcher.$\r$\n$\r$\nJoin the Patilanci server with a Microsoft account or an offline profile. Your sessions and Minecraft settings stay with you between launches and pack updates.$\r$\n$\r$\nSetup installs the launcher. Minecraft and modpack files download separately in the app. Internet access and Java 21 are required.$\r$\n$\r$\nChoose Next to get started."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customUnWelcomePage
  !define MUI_UNWELCOMEPAGE_TEXT "This removes Patilanci Launcher.$\r$\n$\r$\nYour launcher settings, saved sessions, profiles, worlds, personal mods, shaders, and Minecraft settings are kept in your user data folder for a future reinstall.$\r$\n$\r$\nClose the launcher before continuing."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend
