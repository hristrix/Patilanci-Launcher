const test = require('node:test');
const assert = require('node:assert/strict');
const { validateLockfile } = require('../packaging/check-lockfile.cjs');

test('the committed lockfile is complete and matches the launcher package', () => {
  assert.equal(
    validateLockfile(
      require('../package.json'),
      require('../package-lock.json'),
    ),
    true,
  );
});
test('versionless optional dependency entries fail with an actionable error before npm ci', () => {
  const pkg = { version: '1.0.0' };
  const lock = {
    version: '1.0.0',
    packages: {
      '': { version: '1.0.0' },
      'node_modules/esbuild/node_modules/@esbuild/android-arm': {
        dev: true,
        optional: true,
      },
    },
  };
  assert.throws(
    () => validateLockfile(pkg, lock),
    /Invalid dependency lockfile: node_modules\/esbuild\/.*no valid version/,
  );
  lock.packages[
    'node_modules/esbuild/node_modules/@esbuild/android-arm'
  ].version = '';
  assert.throws(() => validateLockfile(pkg, lock), /no valid version/);
});
test('missing dependency declarations and unsynchronized root versions fail validation', () => {
  const pkg = { version: '1.0.0', dependencies: { react: '^19.2.0' } };
  const lock = { version: '1.0.0', packages: { '': { version: '1.0.0' } } };
  assert.throws(
    () => validateLockfile(pkg, lock),
    /does not match.*dependencies/,
  );
  lock.packages[''].dependencies = pkg.dependencies;
  assert.equal(validateLockfile(pkg, lock), true);
  lock.version = '0.9.0';
  assert.throws(() => validateLockfile(pkg, lock), /versions must match/);
});
