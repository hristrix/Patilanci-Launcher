const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  createUpdateMonitor,
  UPDATE_INTERVAL_MS,
} = require('../electron/update-monitor.cjs');

function fixture(overrides = {}) {
  const states = [],
    notices = [];
  let pack = { fileId: 1 },
    latest = { id: 2, displayName: 'Patilanci 2' };
  const monitor = createUpdateMonitor({
    getInstalled: async () => pack,
    getLatest: async () => latest,
    checkLauncher: async () => ({ status: 'current' }),
    onState: (state) => states.push(state),
    onNotice: (notice) => notices.push(notice),
    now: () => 123,
    ...overrides,
  });
  return {
    monitor,
    states,
    notices,
    install: (value) => {
      pack = value;
      monitor.installed(value);
    },
    release: (value) => {
      latest = value;
    },
  };
}

test('detects a new pack, announces it once per release and clears availability after installation', async () => {
  const { monitor, notices, install, release } = fixture();
  await monitor.check();
  assert.deepEqual(monitor.state(), {
    status: 'available',
    fileId: 2,
    releaseName: 'Patilanci 2',
    checkedAt: 123,
    error: null,
  });
  await monitor.check();
  assert.equal(notices.length, 1);
  install({ fileId: 2 });
  assert.equal(monitor.state().status, 'current');
  release({ id: 3, fileName: 'Patilanci 3.zip' });
  await monitor.check();
  assert.equal(monitor.state().status, 'available');
  assert.equal(notices.length, 2);
  install({ fileId: 4 });
  assert.equal(monitor.state().status, 'idle');
  assert.equal(monitor.state().fileId, null);
});

test('retains known updates across outages while launcher and modpack checks fail independently', async () => {
  let failed = false,
    launcherChecks = 0;
  const { monitor, notices } = fixture({
    getLatest: async () => {
      if (failed) throw new Error('offline');
      return { id: 2 };
    },
    checkLauncher: async () => {
      launcherChecks++;
      if (!failed) throw new Error('GitHub unavailable');
      return { status: 'downloaded', latestVersion: '2.0.0' };
    },
  });
  await monitor.check();
  assert.equal(monitor.state().status, 'available');
  failed = true;
  await monitor.check();
  await monitor.check();
  assert.equal(monitor.state().status, 'available');
  assert.match(monitor.state().error, /temporarily unavailable/);
  assert.equal(launcherChecks, 3);
  assert.deepEqual(
    notices.map((n) => n.key),
    ['modpack:2', 'launcher:2.0.0'],
  );
});

test('coalesces timer and focus checks, skips busy operations and cancels the ten-second timer on quit', async () => {
  let resolveLatest,
    callback,
    interval,
    checks = 0,
    busy = true,
    stops = 0;
  const handle = { unref() {} };
  const { monitor } = fixture({
    canCheck: () => !busy,
    getLatest: () => {
      checks++;
      return new Promise((resolve) => {
        resolveLatest = resolve;
      });
    },
    schedule: (fn, ms) => {
      callback = fn;
      interval = ms;
      return handle;
    },
    unschedule: (value) => {
      assert.equal(value, handle);
      stops++;
    },
  });
  monitor.start();
  monitor.start();
  assert.equal(interval, 10000);
  assert.equal(interval, UPDATE_INTERVAL_MS);
  await monitor.check();
  assert.equal(checks, 0);
  busy = false;
  const first = monitor.check();
  assert.equal(first, monitor.check());
  callback();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(checks, 1);
  resolveLatest({ id: 1 });
  await first;
  assert.equal(monitor.state().status, 'current');
  monitor.stop();
  monitor.stop();
  assert.equal(stops, 1);
});

test('new modpacks are announced while a launcher download is still pending', async () => {
  let finishLauncher,
    launcherChecks = 0;
  const { monitor, notices, release } = fixture({
    checkLauncher: () => {
      launcherChecks++;
      return new Promise((resolve) => {
        finishLauncher = resolve;
      });
    },
  });
  const first = monitor.check();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(monitor.state().fileId, 2);
  release({ id: 3, displayName: 'New pack during launcher download' });
  const second = monitor.check();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(monitor.state().fileId, 3);
  assert.equal(monitor.state().status, 'available');
  assert.equal(launcherChecks, 1, 'Do not start a second launcher download');
  assert.deepEqual(
    notices.map((notice) => notice.key),
    ['modpack:2', 'modpack:3'],
  );
  finishLauncher({ status: 'downloaded', latestVersion: '2.2.0' });
  await Promise.all([first, second]);
  assert.equal(notices.at(-1).key, 'launcher:2.2.0');
});

test('rechecks installed pack after the network reply to avoid a false notice during installation', async () => {
  let reads = 0;
  const { monitor, notices } = fixture({
    getInstalled: async () => ({ fileId: ++reads === 1 ? 1 : 2 }),
  });
  await monitor.check();
  assert.equal(monitor.state().status, 'current');
  assert.equal(notices.length, 0);
});

test('does not announce a modpack when nothing has been installed yet', async () => {
  let requests = 0;
  const { monitor, notices } = fixture({
    getInstalled: async () => null,
    getLatest: async () => {
      requests++;
      return { id: 2 };
    },
  });
  await monitor.check();
  assert.equal(requests, 0);
  assert.equal(notices.length, 0);
});
