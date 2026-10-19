const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

test('Inspect Element and developer-tool shortcuts are available only in unpackaged development runs', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../electron/inspect-element.cjs'),
    'utf8',
  );
  for (const isPackaged of [true, false]) {
    const contents = new EventEmitter();
    let opened = 0,
      inspected = 0,
      menu;
    contents.isDestroyed = () => false;
    contents.isDevToolsOpened = () => false;
    contents.openDevTools = () => {
      opened++;
    };
    contents.inspectElement = () => {
      inspected++;
    };
    const module = { exports: {} };
    vm.runInNewContext(source, {
      module,
      require: () => ({
        app: { isPackaged },
        Menu: {
          buildFromTemplate(items) {
            menu = items;
            return { popup() {} };
          },
        },
      }),
    });
    module.exports.enableInspectElement({ webContents: contents });
    contents.emit('context-menu', {}, { x: 1, y: 2 });
    if (menu) menu.find((item) => item.label === 'Inspect Element').click();
    contents.emit(
      'before-input-event',
      { preventDefault() {} },
      { type: 'keyDown', key: 'F12' },
    );
    assert.equal(opened, isPackaged ? 0 : 2);
    assert.equal(inspected, isPackaged ? 0 : 1);
    assert.equal(contents.listenerCount('context-menu'), isPackaged ? 0 : 1);
    assert.equal(
      contents.listenerCount('before-input-event'),
      isPackaged ? 0 : 1,
    );
  }
});
