const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const Zip = require('adm-zip');
const {
  listMods,
  recordBundledMods,
  addLocalMods,
  removePersonalMod,
  setPersonalModEnabled,
  preservePersonalMods,
} = require('../electron/mods.cjs');

async function fixture(t) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'patilanci-mods-test-'),
  );
  assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith('patilanci-mods-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

async function instance(directory, name = 'instance') {
  const target = path.join(directory, name);
  await fs.mkdir(path.join(target, 'mods'), { recursive: true });
  await fs.writeFile(
    path.join(target, 'patilanci-install.json'),
    JSON.stringify({ minecraft: '1.21.10', version: '2.2.0' }),
  );
  return target;
}

async function jar(directory, filename, id, options = {}) {
  await fs.mkdir(directory, { recursive: true });
  const zip = new Zip();
  zip.addFile(
    'fabric.mod.json',
    Buffer.from(
      JSON.stringify({
        schemaVersion: 1,
        id,
        version: '1.0.0',
        name: id,
        ...options,
      }),
    ),
  );
  const target = path.join(directory, filename);
  await fs.writeFile(target, zip.toBuffer());
  return target;
}

test('personal mods disable and re-enable without changing bytes or imported source files', async (t) => {
  const directory = await fixture(t);
  const root = await instance(directory);
  await recordBundledMods(root);
  const source = await jar(
    path.join(directory, 'downloads'),
    'extra.jar',
    'personal_mod',
  );
  const original = await fs.readFile(source);
  await addLocalMods(root, [source]);
  await setPersonalModEnabled(root, { fileName: 'extra.jar', enabled: false });
  await assert.rejects(fs.stat(path.join(root, 'mods/extra.jar')), {
    code: 'ENOENT',
  });
  assert.deepEqual(
    await fs.readFile(path.join(root, 'mods/extra.jar.disabled')),
    original,
  );
  assert.deepEqual(
    (await listMods(root)).personal.map((mod) => [
      mod.fileName,
      mod.enabled,
      mod.present,
    ]),
    [['extra.jar', false, true]],
  );
  await setPersonalModEnabled(root, { fileName: 'extra.jar', enabled: false });
  await assert.rejects(addLocalMods(root, [source]), /conflicts/);
  await setPersonalModEnabled(root, { fileName: 'extra.jar', enabled: true });
  assert.deepEqual(
    await fs.readFile(path.join(root, 'mods/extra.jar')),
    original,
  );
  assert.equal((await listMods(root)).personal[0].enabled, true);
  assert.deepEqual(await fs.readFile(source), original);
});

test('disabled personal mods stay disabled through consecutive pack updates and can be removed', async (t) => {
  const directory = await fixture(t);
  let previous = await instance(directory, 'first');
  await recordBundledMods(previous);
  const source = await jar(
    path.join(directory, 'downloads'),
    'extra.jar',
    'personal_mod',
  );
  await addLocalMods(previous, [source]);
  await setPersonalModEnabled(previous, {
    fileName: 'extra.jar',
    enabled: false,
  });
  for (const name of ['second', 'third']) {
    const next = await instance(directory, name);
    await jar(path.join(next, 'mods'), 'required.jar', 'required_mod');
    await recordBundledMods(next);
    await preservePersonalMods(previous, next);
    assert.equal((await listMods(next)).personal[0].enabled, false);
    await assert.rejects(fs.stat(path.join(next, 'mods/extra.jar')), {
      code: 'ENOENT',
    });
    assert.deepEqual(
      await fs.readFile(path.join(next, 'mods/extra.jar.disabled')),
      await fs.readFile(source),
    );
    previous = next;
  }
  await removePersonalMod(previous, 'extra.jar');
  await assert.rejects(
    fs.stat(path.join(previous, 'mods/extra.jar.disabled')),
    { code: 'ENOENT' },
  );
  assert.equal((await listMods(previous)).personal.length, 0);
});

test('mod switches reject protected, untracked, malformed and conflicting files', async (t) => {
  const directory = await fixture(t);
  const root = await instance(directory);
  const required = await jar(
    path.join(root, 'mods'),
    'required.jar',
    'required_mod',
  );
  await recordBundledMods(root);
  const bytes = await fs.readFile(required);
  await jar(path.join(root, 'mods'), 'untracked.jar', 'untracked_mod');
  for (const fileName of ['required.jar', 'untracked.jar'])
    await assert.rejects(
      setPersonalModEnabled(root, { fileName, enabled: false }),
      /protected/,
    );
  for (const request of [
    null,
    {},
    { fileName: '../required.jar', enabled: false },
    { fileName: 'required.jar', enabled: 'false' },
  ])
    await assert.rejects(setPersonalModEnabled(root, request));
  assert.deepEqual(await fs.readFile(required), bytes);
  const source = await jar(
    path.join(directory, 'downloads'),
    'extra.jar',
    'personal_mod',
  );
  await addLocalMods(root, [source]);
  await fs.writeFile(
    path.join(root, 'mods/extra.jar.disabled'),
    'existing user file',
  );
  await assert.rejects(
    setPersonalModEnabled(root, { fileName: 'extra.jar', enabled: false }),
    /Both enabled and disabled/,
  );
  assert.equal(
    await fs.readFile(path.join(root, 'mods/extra.jar.disabled'), 'utf8'),
    'existing user file',
  );
  assert.deepEqual(
    await fs.readFile(path.join(root, 'mods/extra.jar')),
    await fs.readFile(source),
  );
});

test('required pack mods cannot be deleted through the backend', async (t) => {
  const directory = await fixture(t);
  const root = await instance(directory);
  const core = await jar(
    path.join(root, 'mods'),
    'required.jar',
    'required_mod',
  );
  await recordBundledMods(root);
  const original = await fs.readFile(core);
  await assert.rejects(removePersonalMod(root, 'required.jar'), /protected/);
  assert.deepEqual(await fs.readFile(core), original);
});

test('a player can add and remove a mod without changing the source JAR or pack', async (t) => {
  const directory = await fixture(t);
  const root = await instance(directory);
  await jar(path.join(root, 'mods'), 'required.jar', 'required_mod');
  await recordBundledMods(root);
  const source = await jar(
    path.join(directory, 'downloads'),
    'extra.jar',
    'personal_mod',
  );
  assert.equal(await addLocalMods(root, [source]), 1);
  const inventory = await listMods(root);
  assert.equal(inventory.bundled.length, 1);
  assert.equal(inventory.personal[0].id, 'personal_mod');
  await removePersonalMod(root, 'extra.jar');
  assert.equal((await listMods(root)).personal.length, 0);
  await assert.rejects(fs.stat(path.join(root, 'mods', 'extra.jar')), {
    code: 'ENOENT',
  });
  assert.ok((await fs.stat(source)).isFile());
});

test('imports cannot replace a bundled filename, ID or provided alias', async (t) => {
  const directory = await fixture(t);
  const root = await instance(directory);
  await jar(path.join(root, 'mods'), 'required.jar', 'required_mod', {
    provides: ['required_alias'],
  });
  await recordBundledMods(root);
  for (const [filename, id] of [
    ['required.jar', 'other_mod'],
    ['renamed.jar', 'required_mod'],
    ['alias.jar', 'required_alias'],
  ]) {
    const source = await jar(path.join(directory, 'downloads'), filename, id);
    await assert.rejects(addLocalMods(root, [source]), /conflicts/);
  }
  assert.equal((await listMods(root)).personal.length, 0);
});

test('a batch with invalid or duplicate JARs leaves the instance unchanged', async (t) => {
  const directory = await fixture(t);
  const root = await instance(directory);
  await recordBundledMods(root);
  const first = await jar(
    path.join(directory, 'downloads'),
    'extra.jar',
    'personal_mod',
  );
  const duplicate = await jar(
    path.join(directory, 'downloads'),
    'duplicate.jar',
    'personal_mod',
  );
  await assert.rejects(addLocalMods(root, [first, duplicate]), /conflicts/);
  const invalid = path.join(directory, 'bad.jar');
  await fs.writeFile(invalid, 'not a Fabric JAR');
  await assert.rejects(addLocalMods(root, [first, invalid]));
  assert.deepEqual(await fs.readdir(path.join(root, 'mods')), []);
});

test('untracked legacy files stay protected and removal rejects traversal', async (t) => {
  const directory = await fixture(t);
  const root = await instance(directory);
  await jar(path.join(root, 'mods'), 'legacy.jar', 'legacy_mod');
  await assert.rejects(removePersonalMod(root, 'legacy.jar'), /protected/);
  for (const filename of ['../escape.jar', '..\\escape.jar', 'C:/escape.jar']) {
    await assert.rejects(
      removePersonalMod(root, filename),
      /Invalid mod filename/,
    );
  }
  assert.equal((await listMods(root)).bundled.length, 1);
});

test('personal mods survive pack updates and remain removable', async (t) => {
  const directory = await fixture(t);
  const previous = await instance(directory, 'previous');
  await jar(path.join(previous, 'mods'), 'old-core.jar', 'old_core');
  await recordBundledMods(previous);
  const source = await jar(
    path.join(directory, 'downloads'),
    'extra.jar',
    'personal_mod',
  );
  await addLocalMods(previous, [source]);
  const next = await instance(directory, 'next');
  await jar(path.join(next, 'mods'), 'new-core.jar', 'new_core');
  await recordBundledMods(next);
  await preservePersonalMods(previous, next);
  const inventory = await listMods(next);
  assert.equal(inventory.personal[0].id, 'personal_mod');
  assert.equal(inventory.bundled[0].id, 'new_core');
  assert.deepEqual(
    await fs.readFile(path.join(next, 'mods', 'extra.jar')),
    await fs.readFile(source),
  );
  await removePersonalMod(next, 'extra.jar');
  await assert.rejects(removePersonalMod(next, 'new-core.jar'), /protected/);
});

test('an update collision blocks instead of overwriting required mods', async (t) => {
  const directory = await fixture(t);
  const previous = await instance(directory, 'previous');
  await recordBundledMods(previous);
  const source = await jar(
    path.join(directory, 'downloads'),
    'extra.jar',
    'personal_mod',
  );
  await addLocalMods(previous, [source]);
  const next = await instance(directory, 'next');
  const core = await jar(
    path.join(next, 'mods'),
    'required.jar',
    'personal_mod',
    { version: '2.0.0' },
  );
  await recordBundledMods(next);
  const original = await fs.readFile(core);
  await assert.rejects(
    preservePersonalMods(previous, next),
    /conflicts with your added mod/,
  );
  assert.deepEqual(await fs.readFile(core), original);
  assert.ok((await fs.stat(path.join(previous, 'mods', 'extra.jar'))).isFile());
});

test('a personal mod adopted unchanged by a new pack becomes protected', async (t) => {
  const directory = await fixture(t);
  const previous = await instance(directory, 'previous');
  await recordBundledMods(previous);
  const source = await jar(
    path.join(directory, 'downloads'),
    'extra.jar',
    'personal_mod',
  );
  await addLocalMods(previous, [source]);
  const next = await instance(directory, 'next');
  await fs.copyFile(source, path.join(next, 'mods', 'extra.jar'));
  await recordBundledMods(next);
  assert.deepEqual(await preservePersonalMods(previous, next), [
    'personal_mod',
  ]);
  assert.equal((await listMods(next)).personal.length, 0);
  await assert.rejects(removePersonalMod(next, 'extra.jar'), /protected/);
});

test('manually copied Iris survives repeated updates while old bundled mods are replaced', async (t) => {
  const directory = await fixture(t);
  const previous = await instance(directory, 'previous');
  await jar(path.join(previous, 'mods'), 'old-core.jar', 'pack_core');
  await recordBundledMods(previous);
  const iris = await jar(path.join(previous, 'mods'), 'iris.jar', 'iris');
  const expected = await fs.readFile(iris);
  const next = await instance(directory, 'next');
  await jar(path.join(next, 'mods'), 'new-core.jar', 'pack_core', {
    version: '2.0.0',
  });
  await recordBundledMods(next);
  await preservePersonalMods(previous, next);
  assert.deepEqual(
    await fs.readFile(path.join(next, 'mods/iris.jar')),
    expected,
  );
  await assert.rejects(fs.stat(path.join(next, 'mods/old-core.jar')), {
    code: 'ENOENT',
  });
  await assert.rejects(removePersonalMod(next, 'iris.jar'), /protected/);
  const third = await instance(directory, 'third');
  await recordBundledMods(third);
  await preservePersonalMods(next, third);
  assert.deepEqual(
    await fs.readFile(path.join(third, 'mods/iris.jar')),
    expected,
  );
});

test('updated personal mod metadata is carried forward and manual conflicts block activation', async (t) => {
  const directory = await fixture(t);
  const previous = await instance(directory, 'previous');
  await recordBundledMods(previous);
  const source = await jar(
    path.join(directory, 'downloads'),
    'iris.jar',
    'iris',
  );
  await addLocalMods(previous, [source]);
  await jar(path.join(previous, 'mods'), 'iris.jar', 'iris', {
    version: '2.0.0',
  });
  const next = await instance(directory, 'next');
  await recordBundledMods(next);
  await preservePersonalMods(previous, next);
  assert.equal((await listMods(next)).personal[0].version, '2.0.0');
  const third = await instance(directory, 'third');
  await jar(path.join(third, 'mods'), 'required-iris.jar', 'iris', {
    version: '3.0.0',
  });
  await recordBundledMods(third);
  await assert.rejects(preservePersonalMods(next, third), /conflicts/);
});
