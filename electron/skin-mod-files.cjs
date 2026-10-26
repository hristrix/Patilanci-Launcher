const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { scanMods } = require('./mods.cjs');

async function regularDirectory(directory) {
  await fs.mkdir(directory, { recursive: true });
  const stat = await fs.lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error('Skin files must use regular directories.');
}

async function regularFile(file) {
  try {
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink())
      throw new Error('Skin files must be regular files.');
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function writeAtomic(file, data) {
  await regularFile(file);
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, data, { flag: 'wx' });
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

// Maintain one reserved file; never replace or duplicate a player's own mod.
async function installSkinMod({ instance, fileName, id, bytes }) {
  const directory = path.join(instance, 'mods');
  await regularDirectory(directory);
  const mods = await scanMods(instance);
  const existing = mods.find(
    (mod) => mod.id === id && mod.fileName !== fileName,
  );
  if (existing)
    throw new Error(
      `Another ${id} is installed as ${existing.fileName}. Remove that copy from the instance mods folder before launching.`,
    );
  if (mods.some((mod) => mod.fileName === fileName && mod.id !== id))
    throw new Error(
      `A different file uses ${fileName}. Rename it in the instance mods folder before launching.`,
    );
  await writeAtomic(path.join(directory, fileName), bytes);
}

module.exports = { regularDirectory, regularFile, writeAtomic, installSkinMod };
