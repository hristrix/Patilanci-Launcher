const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

async function updateBundle() {
  const source = path.join(
    __dirname,
    'build/libs/patilanci-skin-companion-1.0.0.jar',
  );
  const destination = path.join(
    __dirname,
    '../electron/assets/patilanci-skin-companion.jar',
  );
  const bytes = await fs.readFile(source);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, bytes);
  await fs.writeFile(
    `${destination}.sha256`,
    crypto.createHash('sha256').update(bytes).digest('hex'),
  );
  console.log('Updated bundled Patilanci Skin Companion and SHA-256.');
}

updateBundle().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
