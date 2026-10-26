const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const Zip = require('adm-zip');
const { safePath } = require('./utils.cjs');

const INVENTORY_FILE = 'patilanci-mods.json';
const MAX_JAR_SIZE = 128 * 1024 * 1024;
const RESERVED_IDS = new Set(['minecraft', 'java', 'fabricloader']);

function validateFileName(fileName) {
  if (
    typeof fileName !== 'string' ||
    !fileName ||
    fileName.includes('/') ||
    fileName.includes('\\') ||
    fileName.includes(':') ||
    !fileName.toLowerCase().endsWith('.jar')
  ) {
    throw new Error('Invalid mod filename.');
  }
  return fileName;
}

function modPath(instance, fileName, enabled = true) {
  return safePath(
    path.join(instance, 'mods'),
    validateFileName(fileName) + (enabled ? '' : '.disabled'),
  );
}

function readJarMetadata(data, fileName, strict = false) {
  const fallback = {
    fileName,
    name: fileName.replace(/\.jar$/i, ''),
    id: null,
    version: 'Unknown',
    provides: [],
    minecraft: '',
    sha256: crypto.createHash('sha256').update(data).digest('hex'),
  };

  try {
    const archive = new Zip(data);
    const entry = archive.getEntry('fabric.mod.json');
    if (!entry || entry.header.size > 1024 * 1024) {
      throw new Error('Missing or oversized Fabric metadata.');
    }
    const metadata = JSON.parse(entry.getData().toString('utf8'));
    if (
      metadata.schemaVersion !== 1 ||
      typeof metadata.id !== 'string' ||
      !/^[a-zA-Z][a-zA-Z0-9_-]{1,63}$/.test(metadata.id) ||
      typeof metadata.version !== 'string' ||
      !metadata.version
    ) {
      throw new Error('Invalid Fabric metadata.');
    }
    if (strict && metadata.environment === 'server') {
      throw new Error(
        'This is a server-only mod. Choose a client-compatible mod.',
      );
    }
    return {
      ...fallback,
      name: typeof metadata.name === 'string' ? metadata.name : metadata.id,
      id: metadata.id,
      version: metadata.version,
      provides: Array.isArray(metadata.provides)
        ? metadata.provides.filter((id) => typeof id === 'string')
        : [],
      minecraft: Array.isArray(metadata.depends?.minecraft)
        ? metadata.depends.minecraft.join(' or ')
        : typeof metadata.depends?.minecraft === 'string'
          ? metadata.depends.minecraft
          : '',
    };
  } catch (error) {
    if (strict) throw new Error(`${fileName}: ${error.message}`);
    return fallback;
  }
}

async function scanMods(instance) {
  const directory = path.join(instance, 'mods');
  try {
    const stat = await fs.lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error('The mods directory must be a regular directory.');
    }
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const entries = await fs.readdir(directory, { withFileTypes: true });
  const mods = [];
  for (const entry of entries) {
    const disabled = entry.name.toLowerCase().endsWith('.jar.disabled');
    if (!disabled && !entry.name.toLowerCase().endsWith('.jar')) continue;
    if (!entry.isFile()) throw new Error(`Unsupported mod file: ${entry.name}`);
    const fileName = disabled ? entry.name.slice(0, -9) : entry.name;
    if (
      mods.some((mod) => mod.fileName.toLowerCase() === fileName.toLowerCase())
    )
      throw new Error(
        `Both enabled and disabled copies exist for ${fileName}. Keep only one copy.`,
      );
    const filename = modPath(instance, fileName, !disabled);
    const stat = await fs.stat(filename);
    if (stat.size > MAX_JAR_SIZE)
      throw new Error(`Mod exceeds the 128 MB limit: ${entry.name}`);
    mods.push({
      ...readJarMetadata(await fs.readFile(filename), fileName),
      enabled: !disabled,
    });
  }
  return mods;
}

async function readInventory(instance) {
  try {
    const inventory = JSON.parse(
      await fs.readFile(path.join(instance, INVENTORY_FILE), 'utf8'),
    );
    if (
      inventory.version !== 1 ||
      !Array.isArray(inventory.bundled) ||
      !Array.isArray(inventory.personal)
    ) {
      throw new Error('Invalid mod ownership inventory.');
    }
    if (inventory.external !== undefined && !Array.isArray(inventory.external))
      throw new Error('Invalid mod ownership inventory.');
    for (const mod of [
      ...inventory.bundled,
      ...inventory.personal,
      ...(inventory.external || []),
    ]) {
      validateFileName(mod.fileName);
      if (!Array.isArray(mod.provides))
        throw new Error('Invalid mod ownership inventory.');
    }
    return inventory;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // Existing files are protected when upgrading an older launcher installation.
    return { version: 1, bundled: await scanMods(instance), personal: [] };
  }
}

async function writeInventory(instance, inventory) {
  const filename = path.join(instance, INVENTORY_FILE);
  const temporary = `${filename}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(inventory, null, 2));
    await fs.rename(temporary, filename);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

async function readInstalledPack(instance) {
  try {
    return JSON.parse(
      await fs.readFile(path.join(instance, 'patilanci-install.json'), 'utf8'),
    );
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function identities(mod) {
  return [mod.id, ...mod.provides].filter(Boolean);
}

function conflicts(first, second) {
  return (
    first.fileName.toLowerCase() === second.fileName.toLowerCase() ||
    identities(first).some((id) => identities(second).includes(id))
  );
}

async function currentState(instance) {
  const inventory = await readInventory(instance);
  const files = await scanMods(instance);
  const knownNames = new Set(
    [
      ...inventory.bundled,
      ...inventory.personal,
      ...(inventory.external || []),
    ].map((mod) => mod.fileName.toLowerCase()),
  );
  // Untracked files never gain a Remove action just because they are on disk.
  const untracked = files.filter(
    (mod) => !knownNames.has(mod.fileName.toLowerCase()),
  );
  return {
    inventory: {
      ...inventory,
      external: [...(inventory.external || []), ...untracked],
    },
    files,
  };
}

async function listMods(instance) {
  const pack = await readInstalledPack(instance);
  if (!pack) return { installed: false, bundled: [], personal: [] };
  const { inventory, files } = await currentState(instance);
  const names = new Set(files.map((mod) => mod.fileName.toLowerCase()));
  const present = (mod) => ({
    ...mod,
    present: names.has(mod.fileName.toLowerCase()),
    enabled:
      files.find(
        (file) => file.fileName.toLowerCase() === mod.fileName.toLowerCase(),
      )?.enabled ??
      mod.enabled ??
      true,
  });
  return {
    installed: true,
    minecraft: pack.minecraft,
    packVersion: pack.version,
    bundled: [...inventory.bundled, ...(inventory.external || [])].map(present),
    personal: inventory.personal.map(present),
  };
}

async function recordBundledMods(instance) {
  const inventory = {
    version: 1,
    bundled: await scanMods(instance),
    personal: [],
  };
  await writeInventory(instance, inventory);
  return inventory;
}

async function ensureModInventory(instance) {
  const { inventory } = await currentState(instance);
  await writeInventory(instance, inventory);
}

async function addLocalMods(instance, selectedFiles) {
  if (!(await readInstalledPack(instance)))
    throw new Error('Install the Patilanci modpack before adding mods.');
  const { inventory, files } = await currentState(instance);
  const imports = [];
  const existing = [
    ...inventory.bundled,
    ...inventory.personal,
    ...(inventory.external || []),
    ...files,
  ];

  for (const filename of selectedFiles) {
    const fileName = validateFileName(path.basename(filename));
    const stat = await fs.stat(filename);
    if (!stat.isFile() || stat.size > MAX_JAR_SIZE)
      throw new Error(`${fileName}: choose a JAR under 128 MB.`);
    const data = await fs.readFile(filename);
    const metadata = readJarMetadata(data, fileName, true);
    if (identities(metadata).some((id) => RESERVED_IDS.has(id)))
      throw new Error(`${fileName} conflicts with Minecraft or Fabric Loader.`);
    const conflict = existing.find((mod) => conflicts(metadata, mod));
    if (conflict)
      throw new Error(
        `${metadata.name} conflicts with ${conflict.name}. Existing mods cannot be replaced by an import.`,
      );
    imports.push({ metadata, data });
    existing.push(metadata);
  }

  await fs.mkdir(path.join(instance, 'mods'), { recursive: true });
  const created = [];
  try {
    for (const item of imports) {
      const filename = modPath(instance, item.metadata.fileName);
      await fs.writeFile(filename, item.data, { flag: 'wx' });
      created.push(filename);
    }
    await writeInventory(instance, {
      ...inventory,
      personal: [
        ...inventory.personal,
        ...imports.map((item) => item.metadata),
      ],
    });
  } catch (error) {
    for (const filename of created) await fs.rm(filename, { force: true });
    throw error;
  }
  return imports.length;
}

async function removePersonalMod(instance, fileName) {
  validateFileName(fileName);
  const { inventory, files } = await currentState(instance);
  const selected = inventory.personal.find((mod) => mod.fileName === fileName);
  if (!selected || inventory.bundled.some((mod) => conflicts(mod, selected))) {
    throw new Error(
      'Patilanci modpack files are protected. Only mods added through this launcher can be removed.',
    );
  }

  const filename = modPath(
    instance,
    fileName,
    files.find((file) => file.fileName === fileName)?.enabled !== false,
  );
  const temporary = path.join(instance, `.removed-mod-${crypto.randomUUID()}`);
  let moved = false;
  try {
    const stat = await fs.lstat(filename);
    if (!stat.isFile() || stat.isSymbolicLink())
      throw new Error('Only regular mod files can be removed.');
    await fs.rename(filename, temporary);
    moved = true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  try {
    await writeInventory(instance, {
      ...inventory,
      personal: inventory.personal.filter((mod) => mod !== selected),
    });
  } catch (error) {
    if (moved) await fs.rename(temporary, filename);
    throw error;
  }
  if (moved) await fs.rm(temporary, { force: true });
}

async function setPersonalModEnabled(instance, request) {
  if (!request || typeof request.enabled !== 'boolean')
    throw new Error('Invalid mod enabled state.');
  const { fileName, enabled } = request;
  validateFileName(fileName);
  if (!(await readInstalledPack(instance)))
    throw new Error('Install the Patilanci modpack before changing mods.');
  const { inventory, files } = await currentState(instance);
  const selected = inventory.personal.find((mod) => mod.fileName === fileName);
  const file = files.find((mod) => mod.fileName === fileName);
  if (
    !selected ||
    inventory.bundled.some(
      (mod) => conflicts(mod, selected) || (file && conflicts(mod, file)),
    )
  )
    throw new Error(
      'Patilanci modpack files are protected. Only mods added through this launcher can be enabled or disabled.',
    );
  if (!file)
    throw new Error('The selected mod file is missing. Refresh the mod list.');
  if (file.enabled === enabled) return;
  const source = modPath(instance, fileName, file.enabled);
  const target = modPath(instance, fileName, enabled);
  // COPYFILE_EXCL protects a destination created outside the launcher too.
  await fs.copyFile(source, target, fs.constants.COPYFILE_EXCL);
  try {
    await fs.unlink(source);
  } catch (error) {
    await fs.rm(target, { force: true });
    throw error;
  }
  try {
    await writeInventory(instance, {
      ...inventory,
      personal: inventory.personal.map((mod) =>
        mod === selected ? { ...file, enabled } : mod,
      ),
    });
  } catch (error) {
    await fs.copyFile(target, source, fs.constants.COPYFILE_EXCL);
    await fs.unlink(target);
    throw error;
  }
}

async function preservePersonalMods(previousInstance, nextInstance) {
  const previous = await currentState(previousInstance);
  const next = await readInventory(nextInstance);
  const promoted = [];

  next.external ||= [];
  const personalNames = new Set(
    previous.inventory.personal.map((mod) => mod.fileName),
  );
  for (const mod of [
    ...previous.inventory.personal,
    ...(previous.inventory.external || []),
  ]) {
    const file = previous.files.find(
      (entry) => entry.fileName === mod.fileName,
    );
    if (!file) continue;
    const conflict = next.bundled.find((entry) => conflicts(entry, file));
    if (conflict) {
      if (conflict.sha256 === file.sha256) {
        promoted.push(mod.name);
        continue;
      }
      throw new Error(
        `The new pack includes ${conflict.name}, which conflicts with your added mod ${mod.name}. Remove your added mod using the Mods tab or instance folder, then retry the update.`,
      );
    }
    await fs.mkdir(path.join(nextInstance, 'mods'), { recursive: true });
    await fs.copyFile(
      modPath(previousInstance, mod.fileName, file.enabled !== false),
      modPath(nextInstance, mod.fileName, file.enabled !== false),
      fs.constants.COPYFILE_EXCL,
    );
    (personalNames.has(mod.fileName) ? next.personal : next.external).push(
      file,
    );
  }
  await writeInventory(nextInstance, next);
  return promoted;
}

module.exports = {
  scanMods,
  listMods,
  recordBundledMods,
  ensureModInventory,
  addLocalMods,
  removePersonalMod,
  setPersonalModEnabled,
  preservePersonalMods,
};
