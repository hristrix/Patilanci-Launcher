const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const { configureLauncherExit } = require('./launcher-exit.cjs');
app.disableHardwareAcceleration();
const timeout = setTimeout(() => {
  console.error('Launcher exit timed out.');
  app.exit(1);
}, 15000);
app
  .whenReady()
  .then(async () => {
    const window = new BrowserWindow({ show: false, width: 400, height: 250 });
    const consoleWindow = new BrowserWindow({ show: false });
    let release;
    let cleanups = 0;
    configureLauncherExit({
      app,
      window,
      beforeQuit: () => {
        cleanups++;
        return new Promise((resolve) => {
          release = resolve;
        });
      },
      onError: (error) => {
        console.error(error);
        app.exit(1);
      },
    });
    await window.loadURL(
      'data:text/html,<title>Launcher exit smoke test</title>',
    );
    window.show();
    window.close();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(window.isDestroyed(), false);
    assert.equal(window.isVisible(), true);
    assert.equal(cleanups, 1);
    window.close();
    app.once('will-quit', () => {
      try {
        assert.equal(cleanups, 1);
        assert.equal(window.isDestroyed(), true);
        assert.equal(consoleWindow.isDestroyed(), true);
        clearTimeout(timeout);
        console.log(
          'Native launcher exit checks passed: close waits for cleanup and quits all windows.',
        );
      } catch (error) {
        console.error(error);
        app.exit(1);
      }
    });
    release();
  })
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
