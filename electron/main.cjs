const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  safeStorage,
  dialog,
} = require('electron');
const fs = require('node:fs/promises'),
  path = require('node:path'),
  crypto = require('node:crypto');
const Zip = require('adm-zip');
const os = require('node:os');
const { Authenticator } = require('minecraft-launcher-core');
const { startMinecraftService } = require('./minecraft-service.cjs');
const { prepareJava, probeJava, JAVA_VERSIONS } = require('./java-runtime.cjs');
const { Auth } = require('msmc');
const { status } = require('minecraft-server-util');
const { safePath } = require('./utils.cjs');
const { savePreferences } = require('./preferences.cjs');
const { lockWindowZoom } = require('./window-zoom.cjs');
const { enableInspectElement } = require('./inspect-element.cjs');
const { createDiscordPresence } = require('./discord-presence.cjs');
const { configureLauncherExit } = require('./launcher-exit.cjs');
const { createUpdateMonitor } = require('./update-monitor.cjs');
const { createInstanceStorage } = require('./instance-storage.cjs');
const { prepareLaunch } = require('./launch-preparation.cjs');
const {
  DISCORD_APPLICATION_ID,
  DISCORD_IMAGE_KEY,
} = require('./discord-config.cjs');
const {
  createStartupUpdate,
  createStartupFlow,
} = require('./startup-update.cjs');
const { createLauncherUpdates } = require('./launcher-updates.cjs');
const { createOfflineProfiles } = require('./offline-profiles.cjs');
const { createSessionStore } = require('./sessions.cjs');
const {
  preservePlayerData,
  reuseGameDownloads,
} = require('./instance-data.cjs');
const { createGameProcess, terminate } = require('./game-process.cjs');
const { createConsoleLog } = require('./console-log.cjs');
const { createConsoleWindow } = require('./console-window.cjs');
const { createOfflineSkinResolver } = require('./offline-skins.cjs');
const {
  publicMinecraftProfile,
  loadPlayerSkin,
} = require('./player-profile.cjs');
const { serviceUrl } = require('./download-service-config.cjs');
const {
  windowState,
  windowAction,
  observeWindowState,
} = require('./window-controls.cjs');
const { findLatestClientFile } = require('./releases.cjs');
const {
  listMods,
  recordBundledMods,
  ensureModInventory,
  addLocalMods,
  removePersonalMod,
  preservePersonalMods,
} = require('./mods.cjs');
const HOST = 'hushed-mongoose.shulker.com',
  PROJECT = 1746375;
let win,
  account,
  playerProfile = null,
  skinRequest = null,
  busy = false,
  running = false;
const consoleLog = createConsoleLog();
const discord = createDiscordPresence({
  applicationId: DISCORD_APPLICATION_ID,
  imageKey: DISCORD_IMAGE_KEY,
});
let launchAttempt = null;
let updateMonitor;
const gameConsole = createConsoleWindow({
  BrowserWindow,
  ipcMain,
  log: consoleLog,
  onClose: stopConsoleGame,
});
let lastConsoleMessage = '';
const game = createGameProcess({
  kill: (child) =>
    launchAttempt?.service ? launchAttempt.service.stop() : terminate(child),
  onChange(state) {
    running = state.running;
    discord.setActivity(state.running ? 'playing' : 'launcher');
    consoleLog.setStatus(
      state.stopping ? 'stopping' : state.running ? 'running' : 'stopped',
    );
    if (win && !win.isDestroyed()) win.webContents.send('gameState', state);
    if (!state.running) {
      instanceStorage.invalidate();
      send('Minecraft closed. Ready to play.', 100);
    } else if (state.stopping) send('Stopping Minecraft…');
  },
});
async function stopConsoleGame() {
  const attempt = launchAttempt;
  if (attempt) attempt.cancelled = true;
  attempt?.javaAbort?.abort();
  if (!game.state().running) discord.setActivity('launcher');
  if (game.state().running) await game.stop();
  else if (attempt?.service) await attempt.service.stop();
  await attempt?.javaPreparation?.catch(() => {});
}
const ownsLauncherLock = app.requestSingleInstanceLock();
if (!ownsLauncherLock) app.quit();
app.on('second-instance', () => {
  if (win?.isMinimized()) win.restore();
  win?.show();
  win?.focus();
});
const base = () => path.join(app.getPath('userData'), 'instances'),
  root = () => path.join(base(), 'patilanci');
const settingFile = () => path.join(app.getPath('userData'), 'settings.json');
const instanceStorage = createInstanceStorage({
  instance: root,
  runtimes: () => path.join(app.getPath('userData'), 'runtimes'),
});
let offlineProfileStore;
let offlineSkinResolver;
function offlineSkins() {
  return (offlineSkinResolver ||= createOfflineSkinResolver(
    path.join(app.getPath('userData'), 'offline-skin-cache'),
  ));
}
let sessionStore,
  savedSession = {},
  sessionReady;
function sessions() {
  return (sessionStore ||= createSessionStore(
    path.join(app.getPath('userData'), 'session.enc'),
    safeStorage,
  ));
}
function restoreSession() {
  return (sessionReady ||= (async () => {
    savedSession = await sessions().read();
    if (savedSession.refreshToken && savedSession.mode !== 'offline') {
      try {
        await acceptMicrosoft(
          await new Auth('select_account').refresh(savedSession.refreshToken),
        );
      } catch {
        // Keep the refresh token for a later retry if the network is unavailable.
      }
    }
  })());
}
function activeSession() {
  const mode = savedSession.mode || 'microsoft';
  return {
    mode,
    name: savedSession.offlineName || '',
    authenticated:
      mode === 'offline'
        ? Boolean(savedSession.offlineName)
        : Boolean(savedSession.refreshToken),
  };
}
function requireAccountChange() {
  if (busy || running)
    throw new Error(
      'Wait for the current operation and close Minecraft before changing accounts.',
    );
}
async function acceptMicrosoft(xbox) {
  const minecraft = await xbox.getMinecraft();
  if (minecraft.profile.demo)
    throw new Error('This Microsoft account needs Minecraft Java Edition.');
  const profile = publicMinecraftProfile(minecraft.profile);
  const updated = { ...savedSession, refreshToken: xbox.save() };
  await sessions().write(updated);
  savedSession = updated;
  account = minecraft;
  playerProfile = profile;
  skinRequest = null;
}
function offlineProfiles() {
  offlineProfileStore ||= createOfflineProfiles(
    path.join(app.getPath('userData'), 'offline-profiles.json'),
  );
  return offlineProfileStore;
}
const send = (message, percent = null) => {
  if (win && !win.isDestroyed())
    win.webContents.send('progress', { message, percent });
  if (consoleLog.active() && message !== lastConsoleMessage) {
    consoleLog.append(message);
    lastConsoleMessage = message;
  }
};
const launcherUpdates = createLauncherUpdates({
  enabled:
    app.isPackaged &&
    !require('../package.json').patilanciPreview &&
    !process.windowsStore &&
    process.platform === 'win32',
  version: app.getVersion(),
  createUpdater: () => new (require('electron-updater').NsisUpdater)(),
  onState: (state) => {
    if (win && !win.isDestroyed())
      win.webContents.send('launcherUpdate', state);
    updateMonitor?.launcherState(state);
  },
  canInstall: () => !busy && !running,
});
async function restoreStartupAccount() {
  if (!account && savedSession.refreshToken) sessionReady = null;
  await restoreSession();
  const session = activeSession();
  if (session.mode === 'offline' && session.authenticated) {
    const profile = await offlineProfiles().status(session.name);
    if (!profile.exists) {
      savedSession = { ...savedSession, offlineName: undefined };
      await sessions().write(savedSession);
      return {
        status: 'sign-in-required',
        message: 'Offline profile needs sign-in',
      };
    }
    return {
      status: 'ready',
      message: `Offline profile restored · ${session.name}`,
    };
  }
  if (savedSession.refreshToken && !account)
    return {
      status: 'sign-in-required',
      message: 'Microsoft session needs sign-in · reconnect from Home',
    };
  return account
    ? {
        status: 'ready',
        message: `Microsoft account restored · ${playerProfile.name}`,
      }
    : { status: 'signed-out', message: 'Choose an account after startup' };
}
async function settings() {
  let s = { memory: 6, javaPath: 'java', apiKey: '' };
  try {
    const v = JSON.parse(await fs.readFile(settingFile(), 'utf8'));
    s = {
      ...s,
      ...v,
      apiKey: v.key
        ? safeStorage.decryptString(Buffer.from(v.key, 'base64'))
        : '',
    };
  } catch {}
  if (!s.javaPaths) {
    s.javaPaths = {};
    if (s.javaPath?.trim() && s.javaPath.trim() !== 'java') {
      let major = 21;
      try {
        major = await probeJava(s.javaPath.trim());
      } catch {}
      if (JAVA_VERSIONS.includes(major)) s.javaPaths[major] = s.javaPath.trim();
    }
  }
  return s;
}
async function json(url, headers = {}) {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
  if (!r.ok)
    throw Error(`Request failed (${r.status}) at ${new URL(url).hostname}`);
  return r.json();
}
async function cfResponse(route) {
  const backend = serviceUrl();
  if (backend) return json(`${backend}/v1${route}`);
  const s = await settings();
  if (!s.apiKey)
    throw Error(
      'Modpack downloads are not configured. Contact the Patilanci launcher administrator.',
    );
  return json(`https://api.curseforge.com/v1${route}`, {
    'x-api-key': s.apiKey,
    'Cache-Control': 'no-cache',
  });
}
async function cf(route) {
  return (await cfResponse(route)).data;
}
async function latestPackFile() {
  const latestOnly = Boolean(serviceUrl());
  return findLatestClientFile(({ index, pageSize }) =>
    cfResponse(
      `/mods/${PROJECT}/files?index=${index}&pageSize=${latestOnly ? 1 : pageSize}`,
    ),
  );
}
async function download(url, file, hash) {
  const u = new URL(url);
  if (u.protocol !== 'https:') throw Error('HTTPS required');
  const headers = {};
  if (u.hostname.endsWith('.forgecdn.net'))
    headers['x-api-key'] = (await settings()).apiKey;
  const r = await fetch(u, { headers, signal: AbortSignal.timeout(180000) });
  if (!r.ok) throw Error(`Download failed (${r.status})`);
  const data = Buffer.from(await r.arrayBuffer());
  if (
    hash &&
    crypto.createHash('sha1').update(data).digest('hex').toLowerCase() !==
      hash.toLowerCase()
  )
    throw Error('Download integrity check failed');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
}
async function fileDownload(mod, id, directory) {
  const info = await cf(`/mods/${mod}/files/${id}`);
  const url =
    info.downloadUrl || (await cf(`/mods/${mod}/files/${id}/download-url`));
  if (!url)
    throw Error(
      `Third-party downloads unavailable for ${info.displayName}. Installation was not activated.`,
    );
  const dest = safePath(directory, info.fileName);
  await download(url, dest, info.hashes?.find((h) => h.algo === 1)?.value);
  return dest;
}
async function installed() {
  try {
    return JSON.parse(
      await fs.readFile(path.join(root(), 'patilanci-install.json'), 'utf8'),
    );
  } catch {
    return null;
  }
}
async function install({ refreshInventory = true } = {}) {
  if (busy || running)
    throw Error('Close Minecraft or wait for the current operation.');
  busy = true;
  const staging = path.join(base(), `staging-${Date.now()}`);
  try {
    send('Verifying the latest CurseForge client release…', 2);
    const latest = await latestPackFile();
    const old = await installed();
    if (old?.fileId === latest.id) {
      updateMonitor?.installed(old);
      if (refreshInventory) await ensureModInventory(root());
      const releaseName = latest.displayName || latest.fileName;
      if (releaseName && old.releaseName !== releaseName) {
        old.releaseName = releaseName;
        await fs.writeFile(
          path.join(root(), 'patilanci-install.json'),
          JSON.stringify(old),
        );
      }
      send('Latest client release verified.', 100);
      return old;
    }
    await fs.mkdir(staging, { recursive: true });
    const archive = await fileDownload(PROJECT, latest.id, staging),
      zip = new Zip(archive);
    const entry = zip.getEntry('manifest.json');
    if (!entry) throw Error('Missing pack manifest');
    const manifest = JSON.parse(entry.getData().toString());
    const loader =
      manifest.minecraft?.modLoaders?.find((l) => l.primary) ||
      manifest.minecraft?.modLoaders?.[0];
    if (!loader?.id.startsWith('fabric-'))
      throw Error('Only Fabric packs are currently supported');
    const instance = path.join(staging, 'instance');
    await fs.mkdir(instance, { recursive: true });
    const overrides = manifest.overrides || 'overrides';
    safePath(instance, overrides);
    for (const e of zip.getEntries()) {
      if (e.isDirectory || !e.entryName.startsWith(overrides + '/')) continue;
      const dest = safePath(instance, e.entryName.slice(overrides.length + 1));
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, e.getData());
    }
    const mods = manifest.files || [];
    for (let i = 0; i < mods.length; i++) {
      send(
        `Downloading mod ${i + 1} of ${mods.length}`,
        10 + Math.round((i / Math.max(mods.length, 1)) * 75),
      );
      await fileDownload(
        mods[i].projectID,
        mods[i].fileID,
        path.join(instance, 'mods'),
      );
    }
    send('Preparing Fabric…', 90);
    const mc = manifest.minecraft.version,
      fabric = loader.id.slice(7);
    const profile = await json(
      `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(mc)}/${encodeURIComponent(fabric)}/profile/json`,
    );
    const dir = safePath(path.join(instance, 'versions'), profile.id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, `${profile.id}.json`),
      JSON.stringify(profile),
    );
    const pack = {
      fileId: latest.id,
      releaseName: latest.displayName || latest.fileName,
      name: manifest.name,
      version: manifest.version,
      minecraft: mc,
      fabric,
      custom: profile.id,
      mods: mods.length,
    };
    await fs.writeFile(
      path.join(instance, 'patilanci-install.json'),
      JSON.stringify(pack),
    );
    await recordBundledMods(instance);
    const promoted = await preservePersonalMods(root(), instance);
    if (promoted.length > 0) {
      send(`Now included in the protected pack: ${promoted.join(', ')}`);
    }
    await preservePlayerData(root(), instance);
    send('Reusing downloaded Minecraft assets and libraries…', 95);
    await reuseGameDownloads(root(), instance);
    const backup = path.join(base(), 'patilanci-backup');
    await fs.rm(backup, { recursive: true, force: true });
    let moved = false;
    try {
      await fs.rename(root(), backup);
      moved = true;
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    try {
      await fs.rename(instance, root());
    } catch (e) {
      if (moved) await fs.rename(backup, root());
      throw e;
    }
    instanceStorage.invalidate();
    updateMonitor?.installed(pack);
    send('Modpack ready. Your adventure awaits.', 100);
    return pack;
  } finally {
    try {
      await fs.rm(staging, { recursive: true, force: true });
    } finally {
      busy = false;
    }
  }
}
app.whenReady().then(() => {
  if (!ownsLauncherLock) return;
  discord.start();
  win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1050,
    minHeight: 740,
    backgroundColor: '#0b0b0d',
    title: 'Patilanci Launcher',
    icon: path.join(__dirname, '../dist/brand/patilanci-icon.png'),
    autoHideMenuBar: true,
    frame: false,
    show: false,
    webPreferences: {
      devTools: !app.isPackaged,
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      zoomFactor: 1,
    },
  });
  lockWindowZoom(win);
  enableInspectElement(win);
  observeWindowState(win);
  win.on('closed', () => gameConsole.close());
  configureLauncherExit({
    app,
    window: win,
    beforeQuit: stopConsoleGame,
    onError: (error) => {
      consoleLog.append(error.message, 'launcher', 'error');
      gameConsole.open();
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.loadFile(path.join(__dirname, '../dist/index.html')).then(() => {
    win.show();
    win.focus();
  });
  updateMonitor.start();
  win.on('focus', () => {
    void updateMonitor.check();
  });
});
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => {
  updateMonitor?.stop();
  discord.stop();
});
ipcMain.handle('openConsole', (event) => {
  if (event.sender !== win?.webContents)
    throw new Error('Launcher window required.');
  gameConsole.open();
});
ipcMain.handle('windowState', (event) => {
  if (event.sender !== win?.webContents)
    throw new Error('Launcher window required.');
  return windowState(win);
});
ipcMain.handle('windowAction', (event, action) =>
  windowAction(win, event.sender, action),
);
ipcMain.handle('config', async () => {
  await restoreSession();
  const s = await settings();
  return {
    memory: s.memory,
    javaPath: s.javaPath,
    javaPaths: s.javaPaths,
    installed: await installed(),
    host: HOST,
    account: playerProfile,
    session: activeSession(),
    game: game.state(),
    launcherUpdate: launcherUpdates.state(),
    modpackUpdate: updateMonitor.state(),
  };
});
ipcMain.handle('memoryInfo', () => ({
  totalBytes: os.totalmem(),
  availableBytes: os.freemem(),
  sampledAt: Date.now(),
}));
ipcMain.handle('storage', (_, force) =>
  busy ? { status: 'busy' } : instanceStorage.read(force === true),
);
ipcMain.handle('save', (_, data) => savePreferences(settingFile(), data));
ipcMain.handle('browseJava', async (_, major) => {
  if (!JAVA_VERSIONS.includes(major))
    throw new Error('Unsupported Java version.');
  const selection = await dialog.showOpenDialog(win, {
    title: `Select the Java ${major} executable`,
    properties: ['openFile'],
    filters: [{ name: 'Java executable (java.exe)', extensions: ['exe'] }],
  });
  if (selection.canceled || !selection.filePaths[0]) return null;
  const executable = selection.filePaths[0];
  const found = await probeJava(executable);
  if (found !== major)
    throw new Error(
      `Selected Java ${found}. Choose a Java ${major} executable for this row.`,
    );
  return executable;
});
ipcMain.handle('status', async () => {
  try {
    const r = await status(HOST, 25565, { timeout: 8000, enableSRV: true });
    return {
      online: true,
      count: r.players.online,
      max: r.players.max,
      players: (r.players.sample || []).map((p) => ({
        name: p.name,
        id: p.id,
      })),
      latency: r.roundTripLatency,
    };
  } catch {
    return { online: false, count: 0, max: 0, players: [] };
  }
});
ipcMain.handle('login', async () => {
  requireAccountChange();
  await restoreSession();
  if (activeSession().authenticated && activeSession().mode !== 'microsoft')
    throw new Error(
      'Sign out of your offline profile before signing in with Microsoft.',
    );
  const xbox = await new Auth('select_account').launch('electron');
  await acceptMicrosoft(xbox);
  savedSession = { ...savedSession, mode: 'microsoft' };
  await sessions().write(savedSession);
  return playerProfile;
});
ipcMain.handle('logout', async () => {
  requireAccountChange();
  await restoreSession();
  await sessions().clear();
  savedSession = {};
  account = null;
  playerProfile = null;
  skinRequest = null;
});
ipcMain.handle('skin', async (_, request) => {
  await restoreSession();
  if (request?.mode === 'offline') {
    const session = activeSession();
    if (
      session.mode !== 'offline' ||
      !session.authenticated ||
      typeof request.name !== 'string' ||
      request.name.toLowerCase() !== session.name.toLowerCase()
    )
      throw new Error('Sign in to this offline profile to view its skin.');
    return offlineSkins().get(session.name);
  }
  if (!account || !playerProfile)
    throw new Error('Sign in with Microsoft to view your skin.');
  if (!skinRequest) {
    skinRequest = loadPlayerSkin(playerProfile.skin);
    skinRequest.catch(() => {
      skinRequest = null;
    });
  }
  return skinRequest;
});
const startupUpdate = createStartupUpdate(install);
const startupFlow = createStartupFlow({
  checkLauncher: () =>
    running
      ? { status: 'current', version: app.getVersion() }
      : launcherUpdates.check(),
  restoreAccount: restoreStartupAccount,
  updatePack: async () => {
    if (!running) await startupUpdate();
    return installed();
  },
  onState: (state) => win?.webContents.send('startupState', state),
});
updateMonitor = createUpdateMonitor({
  getInstalled: installed,
  getLatest: latestPackFile,
  checkLauncher: () => launcherUpdates.check(),
  canCheck: () => !busy && startupFlow.state().status === 'ready',
  onState: (state) => {
    if (win && !win.isDestroyed()) win.webContents.send('modpackUpdate', state);
  },
});
ipcMain.handle('startup', () => startupFlow.run());
ipcMain.handle('retryStartup', () => startupFlow.retry());
ipcMain.handle('checkLauncherUpdate', () => {
  if (busy || running)
    throw new Error(
      'Close Minecraft and wait for the current operation before checking launcher updates.',
    );
  return launcherUpdates.check();
});
ipcMain.handle('installLauncherUpdate', () => launcherUpdates.install());
ipcMain.handle('startupUpdate', async () => {
  if (running) return installed();
  await startupUpdate();
  return installed();
});
ipcMain.handle('install', () => install());
ipcMain.handle('gameState', () => game.state());
ipcMain.handle('stopMinecraft', () => game.stop());
ipcMain.handle('offlineProfile', async (_, name) => {
  await restoreSession();
  const result = await offlineProfiles().status(name);
  return {
    ...result,
    remembered:
      savedSession.mode === 'offline' &&
      result.exists &&
      savedSession.offlineName?.toLowerCase() === name.toLowerCase(),
  };
});
ipcMain.handle('loginOffline', async (_, request) => {
  requireAccountChange();
  busy = true;
  try {
    await restoreSession();
    const session = activeSession();
    if (
      session.authenticated &&
      (session.mode !== 'offline' ||
        request?.name?.toLowerCase() !== session.name.toLowerCase())
    )
      throw new Error('Sign out before choosing a different account.');
    const profile = await offlineProfiles().authorize(request);
    const nextSession = {
      ...savedSession,
      mode: 'offline',
      offlineName: profile.name,
    };
    await sessions().write(nextSession);
    savedSession = nextSession;
    return profile;
  } finally {
    busy = false;
  }
});
ipcMain.handle('play', async (_, p) => {
  if (busy || running)
    throw Error('Minecraft or an installation is already running');
  let authorization;
  busy = true;
  try {
    await restoreSession();
    const session = activeSession();
    if (
      session.authenticated &&
      (p?.mode !== session.mode ||
        (session.mode === 'offline' &&
          p?.name?.toLowerCase() !== session.name.toLowerCase()))
    )
      throw new Error('Sign out before choosing a different account.');
    if (p?.mode === 'microsoft') {
      if (!account && savedSession.refreshToken)
        await acceptMicrosoft(
          await new Auth('select_account').refresh(savedSession.refreshToken),
        );
      if (!account) throw Error('Sign in with Microsoft first');
      if (!account.validate())
        await acceptMicrosoft(
          await new Auth('select_account').refresh(savedSession.refreshToken),
        );
      authorization = await account.mclc();
      savedSession = { ...savedSession, mode: 'microsoft' };
      await sessions().write(savedSession);
    } else if (p?.mode === 'offline') {
      const state = await offlineProfiles().status(p.name);
      const remembered =
        savedSession.mode === 'offline' &&
        state.exists &&
        savedSession.offlineName?.toLowerCase() === p.name.toLowerCase();
      if (!remembered)
        throw new Error('Confirm your offline profile PIN to sign in first.');
      authorization = await Authenticator.getAuth(savedSession.offlineName);
    } else {
      throw new Error('Choose a Microsoft account or an offline profile.');
    }
  } finally {
    busy = false;
  }
  const attempt = (launchAttempt = {
    cancelled: false,
    service: null,
    javaAbort: new AbortController(),
  });
  discord.setActivity('launching');
  consoleLog.start([authorization.access_token, authorization.client_token]);
  lastConsoleMessage = '';
  gameConsole.open();
  const preparationStarted = performance.now();
  try {
    const {
      pack,
      settings: s,
      javaPath,
    } = await prepareLaunch({
      install: async (options) => {
        const pack = await install(options);
        busy = true;
        return pack;
      },
      readSettings: settings,
      readInstalled: installed,
      getLatest: latestPackFile,
      controller: attempt.javaAbort,
      prepareRuntime: (pack, s) => {
        send('Checking Java and confirming the latest modpack…');
        return (attempt.javaPreparation = prepareJava(
          {
            pack,
            instance: root(),
            javaPaths: s.javaPaths,
            directory: path.join(app.getPath('userData'), 'runtimes'),
          },
          {
            signal: attempt.javaAbort.signal,
            onProgress: (message, percent) => {
              if (!attempt.cancelled) send(message, percent);
            },
          },
        ));
      },
    });
    if (attempt.cancelled) throw new Error('Minecraft launch cancelled.');
    send('Starting Minecraft…');
    attempt.service = startMinecraftService(
      {
        authorization,
        root: root(),
        javaPath,
        version: {
          number: pack.minecraft,
          type: 'release',
          custom: pack.custom,
        },
        memory: { min: '2G', max: `${s.memory}G` },
        quickPlay: { type: 'multiplayer', identifier: HOST },
      },
      {
        onData: (chunk) => {
          if (launchAttempt === attempt) consoleLog.write(chunk);
        },
        onProgress: (e) => {
          if (launchAttempt === attempt && !attempt.cancelled)
            send(
              `Preparing ${e.type}…`,
              e.total ? Math.round((e.task / e.total) * 100) : null,
            );
        },
        onSpawn: (child) => game.track(child),
        onClose: (code) => {
          if (launchAttempt !== attempt) return;
          consoleLog.flush();
          consoleLog.append(
            `Minecraft exited with code ${code ?? 'unknown'}.`,
            'launcher',
            code ? 'error' : 'info',
          );
        },
      },
    );
    attempt.service.done.then(() => {
      if (launchAttempt === attempt) launchAttempt = null;
    });
    await attempt.service.ready;
    if (attempt.cancelled) throw new Error('Minecraft launch cancelled.');
    send('Minecraft is running.', 100);
    consoleLog.append(
      `Launcher preparation completed in ${((performance.now() - preparationStarted) / 1000).toFixed(1)} seconds.`,
      'launcher',
    );
    return true;
  } catch (error) {
    attempt.javaAbort.abort();
    await attempt.javaPreparation?.catch(() => {});
    consoleLog.flush();
    consoleLog.setStatus(attempt.cancelled ? 'stopped' : 'failed');
    consoleLog.append(
      error.message,
      'launcher',
      attempt.cancelled ? 'info' : 'error',
    );
    if (attempt.cancelled) {
      send('Minecraft launch cancelled.');
      return false;
    }
    throw error;
  } finally {
    busy = false;
    if (!running) discord.setActivity('launcher');
    if (!attempt.service && launchAttempt === attempt) launchAttempt = null;
  }
});
ipcMain.handle('folder', async () => {
  await fs.mkdir(root(), { recursive: true });
  await shell.openPath(root());
});
ipcMain.handle('packPage', () =>
  shell.openExternal('https://www.curseforge.com/minecraft/modpacks/patilanci'),
);

async function modInventory() {
  return { ...(await listMods(root())), canModify: !busy && !running };
}

async function changeMods(callback) {
  if (busy || running) {
    throw new Error(
      'Close Minecraft and wait for installations to finish before changing mods.',
    );
  }
  busy = true;
  try {
    const result = await callback();
    instanceStorage.invalidate();
    return result;
  } finally {
    busy = false;
  }
}

ipcMain.handle('mods', modInventory);
ipcMain.handle('addMods', async () => {
  const added = await changeMods(async () => {
    if (!(await installed()))
      throw new Error('Install the Patilanci modpack before adding mods.');
    const selection = await dialog.showOpenDialog(win, {
      title: 'Add your Fabric mods',
      buttonLabel: 'Add mods',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Fabric mod JARs', extensions: ['jar'] }],
    });
    if (selection.canceled) return 0;
    return addLocalMods(root(), selection.filePaths);
  });
  return { ...(await modInventory()), added };
});
ipcMain.handle('removeMod', async (_, fileName) => {
  await changeMods(() => removePersonalMod(root(), fileName));
  return modInventory();
});
