const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000;
const PIN_PATTERN = /^[0-9]{6,12}$/;

function validateOfflineName(name) {
  if (typeof name !== 'string' || !/^[A-Za-z0-9_]{3,16}$/.test(name)) {
    throw new Error('Username must have 3–16 letters, numbers or underscores.');
  }
  return name;
}

function createOfflineProfiles(file, { now = Date.now } = {}) {
  let pending = Promise.resolve();

  // Serialize reads and writes so concurrent requests cannot lose failed attempts.
  function exclusive(callback) {
    const operation = pending.then(callback);
    pending = operation.catch(() => {});
    return operation;
  }

  async function read() {
    let data;
    try {
      data = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return { version: 1, profiles: [] };
      throw new Error(
        'Local profile data cannot be read. Existing PIN protection was kept.',
      );
    }

    const names = new Set();
    if (
      data?.version !== 1 ||
      !Array.isArray(data.profiles) ||
      data.profiles.length > 1000
    ) {
      throw new Error(
        'Invalid local profile data. PIN verification is blocked.',
      );
    }
    for (const profile of data.profiles) {
      validateOfflineName(profile?.name);
      const key = profile.name.toLowerCase();
      if (
        names.has(key) ||
        profile.algorithm !== 'scrypt-v1' ||
        typeof profile.salt !== 'string' ||
        typeof profile.hash !== 'string' ||
        !/^[a-f0-9]{32}$/.test(profile.salt) ||
        !/^[a-f0-9]{128}$/.test(profile.hash) ||
        !Number.isInteger(profile.failures) ||
        profile.failures < 0 ||
        profile.failures > MAX_ATTEMPTS ||
        !Number.isSafeInteger(profile.lockedUntil) ||
        profile.lockedUntil < 0
      ) {
        throw new Error(
          'Invalid local profile data. PIN verification is blocked.',
        );
      }
      names.add(key);
    }
    return data;
  }

  async function write(data) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, JSON.stringify(data), {
        mode: 0o600,
        flag: 'wx',
      });
      await fs.rename(temporary, file);
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }

  async function derive(pin, salt) {
    return scrypt(pin, Buffer.from(salt, 'hex'), 64, {
      N: 32768,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    });
  }

  function find(data, name) {
    return data.profiles.find(
      (profile) => profile.name.toLowerCase() === name.toLowerCase(),
    );
  }

  function status(name) {
    validateOfflineName(name);
    return exclusive(async () => {
      const profile = find(await read(), name);
      const lockedUntil =
        profile?.lockedUntil > now() ? profile.lockedUntil : 0;
      const failures =
        profile?.lockedUntil && !lockedUntil ? 0 : profile?.failures || 0;
      // Only public state crosses IPC; never expose the salt or PIN hash.
      return {
        exists: Boolean(profile),
        lockedUntil,
        attemptsRemaining: MAX_ATTEMPTS - failures,
      };
    });
  }

  function authorize(request) {
    return exclusive(async () => {
      const name = validateOfflineName(request?.name);
      const data = await read();
      let profile = find(data, name);
      if (profile?.lockedUntil > now()) {
        throw new Error(
          'This local profile is locked for five minutes after repeated incorrect PINs.',
        );
      }
      if (typeof request.pin !== 'string' || !PIN_PATTERN.test(request.pin)) {
        throw new Error('Enter a PIN containing 6–12 digits.');
      }

      if (!profile) {
        if (request.confirmPin !== request.pin)
          throw new Error('The PIN confirmation does not match.');
        if (data.profiles.length >= 1000)
          throw new Error('The local profile limit was reached.');
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = (await derive(request.pin, salt)).toString('hex');
        profile = {
          name,
          algorithm: 'scrypt-v1',
          salt,
          hash,
          failures: 0,
          lockedUntil: 0,
        };
        data.profiles.push(profile);
        await write(data);
        return { name: profile.name };
      }

      if (profile.lockedUntil) {
        profile.failures = 0;
        profile.lockedUntil = 0;
      }
      const candidate = await derive(request.pin, profile.salt);
      const matches = crypto.timingSafeEqual(
        candidate,
        Buffer.from(profile.hash, 'hex'),
      );
      candidate.fill(0);
      if (!matches) {
        profile.failures += 1;
        if (profile.failures >= MAX_ATTEMPTS)
          profile.lockedUntil = now() + LOCK_DURATION_MS;
        await write(data);
        throw new Error(
          profile.lockedUntil
            ? 'Too many incorrect PINs. This local profile is locked for five minutes.'
            : `Incorrect local profile PIN. ${MAX_ATTEMPTS - profile.failures} attempts remaining.`,
        );
      }

      profile.failures = 0;
      profile.lockedUntil = 0;
      await write(data);
      // Preserve original casing: changing it can change an offline UUID.
      return { name: profile.name };
    });
  }

  return { status, authorize };
}

module.exports = {
  createOfflineProfiles,
  validateOfflineName,
  LOCK_DURATION_MS,
};
