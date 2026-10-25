const { test } = require('node:test');
const assert = require('node:assert/strict');

test('server commands follow Lionarius SkinRestorer syntax for the executing player', async () => {
  const { skinCommand } = await import('../src/lib/skin-commands.mjs');
  assert.equal(
    skinCommand({ source: 'mojang', value: 'Builder' }),
    '/skin set mojang Builder',
  );
  assert.equal(
    skinCommand({ source: 'ely.by', value: ' SkinOwner ' }),
    '/skin set ely.by SkinOwner',
  );
  assert.equal(
    skinCommand({
      source: 'web',
      value: 'https://example.com/skin.png?v=2',
      model: 'slim',
    }),
    '/skin set web slim "https://example.com/skin.png?v=2"',
  );
});

test('invalid names, command injection, credentials, local files, and oversized chat commands are rejected', async () => {
  const { skinCommand } = await import('../src/lib/skin-commands.mjs');
  for (const value of [
    '',
    'xx',
    'Player @a',
    'Player\n/stop',
    '../Builder',
    'a'.repeat(17),
  ])
    assert.throws(() => skinCommand({ source: 'mojang', value }));
  for (const value of [
    'file:///C:/skin.png',
    'javascript:alert(1)',
    'http://example.com/skin.png',
    'https://user:password@example.com/skin.png',
    'https://example.com/skin.png" @a',
    'https://example.com/skin.png\n/stop',
    'https://example.com/' + 'a'.repeat(256),
  ])
    assert.throws(() => skinCommand({ source: 'web', value }));
  assert.throws(() => skinCommand({ source: 'other', value: 'Builder' }));
  assert.throws(() =>
    skinCommand({
      source: 'web',
      value: 'https://example.com/skin.png',
      model: 'other',
    }),
  );
});
