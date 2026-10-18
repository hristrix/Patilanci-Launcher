// Renderer reloads must share one startup installation, rather than starting
// competing downloads. A failed attempt can be retried after fixing settings.
function createStartupUpdate(updatePack) {
  let attempt = null;

  return function startupUpdate() {
    if (!attempt) {
      attempt = Promise.resolve().then(updatePack);
      attempt.catch(() => {
        attempt = null;
      });
    }

    return attempt;
  };
}

function createStartupFlow({
  checkLauncher,
  restoreAccount,
  updatePack,
  onState = () => {},
}) {
  let pending;
  let state;
  function reset() {
    state = {
      status: 'checking',
      phase: 'launcher',
      steps: {
        launcher: { status: 'pending', message: 'Checking launcher updates' },
        account: { status: 'pending', message: 'Restoring your account' },
        modpack: { status: 'pending', message: 'Checking the latest modpack' },
      },
    };
  }
  reset();
  const publish = () => onState(structuredClone(state));
  const step = (key, status, message) => {
    state.phase = key;
    state.steps[key] = { status, message };
    publish();
  };
  function run() {
    if (pending) return pending;
    if (['ready', 'update-ready'].includes(state.status))
      return Promise.resolve(structuredClone(state));
    reset();
    pending = (async () => {
      try {
        step('launcher', 'active', 'Checking launcher updates…');
        state.launcher = await checkLauncher();
        if (state.launcher.status === 'downloaded') {
          state.status = 'update-ready';
          step(
            'launcher',
            'done',
            `Launcher ${state.launcher.latestVersion} is ready to install`,
          );
          return structuredClone(state);
        }
        step(
          'launcher',
          state.launcher.status === 'error' ? 'warning' : 'done',
          state.launcher.status === 'error'
            ? 'Launcher updates could not be checked'
            : state.launcher.status === 'development'
              ? 'Development build · installer updates skipped'
              : 'Launcher is up to date',
        );
        step('account', 'active', 'Restoring your account…');
        state.account = await restoreAccount();
        step(
          'account',
          state.account.status === 'sign-in-required' ? 'warning' : 'done',
          state.account.message,
        );
        step('modpack', 'active', 'Checking and updating the latest modpack…');
        state.pack = await updatePack();
        state.status = 'ready';
        step('modpack', 'done', 'Latest modpack ready');
        return structuredClone(state);
      } catch (error) {
        state.status = 'failed';
        state.error = error.message;
        step(state.phase, 'error', error.message);
        throw error;
      } finally {
        pending = null;
      }
    })();
    return pending;
  }
  function retry() {
    if (pending) return pending;
    reset();
    return run();
  }
  return { run, retry, state: () => structuredClone(state) };
}

module.exports = { createStartupUpdate, createStartupFlow };
