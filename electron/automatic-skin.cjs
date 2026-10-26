const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateSelection } = require('./offline-skin-selection.cjs');
const { installSkinMod } = require('./skin-mod-files.cjs');

const COMPANION_FILE = 'patilanci-skin-companion.jar';

// Called after pack installation so pack updates cannot discard the companion.
// It remains inert without this launch's JVM property (including premium play).
async function prepareAutomaticSkin({
  mode,
  name,
  server,
  minecraft,
  instance,
  readSelection,
  asset = path.join(__dirname, 'assets', COMPANION_FILE),
  savedSelection,
}) {
  if (mode !== 'offline') return [];
  const saved =
    savedSelection === undefined ? await readSelection(name) : savedSelection;
  if (!saved) return [];
  if (minecraft !== '1.21.10')
    throw new Error(
      'Automatic skins support Minecraft 1.21.10. Reset the saved launcher skin before launching a different version.',
    );
  const selection = validateSelection(saved.selection);
  const { skinCommand } = await import('./skin-command.mjs');
  const command = skinCommand(selection).slice(1);
  const bytes = await fs.readFile(asset);
  const expected = (await fs.readFile(`${asset}.sha256`, 'utf8')).trim();
  if (crypto.createHash('sha256').update(bytes).digest('hex') !== expected)
    throw new Error(
      'The bundled skin companion is damaged. Reinstall the launcher.',
    );
  await installSkinMod({
    instance,
    fileName: COMPANION_FILE,
    id: 'patilanci_skin_companion',
    bytes,
  });
  const request = Buffer.from(
    JSON.stringify({ player: name, server, command }),
  ).toString('base64url');
  return [`-Dpatilanci.skin.request=${request}`];
}

module.exports = { prepareAutomaticSkin, COMPANION_FILE };
