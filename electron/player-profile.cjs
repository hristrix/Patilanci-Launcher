const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_SKIN_BYTES = 1024 * 1024;

function publicMinecraftProfile(profile) {
  if (
    typeof profile?.id !== 'string' ||
    typeof profile?.name !== 'string' ||
    !/^[a-f0-9]{32}$/i.test(profile?.id || '') ||
    !/^[A-Za-z0-9_]{3,16}$/.test(profile?.name || '')
  )
    throw new Error('Minecraft returned an invalid player profile.');

  const activeSkin = Array.isArray(profile.skins)
    ? profile.skins.find((skin) => skin?.state === 'ACTIVE')
    : null;
  let skin = null;
  if (activeSkin) {
    try {
      const url = new URL(activeSkin.url);
      if (
        ['http:', 'https:'].includes(url.protocol) &&
        url.hostname === 'textures.minecraft.net' &&
        !url.port &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        /^\/texture\/[a-f0-9]{32,128}$/i.test(url.pathname)
      ) {
        url.protocol = 'https:';
        skin = {
          url: url.href,
          model: activeSkin.variant === 'SLIM' ? 'slim' : 'default',
        };
      }
    } catch {}
  }
  // Explicitly select public fields so authentication tokens cannot enter IPC.
  return { id: profile.id, name: profile.name, skin };
}

async function loadPlayerSkin(skin, fetchTexture = fetch) {
  if (!skin) return null;
  const url = new URL(skin.url);
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'textures.minecraft.net' ||
    !/^\/texture\/[a-f0-9]{32,128}$/i.test(url.pathname) ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash
  ) {
    throw new Error('Invalid Minecraft skin source.');
  }
  const response = await fetchTexture(url.href, {
    signal: AbortSignal.timeout(15000),
    redirect: 'error',
  });
  if (!response.ok || !response.body)
    throw new Error('Minecraft skin could not be loaded.');
  return readSkinImage(response, skin.model);
}

async function readSkinImage(response, model) {
  if (!response.ok || !response.body)
    throw new Error('Minecraft skin could not be loaded.');
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > MAX_SKIN_BYTES)
      throw new Error('Minecraft skin is too large.');
    chunks.push(Buffer.from(chunk));
  }
  const image = Buffer.concat(chunks);
  return parseSkinImage(image, model);
}

function parseSkinImage(image, model) {
  if (image.length > MAX_SKIN_BYTES)
    throw new Error('Minecraft skin is too large.');
  if (
    image.length < 33 ||
    !image.subarray(0, 8).equals(PNG_SIGNATURE) ||
    image.toString('ascii', 12, 16) !== 'IHDR'
  ) {
    throw new Error('Minecraft skin is not a valid PNG.');
  }
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (
    width < 64 ||
    width > 1024 ||
    (width & (width - 1)) !== 0 ||
    (height !== width && height !== width / 2)
  ) {
    throw new Error('Minecraft skin dimensions are unsupported.');
  }
  return {
    dataUrl: `data:image/png;base64,${image.toString('base64')}`,
    model: model === 'slim' ? 'slim' : 'default',
  };
}

module.exports = {
  publicMinecraftProfile,
  loadPlayerSkin,
  readSkinImage,
  parseSkinImage,
};
