const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  validateSkinUpload,
  uploadMinecraftSkin,
} = require('../electron/skin-upload.cjs');
const image = fs.readFileSync(
  path.join(__dirname, '../public/skins/steve.png'),
);
const id = 'a'.repeat(32);
const texture = `https://textures.minecraft.net/texture/${'b'.repeat(64)}`;
const profile = {
  id,
  name: 'Builder',
  skins: [{ state: 'ACTIVE', url: texture, variant: 'SLIM' }],
  access_token: 'never-return-this',
};

test('account skin upload uses a PNG multipart body and keeps tokens in the main process', async () => {
  const result = await uploadMinecraftSkin(
    { token: 'private-token', image, variant: 'slim', expectedId: id },
    async (url, options) => {
      assert.equal(
        url,
        'https://api.minecraftservices.com/minecraft/profile/skins',
      );
      assert.equal(options.method, 'POST');
      assert.equal(options.redirect, 'error');
      assert.deepEqual(options.headers, {
        Authorization: 'Bearer private-token',
      });
      assert.equal(options.body.get('variant'), 'slim');
      assert.equal(options.body.get('file').type, 'image/png');
      assert.deepEqual(
        Buffer.from(await options.body.get('file').arrayBuffer()),
        image,
      );
      return Response.json(profile);
    },
  );
  assert.deepEqual(result, {
    id,
    name: 'Builder',
    skin: { url: texture, model: 'slim' },
  });
  assert.equal(JSON.stringify(result).includes('token'), false);
});

test('successful empty upload responses refresh only the official account profile', async () => {
  const calls = [];
  await uploadMinecraftSkin(
    { token: 'secret', image, variant: 'classic', expectedId: id },
    async (url, options) => {
      calls.push(url);
      assert.equal(options.redirect, 'error');
      return calls.length === 1
        ? new Response(null, { status: 204 })
        : Response.json(profile);
    },
  );
  assert.deepEqual(calls, [
    'https://api.minecraftservices.com/minecraft/profile/skins',
    'https://api.minecraftservices.com/minecraft/profile',
  ]);
});

test('upload rejects unsupported dimensions, models, and missing authentication before networking', async () => {
  const hd = Buffer.from(image);
  hd.writeUInt32BE(128, 16);
  hd.writeUInt32BE(128, 20);
  assert.throws(() => validateSkinUpload(hd, 'classic'), /64/);
  const legacy = Buffer.from(image);
  legacy.writeUInt32BE(32, 20);
  assert.equal(validateSkinUpload(legacy, 'classic').model, 'default');
  assert.throws(() => validateSkinUpload(legacy, 'slim'), /Classic/);
  assert.throws(() => validateSkinUpload(image, 'arbitrary'), /model/);
  let fetched = false;
  await assert.rejects(
    uploadMinecraftSkin(
      { token: '', image, variant: 'classic', expectedId: id },
      async () => {
        fetched = true;
      },
    ),
    /Sign in/,
  );
  assert.equal(fetched, false);
});

test('upload failures expose actionable messages without reflecting service bodies or tokens', async () => {
  for (const [status, message] of [
    [400, /rejected/],
    [401, /expired/],
    [403, /permissions/],
    [429, /Too many/],
    [500, /Try again later/],
  ]) {
    await assert.rejects(
      uploadMinecraftSkin(
        { token: 'secret-token', image, variant: 'classic', expectedId: id },
        async () => new Response('secret-token', { status }),
      ),
      message,
    );
  }
  await assert.rejects(
    uploadMinecraftSkin(
      { token: 'secret-token', image, variant: 'classic', expectedId: id },
      async () => {
        throw new Error('secret-token');
      },
    ),
    /Could not confirm/,
  );
});

test('mismatched and oversized profile responses do not become active account skins', async () => {
  for (const response of [
    Response.json({ ...profile, id: 'c'.repeat(32) }),
    new Response('x'.repeat(65537)),
  ]) {
    await assert.rejects(
      uploadMinecraftSkin(
        { token: 'secret', image, variant: 'classic', expectedId: id },
        async () => response,
      ),
      /Skin uploaded, but/,
    );
  }
});
