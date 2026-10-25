const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const {
  createOfflineSkinSelections,
  createSkinSourceLoader,
} = require('../electron/offline-skin-selection.cjs');
const {
  publicSkinResponse,
  isPublicAddress,
} = require('../electron/public-skin-url.cjs');

function png() {
  const image = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(image);
  image.write('IHDR', 12);
  image.writeUInt32BE(64, 16);
  image.writeUInt32BE(64, 20);
  return image;
}
const texture = {
  dataUrl: `data:image/png;base64,${png().toString('base64')}`,
  model: 'slim',
};
async function directory(t) {
  const dir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'patilanci-skin-choice-'),
  );
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

test('offline source and texture survive restarts and name casing, stay profile-specific, and can reset', async (t) => {
  const dir = await directory(t);
  const selection = {
    source: 'ely.by',
    value: 'DifferentOwner',
    model: 'classic',
  };
  const store = createOfflineSkinSelections(dir, {
    loadTexture: async (input) => {
      assert.deepEqual(input, selection);
      return texture;
    },
  });
  const first = await store.save('Builder', selection);
  const restarted = createOfflineSkinSelections(dir, {
    loadTexture: () => {
      throw Error('Saved previews must not need networking');
    },
  });
  const saved = await restarted.read('BUILDER');
  assert.deepEqual(saved.selection, selection);
  assert.deepEqual(saved.texture, texture);
  assert.equal(saved.revision, first.revision);
  assert.equal(await restarted.read('SomeoneElse'), null);
  await restarted.clear('builder');
  assert.equal(await store.read('Builder'), null);
});

test('failed and invalid choices cannot replace the last saved skin or escape the profile directory', async (t) => {
  const dir = await directory(t);
  let fail = false;
  const store = createOfflineSkinSelections(dir, {
    loadTexture: async () => (fail ? null : texture),
  });
  await store.save('Builder', { source: 'mojang', value: 'Notch' });
  fail = true;
  await assert.rejects(
    store.save('Builder', { source: 'ely.by', value: 'MissingPlayer' }),
    /No skin found/,
  );
  assert.equal((await store.read('Builder')).selection.value, 'Notch');
  for (const selection of [
    { source: 'bad', value: 'Owner' },
    { source: 'ely.by', value: '../bad' },
    { source: 'web', value: 'file:///skin.png' },
    { source: 'web', value: 'https://user:pass@example.com/skin.png' },
  ])
    await assert.rejects(store.save('Builder', selection));
  await assert.rejects(
    store.save('../escape', { source: 'ely.by', value: 'Owner' }),
  );
});

test('each selected provider loads its own texture and preserves the PNG model', async () => {
  const calls = [];
  const hash = 'a'.repeat(64);
  const loader = createSkinSourceLoader({
    ely: {
      get: async (name) => {
        calls.push(name);
        return texture;
      },
    },
    fetchPublicImage: async (url) => {
      calls.push(url);
      return new Response(png());
    },
    fetchProfile: async (url, options) => {
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers, undefined);
      calls.push(url);
      if (url.includes('/users/profiles/'))
        return Response.json({ id: 'b'.repeat(32) });
      if (url.includes('/session/minecraft/'))
        return Response.json({
          properties: [
            {
              name: 'textures',
              value: Buffer.from(
                JSON.stringify({
                  textures: {
                    SKIN: {
                      url: `http://textures.minecraft.net/texture/${hash}`,
                      metadata: { model: 'slim' },
                    },
                  },
                }),
              ).toString('base64'),
            },
          ],
        });
      return new Response(png());
    },
  });
  assert.deepEqual(
    await loader({ source: 'ely.by', value: 'OtherName' }),
    texture,
  );
  assert.equal(
    (await loader({ source: 'mojang', value: 'Notch' })).model,
    'slim',
  );
  assert.equal(
    (
      await loader({
        source: 'web',
        value: 'https://example.com/skin.png',
        model: 'slim',
      })
    ).model,
    'slim',
  );
  assert.ok(calls.includes(`https://textures.minecraft.net/texture/${hash}`));
});

test('public PNG connections reject local addresses, mixed DNS results, and redirects', async () => {
  for (const address of [
    '127.0.0.1',
    '10.0.0.2',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fe80::1',
  ])
    assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
  assert.throws(() => publicSkinResponse('https://127.0.0.1/a.png'));
  await assert.rejects(
    publicSkinResponse('https://example.com/a.png', {
      lookup: (_, options, done) =>
        done(null, [
          { address: '8.8.8.8', family: 4 },
          { address: '10.0.0.1', family: 4 },
        ]),
      request: (url, options) => {
        const req = new EventEmitter();
        process.nextTick(() =>
          options.lookup(url.hostname, {}, (error) => req.emit('error', error)),
        );
        return req;
      },
    }),
    /Private and local/,
  );
  let destroyed = false;
  await assert.rejects(
    publicSkinResponse('https://example.com/a.png', {
      request: (_, options, respond) => {
        process.nextTick(() =>
          respond({
            statusCode: 302,
            destroy() {
              destroyed = true;
            },
          }),
        );
        return new EventEmitter();
      },
    }),
    /without redirects/,
  );
  assert.equal(destroyed, true);
});
