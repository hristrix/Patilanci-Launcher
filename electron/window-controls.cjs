function windowState(window) {
  return {
    maximized: Boolean(window && !window.isDestroyed() && window.isMaximized()),
  };
}

function windowAction(window, sender, action) {
  if (!window || window.isDestroyed() || sender !== window.webContents) {
    throw new Error(
      'Window controls are only available to the launcher window.',
    );
  }
  if (!['minimize', 'toggleMaximize', 'close'].includes(action)) {
    throw new Error('Invalid window action.');
  }
  if (action === 'minimize') window.minimize();
  if (action === 'toggleMaximize') {
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
  }
  if (action === 'close') window.close();
  return windowState(window);
}

function observeWindowState(window) {
  const send = () => {
    if (!window.isDestroyed())
      window.webContents.send('windowState', windowState(window));
  };
  window.on('maximize', send);
  window.on('unmaximize', send);
}

module.exports = { windowState, windowAction, observeWindowState };
