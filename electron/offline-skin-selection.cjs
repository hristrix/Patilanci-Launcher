const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateOfflineName } = require('./offline-profiles.cjs');
const {
  parseSkinImage,
  readSkinImage,
  loadPlayerSkin,
} = require('./player-profile.cjs');
const { publicSkinResponse } = require('./public-skin-url.cjs');

function validateSelection(input) {
  if (
    !input ||
    !['ely.by', 'mojang', 'web'].includes(input.source) ||
    typeof input.value !== 'string'
  )
    throw new Error('Choose a supported skin source.');
  const value = input.value.trim();
  const model = input.model || 'classic';
  if (!['classic', 'slim'].includes(model))
    throw new Error('Choose Classic or Slim.');
  if (input.source !== 'web') validateOfflineName(value);
  else {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      value.length > 256
    )
      throw new Error('Choose a public HTTPS skin PNG URL.');
  }
  return { source: input.source, value, model };
}

async function readJson(response) {
  if (!response.ok || !response.body)
    throw new Error('Skin profile could not be loaded.');
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > 65536) throw new Error('Skin profile is too large.');
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function createSkinSourceLoader({
  ely,
  fetchProfile = fetch,
  fetchPublicImage = publicSkinResponse,
}) {
  return async (selection) => {
    if (selection.source === 'ely.by') return ely.get(selection.value);
    if (selection.source === 'web')
      return readSkinImage(
        await fetchPublicImage(selection.value),
        selection.model === 'slim' ? 'slim' : 'default',
      );
    const options = () => ({
      redirect: 'error',
      signal: AbortSignal.timeout(12000),
    });
    const player = await readJson(
      await fetchProfile(
        `https://api.mojang.com/users/profiles/minecraft/${selection.value}`,
        options(),
      ),
    );
    if (!/^[a-f0-9]{32}$/i.test(player.id || ''))
      throw new Error('Minecraft player was not found.');
    const profile = await readJson(
      await fetchProfile(
        `https://sessionserver.mojang.com/session/minecraft/profile/${player.id}`,
        options(),
      ),
    );
    const encoded = profile.properties?.find(
      (property) => property.name === 'textures',
    )?.value;
    if (typeof encoded !== 'string' || encoded.length > 65536)
      throw new Error('Minecraft skin was not found.');
    const skin = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'))
      .textures?.SKIN;
    if (!skin) return null;
    const url = new URL(skin.url);
    // The official profile service still returns HTTP texture links.
    if (url.protocol === 'http:') url.protocol = 'https:';
    return loadPlayerSkin(
      { url: url.href, model: skin.metadata?.model },
      fetchProfile,
    );
  };
}

function createOfflineSkinSelections(directory, { loadTexture }) {
  const fileFor = (name) =>
    path.join(
      directory,
      `${crypto.createHash('sha256').update(validateOfflineName(name).toLowerCase()).digest('hex')}.json`,
    );
  async function read(name) {
    const file = fileFor(name);
    try {
      if ((await fs.stat(file)).size > 1500000)
        throw new Error('Saved skin is too large.');
      const saved = JSON.parse(await fs.readFile(file, 'utf8'));
      if (
        saved.version !== 1 ||
        typeof saved.revision !== 'string' ||
        !saved.texture?.dataUrl?.startsWith('data:image/png;base64,')
      )
        throw new Error('Invalid saved skin.');
      return {
        selection: validateSelection(saved.selection),
        revision: saved.revision,
        texture: parseSkinImage(
          Buffer.from(saved.texture.dataUrl.slice(22), 'base64'),
          saved.texture.model,
        ),
      };
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw new Error(
        'The saved offline skin could not be read. Save it again or reset the launcher skin.',
      );
    }
  }
  async function save(name, input) {
    const file = fileFor(name);
    const selection = validateSelection(input);
    const loaded = await loadTexture(selection);
    if (!loaded?.dataUrl?.startsWith('data:image/png;base64,'))
      throw new Error(
        'No skin found at that source. Check the name or PNG URL.',
      );
    const texture = parseSkinImage(
      Buffer.from(loaded.dataUrl.slice(22), 'base64'),
      loaded.model,
    );
    const saved = {
      version: 1,
      revision: crypto.randomUUID(),
      selection,
      texture,
    };
    await fs.mkdir(directory, { recursive: true });
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, JSON.stringify(saved), { flag: 'wx' });
      await fs.rename(temporary, file);
    } finally {
      await fs.rm(temporary, { force: true });
    }
    return { selection, revision: saved.revision };
  }
  async function clear(name) {
    await fs.rm(fileFor(name), { force: true });
  }
  return { read, save, clear };
}

module.exports = {
  createOfflineSkinSelections,
  createSkinSourceLoader,
  validateSelection,
};
