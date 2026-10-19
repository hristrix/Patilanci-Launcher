const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { verifyInstaller } = require('../packaging/verify-installer.cjs');
const { checkRelease } = require('../packaging/check-release.cjs');

async function fixture(t) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'patilanci-installer-test-'),
  );
  assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith('patilanci-installer-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const version = '1.2.3';
  const name = `Patilanci-Launcher-Setup-${version}-x64.exe`;
  const data = Buffer.from('installer fixture');
  const hash = crypto.createHash('sha512').update(data).digest('base64');
  const metadata = {
    version,
    files: [{ url: name, sha512: hash, size: data.length }],
    path: name,
    sha512: hash,
  };
  await fs.writeFile(path.join(directory, name), data);
  const save = () =>
    fs.writeFile(path.join(directory, 'latest.yml'), JSON.stringify(metadata));
  await save();
  return { directory, version, name, metadata, save };
}
test('production artifacts match the package version, updater file and actual installer checksum', async (t) => {
  const { directory, version, name } = await fixture(t);
  assert.equal((await verifyInstaller(directory, version)).installer, name);
  assert.equal(checkRelease().version, require('../package.json').version);
});
test('wrong versions, incorrect installer filenames and corrupt updater hashes block publication', async (t) => {
  const { directory, version, metadata, save } = await fixture(t);
  await assert.rejects(
    verifyInstaller(directory, '1.2.4'),
    /exact launcher version/,
  );
  metadata.files[0].url = '../outside.exe';
  await save();
  await assert.rejects(verifyInstaller(directory, version), /filename/);
  metadata.files[0].url = metadata.path;
  metadata.files[0].sha512 = 'corrupt';
  await save();
  await assert.rejects(verifyInstaller(directory, version), /checksum/);
});
test('truncated installers and inaccurate updater sizes block publication', async (t) => {
  const { directory, version, name, metadata, save } = await fixture(t);
  metadata.files[0].size++;
  await save();
  await assert.rejects(verifyInstaller(directory, version), /incorrect size/);
  await fs.writeFile(path.join(directory, name), '');
  await assert.rejects(verifyInstaller(directory, version), /empty/);
});
