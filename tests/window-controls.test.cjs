const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const {
  windowState,
  windowAction,
  observeWindowState,
} = require('../electron/window-controls.cjs');

function fixture() {
  const window = new EventEmitter();
  let maximized = false;
  let destroyed = false;
  const actions = [];
  const messages = [];
  window.webContents = { send: (...message) => messages.push(message) };
  window.isDestroyed = () => destroyed;
  window.isMaximized = () => maximized;
  window.maximize = () => {
    maximized = true;
    actions.push('maximize');
    window.emit('maximize');
  };
  window.unmaximize = () => {
    maximized = false;
    actions.push('restore');
    window.emit('unmaximize');
  };
  window.minimize = () => actions.push('minimize');
  window.close = () => {
    destroyed = true;
    actions.push('close');
  };
  return { window, actions, messages };
}

test('untrusted windows and malformed commands cannot control the launcher', () => {
  const { window, actions } = fixture();
  assert.throws(() => windowAction(window, {}, 'close'), /only available/);
  for (const command of [null, {}, ['close'], 'execute', 'destroy']) {
    assert.throws(
      () => windowAction(window, window.webContents, command),
      /Invalid window action/,
    );
  }
  assert.deepEqual(actions, []);
});

test('maximize and native restore events keep title-bar state synchronized', () => {
  const { window, actions, messages } = fixture();
  observeWindowState(window);
  assert.deepEqual(windowAction(window, window.webContents, 'toggleMaximize'), {
    maximized: true,
  });
  // Restoring through the operating system must update the same renderer state.
  window.unmaximize();
  assert.deepEqual(windowState(window), { maximized: false });
  assert.deepEqual(messages, [
    ['windowState', { maximized: true }],
    ['windowState', { maximized: false }],
  ]);
  windowAction(window, window.webContents, 'minimize');
  windowAction(window, window.webContents, 'close');
  assert.deepEqual(actions, ['maximize', 'restore', 'minimize', 'close']);
  assert.throws(
    () => windowAction(window, window.webContents, 'close'),
    /only available/,
  );
  assert.deepEqual(windowState(null), { maximized: false });
});
