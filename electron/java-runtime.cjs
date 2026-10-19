const fs = require('node:fs/promises');
const syncFs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require('node:worker_threads');
const Zip = require('adm-zip');
const { safePath } = require('./utils.cjs');

const JAVA_VERSIONS = [8, 17, 21, 25];
function parseJavaVersion(output) {
  const match = /(?:openjdk|java) version "(?:1\.)?(\d+)(?:[.\-+"_])/i.exec(
    output,
  );
  if (!match)
    throw new Error(
      'Could not read the Java version. Choose bin/java.exe from a Java installation.',
    );
  return Number(match[1]);
}
function probeJava(executable) {
  return new Promise((resolve, reject) => {
    execFile(
      executable,
      ['-version'],
      { windowsHide: true, timeout: 10000, maxBuffer: 65536 },
      (error, stdout, stderr) => {
        if (error)
          return reject(
            new Error(
              'Cannot run the selected Java executable. Check its path in Settings.',
            ),
          );
        try {
          resolve(parseJavaVersion(`${stdout}\n${stderr}`));
        } catch (error) {
          reject(error);
        }
      },
    );
  });
}
async function checkJava(executable, major, probe = probeJava) {
  const found = await probe(executable);
  if (found !== major)
    throw new Error(
      `Java ${major} is required, but the selected executable is Java ${found}. Choose Java ${major} in Settings or reset its path to Automatic.`,
    );
  return executable;
}
async function getJson(url, fetcher = fetch) {
  if (new URL(url).protocol !== 'https:')
    throw new Error('Java metadata requires HTTPS.');
  const response = await fetcher(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok)
    throw new Error(
      `Could not retrieve Java requirements or runtime (HTTP ${response.status}). Check your connection and try again.`,
    );
  return response.json();
}
async function requiredJava(pack, instance, readJson = getJson) {
  const versionDirectory = path.join(instance, 'versions');
  let vanilla;
  try {
    vanilla = JSON.parse(
      await fs.readFile(
        safePath(versionDirectory, `${pack.minecraft}/${pack.minecraft}.json`),
        'utf8',
      ),
    );
    if (vanilla.id !== pack.minecraft || !vanilla.javaVersion?.majorVersion)
      vanilla = null;
  } catch {}
  if (!vanilla) {
    try {
      const cached = JSON.parse(
        await fs.readFile(
          path.join(
            versionDirectory,
            `patilanci-java-${encodeURIComponent(pack.minecraft)}.json`,
          ),
          'utf8',
        ),
      );
      if (cached.id === pack.minecraft) vanilla = cached;
    } catch {}
  }
  if (!vanilla) {
    const manifest = await readJson(
      'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json',
    );
    const version = manifest.versions?.find(
      (entry) => entry.id === pack.minecraft,
    );
    if (!version)
      throw new Error(
        `Cannot find Java requirements for Minecraft ${pack.minecraft}.`,
      );
    vanilla = await readJson(version.url);
    if (vanilla.id !== pack.minecraft)
      throw new Error('Minecraft version metadata does not match the modpack.');
    // Keep requirements offline without pre-populating MCLC's own version files.
    await fs.mkdir(versionDirectory, { recursive: true });
    await fs.writeFile(
      path.join(
        versionDirectory,
        `patilanci-java-${encodeURIComponent(pack.minecraft)}.json`,
      ),
      JSON.stringify(vanilla),
    );
  }
  let loader = {};
  try {
    loader = JSON.parse(
      await fs.readFile(
        safePath(versionDirectory, `${pack.custom}/${pack.custom}.json`),
        'utf8',
      ),
    );
  } catch {}
  const major = Math.max(
    vanilla.javaVersion?.majorVersion || 8,
    loader.javaVersion?.majorVersion || 8,
  );
  if (!JAVA_VERSIONS.includes(major))
    throw new Error(
      `This modpack requires Java ${major}, which this launcher does not yet manage.`,
    );
  return major;
}
async function downloadRuntime(
  pkg,
  file,
  onProgress = () => {},
  fetcher = fetch,
) {
  if (
    !/^[a-f0-9]{64}$/i.test(pkg.checksum || '') ||
    new URL(pkg.link).protocol !== 'https:'
  )
    throw new Error('Invalid Java download metadata.');
  const response = await fetcher(pkg.link, {
    signal: AbortSignal.timeout(300000),
  });
  if (!response.ok || !response.body)
    throw new Error(
      `Java download failed (HTTP ${response.status}). Try launching again.`,
    );
  const handle = await fs.open(file, 'wx');
  const digest = crypto.createHash('sha256');
  let bytes = 0,
    lastPercent = -1;
  try {
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > 200 * 1024 * 1024)
        throw new Error('Java runtime download is too large.');
      digest.update(chunk);
      await handle.writeFile(chunk);
      const percent = pkg.size
        ? Math.min(99, Math.floor((bytes / pkg.size) * 100))
        : null;
      if (percent !== lastPercent) {
        onProgress(percent);
        lastPercent = percent;
      }
    }
  } finally {
    await handle.close();
  }
  if (digest.digest('hex').toLowerCase() !== pkg.checksum.toLowerCase())
    throw new Error(
      'Java download integrity check failed. Try launching again.',
    );
}
function extractRuntime(archive, destination) {
  const zip = new Zip(archive);
  let total = 0,
    executable;
  for (const entry of zip.getEntries()) {
    const target = safePath(destination, entry.entryName.replace(/\/$/, ''));
    if (((entry.attr >>> 16) & 0xf000) === 0xa000)
      throw new Error('Java archive contains a symbolic link.');
    total += entry.header.size;
    if (total > 600 * 1024 * 1024)
      throw new Error('Java archive expands beyond its allowed size.');
    if (entry.isDirectory) {
      syncFs.mkdirSync(target, { recursive: true });
      continue;
    }
    syncFs.mkdirSync(path.dirname(target), { recursive: true });
    syncFs.writeFileSync(target, entry.getData(), { flag: 'wx' });
    if (entry.entryName.endsWith('/bin/java.exe')) executable = target;
  }
  if (!executable)
    throw new Error('Java download does not contain bin/java.exe.');
  return executable;
}
async function ensureJava(
  { major, javaPaths = {}, directory, stagingName, onProgress = () => {} },
  dependencies = {},
) {
  const probe = dependencies.probe || probeJava;
  if (!JAVA_VERSIONS.includes(major))
    throw new Error('Unsupported Java version.');
  if (javaPaths[major]?.trim()) {
    onProgress(`Checking your Java ${major} executable…`);
    return checkJava(javaPaths[major].trim(), major, probe);
  }
  const target = path.join(directory, `java-${major}-x64`);
  try {
    const marker = JSON.parse(
      await fs.readFile(path.join(target, 'runtime.json'), 'utf8'),
    );
    const executable = safePath(target, marker.executable);
    await checkJava(executable, major, probe);
    onProgress(`Using managed Java ${major}.`);
    return executable;
  } catch {}
  if (
    (dependencies.platform || process.platform) !== 'win32' ||
    (dependencies.arch || process.arch) !== 'x64'
  )
    throw new Error(
      'Automatic Java installation currently supports Windows x64. Set a Java executable in Settings.',
    );
  onProgress(`Finding Java ${major}…`);
  const readJson = dependencies.readJson || getJson;
  const releases = await readJson(
    `https://api.adoptium.net/v3/assets/latest/${major}/hotspot?architecture=x64&image_type=jre&os=windows&vendor=eclipse`,
  );
  const pkg = releases.find(
    (release) =>
      release.version?.major === major &&
      release.binary?.package?.name?.endsWith('.zip'),
  )?.binary.package;
  if (!pkg)
    throw new Error(
      `No Java ${major} Windows runtime is available. Set a Java ${major} executable in Settings.`,
    );
  await fs.mkdir(directory, { recursive: true });
  const staging = stagingName
    ? safePath(directory, stagingName)
    : await fs.mkdtemp(path.join(directory, `.java-${major}-`));
  await fs.mkdir(staging, { recursive: true });
  try {
    const archive = path.join(staging, 'runtime.zip');
    await (dependencies.download || downloadRuntime)(pkg, archive, (percent) =>
      onProgress(`Downloading Java ${major}…`, percent),
    );
    onProgress(`Installing Java ${major}…`);
    const unpacked = path.join(staging, 'unpacked');
    const executable = (dependencies.extract || extractRuntime)(
      archive,
      unpacked,
    );
    await checkJava(executable, major, probe);
    const relative = path
      .relative(unpacked, executable)
      .split(path.sep)
      .join('/');
    await fs.writeFile(
      path.join(unpacked, 'runtime.json'),
      JSON.stringify({ major, executable: relative }),
    );
    await fs.rm(target, { recursive: true, force: true });
    await fs.rename(unpacked, target);
    onProgress(`Java ${major} is ready.`);
    return safePath(target, relative);
  } finally {
    await fs.rm(staging, { recursive: true, force: true });
  }
}
function prepareJava(options, { onProgress = () => {}, signal } = {}) {
  const stagingName = `.java-${crypto.randomUUID()}`;
  const staging = safePath(options.directory, stagingName);
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      workerData: { ...options, stagingName },
    });
    let settled = false;
    function finish(error, value) {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve(value);
    }
    function abort() {
      void worker
        .terminate()
        .then(() => finish(new Error('Minecraft launch cancelled.')), finish);
    }
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener('abort', abort, { once: true });
    worker.on('message', (message) => {
      if (message.type === 'progress')
        onProgress(message.message, message.percent ?? null);
      if (message.type === 'ready') finish(null, message.path);
      if (message.type === 'error') finish(new Error(message.message));
    });
    worker.once('error', (error) => finish(error));
    worker.once('exit', () =>
      finish(
        new Error(
          'Java preparation stopped before completion. Try launching again.',
        ),
      ),
    );
  }).finally(() => fs.rm(staging, { recursive: true, force: true }));
}
if (!isMainThread && workerData) {
  (async () => {
    const { pack, instance, directory, javaPaths, stagingName } = workerData;
    const major = await requiredJava(pack, instance);
    const executable = await ensureJava({
      major,
      javaPaths,
      directory,
      stagingName,
      onProgress: (message, percent) =>
        parentPort.postMessage({ type: 'progress', message, percent }),
    });
    parentPort.postMessage({ type: 'ready', path: executable });
  })().catch((error) =>
    parentPort.postMessage({ type: 'error', message: error.message }),
  );
}
module.exports = {
  JAVA_VERSIONS,
  parseJavaVersion,
  probeJava,
  checkJava,
  requiredJava,
  downloadRuntime,
  extractRuntime,
  ensureJava,
  prepareJava,
};
