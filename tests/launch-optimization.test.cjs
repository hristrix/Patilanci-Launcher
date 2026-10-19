const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const syncFs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { FileVerification } = require('../electron/file-verification.cjs');
const { prepareLaunch } = require('../electron/launch-preparation.cjs');
const { reuseGameDownloads } = require('../electron/instance-data.cjs');

async function fixture(t) {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), 'patilanci-launch-test-'),
  );
  assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
  assert.ok(path.basename(root).startsWith('patilanci-launch-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
const hash = (data) => crypto.createHash('sha1').update(data).digest('hex');
test('warm verification avoids asset content reads, including after restarting the launcher', async (t) => {
  const root = await fixture(t);
  const file = path.join(root, 'asset');
  const bytes = Buffer.alloc(256 * 1024, 7);
  await fs.writeFile(file, bytes);
  let reads = 0;
  const options = {
    read: (file) => {
      reads++;
      return syncFs.readFileSync(file);
    },
  };
  const cold = new FileVerification(root, options);
  assert.equal(cold.check(hash(bytes), file), true);
  assert.equal(reads, 1);
  assert.equal(cold.check(hash(bytes), file), true);
  assert.equal(reads, 1);
  cold.save();
  const warm = new FileVerification(root, options);
  assert.equal(warm.check(hash(bytes), file), true);
  assert.equal(reads, 1, 'an unchanged file must not be read again');
});
test('changed, replaced, missing and corrupt files cannot use a cached verification', async (t) => {
  const root = await fixture(t);
  const file = path.join(root, 'library.jar');
  await fs.writeFile(file, 'good');
  const cache = new FileVerification(root);
  assert.equal(cache.check(hash('good'), file), true);
  assert.equal(cache.check(hash('different expected digest'), file), false);
  const stat = await fs.stat(file);
  await fs.writeFile(file, 'evil');
  await fs.utimes(file, stat.atime, new Date(stat.mtimeMs - 1000));
  assert.equal(cache.check(hash('good'), file), false);
  await fs.unlink(file);
  assert.equal(cache.check(hash('good'), file), false);
  await fs.writeFile(file, 'evil');
  assert.equal(cache.check(hash('good'), file), false);
  await fs.writeFile(
    path.join(root, 'patilanci-checksums.json'),
    'corrupt cache',
  );
  assert.equal(new FileVerification(root).check(hash('good'), file), false);
});
test('new pack download files take priority, missing immutable assets and libraries are reused', async (t) => {
  const root = await fixture(t);
  const previous = path.join(root, 'previous');
  const next = path.join(root, 'next');
  for (const [file, data] of Object.entries({
    'assets/objects/hash': 'asset',
    'libraries/lib.jar': 'library',
    'libraries/current.jar': 'old',
    'versions/old.json': 'old version',
    'mods/old.jar': 'old mod',
  })) {
    await fs.mkdir(path.dirname(path.join(previous, file)), {
      recursive: true,
    });
    await fs.writeFile(path.join(previous, file), data);
  }
  await fs.mkdir(path.join(next, 'libraries'), { recursive: true });
  await fs.writeFile(path.join(next, 'libraries/current.jar'), 'new');
  await reuseGameDownloads(previous, next);
  assert.equal(
    await fs.readFile(path.join(next, 'assets/objects/hash'), 'utf8'),
    'asset',
  );
  assert.equal(
    await fs.readFile(path.join(next, 'libraries/lib.jar'), 'utf8'),
    'library',
  );
  assert.equal(
    await fs.readFile(path.join(next, 'libraries/current.jar'), 'utf8'),
    'new',
  );
  await assert.rejects(fs.access(path.join(next, 'mods/old.jar')), {
    code: 'ENOENT',
  });
  await assert.rejects(fs.access(path.join(next, 'versions/old.json')), {
    code: 'ENOENT',
  });
  await fs.writeFile(path.join(next, 'libraries/lib.jar'), 'repair');
  assert.equal(
    await fs.readFile(path.join(previous, 'libraries/lib.jar'), 'utf8'),
    'library',
    'cache reuse must not hard-link mutable copies',
  );
  await reuseGameDownloads(path.join(root, 'missing'), next);
});
function launchOptions(extra = {}) {
  return {
    install: async (options) => assert.equal(options.refreshInventory, false),
    readSettings: async () => ({ memory: 6 }),
    readInstalled: async () => ({ fileId: 42 }),
    getLatest: async () => ({ id: 42 }),
    prepareRuntime: async () => 'java.exe',
    controller: new AbortController(),
    ...extra,
  };
}
test('Java preparation and the fresh release check overlap, and both must finish before launch', async () => {
  let releaseJava, releaseLatest;
  const started = [];
  let complete = false;
  const preparation = prepareLaunch(
    launchOptions({
      getLatest: () => {
        started.push('latest');
        return new Promise((resolve) => {
          releaseLatest = resolve;
        });
      },
      prepareRuntime: () => {
        started.push('java');
        return new Promise((resolve) => {
          releaseJava = resolve;
        });
      },
    }),
  ).then((value) => {
    complete = true;
    return value;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(started.sort(), ['java', 'latest']);
  releaseJava('java.exe');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(complete, false);
  releaseLatest({ id: 42 });
  assert.equal((await preparation).javaPath, 'java.exe');
});
test('unverified latest releases, Java failure and cancellation block optimized preparation', async () => {
  for (const getLatest of [
    async () => ({ id: 99 }),
    async () => {
      throw new Error('offline');
    },
  ]) {
    const options = launchOptions({ getLatest });
    await assert.rejects(prepareLaunch(options), /Launch blocked/);
    assert.equal(options.controller.signal.aborted, true);
  }
  await assert.rejects(
    prepareLaunch(
      launchOptions({
        prepareRuntime: async () => {
          throw new Error('Java mismatch');
        },
      }),
    ),
    /Java mismatch/,
  );
  const options = launchOptions();
  options.controller.abort();
  options.install = () => assert.fail('cancelled launch must not install');
  await assert.rejects(prepareLaunch(options), /cancelled/);
});
