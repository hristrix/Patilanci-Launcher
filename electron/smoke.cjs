const {
  app,
  BrowserWindow,
  ipcMain,
  nativeImage,
  safeStorage,
} = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const Zip = require('adm-zip');
const { lockWindowZoom } = require('./window-zoom.cjs');
const { verifyResponsiveText } = require('./responsive-check.cjs');
const { checkModpackTabs } = require('./modpack-tabs-check.cjs');
const { checkStartupSplash } = require('./startup-splash-check.cjs');
const {
  createStartupUpdate,
  createStartupFlow,
} = require('./startup-update.cjs');
const { createOfflineProfiles } = require('./offline-profiles.cjs');
const { savePreferences } = require('./preferences.cjs');
const { createSessionStore } = require('./sessions.cjs');
const { createOfflineSkinSelections } = require('./offline-skin-selection.cjs');
const { EventEmitter } = require('node:events');
const { createGameProcess } = require('./game-process.cjs');
const { createConsoleLog } = require('./console-log.cjs');
const { createConsoleWindow } = require('./console-window.cjs');
const {
  windowState,
  windowAction,
  observeWindowState,
} = require('./window-controls.cjs');
const {
  listMods,
  recordBundledMods,
  addLocalMods,
  removePersonalMod,
  setPersonalModEnabled,
} = require('./mods.cjs');

let fixtureDirectory;
let fixtureUpdateChecks = 0;
let fixturePreferences = {
  memory: 6,
  javaPath: 'java',
  javaPaths: {},
  gameWindow: { width: 1920, height: 1080, fullscreen: false },
};
let fixtureInstance;
let fixtureImport;
let showModFixture = true;
let fixtureFreeMemoryGb = 10;
let finishStartup;
let startupChecks = 0;
let startupFailure = false;
let retryUpdates = 0;
let fixtureProfiles;
let fixtureSessions;
let fixtureSkinSelections;
let fixtureGameStarts = 0;
let pauseLaunch = false;
let failNextLaunch = false;
let finishPreparation;
let finishLaunch;
let fixtureAccount = null;
let fixtureSkinRequests = 0;
let fixtureSkin;
let fixtureOfflineSkinAvailable = true;
let fixtureSkinUploads = 0;
let fixtureWindow;
let fixtureAuthorWebsiteRequests = 0;
let finishGameStop;
const fixtureGame = createGameProcess({
  onChange: (state) => fixtureWindow?.webContents.send('gameState', state),
  kill: (child) =>
    new Promise((resolve) => {
      finishGameStop = () => {
        child.emit('exit', 0);
        resolve();
      };
    }),
});
ipcMain.handle('gameState', () => fixtureGame.state());
ipcMain.handle('stopMinecraft', () => fixtureGame.stop());
ipcMain.handle('windowState', () => windowState(fixtureWindow));
ipcMain.handle('windowAction', (event, action) =>
  windowAction(fixtureWindow, event.sender, action),
);
ipcMain.handle('authorWebsite', (_, destination) => {
  assert.equal(
    destination,
    undefined,
    'The renderer must not choose an external URL',
  );
  fixtureAuthorWebsiteRequests++;
});
ipcMain.handle('login', () => {
  fixtureAccount = {
    id: 'a'.repeat(32),
    name: 'Adventurer1234567',
    skin: { model: 'default' },
  };
  return fixtureAccount;
});
ipcMain.handle('logout', async () => {
  await fixtureSessions.clear();
  fixtureAccount = null;
});
ipcMain.handle('skin', async (_, request) => {
  if (request?.mode === 'offline') {
    assert.equal(
      (await fixtureSessions.read()).offlineName?.toLowerCase(),
      request.name.toLowerCase(),
      'Offline skin lookup needs a signed-in profile',
    );
    fixtureSkinRequests += 1;
    const saved = await fixtureSkinSelections.read(request.name);
    if (saved) return saved.texture;
    if (!fixtureOfflineSkinAvailable) return null;
    return { dataUrl: fixtureSkin, model: 'default', source: 'Ely.by' };
  }
  assert.ok(
    fixtureAccount,
    'Skins must only load for signed-in Microsoft profiles',
  );
  fixtureSkinRequests += 1;
  return { dataUrl: fixtureSkin, model: 'default' };
});
ipcMain.handle('chooseSkin', () => ({
  id: 'fixture-skin-selection',
  name: 'fixture-skin.png',
  texture: { dataUrl: fixtureSkin, model: 'default' },
  legacy: false,
}));
ipcMain.handle('offlineSkinSelection', async () => {
  const session = await fixtureSessions.read();
  assert.equal(session.mode, 'offline');
  const saved = await fixtureSkinSelections.read(session.offlineName);
  return saved
    ? { selection: saved.selection, revision: saved.revision }
    : null;
});
ipcMain.handle('saveOfflineSkin', async (_, selection) => {
  const session = await fixtureSessions.read();
  assert.equal(session.mode, 'offline');
  return fixtureSkinSelections.save(session.offlineName, selection);
});
ipcMain.handle('resetOfflineSkin', async () =>
  fixtureSkinSelections.clear((await fixtureSessions.read()).offlineName),
);
ipcMain.handle('applySkin', (_, request) => {
  assert.ok(fixtureAccount);
  assert.equal(fixtureGame.state().running, false);
  assert.deepEqual(request, { id: 'fixture-skin-selection', variant: 'slim' });
  fixtureSkinUploads++;
  fixtureAccount = {
    ...fixtureAccount,
    skin: {
      url: 'https://textures.minecraft.net/texture/' + 'b'.repeat(64),
      model: 'slim',
    },
  };
  return fixtureAccount;
});
ipcMain.handle('skinHelp', (_, destination) => {
  assert.ok(['ely', 'commands'].includes(destination));
});
ipcMain.handle('offlineProfile', async (_, name) => ({
  ...(await fixtureProfiles.status(name)),
  remembered:
    (await fixtureSessions.read()).offlineName?.toLowerCase() ===
    name.toLowerCase(),
}));
ipcMain.handle('loginOffline', async (_, request) => {
  assert.equal(fixtureGame.state().running, false);
  const profile = await fixtureProfiles.authorize(request);
  await fixtureSessions.write({ mode: 'offline', offlineName: profile.name });
  return profile;
});
ipcMain.handle('play', async (event, request) => {
  assert.equal(
    fixtureGame.state().running,
    false,
    'A second game must never launch',
  );
  assert.equal(request.mode, 'offline');
  const session = await fixtureSessions.read();
  assert.equal(session.mode, 'offline');
  assert.equal(session.offlineName?.toLowerCase(), request.name.toLowerCase());
  if (failNextLaunch) {
    failNextLaunch = false;
    throw new Error('Fixture: Minecraft preparation failed.');
  }
  if (pauseLaunch) {
    event.sender.send('progress', {
      message: 'Подготовка на тестовото стартиране…',
      percent: null,
    });
    await new Promise((resolve) => {
      finishPreparation = resolve;
    });
    event.sender.send('progress', {
      message: 'Starting Minecraft…',
      percent: null,
      launchPhase: 'starting',
    });
    await new Promise((resolve) => {
      finishLaunch = resolve;
    });
  }
  fixtureGameStarts += 1;
  fixtureGame.track(
    Object.assign(new EventEmitter(), {
      pid: fixtureGameStarts + 100,
      exitCode: null,
      signalCode: null,
    }),
  );
  return true;
});
const fixturePack = {
  fileId: 9225884,
  releaseName: 'Patilanci_Adventures_CurseForge_2.2.1.zip',
  version: '2.2.0',
  minecraft: '1.21.10',
  mods: 27,
};
ipcMain.handle('install', () => {
  retryUpdates += 1;
  return fixturePack;
});
const startupUpdate = createStartupUpdate(async () => {
  startupChecks += 1;
  await new Promise((resolve) => {
    finishStartup = resolve;
  });
});
ipcMain.handle('startupUpdate', async (event) => {
  if (startupFailure) throw new Error('Fixture: CurseForge is unreachable.');
  event.sender.send('progress', {
    message: 'Downloading startup update fixture…',
    percent: 35,
  });
  await startupUpdate();
  return null;
});
let fixtureLauncherUpdate = { status: 'current', version: '1.0.0' };
let fixtureLauncherInstalls = 0;
let finishLauncherInstall;
function makeFixtureStartupFlow() {
  return createStartupFlow({
    checkLauncher: async () => fixtureLauncherUpdate,
    restoreAccount: async () => ({
      status: 'ready',
      message: 'Fixture account restored',
    }),
    updatePack: async () => {
      if (startupFailure)
        throw new Error('Fixture: CurseForge is unreachable.');
      fixtureWindow.webContents.send('progress', {
        message: 'Downloading startup update fixture…',
        percent: 35,
      });
      await startupUpdate();
      return fixturePack;
    },
    onState: (state) => fixtureWindow.webContents.send('startupState', state),
  });
}
let fixtureStartupFlow = makeFixtureStartupFlow();
ipcMain.handle('startup', () => fixtureStartupFlow.run());
ipcMain.handle('retryStartup', () => fixtureStartupFlow.retry());
ipcMain.handle('checkLauncherUpdate', () => fixtureLauncherUpdate);
ipcMain.handle('checkUpdates', () => {
  fixtureUpdateChecks++;
  return {};
});
ipcMain.handle('installLauncherUpdate', async (event) => {
  fixtureLauncherInstalls++;
  const update = {
    ...fixtureLauncherUpdate,
    latestVersion: fixtureLauncherUpdate.latestVersion || '99.0.0',
  };
  event.sender.send('launcherUpdate', { ...update, status: 'installing' });
  try {
    await new Promise((resolve, reject) => {
      finishLauncherInstall = (error) => (error ? reject(error) : resolve());
    });
  } catch (error) {
    event.sender.send('launcherUpdate', {
      ...update,
      status: 'downloaded',
      error: error.message,
    });
    throw error;
  }
});
ipcMain.handle('memoryInfo', () => ({
  totalBytes: 16 * 1024 ** 3,
  availableBytes: fixtureFreeMemoryGb * 1024 ** 3,
  sampledAt: Date.now(),
}));

ipcMain.handle('mods', async () =>
  showModFixture
    ? {
        ...(await listMods(fixtureInstance)),
        canModify: !fixtureGame.state().running,
      }
    : { installed: false, bundled: [], personal: [], canModify: true },
);
ipcMain.handle('addMods', async () => {
  const added = await addLocalMods(fixtureInstance, [fixtureImport]);
  return { ...(await listMods(fixtureInstance)), canModify: true, added };
});
ipcMain.handle('removeMod', async (_, fileName) => {
  await removePersonalMod(fixtureInstance, fileName);
  return { ...(await listMods(fixtureInstance)), canModify: true };
});
ipcMain.handle('setModEnabled', async (_, request) => {
  if (fixtureGame.state().running)
    throw new Error('Close Minecraft before changing mods.');
  await setPersonalModEnabled(fixtureInstance, request);
  return { ...(await listMods(fixtureInstance)), canModify: true };
});

async function prepareModsFixture() {
  // Synthetic PNG fixture for the real WebGL renderer; no player data or network.
  const pixels = Buffer.alloc(64 * 64 * 4);
  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      const offset = (y * 64 + x) * 4;
      const color =
        y < 16 ? [105, 161, 210] : y < 32 ? [130, 125, 40] : [100, 65, 55];
      pixels.set([...color, 255], offset);
    }
  }
  // Transparent hat pixels preserve the face; opaque hat pixels sit above it.
  for (let y = 8; y < 16; y++) {
    for (let x = 40; x < 48; x++) {
      pixels.set(
        x < 44 && y < 12 ? [30, 190, 100, 255] : [0, 0, 0, 0],
        (y * 64 + x) * 4,
      );
    }
  }
  fixtureSkin = nativeImage
    .createFromBitmap(pixels, { width: 64, height: 64 })
    .toDataURL();
  fixtureDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'patilanci-ui-mods-'),
  );
  assert.equal(path.dirname(fixtureDirectory), path.resolve(os.tmpdir()));
  assert.ok(path.basename(fixtureDirectory).startsWith('patilanci-ui-mods-'));
  fixtureInstance = path.join(fixtureDirectory, 'instance');
  fixtureSkinSelections = createOfflineSkinSelections(
    path.join(fixtureDirectory, 'skin-selections'),
    {
      loadTexture: async () => ({
        dataUrl: nativeImage
          .createFromBitmap(Buffer.alloc(64 * 64 * 4, 255), {
            width: 64,
            height: 64,
          })
          .toDataURL(),
        model: 'slim',
      }),
    },
  );
  fixtureProfiles = createOfflineProfiles(
    path.join(fixtureDirectory, 'offline-profiles.json'),
  );
  fixtureSessions = createSessionStore(
    path.join(fixtureDirectory, 'session.enc'),
    safeStorage,
  );
  await fs.mkdir(path.join(fixtureInstance, 'mods'), { recursive: true });
  await fs.writeFile(
    path.join(fixtureInstance, 'patilanci-install.json'),
    JSON.stringify({ minecraft: '1.21.10', version: 'UI test fixture' }),
  );

  function jar(id, name) {
    const archive = new Zip();
    archive.addFile(
      'fabric.mod.json',
      Buffer.from(
        JSON.stringify({ schemaVersion: 1, id, name, version: '1.0.0' }),
      ),
    );
    return archive.toBuffer();
  }

  await fs.writeFile(
    path.join(fixtureInstance, 'mods', 'required-fixture.jar'),
    jar('required_fixture', 'Required mod fixture'),
  );
  await recordBundledMods(fixtureInstance);
  fixtureImport = path.join(fixtureDirectory, 'extra-fixture.jar');
  await fs.writeFile(fixtureImport, jar('extra_fixture', 'Player mod fixture'));
}

async function waitForRenderer(window, expression) {
  await window.webContents.executeJavaScript(`new Promise((resolve, reject) => {
    const deadline = Date.now() + 5000;
    const timer = setInterval(() => {
      if (${expression}) { clearInterval(timer); resolve(); }
      else if (Date.now() > deadline) { clearInterval(timer); reject(new Error(${JSON.stringify(`UI state timed out: ${expression}`)})); }
    }, 20);
  })`);
  await waitForPaint(window);
}

async function fillInput(window, selector, value) {
  await window.webContents.executeJavaScript(`(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await waitForPaint(window);
}

// Keep UI checks deterministic without accessing accounts or downloading files.
ipcMain.handle('save', async (_, data) => {
  const file = path.join(fixtureDirectory, 'settings.json');
  await savePreferences(file, data);
  fixturePreferences = JSON.parse(await fs.readFile(file, 'utf8'));
  return true;
});
ipcMain.handle('config', async () => ({
  memory: fixturePreferences.memory,
  javaPath: fixturePreferences.javaPath,
  javaPaths: fixturePreferences.javaPaths,
  gameWindow: fixturePreferences.gameWindow,
  hideOnLaunch: fixturePreferences.hideOnLaunch === true,
  installed: fixturePack,
  account: fixtureAccount,
  offlineSkin:
    (await fixtureSessions.read()).mode === 'offline' &&
    (await fixtureSessions.read()).offlineName
      ? await fixtureSkinSelections.read(
          (await fixtureSessions.read()).offlineName,
        )
      : null,
  game: fixtureGame.state(),
  session: {
    mode: fixtureAccount ? 'microsoft' : (await fixtureSessions.read()).mode,
    name: (await fixtureSessions.read()).offlineName,
    authenticated: Boolean(
      fixtureAccount || (await fixtureSessions.read()).offlineName,
    ),
  },
}));
let pauseStatusRefresh = false;
let finishStatusRefresh;
ipcMain.handle('status', () =>
  pauseStatusRefresh
    ? new Promise((resolve) => {
        finishStatusRefresh = () => resolve({ online: false, players: [] });
      })
    : { online: false, players: [] },
);
ipcMain.handle('storage', (_, force) => ({
  status: 'ready',
  instanceBytes: (force ? 3.5 : 3.25) * 1024 ** 3,
  javaBytes: 512 * 1024 ** 2,
}));
ipcMain.handle('browseJava', (_, major) => `C:\\Java${major}\\bin\\java.exe`);

async function waitForPaint(window) {
  await window.webContents.executeJavaScript(`(async () => {
    await document.fonts.ready;
    // React may replace an image during account changes; decode() on the old
    // element can remain pending. Observe the images still in the document.
    const deadline = Date.now() + 5000;
    while (Array.from(document.images).some(image => !image.complete)) {
      if (Date.now() > deadline) throw new Error('Renderer images did not finish loading.');
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    await Promise.race([
      new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      new Promise(resolve => setTimeout(resolve, 100)),
    ]);
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 150));
}
async function stopFixtureGame(window) {
  await waitForRenderer(
    window,
    `document.querySelector('[aria-label="Спри Minecraft"]')?.disabled === false`,
  );
  await window.webContents.executeJavaScript(
    `document.querySelector('[aria-label="Спри Minecraft"]').click()`,
  );
  await waitForRenderer(
    window,
    `document.querySelector('[aria-label="Спиране на Minecraft"]')?.disabled === true`,
  );
  assert.equal(
    fixtureGame.state().running,
    true,
    'Minecraft stays running until its process exits',
  );
  finishGameStop();
  await waitForRenderer(
    window,
    `document.querySelector('[aria-label="Играй Minecraft"]')?.disabled === false`,
  );
}

async function checkStaticHome(window) {
  window.webContents.debugger.attach('1.3');
  try {
    for (const preference of ['no-preference', 'reduce']) {
      await window.webContents.debugger.sendCommand(
        'Emulation.setEmulatedMedia',
        { features: [{ name: 'prefers-reduced-motion', value: preference }] },
      );
      await waitForPaint(window);
      assert.deepEqual(
        await window.webContents.executeJavaScript(`({
          panorama: getComputedStyle(document.querySelector('.is-home .village-panorama')).animationName,
          controls: document.querySelectorAll('.is-home .scene-motion-toggle').length,
          animations: document.querySelector('.is-home').getAnimations({ subtree: true }).length,
        })`),
        { panorama: 'none', controls: 0, animations: 0 },
        `Home stays static with motion preference ${preference}`,
      );
    }
  } finally {
    await window.webContents.debugger.sendCommand(
      'Emulation.setEmulatedMedia',
      { features: [] },
    );
    window.webContents.debugger.detach();
  }
}

async function checkLayout(window, expectedHeading) {
  await waitForPaint(window);
  if (expectedHeading === 'Добре дошъл в Патиланци') {
    const session = await fixtureSessions.read();
    const name = fixtureAccount?.name || session.offlineName;
    if (name) expectedHeading = `Добре дошъл, ${name}`;
  }
  const layout = await window.webContents.executeJavaScript(`({
    title: document.title,
    heading: document.querySelector('h1')?.textContent,
    hasHorizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    logoLoaded: document.querySelector('.brand-logo')?.naturalWidth > 0,
    selectedPage: document.querySelector('[aria-current="page"]')?.textContent,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  })`);

  assert.equal(layout.heading, expectedHeading);
  assert.equal(layout.hasHorizontalOverflow, false);
  assert.equal(layout.logoLoaded, true);
  assert.equal(window.webContents.getZoomFactor(), 1);
  assert.equal(
    await window.webContents.executeJavaScript(
      `document.querySelector('.settings-link').getBoundingClientRect().bottom <= innerHeight`,
    ),
    true,
    'Settings navigation must remain visible after adding the Mods tab',
  );
  return layout;
}

async function capture(window, filename) {
  const screenshot = await window.webContents.capturePage(
    {},
    { stayHidden: true, stayAwake: true },
  );
  await fs.writeFile(
    path.join(__dirname, '../artifacts', filename),
    screenshot.toPNG(),
  );
}

app.whenReady().then(async () => {
  try {
    await prepareModsFixture();
    const window = new BrowserWindow({
      show: false,
      width: 1360,
      height: 900,
      frame: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
        offscreen: true,
      },
    });
    lockWindowZoom(window);
    fixtureWindow = window;
    const embeddedLog = createConsoleLog();
    const consoleController = createConsoleWindow({
      BrowserWindow,
      ipcMain,
      log: embeddedLog,
      getLauncherWindow: () => window,
    });
    const execute = window.webContents.executeJavaScript.bind(
      window.webContents,
    );
    window.webContents.executeJavaScript = async (script, ...args) => {
      try {
        return await execute(script, ...args);
      } catch (error) {
        console.error('Renderer check failed:', script);
        throw error;
      }
    };
    observeWindowState(window);
    window.setContentSize(1344, 835);

    await fs.mkdir(path.join(__dirname, '../artifacts'), { recursive: true });
    await window.loadFile(path.join(__dirname, '../dist/index.html'));
    await waitForRenderer(
      window,
      `document.querySelector('.splash-progress b')?.textContent === '35%'`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.app-shell') === null`,
      ),
      true,
      'Play must wait for the startup update to finish',
    );
    await capture(window, 'launcher-startup-splash.png');
    if (process.argv.includes('--splash')) {
      await checkStartupSplash(window, { waitForRenderer, capture });
      finishStartup();
      await waitForRenderer(
        window,
        `document.querySelector('.app-shell') !== null && document.querySelector('.startup-splash') === null`,
      );
      console.log(
        'Startup splash passed: reference layout, responsive sizes, live progress, log dialog, signed-out state, errors, restart action, and startup completion.',
      );
      window.destroy();
      await fs.rm(fixtureDirectory, { recursive: true, force: true });
      app.exit(0);
      return;
    }
    finishStartup();
    if (process.argv.includes('--modpack-tabs')) {
      await waitForRenderer(
        window,
        `document.querySelector('.app-shell') !== null`,
      );
      await checkModpackTabs(window, { waitForRenderer, fillInput, capture });
      showModFixture = false;
      await window.webContents.executeJavaScript(
        `document.querySelector('[data-page="modpack"]').click()`,
      );
      await waitForRenderer(
        window,
        `document.querySelector('#pack-tab-mods') !== null`,
      );
      await window.webContents.executeJavaScript(
        `document.querySelector('#pack-tab-mods').click()`,
      );
      await waitForRenderer(
        window,
        `document.querySelector('#pack-panel-mods .mods-empty button') !== null`,
      );
      await window.webContents.executeJavaScript(
        `document.querySelector('#pack-panel-mods .mods-empty button').click()`,
      );
      await waitForRenderer(
        window,
        `document.querySelector('#pack-tab-overview').getAttribute('aria-selected') === 'true'`,
      );
      console.log(
        'Modpack tabs passed: local panels, bundled inventory, search, protected mods, live activity, keyboard navigation, responsive layout, and uninstalled state.',
      );
      window.destroy();
      await fs.rm(fixtureDirectory, { recursive: true, force: true });
      app.exit(0);
      return;
    }
    await waitForRenderer(
      window,
      `document.querySelector('.app-shell') !== null && !document.querySelector('.launch-bar .play-button').disabled`,
    );
    const home = await checkLayout(window, 'Добре дошъл в Патиланци');
    embeddedLog.start();
    embeddedLog.setStatus('running');
    embeddedLog.write('[Render thread/INFO] Embedded log history fixture\n');
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="console"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.game-console.is-embedded .console-status.is-running') && document.querySelector('.console-output').textContent.includes('Embedded log history fixture')`,
    );
    embeddedLog.write('[Render thread/WARN] Embedded live output fixture\n');
    await waitForRenderer(
      window,
      `document.querySelector('.console-output').textContent.includes('Embedded live output fixture')`,
    );
    assert.equal(
      consoleController.getWindow(),
      undefined,
      'Embedded logs work without creating a separate console window',
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.console-notice').textContent.includes('временно не е достъпен')`,
      ),
      false,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('.console-actions .icon-button').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.console-empty') !== null`,
    );
    assert.equal(embeddedLog.snapshot().entries.length, 0);
    embeddedLog.setStatus('stopped');
    embeddedLog.write('Embedded history after navigation fixture\n');
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="home"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.game-console') === null`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="console"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.console-status.is-stopped') && document.querySelector('.console-output').textContent.includes('Embedded history after navigation fixture')`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="home"]').click()`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('.launcher-legal a').click()`,
    );
    await waitForPaint(window);
    assert.equal(
      fixtureAuthorWebsiteRequests,
      1,
      'Clicking the footer requests the fixed author website through the desktop bridge',
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.launch-controls .progress-track') === null`,
      ),
      true,
      'A completed startup must not leave a 100% progress bar on Home',
    );
    await checkStaticHome(window);
    await window.webContents.executeJavaScript(
      `document.querySelector('.settings-link').click()`,
    );
    window.webContents.send('launcherUpdate', {
      status: 'downloaded',
      latestVersion: '99.0.0',
    });
    window.webContents.send('modpackUpdate', {
      status: 'available',
      fileId: 900,
      releaseName: 'Patilanci update fixture',
    });
    await waitForRenderer(
      window,
      `document.querySelectorAll('.update-notice').length === 2`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('.notification-button').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelectorAll('.notifications-panel .notification-item').length === 2`,
    );
    assert.equal(
      fixtureUpdateChecks,
      1,
      'Opening the title-bar bell checks for updates immediately',
    );
    assert.equal(
      await window.webContents.executeJavaScript(`(() => {
      const bar = document.querySelector('.window-titlebar');
      const bell = bar.querySelector('.notification-button');
      const a = bell?.getBoundingClientRect(), b = bar.getBoundingClientRect();
      return Boolean(a && a.top >= b.top && a.bottom <= b.bottom && getComputedStyle(bell).getPropertyValue('-webkit-app-region') === 'no-drag');
    })()`),
      true,
      'The bell belongs to the clickable window controls',
    );
    window.webContents.send('gameState', { running: true });
    await waitForRenderer(
      window,
      `[...document.querySelectorAll('.update-notice .outline-button, .notifications-panel .outline-button')].every(button => button.disabled) && document.querySelector('.notifications-panel').textContent.includes('Затвори Minecraft')`,
    );
    await capture(window, 'launcher-update-notifications.png');
    window.webContents.send('gameState', { running: false });
    await waitForRenderer(
      window,
      `[...document.querySelectorAll('.update-notice .outline-button, .notifications-panel .outline-button')].every(button => !button.disabled)`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('.notifications-panel [data-notification="launcher"] button').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.update-restart-screen') !== null`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.app-shell') === null && document.querySelector('.update-restart-screen [role="progressbar"]') !== null`,
      ),
      true,
      'Updating from Home shows a dedicated restart screen and blocks other actions',
    );
    await capture(window, 'launcher-update-restarting.png');
    finishLauncherInstall(
      new Error('Fixture: Could not start launcher update.'),
    );
    await waitForRenderer(
      window,
      `document.querySelector('.app-shell') !== null && document.querySelector('[role="alert"]')?.textContent.includes('Действието не можа да завърши')`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="mods"]').click()`,
    );
    for (const [width, height] of [
      [1034, 675],
      [1344, 835],
    ]) {
      window.setContentSize(width, height);
      await waitForPaint(window);
      assert.deepEqual(
        await window.webContents.executeJavaScript(`(() => {
        const panel = document.querySelector('.notifications-panel');
        const bounds = panel.getBoundingClientRect();
        const content = document.querySelector('.page-content');
        const before = content.getBoundingClientRect();
        panel.style.display = 'none';
        const after = content.getBoundingClientRect();
        panel.style.display = '';
        return {
          floating: getComputedStyle(panel).position === 'fixed',
          visible: bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= document.querySelector('.window-titlebar').getBoundingClientRect().bottom && bounds.bottom <= innerHeight,
          stable: before.top === after.top && before.height === after.height,
          onTop: panel.contains(document.elementFromPoint(bounds.left + 20, bounds.top + 20)),
        };
      })()`),
        { floating: true, visible: true, stable: true, onTop: true },
        'Notifications float above the page without shifting content at either window size',
      );
    }
    await capture(window, 'launcher-notifications-error-mods.png');
    await window.webContents.executeJavaScript(
      `document.querySelector('.settings-link').click()`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Скрий съобщението за грешка"]').click()`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Затвори известията"]').click()`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="home"]').click()`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Скрий известието за пакета"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('[data-update-kind="modpack"]') === null`,
    );
    window.webContents.send('modpackUpdate', {
      status: 'available',
      fileId: 901,
      releaseName: 'Next update fixture',
    });
    await waitForRenderer(
      window,
      `document.querySelector('[data-update-kind="modpack"]')?.textContent.includes('Next update fixture')`,
    );
    window.webContents.send('modpackUpdate', { status: 'current' });
    window.webContents.send('launcherUpdate', {
      status: 'current',
      version: '1.0.0',
    });
    await waitForRenderer(
      window,
      `document.querySelectorAll('.update-notice').length === 0`,
    );
    window.webContents.send('modpackUpdate', {
      status: 'available',
      fileId: 902,
      releaseName: 'Bell update fixture',
    });
    await window.webContents.executeJavaScript(
      `document.querySelector('.settings-link').click()`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('.notification-button').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.notifications-panel [data-notification="modpack"] button')?.disabled === false`,
    );
    const installsBeforeBell = retryUpdates;
    await window.webContents.executeJavaScript(
      `document.querySelector('.notifications-panel [data-notification="modpack"] button').click()`,
    );
    await waitForRenderer(
      window,
      `!document.querySelector('.notifications-panel [data-notification="modpack"] button').disabled`,
    );
    assert.equal(
      retryUpdates,
      installsBeforeBell + 1,
      'The bell updates the modpack through the desktop bridge',
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('.notification-button').focus(); document.querySelector('.notification-button').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.notifications-panel') === null`,
    );
    window.webContents.send('modpackUpdate', { status: 'current' });
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="home"]').click()`,
    );
    pauseStatusRefresh = true;
    await window.webContents.executeJavaScript(
      `document.querySelector('.refresh-link').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.refresh-link').disabled && document.querySelector('.refresh-link').textContent.includes('Обновяване')`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `getComputedStyle(document.querySelector('.refresh-link svg')).animationName`,
      ),
      'none',
      'Home reports refreshing status without spinning the icon',
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.server-status').textContent.includes('Проверка на връзката')`,
      ),
      true,
    );
    pauseStatusRefresh = false;
    finishStatusRefresh();
    await waitForRenderer(
      window,
      `!document.querySelector('.refresh-link').disabled && document.querySelector('.refresh-link').textContent.includes('Провери връзката')`,
    );
    assert.deepEqual(
      await window.webContents.executeJavaScript(`({
        drag: getComputedStyle(document.querySelector('.window-titlebar')).getPropertyValue('-webkit-app-region'),
        controls: getComputedStyle(document.querySelector('.window-controls')).getPropertyValue('-webkit-app-region'),
        buttons: document.querySelectorAll('.window-control').length,
        maximize: Boolean(document.querySelector('[aria-label="Увеличи прозореца"]')),
        console: Boolean(document.querySelector('[aria-label="Отвори Логовеа на Minecraft"]')),
        folder: Boolean(document.querySelector('[aria-label="Отвори папката на играта"]')),
      })`),
      {
        drag: 'drag',
        controls: 'no-drag',
        buttons: 6,
        maximize: true,
        console: true,
        folder: true,
      },
      'The custom title bar must be draggable while window controls remain clickable',
    );
    for (const keyCode of ['+', '=', '-', '0', 'numadd', 'numsub']) {
      window.webContents.sendInputEvent({
        type: 'keyDown',
        keyCode,
        modifiers: ['control'],
      });
      window.webContents.sendInputEvent({
        type: 'keyUp',
        keyCode,
        modifiers: ['control'],
      });
    }
    window.webContents.sendInputEvent({
      type: 'mouseWheel',
      x: 400,
      y: 300,
      deltaY: 120,
      modifiers: ['control'],
    });
    await waitForPaint(window);
    assert.equal(
      window.webContents.getZoomFactor(),
      1,
      'Zoom shortcuts must keep 100% zoom',
    );
    const wheelBehavior = await window.webContents.executeJavaScript(`(() => {
      const zoomWheel = new WheelEvent('wheel', { ctrlKey: true, deltaY: -120, bubbles: true, cancelable: true });
      const normalWheel = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
      window.dispatchEvent(zoomWheel);
      window.dispatchEvent(normalWheel);
      return { zoomBlocked: zoomWheel.defaultPrevented, normalBlocked: normalWheel.defaultPrevented, scale: visualViewport.scale };
    })()`);
    assert.deepEqual(wheelBehavior, {
      zoomBlocked: true,
      normalBlocked: false,
      scale: 1,
    });
    window.webContents.setZoomFactor(1.25);
    await window.loadFile(path.join(__dirname, '../dist/index.html'));
    await waitForRenderer(
      window,
      `!document.querySelector('.play-button').disabled`,
    );
    assert.equal(startupChecks, 1, 'Reload must reuse the startup update');
    await checkLayout(window, 'Добре дошъл в Патиланци');
    assert.equal(
      window.webContents.getZoomFactor(),
      1,
      'Reload must restore 100% zoom',
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.launch-bar .play-button').getBoundingClientRect().bottom <= innerHeight`,
      ),
      true,
      'The Play button must be visible without scrolling',
    );
    await waitForRenderer(
      window,
      `document.querySelector('[data-skin-profile="default"][data-skin-state="ready"]') !== null`,
    );
    assert.equal(
      fixtureSkinRequests,
      0,
      'Signed-out Steve requires no profile lookup',
    );
    const signedOutHead = await window.webContents.executeJavaScript(
      `document.querySelector('.player-skin-head').toDataURL()`,
    );
    await capture(window, 'launcher-desktop.png');

    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Влез с Microsoft"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('[data-skin-profile="player"][data-skin-state="ready"]') !== null`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.home-player-name').textContent`,
      ),
      'Adventurer1234567',
    );
    assert.equal(fixtureSkinRequests, 1);
    await window.webContents.executeJavaScript(
      `document.querySelector('.sidebar-profile').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.account-drawer.is-open') !== null`,
    );
    assert.deepEqual(
      await window.webContents.executeJavaScript(`(() => {
      const context = document.querySelector('.player-skin-head').getContext('2d');
      return [Array.from(context.getImageData(0, 0, 1, 1).data),
        Array.from(context.getImageData(31, 31, 1, 1).data)];
    })()`),
      [
        [100, 190, 30, 255],
        [210, 161, 105, 255],
      ],
      'Sidebar head uses the signed-in skin face with its transparent hat overlay',
    );
    // Both the signed-in home page and its skin stay static.
    await checkStaticHome(window);
    await waitForPaint(window);
    const skinBounds = await window.webContents.executeJavaScript(`(() => {
      const bounds = document.querySelector('.skin-preview').getBoundingClientRect();
      return { x: Math.ceil(bounds.x), y: Math.ceil(bounds.y), width: Math.floor(bounds.width), height: Math.floor(bounds.height) };
    })()`);
    const staticSkin = (
      await window.webContents.capturePage(skinBounds)
    ).toPNG();
    const dragX = skinBounds.x + Math.floor(skinBounds.width / 2);
    const dragY = skinBounds.y + Math.floor(skinBounds.height / 2);
    window.webContents.sendInputEvent({
      type: 'mouseDown',
      x: dragX,
      y: dragY,
      button: 'left',
      clickCount: 1,
    });
    window.webContents.sendInputEvent({
      type: 'mouseMove',
      x: dragX + 40,
      y: dragY + 10,
      modifiers: ['leftButtonDown'],
    });
    window.webContents.sendInputEvent({
      type: 'mouseUp',
      x: dragX + 40,
      y: dragY + 10,
      button: 'left',
      clickCount: 1,
    });
    await new Promise((resolve) => setTimeout(resolve, 800));
    assert.equal(
      (await window.webContents.capturePage(skinBounds))
        .toPNG()
        .equals(staticSkin),
      true,
      'The 3D skin stays fixed over time and after dragging',
    );

    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.skin-hint') === null && getComputedStyle(document.querySelector('.skin-preview canvas')).pointerEvents === 'none'`,
      ),
      true,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelectorAll('.account-tabs button').length === 1 && !document.querySelector('.account-tabs').textContent.includes('Местен профил')`,
      ),
      true,
      'Premium sign-in hides the offline account choice',
    );
    await capture(window, 'launcher-microsoft-skin-fixture.png');
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Промени външния вид"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.skin-dialog[open]') !== null`,
    );
    await window.webContents.executeJavaScript(
      `Array.from(document.querySelectorAll('.skin-dialog button')).find(button => button.textContent.includes('Избери изображение')).click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.skin-file-name')?.textContent === 'fixture-skin.png'`,
    );
    await window.webContents.executeJavaScript(`(() => {
      const select = document.querySelector('#account-skin-model');
      select.value = 'slim'; select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await window.webContents.executeJavaScript(
      `Array.from(document.querySelectorAll('.skin-dialog button')).find(button => button.textContent.includes('Запази в Minecraft профила')).click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.skin-notice')?.textContent.includes('Minecraft профила е обновен')`,
    );
    assert.equal(fixtureSkinUploads, 1);
    await waitForRenderer(
      window,
      `document.querySelectorAll('[data-skin-state="ready"]').length >= 2`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.skin-dialog').scrollWidth <= document.querySelector('.skin-dialog').clientWidth`,
      ),
      true,
    );
    await capture(window, 'launcher-skin-account-settings.png');
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Затвори избора на външен вид"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.skin-dialog') === null`,
    );
    for (const [width, height] of [
      [1034, 675],
      [1280, 720],
      [1920, 1080],
      [3840, 2160],
    ]) {
      window.setContentSize(width, height);
      await waitForPaint(window);
      assert.equal(
        await window.webContents.executeJavaScript(
          `document.documentElement.scrollWidth <= innerWidth`,
        ),
        true,
      );
      assert.equal(
        await window.webContents.executeJavaScript(
          `document.querySelector('.launch-bar .play-button').getBoundingClientRect().bottom <= innerHeight`,
        ),
        true,
      );
      if (width === 1034) {
        assert.equal(
          await window.webContents.executeJavaScript(
            `document.documentElement.scrollHeight <= innerHeight + 1`,
          ),
          true,
          'The signed-in Microsoft home must fit the compact window',
        );
        await capture(window, 'launcher-microsoft-skin-compact-fixture.png');
      }
    }
    window.setContentSize(1344, 835);
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Излез от Microsoft"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.skin-preview[data-skin-profile=player]') === null`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('[data-skin-profile="default"][data-skin-state="ready"]') !== null`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.player-skin-head').toDataURL()`,
      ),
      signedOutHead,
      'Signing out restores the Steve head instead of retaining the player skin',
    );

    // Exercise the offline profile form and each navigation destination.
    const requestsBeforeOfflineSignIn = fixtureSkinRequests;
    await window.webContents.executeJavaScript(`
      Array.from(document.querySelectorAll('.account-tabs button'))
        .find(button => button.textContent.includes('Местен профил')).click();
    `);
    await waitForPaint(window);
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('#minecraft-username')?.maxLength`,
      ),
      16,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.launch-bar .play-button').getBoundingClientRect().bottom <= innerHeight`,
      ),
      true,
      'The offline Play button must be visible without scrolling',
    );

    await fillInput(window, '#minecraft-username', 'ProtectedPlayer');
    await waitForRenderer(
      window,
      `document.querySelector('#offline-pin-confirm') !== null`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.home-player-name').textContent`,
      ),
      'ProtectedPlayer',
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.skin-preview[data-skin-profile=player]') === null`,
      ),
      true,
    );
    assert.equal(
      fixtureSkinRequests,
      requestsBeforeOfflineSignIn,
      'Unsigned offline profiles must not request a skin',
    );
    window.setContentSize(1034, 675);
    await waitForPaint(window);
    await capture(window, 'launcher-offline-pin-compact.png');
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.documentElement.scrollHeight <= innerHeight + 1`,
      ),
      true,
      'PIN creation must fit the compact home screen',
    );
    window.setContentSize(1344, 835);
    await fillInput(window, '#offline-pin', '654321');
    await fillInput(window, '#offline-pin-confirm', '123456');
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.offline-sign-in').disabled`,
      ),
      true,
      'Mismatched PINs cannot be confirmed',
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.play-button').disabled`,
      ),
      false,
      'The bottom sign-in action stays available while PIN confirmation prevents playing',
    );
    await fillInput(window, '#offline-pin-confirm', '654321');
    await window.webContents.executeJavaScript(
      `document.querySelector('.offline-profile').requestSubmit()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('#offline-pin') === null && document.querySelector('#offline-pin-help')?.textContent.includes('Входът ти е запомнен')`,
    );
    assert.equal(
      fixtureGameStarts,
      0,
      'PIN confirmation saves a session without launching',
    );
    await waitForRenderer(
      window,
      `document.querySelector('[data-skin-profile="player"][data-skin-state="ready"]') !== null`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.skin-preview canvas').getAttribute('aria-label').includes('ProtectedPlayer')`,
      ),
      true,
      'Signed-in offline profiles get a static public skin preview',
    );
    await capture(window, 'launcher-offline-public-skin-fixture.png');
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Промени външния вид"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('#server-skin-command') !== null`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('#server-skin-command').value`,
      ),
      '/skin set ely.by ProtectedPlayer',
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('#account-skin-model') === null`,
      ),
      true,
      'Offline profiles cannot upload to a premium account',
    );
    await window.webContents.executeJavaScript(`(() => {
      const select = document.querySelector('#server-skin-source');
      select.value = 'web'; select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await fillInput(
      window,
      '#server-skin-value',
      'https://example.com/skin.png',
    );
    await waitForRenderer(
      window,
      `document.querySelector('#server-skin-command')?.value === '/skin set web classic "https://example.com/skin.png"'`,
    );
    await window.webContents.executeJavaScript(`(() => {
      const model = document.querySelector('#server-skin-model');
      model.value = 'slim'; model.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    const lookupsBeforeSave = fixtureSkinRequests;
    await window.webContents.executeJavaScript(
      `Array.from(document.querySelectorAll('.skin-command-actions button')).find(button => button.textContent === 'Запази за този профил').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.skin-notice')?.textContent.includes('Външният вид е запазен') && document.querySelector('.login-avatar-stage .skin-preview')?.dataset.skinState === 'ready'`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.skin-server-note')?.textContent.includes('SkinRestorer на Lionarius')`,
      ),
      true,
      'Offline skin settings explain the required server integration',
    );
    assert.equal(
      fixtureSkinRequests,
      lookupsBeforeSave + 1,
      'Saving a source refreshes the shared head and character texture',
    );
    assert.deepEqual(
      await window.webContents.executeJavaScript(
        `Array.from(document.querySelector('.player-skin-head').getContext('2d').getImageData(0,0,1,1).data)`,
      ),
      [255, 255, 255, 255],
    );
    window.setContentSize(1034, 675);
    await waitForPaint(window);
    assert.equal(
      await window.webContents.executeJavaScript(`(() => {
      const dialog = document.querySelector('.skin-dialog');
      const bounds = dialog.getBoundingClientRect();
      return bounds.top >= 0 && bounds.bottom <= innerHeight && dialog.scrollWidth <= dialog.clientWidth;
    })()`),
      true,
      'Skin settings remain bounded and scrollable in the compact window',
    );
    await capture(window, 'launcher-skin-server-settings-compact.png');
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Затвори избора на външен вид"]').click()`,
    );
    window.setContentSize(1344, 835);
    await window.reload();
    await waitForRenderer(
      window,
      `document.querySelector('.login-avatar-stage .skin-preview')?.dataset.skinState === 'ready'`,
    );
    assert.deepEqual(
      await window.webContents.executeJavaScript(
        `Array.from(document.querySelector('.player-skin-head').getContext('2d').getImageData(0,0,1,1).data)`,
      ),
      [255, 255, 255, 255],
      'The selected skin is restored after reopening the renderer',
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Промени външния вид"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('#server-skin-value')?.value === 'https://example.com/skin.png' && !document.querySelector('#server-skin-value').disabled`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('#server-skin-source').value === 'web' && document.querySelector('#server-skin-model').value === 'slim'`,
      ),
      true,
      'Skin settings restore the source, URL, and model',
    );
    await window.webContents.executeJavaScript(
      `Array.from(document.querySelectorAll('.skin-command-actions button')).find(button => button.textContent === 'Възстанови първоначалния вид').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.skin-notice')?.textContent.includes('Външният вид в приложението отново се търси')`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Затвори избора на външен вид"]').click()`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelectorAll('.account-tabs button').length === 1 && !document.querySelector('.account-tabs').textContent.includes('Microsoft') && document.querySelector('#minecraft-username').disabled`,
      ),
      true,
      'Offline sign-in hides Microsoft and locks the profile name',
    );

    // A renderer restart restores the encrypted session and selected offline name.
    await window.reload();
    await waitForRenderer(
      window,
      `document.querySelector('#minecraft-username')?.value === 'ProtectedPlayer' && document.querySelector('#offline-pin') === null && !document.querySelector('.play-button').disabled`,
    );
    assert.equal(
      fixtureGameStarts,
      0,
      'Restoring a session does not launch Minecraft',
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('.settings-link').click()`,
    );
    await fillInput(window, '#game-width', '1440');
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="home"]').click()`,
    );
    pauseLaunch = true;
    await window.webContents.executeJavaScript(
      `document.querySelector('.play-button').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.launch-controls').dataset.launchPhase === 'preparing' && document.querySelector('.progress-summary').textContent.includes('Подготовка на тестовото стартиране')`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.launch-controls [role="progressbar"]').hasAttribute('aria-valuenow')`,
      ),
      false,
      'Preparation with no measured percentage uses an indeterminate progress bar',
    );
    finishPreparation();
    await waitForRenderer(
      window,
      `document.querySelector('.launch-controls').dataset.launchPhase === 'starting'`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.launch-steps [aria-current="step"]').textContent.includes('Стартиране') && document.querySelector('.play-button').disabled`,
      ),
      true,
      'The starting step follows the launch event and prevents duplicate launches',
    );
    await capture(window, 'launcher-starting-fixture.png');
    pauseLaunch = false;
    finishLaunch();
    await waitForRenderer(
      window,
      `document.querySelector('.play-button')?.textContent.includes('СПРИ ИГРАТА')`,
    );
    assert.equal(fixtureGameStarts, 1);
    await window.webContents.executeJavaScript(
      `document.querySelector('.settings-link').click()`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('#game-width').value`,
      ),
      '1440',
      'Launching Minecraft preserves unsaved settings edits',
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="home"]').click()`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.launch-steps [aria-current="step"]').textContent.includes('Играта работи') && document.querySelector('.launch-controls .progress-track') === null`,
      ),
      true,
      'A running game completes the launch steps and clears the progress bar',
    );
    await window.reload();
    await waitForRenderer(
      window,
      `document.querySelector('.play-button')?.textContent.includes('СПРИ ИГРАТА')`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.play-button').textContent.includes('СПРИ ИГРАТА')`,
      ),
      true,
      'Reload retains the running-game Stop action',
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="mods"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.mods-edit-warning') !== null`,
    );
    await stopFixtureGame(window);
    await waitForRenderer(
      window,
      `document.querySelector('.mods-heading .play-button')?.disabled === false && !document.querySelector('.mods-edit-warning')`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="home"]').click()`,
    );
    failNextLaunch = true;
    await window.webContents.executeJavaScript(
      `document.querySelector('.play-button').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('[role="alert"]')?.textContent.includes('Действието не можа да завърши') && !document.querySelector('.play-button').disabled`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.launch-controls').dataset.launchPhase === 'idle' && document.querySelector('.launch-steps') === null && document.querySelector('.launch-controls .progress-track') === null`,
      ),
      true,
      'A failed launch clears its steps and progress so the player can retry',
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Скрий съобщението за грешка"]').click()`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('.play-button').click()`,
    );
    await waitForRenderer(
      window,
      `!document.querySelector('.play-button').disabled`,
    );
    assert.equal(
      fixtureGameStarts,
      2,
      'A saved session can play without entering a PIN',
    );
    await stopFixtureGame(window);
    await window.webContents.executeJavaScript(
      `Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('Излез от запомнените профили')).click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('#offline-pin') !== null && !document.querySelector('.launch-bar .play-button').disabled && document.querySelector('.launch-bar .play-button').textContent.includes('ВЛЕЗ')`,
    );
    assert.deepEqual(
      await fixtureSessions.read(),
      {},
      'Sign-out clears the saved session',
    );

    await fillInput(window, '#offline-pin', '123456');
    await window.webContents.executeJavaScript(
      `document.querySelector('.offline-sign-in').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('[role="alert"]')?.textContent.includes('Неправилен ПИН код')`,
    );
    assert.equal(
      fixtureGameStarts,
      2,
      'An incorrect PIN must not reach game launch',
    );
    assert.deepEqual(
      await fixtureSessions.read(),
      {},
      'Incorrect PINs cannot save a session',
    );
    assert.equal(
      (await fixtureProfiles.status('ProtectedPlayer')).attemptsRemaining,
      4,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Скрий съобщението за грешка"]').click()`,
    );
    await fillInput(window, '#offline-pin', '654321');
    await window.webContents.executeJavaScript(
      `document.querySelector('.offline-sign-in').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('#offline-pin') === null && !document.querySelector('.play-button').disabled`,
    );
    assert.equal(
      fixtureGameStarts,
      2,
      'The existing PIN must unlock the profile',
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('.play-button').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.play-button')?.textContent.includes('СПРИ ИГРАТА')`,
    );
    assert.equal(fixtureGameStarts, 3);
    await stopFixtureGame(window);
    fixtureOfflineSkinAvailable = false;
    await window.reload();
    await waitForRenderer(
      window,
      `document.querySelector('[data-skin-state="missing"] .player-voxel-avatar') !== null`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.skin-placeholder').textContent.includes('Не е намерено достъпно изображение')`,
      ),
      true,
      'Missing public skins fall back to Steve',
    );
    fixtureOfflineSkinAvailable = true;
    await window.reload();
    await waitForRenderer(
      window,
      `document.querySelector('[data-skin-profile="player"][data-skin-state="ready"]') !== null`,
    );

    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="modpack"]').click()`,
    );
    await checkLayout(window, 'Пакет с добавки');
    await waitForRenderer(
      window,
      `document.querySelector('.pack-storage')?.textContent.includes('3.25 ГиБ')`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Провери заетото място от Minecraft"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.pack-storage')?.textContent.includes('3.50 ГиБ')`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.pack-storage').textContent.includes('Автоматично изтеглена Java: 512.0 МиБ')`,
      ),
      true,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.pack-update').dataset.updateStatus`,
      ),
      'ready',
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelectorAll('.pack-facts dd')[1].textContent`,
      ),
      fixturePack.releaseName,
      'Show the CurseForge release name even when its manifest version differs',
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.pack-retry') === null && document.querySelector('.pack-activity').hidden`,
      ),
      true,
      'Automatic updates need no manual install button and activity starts hidden',
    );
    await capture(window, 'launcher-modpack.png');
    await window.webContents.executeJavaScript(
      `document.querySelector('.pack-links .outline-button').click()`,
    );
    await checkLayout(window, 'Пакет с добавки');

    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="players"]').click()`,
    );
    await checkLayout(window, 'Общност');

    await window.webContents.executeJavaScript(
      `document.querySelector('.settings-link').click()`,
    );
    await checkLayout(window, 'Настройки');
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelectorAll('.java-version-row').length`,
      ),
      4,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `Array.from(document.querySelectorAll('.java-version-row input')).every(input => input.disabled)`,
      ),
      true,
      'All automatically managed Java fields start disabled',
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Избери файл за Java 21"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('#java-path-21').value === 'C:\\\\Java21\\\\bin\\\\java.exe'`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('#java-path-21').disabled`,
      ),
      false,
      'A custom Java executable enables editing',
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Върни Java 21 към автоматичен избор"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('#java-path-21').value === ''`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('#java-path-21').disabled`,
      ),
      true,
      'Reset returns the field to disabled managed mode',
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Избери файл за Java 17"]').click()`,
    );
    await waitForRenderer(
      window,
      `!document.querySelector('#java-path-17').disabled`,
    );
    await fillInput(window, '#java-path-17', 'C:\\Custom Java\\bin\\java.exe');
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('#java-path-17').value`,
      ),
      'C:\\Custom Java\\bin\\java.exe',
    );
    await capture(window, 'launcher-java-settings.png');
    await waitForRenderer(
      window,
      `document.querySelector('[data-memory-severity="ok"]') !== null`,
    );
    fixtureFreeMemoryGb = 3;
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Провери паметта отново"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('[data-memory-severity="warning"]') !== null`,
    );
    assert.match(
      await window.webContents.executeJavaScript(
        `document.querySelector('#memory-assessment').textContent`,
      ),
      /Само 3 ГБ са свободни/,
    );
    fixtureFreeMemoryGb = 10;
    await window.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Провери паметта отново"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('[data-memory-severity="ok"]') !== null`,
    );
    await window.webContents.executeJavaScript(`(() => {
      const slider = document.querySelector('#memory');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '16');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await waitForRenderer(
      window,
      `document.querySelector('[data-memory-severity="danger"]') !== null`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.preferences-actions .play-button').disabled`,
      ),
      false,
      'Memory warnings must not block saving preferences',
    );
    await capture(window, 'launcher-memory-warning.png');
    await window.webContents.executeJavaScript(
      `document.querySelector('.memory-recommendation button').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('[data-memory-severity="ok"]') !== null`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `Number(document.querySelector('#memory').value)`,
      ),
      6,
    );

    // Settings must survive the real save path and a renderer reload.
    await fillInput(window, '#game-width', '1600');
    await fillInput(window, '#game-height', '900');
    for (const fullscreen of [true, false]) {
      await window.webContents.executeJavaScript(
        `document.querySelector('.game-window-settings input[type="checkbox"]').click(); document.querySelector('.startup-settings input').click()`,
      );
      await waitForRenderer(
        window,
        `document.querySelector('#game-width').disabled === ${fullscreen}`,
      );
      await window.webContents.executeJavaScript(
        `document.querySelector('.preferences-actions .play-button').click()`,
      );
      await waitForRenderer(
        window,
        `!document.querySelector('.preferences-actions .play-button').disabled`,
      );
      assert.deepEqual(fixturePreferences.gameWindow, {
        width: 1600,
        height: 900,
        fullscreen,
      });
      assert.equal(
        fixturePreferences.hideOnLaunch,
        fullscreen,
        'Hide-on-launch passes through the real settings save path',
      );
      await window.reload();
      await waitForRenderer(
        window,
        `document.querySelector('.app-shell') !== null`,
      );
      await window.webContents.executeJavaScript(
        `document.querySelector('.settings-link').click()`,
      );
      await waitForRenderer(
        window,
        `document.querySelector('#game-width')?.value === '1600' && document.querySelector('#game-height')?.value === '900'`,
      );
      assert.equal(
        await window.webContents.executeJavaScript(
          `document.querySelector('.game-window-settings input[type="checkbox"]').checked`,
        ),
        fullscreen,
      );
      assert.equal(
        await window.webContents.executeJavaScript(
          `document.querySelector('.startup-settings input').checked`,
        ),
        fullscreen,
        'Hide-on-launch survives renderer reloads',
      );
    }

    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="mods"]').click()`,
    );
    await checkLayout(window, 'Моите добавки');
    await waitForRenderer(
      window,
      `document.querySelector('.mods-heading .play-button')?.disabled === false`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('[data-origin="bundled"] .remove-mod-button') === null`,
      ),
      true,
    );
    assert.match(
      await window.webContents.executeJavaScript(
        `window.launcher.removeMod('required-fixture.jar').then(() => 'unexpected success', error => error.message)`,
      ),
      /protected/,
    );

    await window.webContents.executeJavaScript(
      `document.querySelector('.mods-heading .play-button').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelectorAll('[data-origin="personal"]').length === 1`,
    );
    await capture(window, 'launcher-mods-test-fixture.png');
    assert.equal((await listMods(fixtureInstance)).personal.length, 1);
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-origin="personal"] .mod-toggle').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('[data-origin="personal"] .mod-toggle')?.getAttribute('aria-checked') === 'false'`,
    );
    assert.equal((await listMods(fixtureInstance)).personal[0].enabled, false);
    await assert.rejects(
      fs.stat(path.join(fixtureInstance, 'mods/extra-fixture.jar')),
      { code: 'ENOENT' },
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-origin="personal"] .mod-toggle').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('[data-origin="personal"] .mod-toggle')?.getAttribute('aria-checked') === 'true'`,
    );
    assert.equal((await listMods(fixtureInstance)).personal[0].enabled, true);
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-origin="personal"] .mod-menu-button').click()`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('.remove-mod-button').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.mods-notice')?.textContent.includes('е премахната')`,
    );
    assert.equal((await listMods(fixtureInstance)).personal.length, 0);
    assert.equal((await listMods(fixtureInstance)).bundled.length, 1);

    showModFixture = false;
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="home"]').click()`,
    );
    await checkLayout(window, 'Добре дошъл в Патиланци');
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="mods"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.mods-empty h3')?.textContent === 'Първо инсталирай Patilanci.'`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.mods-heading .play-button').disabled`,
      ),
      true,
    );

    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="home"]').click()`,
    );
    window.setContentSize(1034, 675);
    await checkLayout(window, 'Добре дошъл в Патиланци');
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.launch-bar .play-button').getBoundingClientRect().bottom <= innerHeight`,
      ),
      true,
      'The offline Play button must fit the compact window',
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.documentElement.scrollHeight <= innerHeight + 1`,
      ),
      true,
      'The offline home page should also fit the compact window',
    );
    await window.webContents.executeJavaScript(
      `Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('Излез от запомнените профили')).click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelectorAll('.account-tabs button').length === 2`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('.account-tabs button').click()`,
    );
    await waitForPaint(window);
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.launch-bar .play-button').getBoundingClientRect().bottom <= innerHeight`,
      ),
      true,
      'The Play button must fit the compact window',
    );
    await capture(window, 'launcher-compact.png');
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.documentElement.scrollHeight <= innerHeight + 1`,
      ),
      true,
      'The standard home page should fit the compact window',
    );

    showModFixture = true;
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="mods"]').click()`,
    );
    await checkLayout(window, 'Моите добавки');
    await capture(window, 'launcher-mods-compact-test-fixture.png');

    await verifyResponsiveText(window, waitForPaint, capture);

    const installsBeforeStartupFailure = retryUpdates;
    startupFailure = true;
    fixtureStartupFlow = makeFixtureStartupFlow();
    await window.loadFile(path.join(__dirname, '../dist/index.html'));
    await waitForRenderer(
      window,
      `document.querySelector('.splash-progress')?.textContent.includes('Подготовката е прекъсната') && document.querySelector('[data-step="modpack"][role="alert"]')?.textContent.includes('Няма връзка за изтегляне')`,
    );
    await capture(window, 'launcher-startup-failure.png');
    startupFailure = false;
    await window.webContents.executeJavaScript(
      `document.querySelector('.splash-actions .play-button').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.app-shell') !== null`,
    );
    startupFailure = true;
    fixtureStartupFlow = makeFixtureStartupFlow();
    await window.loadFile(path.join(__dirname, '../dist/index.html'));
    await waitForRenderer(
      window,
      `document.querySelector('.splash-progress')?.textContent.includes('Подготовката е прекъсната') && document.querySelector('[data-step="modpack"][role="alert"]')?.textContent.includes('Няма връзка за изтегляне')`,
    );
    await window.webContents.executeJavaScript(
      `Array.from(document.querySelectorAll('.splash-actions button')).find(button => button.textContent.includes('Отвори приложението')).click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.app-shell') !== null`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('.settings-link').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.preferences-actions .play-button')?.disabled === false`,
    );
    assert.deepEqual(
      await window.webContents.executeJavaScript(`({
      memory: Number(document.querySelector('#memory').value),
      width: Number(document.querySelector('#game-width').value),
      height: Number(document.querySelector('#game-height').value),
      hideOnLaunch: document.querySelector('.startup-settings input').checked,
    })`),
      {
        memory: fixturePreferences.memory,
        width: fixturePreferences.gameWindow.width,
        height: fixturePreferences.gameWindow.height,
        hideOnLaunch: fixturePreferences.hideOnLaunch,
      },
      'Continuing after startup failure loads saved preferences rather than defaults',
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('[data-page="modpack"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.pack-retry') !== null`,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('.pack-retry').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.pack-update')?.dataset.updateStatus === 'ready' && document.querySelector('.pack-retry') === null`,
    );
    assert.equal(
      retryUpdates - installsBeforeStartupFailure,
      1,
      'Retry must run the update and restore the ready view',
    );
    startupFailure = false;
    fixtureLauncherUpdate = {
      status: 'downloaded',
      version: '1.0.0',
      latestVersion: '1.1.0',
    };
    fixtureStartupFlow = makeFixtureStartupFlow();
    await window.loadFile(path.join(__dirname, '../dist/index.html'));
    await waitForRenderer(
      window,
      `document.querySelector('.splash-actions .play-button')?.textContent.includes('Рестартирай и обнови')`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.app-shell') === null`,
      ),
      true,
      'Downloaded launcher updates stay in the splash until restart',
    );
    await capture(window, 'launcher-startup-update-ready.png');
    const installsBeforeRestart = fixtureLauncherInstalls;
    await window.webContents.executeJavaScript(
      `document.querySelector('.splash-actions .play-button').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.update-restart-screen')?.textContent.includes('1.1.0')`,
    );
    assert.equal(fixtureLauncherInstalls, installsBeforeRestart + 1);
    await capture(window, 'launcher-startup-update-restarting.png');
    finishLauncherInstall();
    fixtureLauncherUpdate = { status: 'current', version: '1.0.0' };
    fixtureStartupFlow = makeFixtureStartupFlow();
    await window.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: { updated: '1' },
    });
    await waitForRenderer(
      window,
      `document.querySelector('.app-shell') !== null`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.update-notices')?.textContent.includes('Приложението е обновено успешно')`,
    );
    await capture(window, 'launcher-update-complete.png');

    console.log('Electron UI checks passed:', JSON.stringify(home));
    console.log(
      'Verified 100% zoom, zoom input blocking, reload reset, all five pages, mod protections, and both window sizes.',
    );
    const closed = new Promise((resolve) => window.once('closed', resolve));
    window.webContents
      .executeJavaScript(
        `document.querySelector('[aria-label="Затвори приложението"]').click()`,
      )
      .catch(() => {});
    await closed;
    assert.equal(
      window.isDestroyed(),
      true,
      'The custom Close control must close the native window',
    );
    await fs.rm(fixtureDirectory, { recursive: true, force: true });
    app.exit(0);
  } catch (error) {
    console.error(error);
    if (fixtureDirectory)
      await fs.rm(fixtureDirectory, { recursive: true, force: true });
    app.exit(1);
  }
});
