const { app, Menu } = require('electron');

function enableInspectElement(window) {
  if (app.isPackaged) return;
  const contents = window.webContents;
  contents.on('context-menu', (_, params) => {
    const items = [];
    if (params.isEditable) {
      items.push(
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
      );
    } else if (params.selectionText) {
      items.push({ role: 'copy' }, { type: 'separator' });
    }
    items.push({
      label: 'Inspect Element',
      click() {
        if (contents.isDestroyed()) return;
        if (!contents.isDevToolsOpened())
          contents.openDevTools({ mode: 'detach' });
        contents.inspectElement(params.x, params.y);
      },
    });
    Menu.buildFromTemplate(items).popup({ window });
  });
  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || input.isAutoRepeat) return;
    if (
      input.key === 'F12' ||
      ((input.control || input.meta) &&
        input.shift &&
        input.key.toLowerCase() === 'i')
    ) {
      event.preventDefault();
      if (contents.isDevToolsOpened()) contents.closeDevTools();
      else contents.openDevTools({ mode: 'detach' });
    }
  });
}

module.exports = { enableInspectElement };
