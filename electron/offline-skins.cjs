const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateOfflineName } = require('./offline-profiles.cjs');
const { readSkinImage, parseSkinImage } = require('./player-profile.cjs');

const FRESH_MS = 10 * 60 * 1000;
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const RETRY_MS = 60 * 1000;

function createOfflineSkinResolver(
  directory,
  { fetchSkin = fetch, now = Date.now } = {},
) {
  const cache = new Map();

  async function readSaved(name) {
    try {
      const file = path.join(directory, `${name}.json`);
      if ((await fs.stat(file)).size > 1500000) return null;
      const saved = JSON.parse(await fs.readFile(file, 'utf8'));
      if (
        saved.version !== 1 ||
        !Number.isSafeInteger(saved.fetchedAt) ||
        saved.fetchedAt > now() ||
        now() - saved.fetchedAt > STALE_MS ||
        typeof saved.texture?.dataUrl !== 'string' ||
        !saved.texture.dataUrl.startsWith('data:image/png;base64,')
      )
        return null;
      const texture = parseSkinImage(
        Buffer.from(saved.texture.dataUrl.slice(22), 'base64'),
        saved.texture.model,
      );
      return {
        fetchedAt: saved.fetchedAt,
        texture: { ...texture, source: 'Ely.by' },
      };
    } catch {
      return null;
    }
  }

  async function save(name, texture) {
    await fs.mkdir(directory, { recursive: true });
    const file = path.join(directory, `${name}.json`);
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    try {
      await fs.writeFile(
        temporary,
        JSON.stringify({ version: 1, fetchedAt: now(), texture }),
        { flag: 'wx' },
      );
      await fs.rename(temporary, file);
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }

  async function resolve(name) {
    const saved = await readSaved(name);
    if (saved && now() - saved.fetchedAt < FRESH_MS)
      return {
        texture: saved.texture,
        ttl: FRESH_MS - (now() - saved.fetchedAt),
      };
    try {
      const options = () => ({
        redirect: 'error',
        signal: AbortSignal.timeout(12000),
      });
      const metadata = await fetchSkin(
        `https://skinsystem.ely.by/textures/${name}`,
        options(),
      );
      if ([204, 404].includes(metadata.status)) {
        await fs
          .rm(path.join(directory, `${name}.json`), { force: true })
          .catch(() => {});
        return { texture: null, ttl: RETRY_MS };
      }
      if (!metadata.ok || !metadata.body)
        throw new Error('Skin lookup failed.');
      const chunks = [];
      let length = 0;
      for await (const chunk of metadata.body) {
        length += chunk.length;
        if (length > 65536) throw new Error('Skin metadata is too large.');
        chunks.push(Buffer.from(chunk));
      }
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!data.SKIN) {
        await fs
          .rm(path.join(directory, `${name}.json`), { force: true })
          .catch(() => {});
        return { texture: null, ttl: RETRY_MS };
      }
      // Ely returns legacy HTTP URLs, including redirects from /skins. Upgrade
      // only its documented storage path and Mojang texture host to HTTPS.
      const url = new URL(data.SKIN.url);
      if (
        !['https:', 'http:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.port ||
        url.search ||
        url.hash ||
        !(
          (url.hostname === 'ely.by' &&
            /^\/storage\/skins\/[a-f0-9]{32,64}\.png$/.test(url.pathname)) ||
          (url.hostname === 'textures.minecraft.net' &&
            /^\/texture\/[a-f0-9]{32,128}$/.test(url.pathname))
        )
      )
        throw new Error('Invalid offline skin source.');
      url.protocol = 'https:';
      const image = await fetchSkin(url.href, options());
      if (!image.ok) throw new Error('Skin image is unavailable.');
      const texture = {
        ...(await readSkinImage(image, data.SKIN.metadata?.model)),
        source: 'Ely.by',
      };
      await save(name, texture).catch(() => {});
      return { texture, ttl: FRESH_MS };
    } catch {
      // Lookup failure never blocks signing in or playing. A recently cached
      // skin remains usable when the service or internet is unavailable.
      return {
        texture: saved ? { ...saved.texture, cached: true } : null,
        ttl: RETRY_MS,
      };
    }
  }

  function get(name) {
    const key = validateOfflineName(name).toLowerCase();
    const existing = cache.get(key);
    if (existing && existing.expiresAt > now()) return existing.promise;
    const entry = { expiresAt: Infinity };
    entry.promise = resolve(key).then(({ texture, ttl }) => {
      entry.expiresAt = now() + ttl;
      return texture;
    });
    cache.delete(key);
    cache.set(key, entry);
    if (cache.size > 32) cache.delete(cache.keys().next().value);
    return entry.promise;
  }

  return { get };
}

module.exports = { createOfflineSkinResolver };
