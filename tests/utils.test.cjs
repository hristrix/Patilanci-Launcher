const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { safePath, validateSettings } = require('../electron/utils.cjs');
test('archive entries cannot escape instance', () => {
  const root = path.resolve('test-instance');
  for (const p of [
    '../escape',
    'a/../../escape',
    'C:/escape',
    'a\\..\\escape',
    '/escape',
  ])
    assert.throws(() => safePath(root, p));
  assert.equal(
    safePath(root, 'config/test.json'),
    path.join(root, 'config', 'test.json'),
  );
});
test('settings constrain memory and reject malformed input', () => {
  for (const memory of [0, 33, NaN, 2.5])
    assert.throws(() => validateSettings({ memory, javaPath: 'java' }));
  assert.deepEqual(validateSettings({ memory: '6', javaPath: ' java ' }), {
    memory: 6,
    javaPath: 'java',
  });
});
