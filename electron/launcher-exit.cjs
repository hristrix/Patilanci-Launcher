function configureLauncherExit({
  app,
  window,
  beforeQuit = async () => {},
  onError = () => {},
}) {
  let quitting = false;
  let pendingQuit = null;
  function close(event) {
    if (quitting) return;
    event.preventDefault();
    app.quit();
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
        if (!window.isDestroyed()) {
          if (window.isMinimized()) window.restore();
          window.show();
          window.focus();
        }
        onError(error);
      })
      .finally(() => {
        pendingQuit = null;
      });
  }
  window.on('close', close);
  app.on('before-quit', quit);
  app.once('will-quit', () => {
    window.removeListener('close', close);
    app.removeListener('before-quit', quit);
  });
}

module.exports = { configureLauncherExit };
