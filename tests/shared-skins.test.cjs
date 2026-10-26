const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  configureSharedSkins,
  skinLoadList,
  loaderBytes,
  SKIN_LOADER,
} = require('../electron/shared-skins.cjs');
const { preservePlayerData } = require('../electron/instance-data.cjs');

function savedSkin() {
  const png = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
  png.write('IHDR', 12);
  png.writeUInt32BE(64, 16);
  png.writeUInt32BE(64, 20);
  return {
    texture: {
      dataUrl: `data:image/png;base64,${png.toString('base64')}`,
      model: 'slim',
    },
  };
}
async function fixture(t) {
  const instance = await fs.mkdtemp(
    path.join(os.tmpdir(), 'patilanci-shared-skins-'),
  );
  t.after(() => fs.rm(instance, { recursive: true, force: true }));
  return { instance, mode: 'offline', name: 'Builder', saved: savedSkin() };
}
const configPath = (instance) =>
  path.join(instance, 'CustomSkinLoader', 'CustomSkinLoader.json');
const readConfig = async (instance) =>
  JSON.parse(await fs.readFile(configPath(instance), 'utf8'));

test('server textures take priority, saved textures match only their player, and Ely.by uses HTTPS before Mojang fallback', () => {
  const list = skinLoadList({
    mode: 'offline',
    name: 'Builder',
    saved: savedSkin(),
  });
  assert.equal(list[0].type, 'GameProfile');
  assert.equal(list[1].skin, 'Patilanci/Builder/{USERNAME}.png');
  assert.equal(list[1].model, 'slim');
  assert.equal(list[2].type, 'ElyByAPI');
  assert.equal(list[2].root, 'https://skinsystem.ely.by/textures/');
  assert.equal(list[3].type, 'MojangAPI');
  for (const mode of ['microsoft', 'offline']) {
    const profiles = skinLoadList({ mode, name: 'Builder', saved: null });
    assert.equal(
      profiles.some((profile) => profile.type === 'Legacy'),
      false,
    );
  }
  assert.throws(() =>
    skinLoadList({ mode: 'offline', name: '../Builder', saved: savedSkin() }),
  );
});

test('switching profiles, premium play, and reset remove the prior own-skin override while preserving personal settings and providers', async (t) => {
  const options = await fixture(t);
  const directory = path.dirname(configPath(options.instance));
  await fs.mkdir(directory);
  const original = JSON.stringify({
    threadPoolSize: 3,
    enableCape: false,
    loadlist: [
      {
        name: 'My skin server',
        type: 'Legacy',
        skin: 'https://example.com/{USERNAME}.png',
      },
    ],
  });
  await fs.writeFile(configPath(options.instance), original);
  await configureSharedSkins(options);
  assert.deepEqual(
    await fs.readFile(
      path.join(directory, 'Patilanci', 'Builder', 'Builder.png'),
    ),
    Buffer.from(options.saved.texture.dataUrl.slice(22), 'base64'),
  );
  await configureSharedSkins({ ...options, name: 'OtherPlayer' });
  let config = await readConfig(options.instance);
  assert.equal(
    config.loadlist.filter((profile) => profile.name === 'Patilanci saved skin')
      .length,
    1,
  );
  assert.equal(config.loadlist[1].skin, 'Patilanci/OtherPlayer/{USERNAME}.png');
  for (const extra of [{ mode: 'microsoft' }, { saved: null }]) {
    await configureSharedSkins({ ...options, ...extra });
    config = await readConfig(options.instance);
    assert.equal(
      config.loadlist.some(
        (profile) => profile.name === 'Patilanci saved skin',
      ),
      false,
    );
    assert.equal(config.threadPoolSize, 3);
    assert.equal(config.enableCape, false);
    assert.equal(config.loadlist.at(-1).name, 'My skin server');
  }
  assert.equal(
    await fs.readFile(
      `${configPath(options.instance)}.before-patilanci`,
      'utf8',
    ),
    original,
  );
});

test('shared configuration, snapshots, and a user-added skin server survive a pack update', async (t) => {
  const options = await fixture(t);
  await configureSharedSkins(options);
  const next = `${options.instance}-next`;
  t.after(() => fs.rm(next, { recursive: true, force: true }));
  await fs.mkdir(next);
  await preservePlayerData(options.instance, next);
  assert.deepEqual(await readConfig(next), await readConfig(options.instance));
  assert.deepEqual(
    await fs.readFile(
      path.join(next, 'CustomSkinLoader/Patilanci/Builder/Builder.png'),
    ),
    Buffer.from(options.saved.texture.dataUrl.slice(22), 'base64'),
  );
});

test('invalid existing configuration is preserved rather than silently replaced', async (t) => {
  const options = await fixture(t);
  await fs.mkdir(path.dirname(configPath(options.instance)));
  await fs.writeFile(configPath(options.instance), '{invalid');
  await assert.rejects(configureSharedSkins(options));
  assert.equal(
    await fs.readFile(configPath(options.instance), 'utf8'),
    '{invalid',
  );
});

test('the official download is pinned; only verified bytes enter the cache and subsequent launches work without a download', async (t) => {
  assert.equal(SKIN_LOADER.version, '14.28');
  assert.equal(new URL(SKIN_LOADER.url).hostname, 'cdn.modrinth.com');
  assert.equal(SKIN_LOADER.sha512.length, 128);
  const { instance: cache } = await fixture(t);
  const bytes = Buffer.from('synthetic verified download');
  const release = {
    ...SKIN_LOADER,
    size: bytes.length,
    sha512: crypto.createHash('sha512').update(bytes).digest('hex'),
  };
  let calls = 0;
  const fetchFile = async (url, options) => {
    calls++;
    assert.equal(url, SKIN_LOADER.url);
    assert.equal(options.redirect, 'error');
    return { ok: true, body: [bytes] };
  };
  assert.deepEqual(await loaderBytes({ cache, fetchFile, release }), bytes);
  assert.deepEqual(await loaderBytes({ cache, fetchFile, release }), bytes);
  assert.equal(calls, 1);
  await fs.writeFile(path.join(cache, release.fileName), 'damaged');
  await loaderBytes({ cache, fetchFile, release });
  assert.equal(calls, 2);
});

test('tampered/oversized downloads, HTTP errors, and cancellation leave no usable cache', async (t) => {
  const { instance: cache } = await fixture(t);
  for (const response of [
    { ok: false },
    { ok: true, body: [Buffer.from('tampered')] },
    { ok: true, body: [Buffer.alloc(SKIN_LOADER.size + 1)] },
  ]) {
    await assert.rejects(
      loaderBytes({ cache, fetchFile: async () => response }),
    );
    assert.deepEqual(await fs.readdir(cache), []);
  }
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    loaderBytes({
      cache,
      signal: controller.signal,
      fetchFile: () => {
        throw Error('must not download');
      },
    }),
    /abort/i,
  );
});
