const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { savePreferences } = require('../electron/preferences.cjs');

async function fixture(context) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'patilanci-preferences-test-'),
  );
  assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith('patilanci-preferences-test-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  return path.join(directory, 'settings.json');
}

test('saving preferences without a key field preserves the encrypted download credential', async (context) => {
  const file = await fixture(context);
  await fs.writeFile(
    file,
    JSON.stringify({ memory: 6, javaPath: 'java', key: 'encrypted-fixture' }),
  );
  await savePreferences(file, { memory: 8, javaPath: ' java21 ' });
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), {
    memory: 8,
    javaPath: 'java21',
    key: 'encrypted-fixture',
  });
});

test('renderer-supplied credentials cannot replace or erase the stored key', async (context) => {
  const file = await fixture(context);
  await fs.writeFile(file, JSON.stringify({ key: 'encrypted-fixture' }));
  await savePreferences(file, {
    memory: 4,
    javaPath: 'java',
    apiKey: 'replacement',
    key: null,
  });
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), {
    memory: 4,
    javaPath: 'java',
    key: 'encrypted-fixture',
  });
});

test('preferences can be saved before download credentials are provisioned', async (context) => {
  const file = await fixture(context);
  await savePreferences(file, { memory: 6, javaPath: 'java' });
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), {
    memory: 6,
    javaPath: 'java',
    key: null,
  });
});

test('invalid preferences and corrupt saved settings are not written over', async (context) => {
  const file = await fixture(context);
  const existing = JSON.stringify({ key: 'encrypted-fixture' });
  await fs.writeFile(file, existing);
  await assert.rejects(savePreferences(file, { memory: 80, javaPath: 'java' }));
  assert.equal(await fs.readFile(file, 'utf8'), existing);
  await fs.writeFile(file, 'corrupt settings');
  await assert.rejects(savePreferences(file, { memory: 6, javaPath: 'java' }));
  assert.equal(await fs.readFile(file, 'utf8'), 'corrupt settings');
});

test('hide-on-launch persists in both directions and invalid values cannot replace settings', async (context) => {
  const file = await fixture(context);
  for (const hideOnLaunch of [true, false]) {
    await savePreferences(file, { memory: 6, javaPath: 'java', hideOnLaunch });
    assert.equal(
      JSON.parse(await fs.readFile(file, 'utf8')).hideOnLaunch,
      hideOnLaunch,
    );
  }
  const existing = await fs.readFile(file, 'utf8');
  for (const hideOnLaunch of ['false', 1, null, {}]) {
    await assert.rejects(
      savePreferences(file, { memory: 6, javaPath: 'java', hideOnLaunch }),
    );
    assert.equal(await fs.readFile(file, 'utf8'), existing);
  }
});

test('version-specific Java paths persist with whitespace removed and reset to automatic', async (context) => {
  const file = await fixture(context);
  await savePreferences(file, {
    memory: 6,
    javaPath: 'java',
    javaPaths: { 8: '', 17: ' C:\\Java17\\bin\\java.exe ', 21: '' },
  });
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')).javaPaths, {
    17: 'C:\\Java17\\bin\\java.exe',
  });
  await savePreferences(file, { memory: 6, javaPath: 'java', javaPaths: {} });
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')).javaPaths, {});
  for (const javaPaths of [
    [],
    null,
    { 21: 42 },
    { 21: 'bad\0path' },
    { 99: 'java.exe' },
  ]) {
    await assert.rejects(
      savePreferences(file, { memory: 6, javaPath: 'java', javaPaths }),
    );
  }
});
