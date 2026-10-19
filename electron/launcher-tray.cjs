function createLauncherTray({
  app,
  Tray,
  Menu,
  icon,
  window,
  onOpenConsole = () => {},
  beforeQuit = async () => {},
  onError = () => {},
}) {
  const tray = new Tray(icon);
  let quitting = false;
  let pendingQuit = null;
  function show() {
    if (window.isDestroyed()) return;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  }
  function close(event) {
    if (quitting || tray.isDestroyed()) return;
    event.preventDefault();
    window.hide();
  }
  function quit(event) {
    if (quitting) return;
    event.preventDefault();
    if (pendingQuit) return;
    pendingQuit = Promise.resolve()
      .then(beforeQuit)
      .then(() => {
        quitting = true;
        app.quit();
      })
      .catch((error) => {
        show();
        onError(error);
      })
      .finally(() => {
        pendingQuit = null;
      });
  }
  function dispose() {
    window.removeListener('close', close);
    app.removeListener('before-quit', quit);
    app.removeListener('activate', show);
    if (!tray.isDestroyed()) tray.destroy();
  }
  tray.setToolTip('Patilanci Launcher');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Patilanci Launcher', click: show },
      { label: 'Open game console', click: onOpenConsole },
      { type: 'separator' },
      { label: 'Quit Patilanci Launcher', click: () => app.quit() },
    ]),
  );
  tray.on('click', show);
  tray.on('double-click', show);
  window.on('close', close);
  app.on('activate', show);
  app.on('before-quit', quit);
  app.once('will-quit', dispose);
  return { show, getTray: () => tray };
}
module.exports = { createLauncherTray };
