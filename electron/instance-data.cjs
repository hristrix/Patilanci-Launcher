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
  const preserved = new Set([
    'saves',
    'screenshots',
    'servers.dat',
    'servers.dat_old',
    'resourcepacks',
    'shaderpacks',
    'config',
    'defaultconfigs',
    'journeymap',
    'XaeroWaypoints',
    'XaeroWorldMap',
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
    if (preserved.has(name) || /^options.*\.txt$/i.test(name)) {
      await copy(path.join(previous, name), path.join(next, name));
    }
  }
}

module.exports = { preservePlayerData };
