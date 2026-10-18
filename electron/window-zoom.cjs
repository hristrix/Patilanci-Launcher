const ZOOM_KEYS = new Set(['+', '=', '-', '0', 'add', 'subtract']);
const ZOOM_CODES = new Set([
  'Equal',
  'Minus',
  'Digit0',
  'NumpadAdd',
  'NumpadSubtract',
  'Numpad0',
]);

function lockWindowZoom(window) {
  const contents = window.webContents;

  // Remove the default View menu and its zoom accelerators.
  window.removeMenu();
  contents.setZoomFactor(1);

  contents.on('did-finish-load', () => {
    contents.setZoomFactor(1);
    contents.setVisualZoomLevelLimits(1, 1).catch((error) => {
      console.error('Could not apply the launcher zoom limits:', error);
    });
  });

  contents.on('before-input-event', (event, input) => {
    const hasModifier = input.control || input.meta;
    const isZoomKey =
      ZOOM_KEYS.has(input.key.toLowerCase()) || ZOOM_CODES.has(input.code);

    if (hasModifier && isZoomKey) {
      event.preventDefault();
    }
  });

  contents.on('before-mouse-event', (event, input) => {
    const modifiers = input.modifiers || [];
    const hasModifier = modifiers.some((modifier) =>
      ['control', 'ctrl', 'meta', 'command', 'cmd'].includes(modifier),
    );

    if (input.type === 'mouseWheel' && hasModifier) {
      event.preventDefault();
    }
  });

  contents.on('zoom-changed', () => {
    contents.setZoomFactor(1);
  });
}

module.exports = { lockWindowZoom };
