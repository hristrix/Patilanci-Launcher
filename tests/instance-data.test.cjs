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
    'options.txt': 'key_key.forward:key.keyboard.r',
    'optionsshaders.txt': 'shaderPack=Custom.zip',
    'config/iris.properties': 'shaderPack=Custom.zip',
    'config/sodium-options.json': '{"quality":"custom"}',
    'shaderpacks/Custom.zip': 'personal shader pack',
    'saves/My World/level.dat': 'world',
    'resourcepacks/custom.zip': 'textures',
    'servers.dat': 'my servers',
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
  await preservePlayerData(previous, next);
  for (const [name, data] of Object.entries(files)) {
    assert.equal(await fs.readFile(path.join(next, name), 'utf8'), data);
    assert.equal(await fs.readFile(path.join(previous, name), 'utf8'), data);
  }
  assert.equal(
    await fs.readFile(path.join(next, 'config/new-mod.json'), 'utf8'),
    'new default',
  );
  await preservePlayerData(path.join(directory, 'not-installed'), next);
});
