const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateSettings } = require('./utils.cjs');

async function savePreferences(file, input) {
  const preferences = validateSettings(input);
  let existing = {};
  try {
    existing = JSON.parse(await fs.readFile(file, 'utf8'));
    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
      throw new Error('Invalid saved launcher preferences.');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  // Renderer preferences cannot supply, replace, or erase the download key.
  const stored = { ...preferences, key: existing.key ?? null };
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(stored), { flag: 'wx' });
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
  return true;
}

module.exports = { savePreferences };
