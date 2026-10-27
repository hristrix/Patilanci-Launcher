function createGameVisibility(getWindow) {
  let wasRunning = false;
  let hiddenWindow;
  return {
    update(state, hideOnLaunch = false) {
      if (state.running && !wasRunning && hideOnLaunch) {
        const window = getWindow();
        if (window && !window.isDestroyed()) {
          hiddenWindow = window;
          window.hide();
        }
      } else if (!state.running && wasRunning && hiddenWindow) {
        const window = hiddenWindow;
        hiddenWindow = null;
        if (!window.isDestroyed()) {
          if (window.isMinimized()) window.restore();
          window.show();
        }
      }
      wasRunning = state.running;
    },
  };
}

module.exports = { createGameVisibility };
