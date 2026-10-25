import { useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS } from '../config';
import useServerStatus from './useServerStatus';
import useInstanceStorage from './useInstanceStorage';

// Coordinates the desktop bridge. Components receive state and named actions.
export default function useLauncher(api) {
  const [config, setConfig] = useState(DEFAULT_SETTINGS);
  const [mode, setMode] = useState('microsoft');
  const [username, setUsername] = useState('');
  const [account, setAccount] = useState(null);
  const [game, setGame] = useState({ running: false, stopping: false });
  const [launchPhase, setLaunchPhase] = useState('idle');
  const sessionLoaded = useRef(false);
  const [busy, setBusy] = useState(Boolean(api));
  const [updateState, setUpdateState] = useState({
    status: api ? 'checking' : 'idle',
  });
  const [progress, setProgress] = useState({
    message: api
      ? 'Checking for modpack updates…'
      : 'Ready for your next adventure',
    percent: null,
  });
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  const [draft, setDraft] = useState(DEFAULT_SETTINGS);
  const [bootVisible, setBootVisible] = useState(Boolean(api));
  const [bootState, setBootState] = useState({
    status: 'checking',
    phase: 'launcher',
  });
  const [launcherUpdate, setLauncherUpdate] = useState(null);
  const [modpackUpdate, setModpackUpdate] = useState(null);

  const { server, serverRefreshing, refreshServer } = useServerStatus(api);
  const { storage, refreshStorage } = useInstanceStorage(
    api,
    config.installed,
    busy,
    game.running,
  );

  async function loadConfiguration({ resetDraft = true } = {}) {
    if (!api) return;
    const configuration = await api.config();
    setConfig(configuration);
    if (configuration.launcherUpdate)
      setLauncherUpdate(configuration.launcherUpdate);
    if (configuration.modpackUpdate)
      setModpackUpdate(configuration.modpackUpdate);
    if (resetDraft) {
      setDraft({
        memory: configuration.memory,
        javaPath: configuration.javaPath,
        javaPaths: configuration.javaPaths || {},
      });
    }
    setAccount(configuration.account);
    if (configuration.game) setGame(configuration.game);
    if (configuration.session?.authenticated || !sessionLoaded.current) {
      setMode(configuration.session?.mode || 'microsoft');
      setUsername(configuration.session?.name || '');
      sessionLoaded.current = true;
    }
  }

  async function runStartup(retry = false) {
    if (!api) return;
    setBootVisible(true);
    setBusy(true);
    setError('');
    setBootState({ status: 'checking', phase: 'launcher' });
    try {
      const result = await (retry ? api.retryStartup() : api.startup());
      setBootState(result);
      if (result.launcher) setLauncherUpdate(result.launcher);
      if (result.status === 'ready') {
        await loadConfiguration();
        setUpdateState({ status: 'ready' });
        setProgress({ message: 'Latest modpack ready to play.', percent: 100 });
        setBootVisible(false);
      }
    } catch (error) {
      const message = error.message.replace(
        /^Error invoking remote method '[^']+': Error: /,
        '',
      );
      setBootState((previous) => ({
        ...previous,
        status: 'failed',
        error: message,
      }));
      setUpdateState({ status: 'failed' });
      setError(message);
    } finally {
      setBusy(false);
    }
  }
  async function openAfterStartupFailure() {
    try {
      await loadConfiguration({ resetDraft: false });
    } catch (error) {
      setError(error.message);
    }
    setBootVisible(false);
    setBusy(false);
  }

  useEffect(() => {
    let active = true;
    // Listen before requesting the update so the first progress event is visible.
    const unsubscribe = api?.onProgress((update) => {
      if (!active) return;
      setProgress(update);
      if (update.launchPhase === 'starting') setLaunchPhase('starting');
      setLogs((previous) => [...previous.slice(-99), update.message]);
    });
    const unsubscribeGame = api?.onGameState((state) => {
      if (active) setGame(state);
    });
    const unsubscribeStartup = api?.onStartupState((state) => {
      if (active) setBootState(state);
    });
    const unsubscribeLauncher = api?.onLauncherUpdate((state) => {
      if (active) setLauncherUpdate(state);
    });
    const unsubscribeModpack = api?.onModpackUpdate((state) => {
      if (active) setModpackUpdate(state);
    });
    runStartup();

    return () => {
      active = false;
      unsubscribe?.();
      unsubscribeGame?.();
      unsubscribeStartup?.();
      unsubscribeLauncher?.();
      unsubscribeModpack?.();
    };
  }, []);

  async function performAction(callback) {
    if (!api) {
      setError('Open the desktop launcher to use this feature.');
      return;
    }
    if (busy) return;

    setBusy(true);
    setError('');
    try {
      await callback();
    } catch (error) {
      setError(
        error.message.replace(
          /^Error invoking remote method '[^']+': Error: /,
          '',
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  function handleLogin() {
    return performAction(async () => {
      if (account) {
        await api.logout();
        setAccount(null);
      } else {
        setAccount(await api.login());
      }
      await loadConfiguration({ resetDraft: false });
    });
  }

  function handleOfflineLogin(credentials) {
    return performAction(async () => {
      await api.loginOffline({ name: username, ...credentials });
      await loadConfiguration({ resetDraft: false });
    });
  }

  function handlePlay() {
    return performAction(async () => {
      setLaunchPhase('preparing');
      setProgress({ message: 'Preparing your adventure…', percent: null });
      try {
        await api.play({ mode, name: username });
        await loadConfiguration();
      } finally {
        setLaunchPhase('idle');
      }
    });
  }
  function handleStop() {
    return performAction(async () => {
      setGame(await api.stopMinecraft());
    });
  }

  function handleInstall() {
    return performAction(async () => {
      setUpdateState({ status: 'checking' });
      try {
        await api.install();
        await loadConfiguration({ resetDraft: false });
        setUpdateState({ status: 'ready' });
      } catch (error) {
        setUpdateState({ status: 'failed' });
        throw error;
      }
    });
  }

  function handleSave() {
    return performAction(async () => {
      await api.save(draft);
      await loadConfiguration();
      setProgress({ message: 'Settings saved', percent: null });
    });
  }

  function signOut() {
    return performAction(async () => {
      await api.logout();
      setAccount(null);
      await loadConfiguration({ resetDraft: false });
    });
  }
  function checkLauncherUpdate() {
    return performAction(async () =>
      setLauncherUpdate(await api.checkLauncherUpdate()),
    );
  }
  function installLauncherUpdate() {
    return performAction(() => api.installLauncherUpdate());
  }
  function reloadConfiguration() {
    return loadConfiguration({ resetDraft: false });
  }
  const sessionMode = config.session?.authenticated
    ? config.session.mode
    : account
      ? 'microsoft'
      : null;

  return {
    state: {
      config,
      server,
      serverRefreshing,
      mode,
      username,
      account,
      sessionMode,
      game,
      launchPhase,
      busy,
      updateState,
      progress,
      error,
      logs,
      draft,
      bootVisible,
      bootState,
      launcherUpdate,
      modpackUpdate,
      storage,
    },
    actions: {
      setMode,
      setUsername,
      setDraft,
      setError,
      performAction,
      refreshServer,
      refreshStorage,
      reloadConfiguration,
      signOut,
      checkLauncherUpdate,
      installLauncherUpdate,
      retryStartup: () => runStartup(true),
      openAfterStartupFailure,
      login: handleLogin,
      loginOffline: handleOfflineLogin,
      play: handlePlay,
      stop: handleStop,
      installPack: handleInstall,
      savePreferences: handleSave,
    },
  };
}
