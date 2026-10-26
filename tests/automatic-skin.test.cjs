const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const Zip = require('adm-zip');
const {
  prepareAutomaticSkin,
  COMPANION_FILE,
} = require('../electron/automatic-skin.cjs');

async function fixture(t) {
  const instance = await fs.mkdtemp(
    path.join(os.tmpdir(), 'patilanci-auto-skin-'),
  );
  t.after(() => fs.rm(instance, { recursive: true, force: true }));
  return {
    mode: 'offline',
    name: 'Builder',
    server: 'smp.example.com',
    minecraft: '1.21.10',
    instance,
    readSelection: async () => ({
      selection: { source: 'ely.by', value: 'SkinOwner', model: 'classic' },
    }),
  };
}

test('premium play and profiles without a selection neither install nor request automatic skin commands', async (t) => {
  const options = await fixture(t);
  assert.deepEqual(
    await prepareAutomaticSkin({
      ...options,
      mode: 'microsoft',
      readSelection: () => {
        throw Error('must not read offline profile');
      },
    }),
    [],
  );
  assert.deepEqual(
    await prepareAutomaticSkin({ ...options, readSelection: async () => null }),
    [],
  );
  assert.deepEqual(await fs.readdir(options.instance), []);
});

test('offline launch installs the verified client-only companion and passes an own-player command scoped to this server', async (t) => {
  const options = await fixture(t);
  const [arg] = await prepareAutomaticSkin(options);
  const request = JSON.parse(Buffer.from(arg.split('=')[1], 'base64url'));
  assert.deepEqual(request, {
    player: 'Builder',
    server: 'smp.example.com',
    command: 'skin set ely.by SkinOwner',
  });
  const jarPath = path.join(options.instance, 'mods', COMPANION_FILE);
  const bytes = await fs.readFile(jarPath);
  const archive = new Zip(bytes);
  const metadata = JSON.parse(archive.readAsText('fabric.mod.json'));
  assert.equal(metadata.environment, 'client');
  assert.equal(metadata.depends.minecraft, '1.21.10');
  assert.equal(metadata.id, 'patilanci_skin_companion');
  assert.ok(archive.getEntry('com/hristrix/skin/SkinCompanion.class'));
  await prepareAutomaticSkin(options);
  assert.deepEqual(await fs.readdir(path.dirname(jarPath)), [COMPANION_FILE]);
  assert.deepEqual(await fs.readFile(jarPath), bytes);
});

test('unsupported Minecraft and malformed commands fail before installing the companion', async (t) => {
  const options = await fixture(t);
  await assert.rejects(
    prepareAutomaticSkin({ ...options, minecraft: '1.21.11' }),
    /1.21.10/,
  );
  await assert.rejects(
    prepareAutomaticSkin({
      ...options,
      readSelection: async () => ({
        selection: { source: 'mojang', value: 'Builder\nstop' },
      }),
    }),
  );
  assert.deepEqual(await fs.readdir(options.instance), []);
});

test('a damaged asset or another file with the reserved filename is preserved and blocks launch', async (t) => {
  const options = await fixture(t);
  const asset = path.join(options.instance, 'damaged.jar');
  await fs.writeFile(asset, 'damaged');
  await fs.writeFile(`${asset}.sha256`, '0'.repeat(64));
  await assert.rejects(prepareAutomaticSkin({ ...options, asset }), /damaged/);
  await fs.mkdir(path.join(options.instance, 'mods'));
  const destination = path.join(options.instance, 'mods', COMPANION_FILE);
  await fs.writeFile(destination, 'personal file');
  await assert.rejects(prepareAutomaticSkin(options), /different file/);
  assert.equal(await fs.readFile(destination, 'utf8'), 'personal file');
});

test('a renamed duplicate companion is detected without installing another copy', async (t) => {
  const options = await fixture(t);
  await prepareAutomaticSkin(options);
  const directory = path.join(options.instance, 'mods');
  await fs.rename(
    path.join(directory, COMPANION_FILE),
    path.join(directory, 'renamed.jar'),
  );
  await assert.rejects(
    prepareAutomaticSkin(options),
    /Another patilanci_skin_companion/,
  );
  assert.deepEqual(await fs.readdir(directory), ['renamed.jar']);
});
