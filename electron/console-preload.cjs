const { contextBridge, ipcRenderer } = require('electron');
window.addEventListener(
  'wheel',
  (event) => {
    if (event.ctrlKey || event.metaKey) event.preventDefault();
  },
  { capture: true, passive: false },
);
contextBridge.exposeInMainWorld('patilanciConsole', {
  snapshot: (after) => ipcRenderer.invoke('consoleSnapshot', after),
  clear: () => ipcRenderer.invoke('clearConsole'),
  windowState: () => ipcRenderer.invoke('consoleWindowState'),
  windowAction: (action) => ipcRenderer.invoke('consoleWindowAction', action),
  onWindowState(callback) {
    const listener = (_, state) => callback(state);
    ipcRenderer.on('windowState', listener);
    return () => ipcRenderer.removeListener('windowState', listener);
  },
});
