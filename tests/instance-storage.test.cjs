const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  directorySize,
  createInstanceStorage,
} = require('../electron/instance-storage.cjs');

test('storage counts installed game files and player data, with missing folders treated as empty', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'patilanci-size-test-'));
  assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
  assert.ok(path.basename(root).startsWith('patilanci-size-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [file, size] of [
    ['mods/mod.jar', 120],
    ['assets/objects/ab/hash', 240],
    ['xaero/map.dat', 500],
  ]) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), Buffer.alloc(size));
  }
  assert.deepEqual(await directorySize(root), {
    bytes: 860,
    files: 3,
    partial: false,
  });
  assert.deepEqual(await directorySize(path.join(root, 'absent')), {
    bytes: 0,
    files: 0,
    partial: false,
  });
});
test('size requests coalesce, cache briefly, and refresh after invalidation', async () => {
  let now = 0,
    calls = 0;
  const reader = createInstanceStorage({
    instance: () => 'game',
    runtimes: () => 'java',
    now: () => now,
    measure: async (root) => {
      calls++;
      return { bytes: root === 'game' ? 100 : 25, files: 1, partial: false };
    },
  });
  const first = reader.read();
  assert.equal(first, reader.read());
  assert.equal((await first).totalBytes, 125);
  await reader.read();
  assert.equal(calls, 2);
  await reader.read(true);
  assert.equal(calls, 4);
  reader.invalidate();
  await reader.read();
  assert.equal(calls, 6);
  now = 61000;
  await reader.read();
  assert.equal(calls, 8);
});
test('storage formatting handles bytes, binary units, partial scans and unavailable values', async () => {
  const { formatBytes, storageLabel } = await import('../src/lib/storage.mjs');
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1024), '1.0 КиБ');
  assert.equal(formatBytes(1536 * 1024 * 1024), '1.50 ГиБ');
  assert.equal(formatBytes(NaN), 'Няма данни');
  assert.equal(storageLabel(null), 'Изчисляване…');
  assert.equal(
    storageLabel({ status: 'partial', instanceBytes: 1024 }),
    'Поне 1.0 КиБ',
  );
  assert.equal(storageLabel({ status: 'error' }), 'Няма данни');
});
