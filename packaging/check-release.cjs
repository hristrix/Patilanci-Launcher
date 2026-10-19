const fs = require('node:fs');
const path = require('node:path');
const { validateLockfile } = require('./check-lockfile.cjs');
const { releaseDetails } = require('./prepare-release.cjs');

function checkRelease(root = path.resolve(__dirname, '..')) {
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  validateLockfile(pkg, lock);
  return releaseDetails(pkg, lock, read('CHANGELOG.md'));
}
if (require.main === module) {
  try {
    console.log(`Release preflight passed for ${checkRelease().tag}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { checkRelease };
