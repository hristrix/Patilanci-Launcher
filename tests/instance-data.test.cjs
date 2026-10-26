const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { preservePlayerData } = require('../electron/instance-data.cjs');

test('updates preserve keybinds, shader settings, user content and new config defaults', async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'patilanci-data-test-'),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const previous = path.join(directory, 'previous');
  const next = path.join(directory, 'next');
  const files = {
    'CustomSkinLoader/CustomSkinLoader.json': '{"loadlist":[]}',
    'options.txt': 'key_key.forward:key.keyboard.r',
    'optionsshaders.txt': 'shaderPack=Custom.zip',
    'config/iris.properties': 'shaderPack=Custom.zip',
    'config/sodium-options.json': '{"quality":"custom"}',
    'shaderpacks/Custom.zip': 'personal shader pack',
    'saves/My World/level.dat': 'world',
    'resourcepacks/custom.zip': 'textures',
    'servers.dat': 'my servers',
    'XaeroWorldMap/Multiplayer_pat ilanci/DIM0/map.zip': 'explored map',
    'XaeroWaypoints/Multiplayer_pat ilanci/waypoints.txt': 'home waypoint',
    'xaero/world-map/world/map.dat': 'newer Xaero map data',
    'xaero/minimap/settings.txt': 'personal minimap settings',
    'journeymap/data/mp/patilanci/map.dat': 'journey map',
    'custom-mod-data/preferences.json': '{"personal":true}',
    'another-mod.toml': 'user_setting = true',
  };
  for (const [name, data] of Object.entries(files)) {
    for (const [root, content] of [
      [previous, data],
      [next, 'new pack default'],
    ]) {
      await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
      await fs.writeFile(path.join(root, name), content);
    }
  }
  await fs.writeFile(path.join(next, 'config', 'new-mod.json'), 'new default');
  await fs.writeFile(
    path.join(next, 'xaero', 'new-default.txt'),
    'new Xaero default',
  );
  await preservePlayerData(previous, next);
  for (const [name, data] of Object.entries(files)) {
    assert.equal(await fs.readFile(path.join(next, name), 'utf8'), data);
    assert.equal(await fs.readFile(path.join(previous, name), 'utf8'), data);
  }
  assert.equal(
    await fs.readFile(path.join(next, 'config/new-mod.json'), 'utf8'),
    'new default',
  );
  assert.equal(
    await fs.readFile(path.join(next, 'xaero/new-default.txt'), 'utf8'),
    'new Xaero default',
  );
  await preservePlayerData(path.join(directory, 'not-installed'), next);
});

test('player data survives consecutive updates while new modpack and launcher files stay current', async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'patilanci-data-test-'),
  );
  assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith('patilanci-data-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const previous = path.join(directory, 'previous');
  const next = path.join(directory, 'next');
  const final = path.join(directory, 'final');
  const managed = [
    'mods/old.jar',
    'versions/old/old.json',
    'libraries/old.jar',
    'assets/old.dat',
    'natives/old.dll',
    '.fabric/old-cache',
    'logs/latest.log',
    'patilanci-install.json',
    'patilanci-mods.json',
  ];
  const personal = Buffer.from([0, 255, 128, 42, 10]);
  for (const root of [previous, next, final]) {
    await fs.mkdir(path.join(root, 'xaero', 'maps'), { recursive: true });
    await fs.writeFile(
      path.join(root, 'xaero', 'maps', 'map.dat'),
      root === previous ? personal : Buffer.from('pack default'),
    );
  }
  for (const name of managed) {
    for (const root of [previous, next, final]) {
      await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
      await fs.writeFile(
        path.join(root, name),
        root === previous ? 'old' : 'new',
      );
    }
  }
  await fs.mkdir(path.join(previous, 'mods', 'removed'), { recursive: true });
  await fs.writeFile(
    path.join(previous, 'mods', 'removed', 'obsolete.jar'),
    'obsolete',
  );
  await preservePlayerData(previous, next);
  await fs.writeFile(
    path.join(next, 'xaero', 'maps', 'new-area.dat'),
    'new exploration',
  );
  await preservePlayerData(next, final);
  assert.deepEqual(
    await fs.readFile(path.join(final, 'xaero/maps/map.dat')),
    personal,
  );
  assert.equal(
    await fs.readFile(path.join(final, 'xaero/maps/new-area.dat'), 'utf8'),
    'new exploration',
  );
  assert.deepEqual(
    await fs.readFile(path.join(previous, 'xaero/maps/map.dat')),
    personal,
  );
  for (const name of managed)
    assert.equal(await fs.readFile(path.join(final, name), 'utf8'), 'new');
  await assert.rejects(
    fs.access(path.join(final, 'mods/removed/obsolete.jar')),
    { code: 'ENOENT' },
  );
});

test('a file and directory conflict aborts preservation without changing the original player data', async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'patilanci-data-test-'),
  );
  assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith('patilanci-data-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const previous = path.join(directory, 'previous');
  const next = path.join(directory, 'next');
  await fs.mkdir(path.join(previous, 'xaero'), { recursive: true });
  await fs.mkdir(next);
  await fs.writeFile(path.join(previous, 'xaero/map.dat'), 'player map');
  await fs.writeFile(path.join(next, 'xaero'), 'conflicting pack file');
  await assert.rejects(preservePlayerData(previous, next));
  assert.equal(
    await fs.readFile(path.join(previous, 'xaero/map.dat'), 'utf8'),
    'player map',
  );
});
