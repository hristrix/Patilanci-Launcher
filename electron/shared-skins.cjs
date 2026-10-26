const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateOfflineName } = require('./offline-profiles.cjs');
const { parseSkinImage } = require('./player-profile.cjs');
const {
  regularDirectory,
  regularFile,
  writeAtomic,
  installSkinMod,
} = require('./skin-mod-files.cjs');

// Official unmodified Fabric release, explicitly supporting Minecraft 1.21.10.
// https://modrinth.com/mod/customskinloader/version/2C8mIbK2
const SKIN_LOADER = Object.freeze({
  version: '14.28',
  fileName: 'CustomSkinLoader_Fabric-14.28.jar',
  id: 'customskinloader',
  url: 'https://cdn.modrinth.com/data/idMHQ4n2/versions/2C8mIbK2/CustomSkinLoader_Fabric-14.28.jar',
  size: 189001,
  sha512:
    '5827ae560b37e6c2ab8ee9f6cf1b736da85a6cad90c26ef91dc3b3e9b0298c66d285877df4d92405f98ebe5b1cfcf71738b1aec5eaff2606412c352fe255deec',
});
const OWNED_PROFILES = new Set([
  'Patilanci server skin',
  'Patilanci saved skin',
  'Patilanci Ely.by',
  'Patilanci Mojang',
]);

function skinLoadList({ mode, name, saved }) {
  const profiles = [{ name: 'Patilanci server skin', type: 'GameProfile' }];
  if (mode === 'offline' && saved?.texture) {
    validateOfflineName(name);
    profiles.push({
      name: 'Patilanci saved skin',
      type: 'Legacy',
      // Keep {USERNAME}: a fixed PNG path would paint every player with this skin.
      skin: `Patilanci/${name}/{USERNAME}.png`,
      model: saved.texture.model === 'slim' ? 'slim' : 'default',
    });
  }
  profiles.push(
    {
      name: 'Patilanci Ely.by',
      type: 'ElyByAPI',
      root: 'https://skinsystem.ely.by/textures/',
    },
    {
      name: 'Patilanci Mojang',
      type: 'MojangAPI',
      apiRoot: 'https://api.mojang.com/',
      sessionRoot: 'https://sessionserver.mojang.com/',
    },
  );
  return profiles;
}

async function loaderBytes({
  cache,
  fetchFile,
  signal,
  release = SKIN_LOADER,
}) {
  signal?.throwIfAborted();
  await regularDirectory(cache);
  const file = path.join(cache, release.fileName);
  const matches = (bytes) =>
    bytes.length === release.size &&
    crypto.createHash('sha512').update(bytes).digest('hex') === release.sha512;
  if (await regularFile(file)) {
    const bytes = await fs.readFile(file);
    if (matches(bytes)) return bytes;
  }
  const response = await fetchFile(release.url, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
      : AbortSignal.timeout(30000),
    redirect: 'error',
    headers: { 'User-Agent': 'Hristrix-PatilanciLauncher/shared-skins' },
  });
  if (!response.ok || !response.body)
    throw new Error(
      'Could not download CustomSkinLoader. Check your connection and retry.',
    );
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > release.size)
      throw new Error('CustomSkinLoader download has an unexpected size.');
    chunks.push(Buffer.from(chunk));
  }
  const bytes = Buffer.concat(chunks);
  if (!matches(bytes))
    throw new Error(
      'CustomSkinLoader download could not be verified. Retry the launch.',
    );
  await writeAtomic(file, bytes);
  return bytes;
}

async function configureSharedSkins({ instance, mode, name, saved }) {
  const directory = path.join(instance, 'CustomSkinLoader');
  await regularDirectory(directory);
  const file = path.join(directory, 'CustomSkinLoader.json');
  let config = {};
  if (await regularFile(file)) {
    if ((await fs.stat(file)).size > 1024 * 1024)
      throw new Error('CustomSkinLoader configuration is too large.');
    const original = await fs.readFile(file, 'utf8');
    config = JSON.parse(original);
    if (
      !config ||
      typeof config !== 'object' ||
      Array.isArray(config) ||
      (config.loadlist !== undefined && !Array.isArray(config.loadlist))
    )
      throw new Error(
        'CustomSkinLoader configuration is invalid. Repair it in the instance folder.',
      );
    const backup = `${file}.before-patilanci`;
    if (!(await regularFile(backup)))
      await fs.writeFile(backup, original, { flag: 'wx' });
  }
  const profiles = skinLoadList({ mode, name, saved });
  const local = profiles.find(
    (profile) => profile.name === 'Patilanci saved skin',
  );
  if (local) {
    if (!saved.texture.dataUrl?.startsWith('data:image/png;base64,'))
      throw new Error('Saved skin image is invalid.');
    const bytes = Buffer.from(saved.texture.dataUrl?.slice(22) || '', 'base64');
    parseSkinImage(bytes, saved.texture.model);
    const localRoot = path.join(directory, 'Patilanci');
    await regularDirectory(localRoot);
    const playerRoot = path.join(localRoot, name);
    await regularDirectory(playerRoot);
    await writeAtomic(path.join(playerRoot, `${name}.png`), bytes);
  }
  await writeAtomic(
    file,
    JSON.stringify(
      {
        ...config,
        // Stop after a complete provider, preserving server/premium capes and skins.
        forceLoadAllTextures: false,
        loadlist: [
          ...profiles,
          ...(config.loadlist || []).filter(
            (profile) => profile && !OWNED_PROFILES.has(profile.name),
          ),
        ],
      },
      null,
      2,
    ),
  );
}

async function prepareSharedSkins({
  instance,
  minecraft,
  mode,
  name,
  saved,
  cache,
  signal,
  fetchFile = fetch,
}) {
  // The companion is version-specific; a future modpack must be reviewed first.
  if (minecraft !== '1.21.10')
    throw new Error('Shared skins currently support Minecraft 1.21.10.');
  const bytes = await loaderBytes({ cache, fetchFile, signal });
  await installSkinMod({ instance, ...SKIN_LOADER, bytes });
  await configureSharedSkins({ instance, mode, name, saved });
}

module.exports = {
  prepareSharedSkins,
  configureSharedSkins,
  skinLoadList,
  loaderBytes,
  SKIN_LOADER,
};
