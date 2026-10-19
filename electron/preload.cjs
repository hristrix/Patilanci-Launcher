const { contextBridge, ipcRenderer } = require('electron');

// Trackpad pinch gestures can arrive as Ctrl+wheel events in Chromium.
window.addEventListener(
  'wheel',
  (event) => {
    if (event.ctrlKey || event.metaKey) event.preventDefault();
  },
  { capture: true, passive: false },
);

const api = {};
for (const name of [
  'config',
  'windowState',
  'windowAction',
  'memoryInfo',
  'save',
  'status',
  'login',
  'skin',
  'logout',
  'install',
  'startupUpdate',
  'startup',
  'retryStartup',
  'checkLauncherUpdate',
  'installLauncherUpdate',
  'play',
  'gameState',
  'stopMinecraft',
  'openConsole',
  'offlineProfile',
  'loginOffline',
  'folder',
  'packPage',
  'mods',
  'addMods',
  'removeMod',
])
  api[name] = (data) => ipcRenderer.invoke(name, data);
api.onProgress = (callback) => {
  const listener = (_, data) => callback(data);
  ipcRenderer.on('progress', listener);
  return () => ipcRenderer.removeListener('progress', listener);
};
api.onWindowState = (callback) => {
  const listener = (_, state) => callback(state);
  ipcRenderer.on('windowState', listener);
  return () => ipcRenderer.removeListener('windowState', listener);
};
api.onGameState = (callback) => {
  const listener = (_, state) => callback(state);
  ipcRenderer.on('gameState', listener);
  return () => ipcRenderer.removeListener('gameState', listener);
};
for (const [method, channel] of [
  ['onStartupState', 'startupState'],
  ['onLauncherUpdate', 'launcherUpdate'],
]) {
  api[method] = (callback) => {
    const listener = (_, state) => callback(state);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  };
}
contextBridge.exposeInMainWorld('launcher', api);
