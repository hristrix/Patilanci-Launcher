const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Handler = require('minecraft-launcher-core/components/handler');
const { savePreferences } = require('../electron/preferences.cjs');
const {
  normalizeGameWindow,
  prepareGameWindow,
} = require('../electron/game-window.cjs');

async function fixture(t) {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), 'patilanci-window-test-'),
  );
  assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
  assert.ok(path.basename(root).startsWith('patilanci-window-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

test('window settings survive saving and produce Minecraft windowed and fullscreen arguments', async (t) => {
  const root = await fixture(t);
  const settings = path.join(root, 'settings.json');
  for (const fullscreen of [false, true, false]) {
    await savePreferences(settings, {
      memory: 6,
      javaPath: 'java',
      gameWindow: { width: '1920', height: '1080', fullscreen },
    });
    const saved = JSON.parse(await fs.readFile(settings, 'utf8'));
    assert.deepEqual(saved.gameWindow, {
      width: 1920,
      height: 1080,
      fullscreen,
    });
    const window = await prepareGameWindow(root, saved.gameWindow);
    const handler = Object.create(Handler.prototype);
    handler.options = {
      root,
      window,
      overrides: {},
      authorization: { name: 'Fixture' },
      version: { number: '1.21.10' },
    };
    handler.version = {
      arguments: { game: ['--username', '${auth_player_name}'] },
    };
    handler.client = { emit() {} };
    handler.isLegacy = () => false;
    const args = await handler.getLaunchOptions();
    assert.equal(args.includes('--fullscreen'), fullscreen);
    if (!fullscreen) {
      assert.equal(args[args.indexOf('--width') + 1], 1920);
      assert.equal(args[args.indexOf('--height') + 1], 1080);
    }
    const options = await fs.readFile(path.join(root, 'options.txt'), 'utf8');
    assert.match(options, new RegExp(`^fullscreen:${fullscreen}$`, 'm'));
    assert.match(options, /^overrideWidth:1920$/m);
    assert.match(options, /^overrideHeight:1080$/m);
  }
});

test('windowed launches leave room for native borders without changing saved dimensions', async (t) => {
  const root = await fixture(t);
  const saved = { width: 1920, height: 1080, fullscreen: false };
  const workArea = { width: 1920, height: 1040 };
  assert.deepEqual(await prepareGameWindow(root, saved, workArea), {
    width: 1888,
    height: 976,
    fullscreen: false,
  });
  assert.deepEqual(saved, { width: 1920, height: 1080, fullscreen: false });
  const options = await fs.readFile(path.join(root, 'options.txt'), 'utf8');
  assert.match(options, /^fullscreen:false$/m);
  assert.match(options, /^overrideWidth:1888$/m);
  assert.match(options, /^overrideHeight:976$/m);
  const smaller = { width: 1280, height: 720, fullscreen: false };
  assert.deepEqual(await prepareGameWindow(root, smaller, workArea), smaller);
  const fullscreen = { ...saved, fullscreen: true };
  assert.deepEqual(
    await prepareGameWindow(root, fullscreen, workArea),
    fullscreen,
  );
});

test('video updates preserve other Minecraft options and replace old size and fullscreen overrides', async (t) => {
  const root = await fixture(t);
  const file = path.join(root, 'options.txt');
  await fs.writeFile(
    file,
    'fullscreen:true\r\noverrideWidth:800\r\noverrideHeight:600\r\nkey_key.jump:key.keyboard.space\r\nresourcePacks:["vanilla"]\r\nfullscreen:true\r\n',
  );
  await prepareGameWindow(root, {
    width: 1600,
    height: 900,
    fullscreen: false,
  });
  assert.equal(
    await fs.readFile(file, 'utf8'),
    'fullscreen:false\r\noverrideWidth:1600\r\noverrideHeight:900\r\nkey_key.jump:key.keyboard.space\r\nresourcePacks:["vanilla"]\r\n',
  );
});

test('old installations get defaults and invalid window preferences cannot replace saved data', async (t) => {
  assert.deepEqual(normalizeGameWindow(), {
    width: 1920,
    height: 1080,
    fullscreen: false,
  });
  const root = await fixture(t);
  const file = path.join(root, 'settings.json');
  await fs.writeFile(file, '{"key":"encrypted-fixture"}');
  for (const gameWindow of [
    null,
    [],
    {},
    { width: 0, height: 1080, fullscreen: false },
    { width: 1920, height: 4321, fullscreen: false },
    { width: 1920.5, height: 1080, fullscreen: false },
    { width: 1920, height: 1080, fullscreen: 'true' },
    { width: true, height: 1080, fullscreen: false },
  ]) {
    await assert.rejects(
      savePreferences(file, { memory: 6, javaPath: 'java', gameWindow }),
      /Game window/,
    );
    assert.equal(
      await fs.readFile(file, 'utf8'),
      '{"key":"encrypted-fixture"}',
    );
  }
});
