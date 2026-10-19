const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createLauncherTray } = require('./launcher-tray.cjs');
app.disableHardwareAcceleration();
app
  .whenReady()
  .then(async () => {
    const window = new BrowserWindow({ show: false, width: 400, height: 250 });
    let cleaned = false;
    const controller = createLauncherTray({
      app,
      Tray,
      Menu,
      window,
      icon: nativeImage
        .createFromPath(
          path.join(__dirname, '../dist/brand/patilanci-icon.png'),
        )
        .resize({ width: 16, height: 16 }),
      beforeQuit: async () => {
        cleaned = true;
      },
      onError: (error) => {
        throw error;
      },
    });
    await window.loadURL('data:text/html,<title>Tray smoke test</title>');
    window.show();
    window.close();
    assert.equal(window.isDestroyed(), false);
    assert.equal(window.isVisible(), false);
    assert.equal(cleaned, false);
    assert.equal(controller.getTray().isDestroyed(), false);
    controller.getTray().emit('click');
    assert.equal(window.isVisible(), true);
    window.close();
    controller.show();
    assert.equal(window.isVisible(), true);
    app.once('will-quit', () => {
      assert.equal(cleaned, true);
      assert.equal(window.isDestroyed(), true);
      assert.equal(controller.getTray().isDestroyed(), true);
      console.log(
        'Native Windows tray checks passed: hide, reopen, full quit and icon cleanup.',
      );
    });
    app.quit();
  })
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
