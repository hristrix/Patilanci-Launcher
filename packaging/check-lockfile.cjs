const fs = require('node:fs');
const path = require('node:path');

function validateLockfile(pkg, lock) {
  if (
    !lock?.packages ||
    lock.version !== pkg.version ||
    lock.packages['']?.version !== pkg.version
  ) {
    throw new Error(
      'Package and lockfile versions must match. Use the documented npm version commands.',
    );
  }
  const version =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
  for (const [location, entry] of Object.entries(lock.packages)) {
    if (entry.link) continue;
    if (typeof entry.version !== 'string' || !version.test(entry.version)) {
      throw new Error(
        `Invalid dependency lockfile: ${location || '(root)'} has no valid version. Regenerate the lockfile with npm 10.9.4 in a clean folder before committing it.`,
      );
    }
  }
  for (const field of [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
  ]) {
    const declared = pkg[field] || {};
    const locked = lock.packages[''][field] || {};
    if (
      Object.keys(declared).length !== Object.keys(locked).length ||
      Object.entries(declared).some(([name, range]) => locked[name] !== range)
    ) {
      throw new Error(
        `package-lock.json does not match package.json ${field}. Regenerate it with npm 10.9.4.`,
      );
    }
  }
  return true;
}
if (require.main === module) {
  try {
    const root = path.resolve(__dirname, '..');
    validateLockfile(
      JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')),
      JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8')),
    );
    console.log(
      'Dependency lockfile versions and package declarations verified.',
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { validateLockfile };
