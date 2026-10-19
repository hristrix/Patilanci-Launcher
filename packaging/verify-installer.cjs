const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseUpdateInfo } = require('electron-updater/out/providers/Provider');

async function verifyInstaller(directory, version) {
  const expected = `Patilanci-Launcher-Setup-${version}-x64.exe`;
  const metadata = parseUpdateInfo(
    await fs.promises.readFile(path.join(directory, 'latest.yml'), 'utf8'),
    'latest.yml',
    'local build',
  );
  if (
    metadata?.version !== version ||
    !Array.isArray(metadata.files) ||
    metadata.files.length !== 1 ||
    metadata.files[0].url !== expected ||
    (metadata.path && metadata.path !== expected)
  ) {
    throw new Error(
      'Installer and updater metadata must reference this exact launcher version and filename.',
    );
  }
  const entry = metadata.files[0];
  const installer = path.join(directory, expected);
  const stat = await fs.promises.stat(installer);
  if (
    !stat.isFile() ||
    !stat.size ||
    (entry.size !== undefined && entry.size !== stat.size)
  )
    throw new Error(
      'The installer is missing, empty, or has an incorrect size.',
    );
  const digest = crypto.createHash('sha512');
  for await (const chunk of fs.createReadStream(installer))
    digest.update(chunk);
  const hash = digest.digest('base64');
  if (entry.sha512 !== hash || (metadata.sha512 && metadata.sha512 !== hash))
    throw new Error(
      'Installer checksum does not match updater metadata. Do not publish these files.',
    );
  return { version, installer: expected, bytes: stat.size };
}
if (require.main === module) {
  verifyInstaller(
    path.resolve(__dirname, '../release/production/installer'),
    require('../package.json').version,
  )
    .then((result) =>
      console.log(
        `Verified ${result.installer} (${result.bytes} bytes), updater version and SHA-512.`,
      ),
    )
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
module.exports = { verifyInstaller };
