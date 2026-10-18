const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createSessionStore } = require('../electron/sessions.cjs');

test('encrypted sessions survive restarts and sign-out removes them', async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'patilanci-session-test-'),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const key = crypto.randomBytes(32);
  const storage = {
    isEncryptionAvailable: () => true,
    encryptString(value) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([
        cipher.update(value, 'utf8'),
        cipher.final(),
      ]);
      return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
    },
    decryptString(value) {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        value.subarray(0, 12),
      );
      decipher.setAuthTag(value.subarray(12, 28));
      return Buffer.concat([
        decipher.update(value.subarray(28)),
        decipher.final(),
      ]).toString('utf8');
    },
  };
  const file = path.join(directory, 'session.enc');
  const session = {
    mode: 'offline',
    offlineName: 'Player_1',
    refreshToken: 'secret-microsoft-refresh-token',
  };
  await createSessionStore(file, storage).write(session);
  const restarted = createSessionStore(file, storage);
  assert.deepEqual(await restarted.read(), { ...session, version: 1 });
  assert.equal(
    (await fs.readFile(file)).includes(Buffer.from(session.refreshToken)),
    false,
  );
  await restarted.clear();
  assert.deepEqual(await restarted.read(), {});
  await fs.writeFile(file, 'corrupt');
  assert.deepEqual(await restarted.read(), {});
});

test('sessions refuse insecure or unavailable encryption', async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'patilanci-session-test-'),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  for (const storage of [
    { isEncryptionAvailable: () => false },
    {
      isEncryptionAvailable: () => true,
      getSelectedStorageBackend: () => 'basic_text',
    },
  ]) {
    const store = createSessionStore(
      path.join(directory, 'session.enc'),
      storage,
    );
    await assert.rejects(
      store.write({ offlineName: 'Player_1' }),
      /Secure session storage/,
    );
    assert.deepEqual(await store.read(), {});
  }
});
