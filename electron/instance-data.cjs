const fs = require('node:fs/promises');
const path = require('node:path');

async function preservePlayerData(previous, next) {
  let entries;
  try {
    entries = await fs.readdir(previous);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  // Mod-owned data can live anywhere in the instance, including newer Xaero
  // folders. Preserve existing files by default instead of naming individual
  // mods. These paths are rebuilt or maintained separately by the launcher.
  const managed = new Set([
    'mods',
    'versions',
    'libraries',
    'assets',
    'natives',
    'runtime',
    'runtimes',
    '.fabric',
    '.quilt',
    '.cache',
    '.mixin.out',
    'logs',
    'crash-reports',
    'patilanci-install.json',
    'patilanci-mods.json',
    'patilanci-checksums.json',
    'patilanci-checksums.json.tmp',
  ]);
  async function copy(source, destination) {
    const stat = await fs.lstat(source);
    if (stat.isSymbolicLink())
      throw new Error('Player data must not contain symbolic links.');
    if (stat.isDirectory()) {
      await fs.mkdir(destination, { recursive: true });
      for (const entry of await fs.readdir(source)) {
        await copy(path.join(source, entry), path.join(destination, entry));
      }
    } else if (stat.isFile()) {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(source, destination);
    } else {
      throw new Error('Unsupported player data file.');
    }
  }
  for (const name of entries) {
    if (!managed.has(name.toLowerCase())) {
      await copy(path.join(previous, name), path.join(next, name));
    }
  }
}

module.exports = { preservePlayerData };

// Assets and Maven libraries are downloaded again unnecessarily if discarded
// with an old pack. Reuse missing files, leaving staged pack files authoritative.
async function reuseGameDownloads(previous, next) {
  async function copy(source, destination) {
    let stat;
    try {
      stat = await fs.lstat(source);
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    if (stat.isSymbolicLink()) return;
    try {
      const existing = await fs.lstat(destination);
      if (existing.isSymbolicLink())
        throw new Error(
          'Game download destination must not contain symbolic links.',
        );
      if (!stat.isDirectory() || !existing.isDirectory()) return;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (stat.isDirectory()) {
      await fs.mkdir(destination, { recursive: true });
      for (const entry of await fs.readdir(source))
        await copy(path.join(source, entry), path.join(destination, entry));
    } else if (stat.isFile()) {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      try {
        await fs.copyFile(
          source,
          destination,
          fs.constants.COPYFILE_EXCL | fs.constants.COPYFILE_FICLONE,
        );
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
      }
    }
  }
  for (const directory of ['assets', 'libraries'])
    await copy(path.join(previous, directory), path.join(next, directory));
}
module.exports.reuseGameDownloads = reuseGameDownloads;
