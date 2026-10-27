const path = require('node:path');
const { app } = require('electron');
const {
  windowState,
  windowAction,
  observeWindowState,
} = require('./window-controls.cjs');
const { lockWindowZoom } = require('./window-zoom.cjs');
const { enableInspectElement } = require('./inspect-element.cjs');

function createConsoleWindow({
  BrowserWindow,
  ipcMain,
  log,
  getLauncherWindow = () => null,
  onClose = async () => {},
}) {
  let window;
  function requireConsole(event) {
    if (!window || window.isDestroyed() || event.sender !== window.webContents)
      throw new Error('Console window required.');
  }
  function requireLogReader(event) {
    const launcher = getLauncherWindow();
    if (
      launcher &&
      !launcher.isDestroyed() &&
      event.sender === launcher.webContents
    )
      return;
    requireConsole(event);
  }
  ipcMain.handle('consoleSnapshot', (event, after) => {
    requireLogReader(event);
    if (after !== undefined && (!Number.isSafeInteger(after) || after < 0))
      throw new Error('Invalid console cursor.');
    return log.snapshot(after);
  });
  ipcMain.handle('clearConsole', (event) => {
    requireLogReader(event);
    log.clear();
  });
  ipcMain.handle('consoleWindowState', (event) => {
    requireConsole(event);
    return windowState(window);
  });
  ipcMain.handle('consoleWindowAction', (event, action) => {
    requireConsole(event);
    return windowAction(window, event.sender, action);
  });
  function open() {
    if (window && !window.isDestroyed()) {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
      return;
    }
    const created = (window = new BrowserWindow({
      title: 'Patilanci Console',
      width: 1100,
      height: 720,
      minWidth: 760,
      minHeight: 480,
      backgroundColor: '#0b0b0d',
      frame: false,
      show: false,
      autoHideMenuBar: true,
      icon: path.join(__dirname, '../dist/brand/patilanci-icon.png'),
      webPreferences: {
        devTools: !app.isPackaged,
        preload: path.join(__dirname, 'console-preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    }));
    lockWindowZoom(created);
    enableInspectElement(created);
    observeWindowState(created);
    created.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    created.webContents.on('will-navigate', (event) => event.preventDefault());
    let allowClose = false,
      closing = false;
    created.on('close', (event) => {
      if (allowClose) return;
      event.preventDefault();
      if (closing) return;
      closing = true;
      Promise.resolve()
        .then(onClose)
        .then(() => {
          allowClose = true;
          if (!created.isDestroyed()) created.close();
        })
        .catch((error) => {
          log.append(
            error.message ||
              'Minecraft could not be stopped. Try closing the console again.',
            'launcher',
            'error',
          );
        })
        .finally(() => {
          closing = false;
        });
    });
    created.on('closed', () => {
      if (window === created) window = null;
    });
    created
      .loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'console' })
      .then(() => {
        if (!created.isDestroyed()) {
          created.show();
          created.focus();
        }
      })
      .catch(() => {
        if (!created.isDestroyed()) created.close();
      });
  }
  return { open, close: () => window?.close(), getWindow: () => window };
}

module.exports = { createConsoleWindow };
