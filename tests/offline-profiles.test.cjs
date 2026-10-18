const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {
  createOfflineProfiles,
  LOCK_DURATION_MS,
} = require('../electron/offline-profiles.cjs');

async function fixture(context) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'patilanci-pin-test-'),
  );
  assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith('patilanci-pin-test-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  return path.join(directory, 'offline-profiles.json');
}

test('enrollment stores a salted hash and only public profile state leaves the store', async (context) => {
  const file = await fixture(context);
  const profiles = createOfflineProfiles(file);
  assert.deepEqual(await profiles.status('Builder'), {
    exists: false,
    lockedUntil: 0,
    attemptsRemaining: 5,
  });
  const pin = '987654321012';
  assert.deepEqual(
    await profiles.authorize({ name: 'Builder', pin, confirmPin: pin }),
    { name: 'Builder' },
  );
  await profiles.authorize({ name: 'Explorer', pin, confirmPin: pin });
  const saved = await fs.readFile(file, 'utf8');
  assert.equal(saved.includes(pin), false);
  const data = JSON.parse(saved);
  assert.notEqual(data.profiles[0].salt, data.profiles[1].salt);
  assert.notEqual(data.profiles[0].hash, data.profiles[1].hash);
  assert.deepEqual(await profiles.status('builder'), {
    exists: true,
    lockedUntil: 0,
    attemptsRemaining: 5,
  });
});

test('PIN verification persists across restarts and name casing cannot bypass it', async (context) => {
  const file = await fixture(context);
  await createOfflineProfiles(file).authorize({
    name: 'Builder',
    pin: '654321',
    confirmPin: '654321',
  });
  const restarted = createOfflineProfiles(file);
  await assert.rejects(
    restarted.authorize({
      name: 'BUILDER',
      pin: '123456',
      confirmPin: '123456',
    }),
    /Incorrect local profile PIN/,
  );
  assert.deepEqual(
    await restarted.authorize({ name: 'builder', pin: '654321' }),
    { name: 'Builder' },
  );
  assert.equal((await restarted.status('Builder')).attemptsRemaining, 5);
});

test('five concurrent wrong attempts cause a persisted five-minute lockout', async (context) => {
  const file = await fixture(context);
  let time = 1000000;
  const options = { now: () => time };
  const profiles = createOfflineProfiles(file, options);
  await profiles.authorize({
    name: 'Builder',
    pin: '654321',
    confirmPin: '654321',
  });
  const attempts = await Promise.allSettled(
    Array.from({ length: 5 }, () =>
      profiles.authorize({ name: 'builder', pin: '123456' }),
    ),
  );
  assert.ok(attempts.every((attempt) => attempt.status === 'rejected'));
  const restarted = createOfflineProfiles(file, options);
  assert.deepEqual(await restarted.status('Builder'), {
    exists: true,
    lockedUntil: time + LOCK_DURATION_MS,
    attemptsRemaining: 0,
  });
  await assert.rejects(
    restarted.authorize({ name: 'Builder', pin: '654321' }),
    /locked/,
  );
  time += LOCK_DURATION_MS + 1;
  assert.equal((await restarted.status('Builder')).attemptsRemaining, 5);
  assert.deepEqual(
    await restarted.authorize({ name: 'Builder', pin: '654321' }),
    { name: 'Builder' },
  );
});

test('invalid names, missing or malformed PINs and mismatched confirmation cannot enroll', async (context) => {
  const file = await fixture(context);
  const profiles = createOfflineProfiles(file);
  for (const request of [
    { name: '../escape', pin: '654321', confirmPin: '654321' },
    { name: 'Builder' },
    { name: 'Builder', pin: 654321, confirmPin: 654321 },
    { name: 'Builder', pin: '12345', confirmPin: '12345' },
    { name: 'Builder', pin: '1234567890123', confirmPin: '1234567890123' },
    { name: 'Builder', pin: 'abcdef', confirmPin: 'abcdef' },
    { name: 'Builder', pin: '654321', confirmPin: '123456' },
  ])
    await assert.rejects(profiles.authorize(request));
  assert.equal((await profiles.status('Builder')).exists, false);
  await assert.rejects(fs.access(file), { code: 'ENOENT' });
});

test('special object-property names remain ordinary protected profile names', async (context) => {
  const file = await fixture(context);
  const profiles = createOfflineProfiles(file);
  await profiles.authorize({
    name: '__proto__',
    pin: '654321',
    confirmPin: '654321',
  });
  assert.equal((await profiles.status('__proto__')).exists, true);
  await assert.rejects(
    profiles.authorize({ name: '__proto__', pin: '123456' }),
    /Incorrect/,
  );
});

test('corrupt protection data blocks verification instead of overwriting the PIN', async (context) => {
  const file = await fixture(context);
  for (const contents of [
    'invalid json',
    JSON.stringify({ version: 1, profiles: [{ name: 'Builder' }] }),
  ]) {
    await fs.writeFile(file, contents);
    const profiles = createOfflineProfiles(file);
    await assert.rejects(profiles.status('Builder'));
    await assert.rejects(
      profiles.authorize({
        name: 'Builder',
        pin: '654321',
        confirmPin: '654321',
      }),
    );
    assert.equal(await fs.readFile(file, 'utf8'), contents);
  }
});
