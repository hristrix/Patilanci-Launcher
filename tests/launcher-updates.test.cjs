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
  await controller.install();
  assert.equal(installs, 1);
});

async function downloadedUpdate(options = {}) {
  const updater = new EventEmitter();
  updater.checkForUpdates = async () => ({
    isUpdateAvailable: true,
    updateInfo: { version: '1.1.0' },
  });
  updater.downloadUpdate = async () =>
    updater.emit('update-downloaded', { version: '1.1.0' });
  updater.quitAndInstall = () => {};
  const controller = createLauncherUpdates({
    createUpdater: () => updater,
    enabled: true,
    version: '1.0.0',
    ...options,
  });
  await controller.check();
  return { controller, updater };
}

test('restart feedback is published before quitting and repeated clicks share one installation', async () => {
  let proceed;
  let installs = 0;
  const states = [];
  const { controller, updater } = await downloadedUpdate({
    beforeInstall: () =>
      new Promise((resolve) => {
        proceed = resolve;
      }),
    onState: (state) => states.push(state.status),
  });
  updater.quitAndInstall = () => {
    installs++;
  };
  const first = controller.install();
  assert.equal(controller.state().status, 'installing');
  assert.equal((await controller.check()).status, 'installing');
  assert.equal(controller.install(), first);
  assert.equal(
    installs,
    0,
    'The updater must wait while restart feedback is shown',
  );
  proceed();
  await first;
  assert.equal(installs, 1);
  assert.equal(states.at(-1), 'installing');
});

test('a failed restart returns to the downloaded update and can be retried', async () => {
  const { controller, updater } = await downloadedUpdate();
  updater.quitAndInstall = () => {
    throw new Error('Could not start update');
  };
  await assert.rejects(controller.install(), /Could not start update/);
  assert.equal(controller.state().status, 'downloaded');
  assert.match(controller.state().error, /Could not start update/);
  updater.quitAndInstall = () => {};
  await controller.install();
  assert.equal(controller.state().status, 'installing');
});

test('a game started during the restart handoff blocks installation', async () => {
  let idle = true;
  const { controller } = await downloadedUpdate({
    canInstall: () => idle,
    beforeInstall: async () => {
      idle = false;
    },
  });
  await assert.rejects(controller.install(), /Close Minecraft/);
  assert.equal(controller.state().status, 'downloaded');
});

test('an updater install error is actionable instead of leaving the restart screen stuck', async () => {
  const { controller, updater } = await downloadedUpdate();
  updater.quitAndInstall = () =>
    updater.emit('error', new Error('Missing installer'));
  await assert.rejects(controller.install(), /could not be started/);
  assert.equal(controller.state().status, 'downloaded');
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
