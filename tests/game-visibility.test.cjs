const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGameVisibility } = require('../electron/game-visibility.cjs');

function fixture() {
  const calls = [];
  const window = {
    isDestroyed: () => false,
    isMinimized: () => true,
    hide: () => calls.push('hide'),
    restore: () => calls.push('restore'),
    show: () => calls.push('show'),
  };
  return { window, calls, visibility: createGameVisibility(() => window) };
}

test('hide-on-launch hides once and restores the launcher only when the game exits', () => {
  const { calls, visibility } = fixture();
  visibility.update({ running: true }, true);
  visibility.update({ running: true, stopping: true }, true);
  assert.deepEqual(calls, ['hide']);
  visibility.update({ running: false });
  visibility.update({ running: false });
  assert.deepEqual(calls, ['hide', 'restore', 'show']);
});

test('disabled hide-on-launch leaves window visibility alone and later launches can enable it', () => {
  const { calls, visibility } = fixture();
  visibility.update({ running: true }, false);
  visibility.update({ running: false });
  assert.deepEqual(calls, []);
  visibility.update({ running: true }, true);
  visibility.update({ running: false });
  assert.deepEqual(calls, ['hide', 'restore', 'show']);
});

test('game exit cannot reopen a destroyed launcher window', () => {
  const { calls, window, visibility } = fixture();
  visibility.update({ running: true }, true);
  window.isDestroyed = () => true;
  visibility.update({ running: false });
  assert.deepEqual(calls, ['hide']);
});
