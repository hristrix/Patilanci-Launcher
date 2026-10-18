const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

function createSessionStore(file, storage) {
  function available() {
    return (
      storage.isEncryptionAvailable() &&
      storage.getSelectedStorageBackend?.() !== 'basic_text'
    );
  }
  async function read() {
    try {
      if (!available()) return {};
      const data = JSON.parse(storage.decryptString(await fs.readFile(file)));
      if (data?.version !== 1) return {};
      return data;
    } catch {
      // Unreadable sessions require a new sign-in; PIN records remain intact.
      return {};
    }
  }
  async function write(data) {
    if (!available())
      throw new Error(
        'Secure session storage is unavailable on this computer.',
      );
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    try {
      await fs.writeFile(
        temporary,
        storage.encryptString(JSON.stringify({ ...data, version: 1 })),
        { flag: 'wx', mode: 0o600 },
      );
      await fs.rename(temporary, file);
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }
  return { read, write, clear: () => fs.rm(file, { force: true }) };
}

module.exports = { createSessionStore };
