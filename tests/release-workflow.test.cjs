const test = require('node:test');
const assert = require('node:assert/strict');
const {
  releaseDetails,
  checkExistingRelease,
  releaseEnvironment,
} = require('../packaging/prepare-release.cjs');

test('unsigned releases need the download service but no certificate secrets', () => {
  const env = {
    GITHUB_EVENT_NAME: 'push',
    GITHUB_REF: 'refs/heads/master',
    PUBLIC_DOWNLOAD_SERVICE_URL: 'https://patilanci.net/launcher',
  };
  assert.equal(releaseEnvironment(env), 'https://patilanci.net/launcher');
  assert.equal(
    releaseEnvironment({ ...env, GITHUB_EVENT_NAME: 'workflow_dispatch' }),
    'https://patilanci.net/launcher',
  );
  assert.throws(
    () => releaseEnvironment({ ...env, GITHUB_EVENT_NAME: 'pull_request' }),
    /master/,
  );
  assert.throws(
    () => releaseEnvironment({ ...env, PUBLIC_DOWNLOAD_SERVICE_URL: '' }),
    /PUBLIC_DOWNLOAD_SERVICE_URL/,
  );
  assert.throws(
    () =>
      releaseEnvironment({
        ...env,
        PUBLIC_DOWNLOAD_SERVICE_URL: 'http://example.com',
      }),
    /HTTPS/,
  );
  assert.throws(
    () => releaseEnvironment({ ...env, GITHUB_REF: 'refs/heads/feature' }),
    /master/,
  );
});

test('release versions must match the lockfile and have their own stable release notes', () => {
  const pkg = { version: '1.2.3' };
  const lock = { version: pkg.version, packages: { '': pkg } };
  const details = releaseDetails(
    pkg,
    lock,
    '# Changelog\n\n## 1.2.3 - 2026-10-18\n\n- Fixed login.\n\n## 1.2.2 - 2026-10-17\n\n- Older fix.\n',
  );
  assert.equal(details.tag, 'v1.2.3');
  assert.match(details.notes, /Fixed login/);
  assert.doesNotMatch(details.notes, /Older fix/);
  assert.throws(
    () => releaseDetails(pkg, { ...lock, version: '1.2.2' }, ''),
    /must match/,
  );
  assert.throws(
    () => releaseDetails(pkg, lock, '# Changelog'),
    /release notes/,
  );
  assert.throws(
    () => releaseDetails({ version: '1.2.3-beta.1' }, lock, ''),
    /stable/,
  );
});

test('published releases cannot be overwritten and only a draft from the same commit can resume', () => {
  assert.equal(checkExistingRelease(null, 'abc'), false);
  assert.equal(
    checkExistingRelease({ draft: true, target_commitish: 'abc' }, 'abc'),
    true,
  );
  assert.throws(
    () => checkExistingRelease({ draft: false }, 'abc'),
    /already published/,
  );
  assert.throws(
    () => checkExistingRelease({ draft: true, target_commitish: 'old' }, 'abc'),
    /another commit/,
  );
});
