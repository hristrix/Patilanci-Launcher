const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createStartupUpdate } = require('../electron/startup-update.cjs');
const { createStartupFlow } = require('../electron/startup-update.cjs');

test('startup and renderer reloads share one pending installation', async () => {
  let finish;
  let installations = 0;
  const pack = { fileId: 42 };
  const startupUpdate = createStartupUpdate(async () => {
    installations += 1;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });

  const first = startupUpdate();
  const reloaded = startupUpdate();
  assert.equal(first, reloaded);
  await Promise.resolve();
  assert.equal(installations, 1);
  finish(pack);
  assert.equal(await first, pack);
  assert.equal(await startupUpdate(), pack);
  assert.equal(installations, 1);
});

test('a failed startup check surfaces its error and can retry after settings are fixed', async () => {
  let attempts = 0;
  const startupUpdate = createStartupUpdate(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('CurseForge authorization failed.');
    return { fileId: 43 };
  });

  await assert.rejects(startupUpdate(), /authorization failed/);
  assert.deepEqual(await startupUpdate(), { fileId: 43 });
  assert.equal(attempts, 2);
});

test('each new launcher session performs a fresh update check', async () => {
  let checks = 0;
  const install = async () => ({ fileId: ++checks });
  assert.deepEqual(await createStartupUpdate(install)(), { fileId: 1 });
  assert.deepEqual(await createStartupUpdate(install)(), { fileId: 2 });
});

test('splash checks launcher, account and latest pack in order and shares reloads', async () => {
  const calls = [];
  const flow = createStartupFlow({
    checkLauncher: async () => {
      calls.push('launcher');
      return { status: 'current' };
    },
    restoreAccount: async () => {
      calls.push('account');
      return { status: 'ready', message: 'Offline profile restored' };
    },
    updatePack: async () => {
      calls.push('modpack');
      return { fileId: 42 };
    },
  });
  const first = flow.run();
  assert.equal(first, flow.run());
  assert.equal((await first).status, 'ready');
  assert.deepEqual(calls, ['launcher', 'account', 'modpack']);
  await flow.run();
  assert.equal(calls.length, 3);
});

test('downloaded launcher updates pause startup before authentication and pack changes', async () => {
  const flow = createStartupFlow({
    checkLauncher: async () => ({
      status: 'downloaded',
      latestVersion: '2.0.0',
    }),
    restoreAccount: () => assert.fail('Wait for restart'),
    updatePack: () => assert.fail('Wait for restart'),
  });
  assert.equal((await flow.run()).status, 'update-ready');
});

test('authentication warnings do not delete sessions and pack failures can retry', async () => {
  let attempts = 0;
  const flow = createStartupFlow({
    checkLauncher: async () => ({ status: 'error' }),
    restoreAccount: async () => ({
      status: 'sign-in-required',
      message: 'Sign in again',
    }),
    updatePack: async () => {
      if (++attempts === 1) throw new Error('Download failed');
      return { fileId: 43 };
    },
  });
  await assert.rejects(flow.run(), /Download failed/);
  assert.equal(flow.state().steps.account.status, 'warning');
  assert.equal(flow.state().steps.modpack.status, 'error');
  assert.equal((await flow.retry()).status, 'ready');
});
