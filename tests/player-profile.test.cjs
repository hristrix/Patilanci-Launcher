const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  publicMinecraftProfile,
  loadPlayerSkin,
} = require('../electron/player-profile.cjs');
const profile = { id: 'a'.repeat(32), name: 'MinecraftPlayer' };
const texture = `https://textures.minecraft.net/texture/${'b'.repeat(64)}`;

test('only the Minecraft name, UUID and active skin cross the profile boundary', () => {
  const result = publicMinecraftProfile({
    ...profile,
    access_token: 'private-token',
    skins: [
      { state: 'INACTIVE', url: 'https://example.com/old' },
      {
        state: 'ACTIVE',
        url: texture.replace('https:', 'http:'),
        variant: 'SLIM',
      },
    ],
  });
  assert.deepEqual(result, {
    ...profile,
    skin: { url: texture, model: 'slim' },
  });
  assert.equal(JSON.stringify(result).includes('private-token'), false);
});

test('skin URLs outside the official texture host are never fetched', async () => {
  for (const url of [
    'https://example.com/texture/' + 'b'.repeat(64),
    texture + '?token=secret',
    texture.replace(
      'textures.minecraft.net',
      'textures.minecraft.net.evil.test',
    ),
    texture.replace('https:', 'file:'),
  ]) {
    assert.equal(
      publicMinecraftProfile({ ...profile, skins: [{ state: 'ACTIVE', url }] })
        .skin,
      null,
    );
    await assert.rejects(
      loadPlayerSkin({ url }, () => {
        throw new Error('This fetch must not run');
      }),
      /Invalid Minecraft skin source/,
    );
  }
});

test('missing skins have a graceful fallback and malformed profiles cannot sign in', async () => {
  assert.deepEqual(publicMinecraftProfile(profile), { ...profile, skin: null });
  assert.equal(await loadPlayerSkin(null), null);
  assert.throws(() => publicMinecraftProfile({ ...profile, id: 'bad' }));
  assert.throws(() =>
    publicMinecraftProfile({ ...profile, name: ['Builder'] }),
  );
});

test('the skin loader limits PNG sizes and rejects non-image responses', async () => {
  const skin = { url: texture, model: 'default' };
  await assert.rejects(
    loadPlayerSkin(skin, async () => new Response('<html>error</html>')),
    /valid PNG/,
  );
  await assert.rejects(
    loadPlayerSkin(
      skin,
      async () => new Response(Buffer.alloc(1024 * 1024 + 1)),
    ),
    /too large/,
  );
  const header = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(header);
  header.write('IHDR', 12);
  header.writeUInt32BE(4096, 16);
  header.writeUInt32BE(4096, 20);
  await assert.rejects(
    loadPlayerSkin(skin, async () => new Response(header)),
    /dimensions/,
  );
  header.writeUInt32BE(64, 16);
  header.writeUInt32BE(64, 20);
  const loaded = await loadPlayerSkin(skin, async (url, options) => {
    assert.equal(url, texture);
    assert.equal(options.redirect, 'error');
    assert.equal(
      options.headers,
      undefined,
      'Authentication tokens are never sent to texture hosts',
    );
    return new Response(header);
  });
  assert.equal(loaded.model, 'default');
  assert.match(loaded.dataUrl, /^data:image\/png;base64,/);
});
