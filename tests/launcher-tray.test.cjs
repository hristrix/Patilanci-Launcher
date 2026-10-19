const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createLauncherTray } = require('../electron/launcher-tray.cjs');

function fixture(beforeQuit = async () => {}) {
  const app = new EventEmitter();
  const window = new EventEmitter();
  const state = {
    hidden: false,
    destroyed: false,
    minimized: false,
    focused: false,
    quit: false,
    console: 0,
    errors: [],
  };
  window.isDestroyed = () => state.destroyed;
  window.isMinimized = () => state.minimized;
  window.hide = () => {
    state.hidden = true;
  };
  window.show = () => {
    state.hidden = false;
  };
  window.focus = () => {
    state.focused = true;
  };
  window.restore = () => {
    state.minimized = false;
  };
  window.close = () => {
    const event = {
      prevented: false,
      preventDefault() {
        this.prevented = true;
      },
    };
    window.emit('close', event);
    if (!event.prevented) state.destroyed = true;
  };
  app.quit = () => {
    const event = {
      prevented: false,
      preventDefault() {
        this.prevented = true;
      },
    };
    app.emit('before-quit', event);
    if (event.prevented) return;
    window.close();
    state.quit = true;
    app.emit('will-quit');
  };
  class Tray extends EventEmitter {
    destroyed = false;
    isDestroyed() {
      return this.destroyed;
    }
    destroy() {
      this.destroyed = true;
    }
    setToolTip(value) {
      this.tooltip = value;
    }
    setContextMenu(menu) {
      this.menu = menu;
    }
  }
  const controller = createLauncherTray({
    app,
    Tray,
    Menu: { buildFromTemplate: (value) => value },
    icon: 'icon',
    window,
    beforeQuit,
    onOpenConsole: () => state.console++,
    onError: (error) => state.errors.push(error.message),
  });
  return { app, window, state, tray: controller.getTray() };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));
test('closing the launcher hides it and tray actions restore it without quitting or stopping the game', () => {
  let stops = 0;
  const { app, window, state, tray } = fixture(async () => stops++);
  window.close();
  assert.equal(state.hidden, true);
  assert.equal(state.destroyed, false);
  assert.equal(state.quit, false);
  assert.equal(stops, 0);
  state.minimized = true;
  tray.emit('click');
  assert.equal(state.hidden, false);
  assert.equal(state.minimized, false);
  assert.equal(state.focused, true);
  window.close();
  tray.menu[0].click();
  assert.equal(state.hidden, false);
  tray.menu[1].click();
  assert.equal(state.console, 1);
  window.close();
  app.emit('activate');
  assert.equal(state.hidden, false);
});
test('explicit Quit waits for game cleanup, closes fully and removes the tray', async () => {
  let release;
  let stops = 0;
  const { app, window, state, tray } = fixture(() => {
    stops++;
    return new Promise((resolve) => {
      release = resolve;
    });
  });
  window.close();
  tray.menu[3].click();
  app.quit();
  await flush();
  assert.equal(stops, 1);
  assert.equal(state.quit, false);
  release();
  await flush();
  assert.equal(state.quit, true);
  assert.equal(state.destroyed, true);
  assert.equal(tray.destroyed, true);
  assert.equal(app.listenerCount('before-quit'), 0);
});
test('failed game cleanup keeps the tray available, restores the launcher and allows retry', async () => {
  let attempts = 0;
  const { window, state, tray } = fixture(async () => {
    if (++attempts === 1) throw new Error('Minecraft could not be stopped');
  });
  window.close();
  tray.menu[3].click();
  await flush();
  assert.equal(state.quit, false);
  assert.equal(state.hidden, false);
  assert.equal(tray.destroyed, false);
  assert.deepEqual(state.errors, ['Minecraft could not be stopped']);
  window.close();
  assert.equal(state.hidden, true);
  tray.menu[3].click();
  await flush();
  assert.equal(state.quit, true);
});
test('application quits such as an updater restart also bypass hiding after cleanup', async () => {
  const { app, state } = fixture();
  app.quit();
  await flush();
  assert.equal(state.quit, true);
  assert.equal(state.destroyed, true);
});
