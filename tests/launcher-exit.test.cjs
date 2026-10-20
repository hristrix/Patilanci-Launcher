const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { configureLauncherExit } = require('../electron/launcher-exit.cjs');

function fixture(beforeQuit = async () => {}) {
  const app = new EventEmitter();
  const window = new EventEmitter();
  const state = { destroyed: false, quit: false, errors: [] };
  window.isDestroyed = () => state.destroyed;
  window.isMinimized = () => false;
  window.show = window.focus = () => {};
  function event() {
    return {
      prevented: false,
      preventDefault() {
        this.prevented = true;
      },
    };
  }
  window.close = () => {
    const closing = event();
    window.emit('close', closing);
    if (!closing.prevented) state.destroyed = true;
  };
  app.quit = () => {
    const quitting = event();
    app.emit('before-quit', quitting);
    if (quitting.prevented) return;
    window.close();
    state.quit = true;
    app.emit('will-quit');
  };
  configureLauncherExit({
    app,
    window,
    beforeQuit,
    onError: (error) => state.errors.push(error.message),
  });
  return { app, window, state };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('closing the launcher waits for cleanup once, then exits completely', async () => {
  let release;
  let stops = 0;
  const { app, window, state } = fixture(() => {
    stops++;
    return new Promise((resolve) => {
      release = resolve;
    });
  });
  window.close();
  window.close();
  app.quit();
  await flush();
  assert.equal(stops, 1);
  assert.equal(state.quit, false);
  assert.equal(state.destroyed, false);
  release();
  await flush();
  assert.equal(state.quit, true);
  assert.equal(state.destroyed, true);
  assert.equal(app.listenerCount('before-quit'), 0);
  assert.equal(window.listenerCount('close'), 0);
});

test('failed cleanup keeps the window available and closing again retries', async () => {
  let attempts = 0;
  const { window, state } = fixture(async () => {
    if (++attempts === 1) throw new Error('Minecraft could not be stopped');
  });
  window.close();
  await flush();
  assert.equal(state.quit, false);
  assert.equal(state.destroyed, false);
  assert.deepEqual(state.errors, ['Minecraft could not be stopped']);
  window.close();
  await flush();
  assert.equal(state.quit, true);
  assert.equal(attempts, 2);
});

test('application quit also waits for cleanup and closes the launcher', async () => {
  let cleaned = false;
  const { app, state } = fixture(async () => {
    cleaned = true;
  });
  app.quit();
  await flush();
  assert.equal(cleaned, true);
  assert.equal(state.quit, true);
  assert.equal(state.destroyed, true);
});
