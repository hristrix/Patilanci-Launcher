function createLauncherUpdates({
  createUpdater,
  enabled,
  version,
  onState = () => {},
  canInstall = () => true,
}) {
  let updater;
  let pending;
  let state = { status: enabled ? 'idle' : 'development', version };
  const update = (data) => {
    state = { ...state, ...data };
    onState({ ...state });
  };
  function getUpdater() {
    if (updater) return updater;
    updater = createUpdater();
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowDowngrade = false;
    updater.allowPrerelease = false;
    updater.disableWebInstaller = true;
    updater.on('download-progress', (progress) =>
      update({ status: 'downloading', percent: Math.round(progress.percent) }),
    );
    updater.on('update-downloaded', (info) =>
      update({
        status: 'downloaded',
        latestVersion: info.version,
        percent: 100,
      }),
    );
    updater.on('error', () =>
      update({
        status: 'error',
        error:
          'Launcher update check or download failed. Check your connection and published releases.',
      }),
    );
    return updater;
  }
  function check() {
    if (!enabled || state.status === 'downloaded')
      return Promise.resolve({ ...state });
    if (pending) return pending;
    pending = (async () => {
      update({ status: 'checking', error: null, percent: null });
      try {
        const client = getUpdater();
        const result = await client.checkForUpdates();
        // electron-updater sets this from semver comparison; do not infer
        // availability by comparing version strings or release dates.
        if (result?.isUpdateAvailable) {
          update({
            status: 'downloading',
            latestVersion: result.updateInfo.version,
            percent: 0,
          });
          await client.downloadUpdate();
          if (state.status !== 'downloaded')
            throw new Error('Update download did not complete.');
        } else {
          if (!result) throw new Error('No update response.');
          update({ status: 'current', latestVersion: version, percent: 100 });
        }
      } catch {
        update({
          status: 'error',
          error:
            'Launcher update check or download failed. Check your connection and published releases.',
        });
      }
      return { ...state };
    })().finally(() => {
      pending = null;
    });
    return pending;
  }
  function install() {
    if (state.status !== 'downloaded')
      throw new Error('Download the launcher update before installing it.');
    if (!canInstall())
      throw new Error(
        'Close Minecraft and wait for the current operation before updating the launcher.',
      );
    getUpdater().quitAndInstall(false, true);
  }
  return { check, install, state: () => ({ ...state }) };
}
module.exports = { createLauncherUpdates };
