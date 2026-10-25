const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createLauncherUpdates } = require('../electron/launcher-updates.cjs');

test('new launcher releases download once, apply silently, and restart only when idle', async () => {
  const updater = new EventEmitter();
  let checks = 0,
    downloads = 0,
    installs = 0,
    idle = false;
  updater.checkForUpdates = async () => {
    checks++;
    return { isUpdateAvailable: true, updateInfo: { version: '1.1.0' } };
  };
  updater.downloadUpdate = async () => {
    downloads++;
    updater.emit('download-progress', { percent: 45 });
    updater.emit('update-downloaded', { version: '1.1.0' });
  };
  updater.quitAndInstall = (silent, run) => {
    assert.equal(silent, true, 'Applying an update must skip the setup wizard');
    assert.equal(run, true);
    installs++;
  };
  const controller = createLauncherUpdates({
    createUpdater: () => updater,
    enabled: true,
    version: '1.0.0',
    canInstall: () => idle,
  });
  const [first, second] = await Promise.all([
    controller.check(),
    controller.check(),
  ]);
  assert.equal(first.status, 'downloaded');
  assert.deepEqual(first, second);
  assert.equal(checks, 1);
  assert.equal(downloads, 1);
  assert.equal(updater.autoInstallOnAppQuit, false);
  assert.equal(updater.allowDowngrade, false);
  assert.equal(updater.autoDownload, false);
  assert.throws(controller.install, /Close Minecraft/);
  idle = true;
  controller.install();
  assert.equal(installs, 1);
});

test('up-to-date, development and failed checks never claim a downloaded release', async () => {
  const updater = new EventEmitter();
  updater.checkForUpdates = async () => ({ isUpdateAvailable: false });
  const options = {
    createUpdater: () => updater,
    enabled: true,
    version: '1.0.0',
  };
  const current = createLauncherUpdates(options);
  assert.equal((await current.check()).status, 'current');
  assert.throws(current.install, /Download/);
  assert.equal(
    (await createLauncherUpdates({ ...options, enabled: false }).check())
      .status,
    'development',
  );
  updater.checkForUpdates = async () => {
    throw new Error('404 latest.yml');
  };
  const failed = createLauncherUpdates(options);
  assert.equal((await failed.check()).status, 'error');
  assert.throws(failed.install, /Download/);
  updater.checkForUpdates = async () => ({ isUpdateAvailable: false });
  assert.equal((await failed.check()).status, 'current');
});
