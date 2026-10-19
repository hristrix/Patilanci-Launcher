const UPDATE_INTERVAL_MS = 60000;

function createUpdateMonitor({
  getInstalled,
  getLatest,
  checkLauncher,
  canCheck = () => true,
  onState = () => {},
  onNotice = () => {},
  now = Date.now,
  schedule = setInterval,
  unschedule = clearInterval,
}) {
  let pending, timer;
  let state = { status: 'idle', fileId: null, releaseName: null };
  const announced = new Set();
  function notice(key, title, body) {
    if (announced.has(key)) return;
    announced.add(key);
    if (announced.size > 100) announced.delete(announced.values().next().value);
    onNotice({ key, title, body });
  }
  function launcherState(value) {
    if (value?.status === 'downloaded')
      notice(
        `launcher:${value.latestVersion}`,
        'Launcher update ready',
        `Patilanci Launcher ${value.latestVersion} is ready. Open the launcher to restart and update.`,
      );
  }
  function publish(value) {
    state = { ...state, ...value };
    onState({ ...state });
  }
  function installed(pack) {
    if (!pack) return;
    if (pack.fileId === state.fileId)
      publish({ status: 'current', error: null });
    else if (state.status === 'available')
      // The install may have fetched a newer release than our last check.
      publish({ status: 'idle', fileId: null, releaseName: null, error: null });
  }
  async function checkPack() {
    try {
      const pack = await getInstalled();
      if (!pack) return;
      const latest = await getLatest();
      // An installation may have completed while the network request ran.
      const active = await getInstalled();
      if (!active) return;
      const releaseName =
        latest.displayName || latest.fileName || `Release ${latest.id}`;
      const available = active.fileId !== latest.id;
      publish({
        status: available ? 'available' : 'current',
        fileId: latest.id,
        releaseName,
        checkedAt: now(),
        error: null,
      });
      if (available)
        notice(
          `modpack:${latest.id}`,
          'New Patilanci modpack',
          `${releaseName} is available. Update from the launcher after closing Minecraft.`,
        );
    } catch {
      // Retain an already-known update during a temporary service outage.
      publish({
        error:
          'The update service is temporarily unavailable. Checking again automatically.',
      });
    }
  }
  function check() {
    if (pending) return pending;
    if (!canCheck()) return Promise.resolve();
    pending = Promise.allSettled([
      Promise.resolve().then(checkLauncher).then(launcherState),
      checkPack(),
    ]).finally(() => {
      pending = null;
    });
    return pending;
  }
  function start() {
    if (timer !== undefined) return;
    timer = schedule(() => {
      void check();
    }, UPDATE_INTERVAL_MS);
    timer?.unref?.();
  }
  function stop() {
    if (timer !== undefined) unschedule(timer);
    timer = undefined;
  }
  return {
    check,
    start,
    stop,
    installed,
    launcherState,
    state: () => ({ ...state }),
  };
}
module.exports = { createUpdateMonitor, UPDATE_INTERVAL_MS };
