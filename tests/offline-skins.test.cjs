const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createOfflineSkinResolver } = require('../electron/offline-skins.cjs');

const textureUrl = `https://ely.by/storage/skins/${'a'.repeat(32)}.png`;
function png() {
  const buffer = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer);
  buffer.write('IHDR', 12);
  buffer.writeUInt32BE(64, 16);
  buffer.writeUInt32BE(64, 20);
  return buffer;
}
async function fixture(t) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'patilanci-skins-test-'),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

test('offline skins use public nickname lookup, secure PNG sources, slim metadata and persistent caching', async (t) => {
  const directory = await fixture(t);
  const calls = [];
  const resolver = createOfflineSkinResolver(directory, {
    fetchSkin: async (url, options) => {
      calls.push(url);
      assert.equal(options.redirect, 'error');
      assert.equal(
        options.headers,
        undefined,
        'No account tokens or PINs go to the skin service',
      );
      if (url.includes('/textures/'))
        return Response.json({
          SKIN: {
            url: textureUrl.replace('https:', 'http:'),
            metadata: { model: 'slim' },
          },
        });
      assert.equal(url, textureUrl);
      return new Response(png());
    },
  });
  const [first, second] = await Promise.all([
    resolver.get('Builder'),
    resolver.get('BUILDER'),
  ]);
  assert.deepEqual(first, second);
  assert.equal(first.model, 'slim');
  assert.equal(first.source, 'Ely.by');
  assert.deepEqual(calls, [
    'https://skinsystem.ely.by/textures/builder',
    textureUrl,
  ]);
  const restarted = createOfflineSkinResolver(directory, {
    fetchSkin: () => {
      throw new Error('Fresh disk cache should not fetch');
    },
  });
  assert.deepEqual(await restarted.get('Builder'), first);
});

test('Ely-proxied Minecraft skins use only the official HTTPS texture host', async (t) => {
  const directory = await fixture(t);
  const url = `https://textures.minecraft.net/texture/${'b'.repeat(64)}`;
  const resolver = createOfflineSkinResolver(directory, {
    fetchSkin: async (requested) => {
      if (requested.includes('/textures/'))
        return Response.json({ SKIN: { url: url.replace('https:', 'http:') } });
      assert.equal(requested, url);
      return new Response(png());
    },
  });
  assert.equal((await resolver.get('Builder')).model, 'default');
});

test('unknown players are negatively cached and do not block Play', async (t) => {
  const directory = await fixture(t);
  let time = 1000000;
  let calls = 0;
  const resolver = createOfflineSkinResolver(directory, {
    now: () => time,
    fetchSkin: async () => {
      calls++;
      return new Response(null, { status: 204 });
    },
  });
  assert.equal(await resolver.get('UnknownPlayer'), null);
  assert.equal(await resolver.get('unknownplayer'), null);
  assert.equal(calls, 1);
  time += 61000;
  assert.equal(await resolver.get('UnknownPlayer'), null);
  assert.equal(calls, 2);
});

test('service failures reuse a recently cached skin across restarts, but not indefinitely', async (t) => {
  const directory = await fixture(t);
  let time = 1000000;
  const successful = createOfflineSkinResolver(directory, {
    now: () => time,
    fetchSkin: async (url) =>
      url.includes('/textures/')
        ? Response.json({ SKIN: { url: textureUrl } })
        : new Response(png()),
  });
  const skin = await successful.get('Builder');
  time += 11 * 60 * 1000;
  const failed = createOfflineSkinResolver(directory, {
    now: () => time,
    fetchSkin: async () => {
      throw new Error('Offline');
    },
  });
  assert.deepEqual(await failed.get('Builder'), { ...skin, cached: true });
  time += 8 * 24 * 60 * 60 * 1000;
  assert.equal(await failed.get('Builder'), null);
});

test('untrusted texture URLs cannot redirect skin requests to arbitrary hosts or local files', async (t) => {
  for (const url of [
    'https://evil.test/skin.png',
    'file:///private.png',
    textureUrl + '?token=secret',
    textureUrl.replace('ely.by', 'ely.by.evil.test'),
    textureUrl.replace('ely.by', 'user:password@ely.by'),
    'https://ely.by/unrelated/file.png',
  ]) {
    const resolver = createOfflineSkinResolver(await fixture(t), {
      fetchSkin: async (requested) => {
        assert.match(requested, /^https:\/\/skinsystem\.ely\.by\/textures\//);
        return Response.json({ SKIN: { url } });
      },
    });
    assert.equal(await resolver.get('Builder'), null);
  }
});

test('bad names and oversized or malformed metadata and images never become skin data', async (t) => {
  const directory = await fixture(t);
  const resolver = createOfflineSkinResolver(directory, {
    fetchSkin: () => {
      throw new Error('Invalid names must not fetch');
    },
  });
  for (const name of ['../bad', 'two words', 'xx', null])
    assert.throws(() => resolver.get(name));
  for (const fetchSkin of [
    async () => new Response('x'.repeat(65537)),
    async () => new Response('<html>failure</html>'),
    async (url) =>
      url.includes('/textures/')
        ? Response.json({ SKIN: { url: textureUrl } })
        : new Response(Buffer.alloc(1024 * 1024 + 1)),
    async (url) =>
      url.includes('/textures/')
        ? Response.json({ SKIN: { url: textureUrl } })
        : new Response('not a PNG'),
  ])
    assert.equal(
      await createOfflineSkinResolver(directory, { fetchSkin }).get('Builder'),
      null,
    );
});
