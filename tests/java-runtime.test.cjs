const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const Zip = require('adm-zip');
const {
  parseJavaVersion,
  checkJava,
  requiredJava,
  downloadRuntime,
  extractRuntime,
  ensureJava,
  prepareJava,
} = require('../electron/java-runtime.cjs');

async function fixture(t) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'patilanci-java-test-'),
  );
  assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith('patilanci-java-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}
async function profile(root, id, data) {
  const folder = path.join(root, 'versions', id);
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(
    path.join(folder, `${id}.json`),
    JSON.stringify({ id, ...data }),
  );
}
test('Java version detection handles Java 8 and current releases and rejects mismatches', async () => {
  for (const [output, major] of [
    ['java version "1.8.0_462"', 8],
    ['openjdk version "17.0.16" 2025-07-15', 17],
    ['openjdk version "21.0.9" 2025-10-21 LTS', 21],
    ['openjdk version "25" 2025-09-16', 25],
  ])
    assert.equal(parseJavaVersion(output), major);
  assert.throws(() => parseJavaVersion('command not found'));
  assert.equal(await checkJava('custom.exe', 21, async () => 21), 'custom.exe');
  await assert.rejects(
    checkJava('custom.exe', 21, async () => 17),
    /Java 21 is required.*Java 17/,
  );
});
test('Java requirements follow Minecraft metadata and higher loader requirements', async (t) => {
  const root = await fixture(t);
  const pack = { minecraft: '1.21.11', custom: 'fabric-test' };
  await profile(root, pack.minecraft, { javaVersion: { majorVersion: 21 } });
  const offline = () => {
    throw new Error('Network must not be needed');
  };
  assert.equal(await requiredJava(pack, root, offline), 21);
  await profile(root, pack.custom, { javaVersion: { majorVersion: 25 } });
  assert.equal(await requiredJava(pack, root, offline), 25);
});
test('first-launch requirements are fetched and cached for offline reuse', async (t) => {
  const root = await fixture(t);
  const pack = { minecraft: '26.1', custom: 'fabric-test' };
  const calls = [];
  const readJson = async (url) => {
    calls.push(url);
    return url.includes('version_manifest')
      ? { versions: [{ id: '26.1', url: 'https://example.com/version.json' }] }
      : { id: '26.1', javaVersion: { majorVersion: 25 } };
  };
  assert.equal(await requiredJava(pack, root, readJson), 25);
  assert.equal(calls.length, 2);
  assert.equal(
    await requiredJava(pack, root, () => {
      throw new Error('offline');
    }),
    25,
  );
  await assert.rejects(
    requiredJava({ minecraft: 'unknown' }, root, async () => ({
      versions: [],
    })),
    /Cannot find Java requirements/,
  );
});
test('custom Java paths take priority, and mismatches never download or launch', async (t) => {
  const directory = await fixture(t);
  const readJson = () => {
    throw new Error('Must not download for custom Java');
  };
  assert.equal(
    await ensureJava(
      { major: 21, javaPaths: { 21: ' custom.exe ' }, directory },
      { probe: async () => 21, readJson },
    ),
    'custom.exe',
  );
  await assert.rejects(
    ensureJava(
      { major: 25, javaPaths: { 25: 'old.exe' }, directory },
      { probe: async () => 21, readJson },
    ),
    /Java 25 is required/,
  );
});
test('managed Java installs once, validates before activation and reuses without network', async (t) => {
  const directory = await fixture(t);
  let downloads = 0;
  const zip = new Zip();
  zip.addFile('temurin-21/bin/java.exe', Buffer.from('test executable'));
  const dependencies = {
    platform: 'win32',
    arch: 'x64',
    probe: async () => 21,
    readJson: async () => [
      {
        version: { major: 21 },
        binary: {
          package: { name: 'jre.zip', link: 'https://example.com/jre.zip' },
        },
      },
    ],
    download: async (_, file) => {
      downloads++;
      await fs.writeFile(file, zip.toBuffer());
    },
  };
  const executable = await ensureJava({ major: 21, directory }, dependencies);
  assert.equal(await fs.readFile(executable, 'utf8'), 'test executable');
  assert.equal(downloads, 1);
  assert.equal(
    await ensureJava(
      { major: 21, directory },
      {
        ...dependencies,
        readJson: () => {
          throw new Error('offline');
        },
      },
    ),
    executable,
  );
  assert.equal(downloads, 1);
  assert.deepEqual(await fs.readdir(directory), ['java-21-x64']);
});
test('failed or corrupt Java downloads do not activate partial runtimes', async (t) => {
  const directory = await fixture(t);
  await assert.rejects(
    ensureJava(
      { major: 17, directory },
      {
        platform: 'win32',
        arch: 'x64',
        readJson: async () => [
          { version: { major: 17 }, binary: { package: { name: 'jre.zip' } } },
        ],
        download: async () => {
          throw new Error('Download integrity check failed');
        },
      },
    ),
    /integrity/,
  );
  assert.deepEqual(await fs.readdir(directory), []);
  await assert.rejects(
    ensureJava({ major: 21, directory }, { platform: 'linux' }),
    /Set a Java executable/,
  );
});
test('runtime download checks SHA-256 and requires HTTPS', async (t) => {
  const directory = await fixture(t);
  const data = Buffer.from('runtime bytes');
  const pkg = {
    link: 'https://example.com/java.zip',
    checksum: crypto.createHash('sha256').update(data).digest('hex'),
    size: data.length,
  };
  const response = async () => new Response(data);
  await downloadRuntime(
    pkg,
    path.join(directory, 'valid.zip'),
    () => {},
    response,
  );
  assert.deepEqual(await fs.readFile(path.join(directory, 'valid.zip')), data);
  await assert.rejects(
    downloadRuntime(
      { ...pkg, checksum: '0'.repeat(64) },
      path.join(directory, 'invalid.zip'),
      () => {},
      response,
    ),
    /integrity/,
  );
  await assert.rejects(
    downloadRuntime(
      { ...pkg, link: 'http://example.com/java.zip' },
      path.join(directory, 'http.zip'),
    ),
    /Invalid Java download/,
  );
});
test('runtime extraction rejects unsafe paths and archives without Java', async (t) => {
  const directory = await fixture(t);
  const zip = new Zip();
  zip.addFile('temurin/readme.txt', Buffer.from('no Java'));
  const archive = path.join(directory, 'missing.zip');
  await fs.writeFile(archive, zip.toBuffer());
  assert.throws(
    () => extractRuntime(archive, path.join(directory, 'unpacked')),
    /does not contain/,
  );
  const unsafe = new Zip();
  unsafe.addFile('temurin/C:/escape', Buffer.from('unsafe'));
  const invalid = path.join(directory, 'unsafe.zip');
  await fs.writeFile(invalid, unsafe.toBuffer());
  assert.throws(
    () => extractRuntime(invalid, path.join(directory, 'bad')),
    /Unsafe archive/,
  );
});
test('cancelling Java preparation terminates its background worker', async (t) => {
  const directory = await fixture(t);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    prepareJava(
      { pack: { minecraft: '26.1' }, instance: directory, directory },
      { signal: controller.signal },
    ),
    /cancelled/,
  );
  assert.deepEqual(await fs.readdir(directory), []);
});
