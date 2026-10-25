const {
  parseSkinImage,
  publicMinecraftProfile,
} = require('./player-profile.cjs');

function validateSkinUpload(image, variant) {
  if (!['classic', 'slim'].includes(variant))
    throw new Error('Choose a Classic or Slim skin model.');
  const texture = parseSkinImage(
    image,
    variant === 'slim' ? 'slim' : 'default',
  );
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width !== 64 || ![32, 64].includes(height))
    throw new Error('Choose a 64 × 64 or 64 × 32 Minecraft skin PNG.');
  if (height === 32 && variant === 'slim')
    throw new Error('Legacy 64 × 32 skins require the Classic model.');
  return texture;
}

async function readProfile(response) {
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body || []) {
    length += chunk.length;
    if (length > 65536)
      throw new Error('Minecraft returned too much profile data.');
    chunks.push(Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks).toString('utf8');
  return body ? JSON.parse(body) : null;
}

async function uploadMinecraftSkin(
  { token, image, variant, expectedId },
  fetchSkin = fetch,
) {
  validateSkinUpload(image, variant);
  if (
    typeof token !== 'string' ||
    !token ||
    !/^[a-f0-9]{32}$/i.test(expectedId)
  )
    throw new Error(
      'Sign in with Microsoft before changing your account skin.',
    );
  const body = new FormData();
  body.set('variant', variant);
  body.set('file', new Blob([image], { type: 'image/png' }), 'skin.png');
  const options = () => ({
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
  });
  let response;
  try {
    response = await fetchSkin(
      'https://api.minecraftservices.com/minecraft/profile/skins',
      {
        ...options(),
        method: 'POST',
        body,
      },
    );
  } catch {
    throw new Error(
      'Could not confirm the skin upload. Check your connection and try again.',
    );
  }
  if (!response.ok) {
    const message = {
      401: 'Your Minecraft session expired. Sign out and sign in with Microsoft again.',
      403: 'Minecraft did not allow this skin change. Check your account permissions.',
      400: 'Minecraft rejected this PNG. Check its skin format and model.',
      429: 'Too many skin changes. Wait a moment before trying again.',
    }[response.status];
    throw new Error(
      message || 'Minecraft could not change your skin. Try again later.',
    );
  }
  try {
    let profile = await readProfile(response);
    if (!profile) {
      response = await fetchSkin(
        'https://api.minecraftservices.com/minecraft/profile',
        options(),
      );
      if (!response.ok) throw new Error('Profile refresh failed.');
      profile = await readProfile(response);
    }
    const result = publicMinecraftProfile(profile);
    if (result.id.toLowerCase() !== expectedId.toLowerCase() || !result.skin)
      throw new Error('Profile did not match the signed-in account.');
    return result;
  } catch {
    throw new Error(
      'Skin uploaded, but the account preview could not refresh. Sign in again to reload it.',
    );
  }
}

module.exports = { validateSkinUpload, uploadMinecraftSkin };
