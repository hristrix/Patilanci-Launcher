; The visible WPF window is extracted separately from the app. It survives
; removing the launcher and delegates real work back to this NSIS engine.
Var setupState
Var setupWait
Var setupOption

!macro launchPatilanciSetup ACTION
  GetTempFileName $setupState
  Delete "$setupState"
  CreateDirectory "$setupState"
  SetOutPath "$setupState"
  File /r "${BUILD_RESOURCES_DIR}\..\..\artifacts\setup-ui\*.*"
  WriteINIStr "$setupState\bootstrap.ini" "setup" "action" "${ACTION}"
  WriteINIStr "$setupState\bootstrap.ini" "setup" "version" "${VERSION}"
  WriteINIStr "$setupState\bootstrap.ini" "setup" "directory" "$INSTDIR"
  WriteINIStr "$setupState\bootstrap.ini" "setup" "mode" "$installMode"
  System::Call 'kernel32::GetCurrentProcessId() i.r0'
  WriteINIStr "$setupState\bootstrap.ini" "setup" "parent" "$0"
  !if "${ACTION}" == "uninstall"
    ; Run the removal engine from outside INSTDIR, without NSIS forking a
    ; detached copy whose exit cannot be observed by the visible frontend.
    CopyFiles /SILENT "$EXEPATH" "$setupState\BackendUninstall.exe"
    WriteINIStr "$setupState\bootstrap.ini" "setup" "backend" "$setupState\BackendUninstall.exe"
  !else
    WriteINIStr "$setupState\bootstrap.ini" "setup" "backend" "$EXEPATH"
  !endif
  ClearErrors
  Exec '"$setupState\PatilanciSetup.exe" "$setupState"'
  ${if} ${Errors}
    MessageBox MB_OK|MB_ICONSTOP "Patilanci Setup could not start. Please run the installer again."
    Abort
  ${endif}
  StrCpy $setupWait 0
  ${do}
    ${if} ${FileExists} "$setupState\ready"
      ${exitdo}
    ${endif}
    IntOp $setupWait $setupWait + 1
    ${if} $setupWait > 150
      MessageBox MB_OK|MB_ICONSTOP "Patilanci Setup could not load. Please check Windows .NET Framework 4.8 and try again."
      Abort
    ${endif}
    Sleep 100
  ${loop}
  SetOutPath "$TEMP"
  ; Release the engine's single-instance mutex before the UI starts its /S
  ; child. The frontend checks this process has exited before allowing work.
  SetErrorLevel 0
  Quit
!macroend

!macro customUnInit
  ${StdUtils.GetParameter} $setupState "patilanci-state" ""
  ${StdUtils.GetParameter} $setupOption "patilanci-action" ""
  ${if} $setupOption != "uninstall"
    ; An old-version removal during installation must not publish completion
    ; into the new installer's progress file.
    StrCpy $setupState ""
  ${endif}
  ${ifNot} ${Silent}
    !insertmacro launchPatilanciSetup "uninstall"
  ${endif}
!macroend

!macro customFiles_x64
  ${if} $setupState != ""
    WriteINIStr "$setupState\progress.ini" "progress" "percent" "85"
    WriteINIStr "$setupState\progress.ini" "progress" "detail" "Създаване на преки пътища…"
  ${endif}
!macroend

!macro customUnInstallSection
  Section "un.PatilanciComplete"
    ${if} $setupState != ""
      ${if} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
        Abort "The launcher could not be removed. Close it and try again."
      ${endif}
      WriteINIStr "$setupState\progress.ini" "progress" "percent" "100"
      WriteINIStr "$setupState\progress.ini" "progress" "complete" "1"
    ${endif}
  SectionEnd
!macroend
