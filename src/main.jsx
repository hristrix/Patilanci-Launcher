import React, { useEffect, useRef, useState } from 'react';
import { version as launcherVersion } from '../package.json';
import { createRoot } from 'react-dom/client';
import {
  ArrowDownToLine,
  ArrowRight,
  Box,
  Check,
  ChevronRight,
  Copy,
  Gamepad2,
  Home,
  LogOut,
  Layers,
  Play,
  RefreshCw,
  Settings,
  Square,
  ShieldCheck,
  Signal,
  Swords,
  Users,
  X,
} from 'lucide-react';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/600.css';
import '@fontsource/oswald/700.css';
import BrandLogo from './components/BrandLogo';
import ModpackPage from './components/ModpackPage';
import ModsPage from './components/ModsPage';
import HomeOverview from './components/HomeOverview';
import MemorySettings from './components/MemorySettings';
import WindowTitleBar from './components/WindowTitleBar';
import SkinPreview from './components/SkinPreview';
import PlayerAvatar from './components/PlayerAvatar';
import StartupSplash from './components/StartupSplash';
import './style.css';
import './responsive.css';
import './home.css';
import './pack.css';
import './controls.css';
import './player.css';
import './window.css';
import './branded-home.css';
import './splash.css';

const launcher = window.launcher;
const SERVER_ADDRESS = 'hushed-mongoose.shulker.com';
const DEFAULT_SETTINGS = {
  memory: 6,
  javaPath: 'java',
  installed: null,
};
const PAGES = {
  home: {
    title: 'Welcome to Patilanci.',
    description: 'A shared world. A new story every time you play.',
    label: 'Play',
  },
  players: {
    title: 'Your next adventure has company.',
    description: 'See who’s spending time in the world right now.',
    label: 'Community',
  },
  modpack: {
    title: 'Familiar survival. More possibilities.',
    description: 'The official Patilanci Adventures modpack, all in one place.',
    label: 'Modpack',
  },
  settings: {
    title: 'Ready for your setup.',
    description: 'Make a little room for your next adventure.',
    label: 'Settings',
  },
  mods: {
    title: 'The essentials. And your extras.',
    description:
      'Explore the Patilanci collection and add a few things of your own.',
    label: 'Mods',
  },
};

function ServerStatus({ server }) {
  const label =
    server === null
      ? 'Checking server'
      : server.online
        ? 'Server online'
        : 'Server unreachable';

  return (
    <span className={`server-status ${server?.online ? 'is-online' : ''}`}>
      <span className="status-dot" />
      {label}
    </span>
  );
}

function Sidebar({ page, onNavigate, account, mode, username }) {
  const offline = mode === 'offline' && /^[A-Za-z0-9_]{3,16}$/.test(username);
  const playerName = offline ? username : account?.name;
  const navigation = [
    {
      id: 'home',
      icon: Home,
      label: 'Let’s play',
      subtitle: 'Your adventure starts here',
    },
    {
      id: 'modpack',
      icon: Box,
      label: 'Modpack',
      subtitle: 'Patilanci Adventures',
    },
    {
      id: 'players',
      icon: Users,
      label: 'Community',
      subtitle: 'Better with your people',
    },
    {
      id: 'mods',
      icon: Layers,
      label: 'Mods',
      subtitle: 'The pack and your additions',
    },
  ];

  return (
    <aside className="sidebar">
      <button
        className="brand-link"
        onClick={() => onNavigate('home')}
        aria-label="Patilanci home"
      >
        <BrandLogo />
        <span className="brand-caption">THE OFFICIAL LAUNCHER</span>
      </button>
      <div className="nav-caption">YOUR NEXT CHAPTER</div>
      <nav aria-label="Main navigation">
        {navigation.map(({ id, icon: Icon, label, subtitle }) => (
          <button
            key={id}
            data-page={id}
            className={`nav-item ${page === id ? 'is-active' : ''}`}
            onClick={() => onNavigate(id)}
            aria-current={page === id ? 'page' : undefined}
          >
            <Icon size={19} />
            <span>
              <strong>{label}</strong>
              <small>{subtitle}</small>
            </span>
            {page === id && <ChevronRight className="nav-arrow" size={15} />}
          </button>
        ))}
      </nav>
      <div className="community-note">
        <span className="pixel-cross" />
        <span className="overline">BUILT TOGETHER</span>
        <h3>
          Good people.
          <br />
          Great adventures.
        </h3>
        <p>One block at a time.</p>
        <div className="brand-stripe">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="sidebar-bottom">
        <button
          className={`settings-link ${page === 'settings' ? 'is-active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          <Settings size={17} />
          Launcher settings
          <ChevronRight size={14} />
        </button>
        <div className="sidebar-profile">
          <div className="profile-avatar">
            <Gamepad2 size={20} />
          </div>
          <div>
            <strong>{playerName || 'Hey, adventurer'}</strong>
            <small>
              {offline
                ? 'Offline profile · Local PIN'
                : account
                  ? 'Microsoft connected'
                  : 'Your world is waiting'}
            </small>
          </div>
        </div>
        <div className="launcher-version">
          <span>PATILANCI SMP</span>
          <span>v{launcherVersion}</span>
        </div>
      </div>
    </aside>
  );
}

function PlayerPanel({ server, onRefresh, expanded = false }) {
  const players = server?.players || [];
  const hasServerResponse = server?.online;

  return (
    <section className={`panel player-panel ${expanded ? 'is-expanded' : ''}`}>
      <div className="panel-title">
        <span className="overline">THE COMMUNITY</span>
        <button
          className="icon-button"
          title="Refresh player list"
          onClick={onRefresh}
        >
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="player-count">
        <Users size={21} />
        <strong>{hasServerResponse ? server.count : '—'}</strong>
        <span>
          players online
          <small>
            {hasServerResponse
              ? `${server.max} places in the world`
              : 'Waiting for the server'}
          </small>
        </span>
      </div>
      <div className="player-divider" />
      <div className="section-heading">
        <h3>In the world</h3>
        <span className="live-label">
          <span
            className={`status-dot ${hasServerResponse ? 'is-online' : ''}`}
          />
          LIVE
        </span>
      </div>
      {players.length > 0 ? (
        <div className="player-list">
          {players.map((player, index) => (
            <div className="player" key={player.id || index}>
              <div
                className="player-avatar"
                style={{ '--avatar-hue': `${index * 47}deg` }}
              >
                <span>{player.name.slice(0, 2)}</span>
              </div>
              <div>
                <strong>{player.name}</strong>
                <small>In the adventure</small>
              </div>
              <span className="status-dot is-online" />
            </div>
          ))}
        </div>
      ) : (
        <div className="player-empty">
          <Swords size={29} />
          <strong>
            {hasServerResponse && !server.count
              ? 'Make the first move.'
              : 'A little quiet here.'}
          </strong>
          <p>
            {hasServerResponse
              ? server.count
                ? 'The server is not sharing player names.'
                : 'The next adventure could start with you.'
              : 'Players appear here when the server is reachable.'}
          </p>
        </div>
      )}
      <div className="player-panel-footer">
        <ShieldCheck size={13} />
        <span>Names shared by the server</span>
        {hasServerResponse && (
          <span className="server-ping">
            <Signal size={12} />
            {server.latency} ms
          </span>
        )}
      </div>
    </section>
  );
}

function MicrosoftMark() {
  return (
    <span className="microsoft-mark" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function AccountPanel({
  mode,
  sessionMode,
  game,
  onStop,
  onModeChange,
  username,
  onUsernameChange,
  account,
  busy,
  onLogin,
  onOfflineLogin,
  onSignOut,
  onPlay,
  onCommunity,
  installed,
  progress,
}) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileRefresh, setProfileRefresh] = useState(0);
  const [managingAccount, setManagingAccount] = useState(false);
  const validName = /^[A-Za-z0-9_]{3,16}$/.test(username);

  useEffect(() => {
    setPin('');
    setConfirmPin('');
    setProfile(null);
    setProfileError('');
  }, [username, mode]);

  useEffect(() => {
    if (mode !== 'offline' || !validName || !launcher) return;
    let active = true;
    let unlockTimer;
    const timer = setTimeout(async () => {
      try {
        const result = await launcher.offlineProfile(username);
        if (!active) return;
        setProfile({ ...result, name: username.toLowerCase() });
        setProfileError('');
        if (result.lockedUntil > Date.now()) {
          unlockTimer = setTimeout(
            () => setProfileRefresh((value) => value + 1),
            result.lockedUntil - Date.now() + 100,
          );
        }
      } catch {
        if (active) {
          setProfile(null);
          setProfileError(
            'Could not read local PIN protection. Try again after restarting the launcher.',
          );
        }
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(unlockTimer);
    };
  }, [username, mode, validName, profileRefresh]);

  const currentProfile =
    profile?.name === username.toLowerCase() ? profile : null;
  const locked = currentProfile?.lockedUntil > Date.now();
  const creatingPin = currentProfile && !currentProfile.exists;
  const offlineReady = Boolean(
    currentProfile &&
    !locked &&
    (currentProfile.remembered ||
      (/^[0-9]{6,12}$/.test(pin) && (!creatingPin || confirmPin === pin))),
  );
  const pinHelp =
    profileError ||
    (locked
      ? 'This profile is temporarily locked after repeated incorrect PINs.'
      : !validName
        ? 'Choose a name with 3–16 letters, numbers or underscores.'
        : !currentProfile
          ? 'Checking local profile protection…'
          : currentProfile.remembered
            ? 'Signed in on this computer. Your session is saved.'
            : creatingPin
              ? 'Create a 6–12 digit PIN. Protects this profile on this computer only.'
              : 'Enter your 6–12 digit PIN. Local protection only.');

  async function signInOffline(event) {
    event.preventDefault();
    if (!offlineReady || busy || game.running) return;
    const credentials = { pin, confirmPin };
    setPin('');
    setConfirmPin('');
    await onOfflineLogin(credentials);
    setProfileRefresh((value) => value + 1);
  }

  return (
    <section className="panel account-panel">
      <div className={`login-card ${sessionMode ? 'is-signed-in' : ''}`}>
        <div className="login-avatar-stage">
          {mode === 'microsoft' && account ? (
            <SkinPreview account={account} api={launcher} />
          ) : sessionMode === 'offline' ? (
            <SkinPreview
              account={{
                id: `offline:${username.toLowerCase()}`,
                name: username,
                mode: 'offline',
              }}
              api={launcher}
            />
          ) : (
            <PlayerAvatar />
          )}
        </div>
        <div className="login-accent" />
        <div className="login-player-heading">
          <strong className="home-player-name">
            {mode === 'microsoft'
              ? account?.name || 'Your account'
              : validName
                ? username
                : 'Your player'}
          </strong>
          <span>
            {sessionMode === 'microsoft'
              ? 'Minecraft Java · Premium'
              : sessionMode === 'offline'
                ? 'Offline profile · Signed in'
                : 'Sign in to start your adventure'}
          </span>
        </div>
        <div className="section-heading">
          <div>
            <span className="overline">READY WHEN YOU ARE</span>
            <h3>
              {sessionMode ? 'Your player account.' : 'Choose how you play.'}
            </h3>
          </div>
          <Gamepad2 className="panel-heading-icon" size={24} />
        </div>
        <div className="account-tabs" role="group" aria-label="Account type">
          {(!sessionMode || sessionMode === 'microsoft') && (
            <button
              className={mode === 'microsoft' ? 'is-selected' : ''}
              disabled={busy || game.running || Boolean(sessionMode)}
              onClick={() => onModeChange('microsoft')}
              aria-pressed={mode === 'microsoft'}
            >
              <MicrosoftMark />
              Microsoft account{mode === 'microsoft' && <Check size={13} />}
            </button>
          )}
          {(!sessionMode || sessionMode === 'offline') && (
            <button
              className={mode === 'offline' ? 'is-selected' : ''}
              disabled={busy || game.running || Boolean(sessionMode)}
              onClick={() => onModeChange('offline')}
              aria-pressed={mode === 'offline'}
            >
              <Users size={15} />
              Offline profile{mode === 'offline' && <Check size={13} />}
            </button>
          )}
        </div>
        {sessionMode && (
          <>
            <button
              className="outline-button manage-account-button"
              aria-expanded={managingAccount}
              onClick={() => setManagingAccount(!managingAccount)}
            >
              <Settings size={15} /> Manage account
            </button>
            {managingAccount && (
              <p className="account-management">
                {sessionMode === 'microsoft'
                  ? 'Your Microsoft account is saved securely on this computer.'
                  : 'Your offline profile is saved on this computer.'}{' '}
                {sessionMode === 'offline' &&
                  ' Skin previews use your public nickname on Ely.by and may differ from the skin shown by the server.'}{' '}
                Sign out below to change accounts.
              </p>
            )}
            <button
              className="outline-button player-community-button"
              onClick={onCommunity}
            >
              <Users size={14} /> Players online
            </button>
          </>
        )}
        {mode === 'microsoft' ? (
          <div className="account-details">
            <div className="account-symbol">
              <ShieldCheck size={20} />
            </div>
            <div>
              <strong>
                {account?.name ||
                  (sessionMode === 'microsoft'
                    ? 'Your saved Microsoft account'
                    : 'Your Minecraft account, right here.')}
              </strong>
              <p>
                {account
                  ? 'Signed in. Your next chapter is ready.'
                  : sessionMode === 'microsoft'
                    ? 'Session saved. Play to reconnect, or sign out to change accounts.'
                    : 'Connect securely with Microsoft to get started.'}
              </p>
            </div>
            <button
              className="outline-button"
              disabled={busy || game.running}
              onClick={sessionMode === 'microsoft' ? onSignOut : onLogin}
              aria-label={
                account || sessionMode === 'microsoft'
                  ? 'Sign out of Microsoft'
                  : 'Sign in with Microsoft'
              }
            >
              {account || sessionMode === 'microsoft' ? (
                <>
                  <LogOut size={14} /> Sign out
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        ) : (
          <form className="offline-profile" onSubmit={signInOffline}>
            <div className="offline-fields">
              <div>
                <label htmlFor="minecraft-username">Player name</label>
                <input
                  id="minecraft-username"
                  value={username}
                  onChange={(event) => onUsernameChange(event.target.value)}
                  placeholder="Your in-game name"
                  maxLength={16}
                  disabled={busy || game.running || sessionMode === 'offline'}
                  autoComplete="off"
                />
              </div>
              {!currentProfile?.remembered && (
                <div>
                  <label htmlFor="offline-pin">
                    {creatingPin ? 'Create PIN' : 'Profile PIN'}
                  </label>
                  <input
                    id="offline-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete={
                      creatingPin ? 'new-password' : 'current-password'
                    }
                    minLength={6}
                    maxLength={12}
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    placeholder="6–12 digits"
                    disabled={busy || !currentProfile || locked}
                    aria-describedby="offline-pin-help"
                  />
                </div>
              )}
              {creatingPin && (
                <div>
                  <label htmlFor="offline-pin-confirm">Confirm PIN</label>
                  <input
                    id="offline-pin-confirm"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={12}
                    value={confirmPin}
                    onChange={(event) => setConfirmPin(event.target.value)}
                    placeholder="Repeat your PIN"
                    disabled={busy}
                    aria-describedby="offline-pin-help"
                  />
                </div>
              )}
            </div>
            <small id="offline-pin-help" role="status">
              {pinHelp}
            </small>
            {!currentProfile?.remembered && (
              <button
                type="submit"
                className="outline-button offline-sign-in"
                disabled={busy || game.running || !offlineReady}
              >
                {creatingPin
                  ? 'Create profile & sign in'
                  : 'Confirm PIN & sign in'}
              </button>
            )}
            {(sessionMode === 'offline' || currentProfile?.remembered) && (
              <button
                type="button"
                className="secondary-button"
                disabled={busy || game.running}
                onClick={async () => {
                  await onSignOut();
                  setProfileRefresh((value) => value + 1);
                }}
              >
                Sign out of saved sessions
              </button>
            )}
          </form>
        )}
      </div>
      <div className="launch-controls">
        <div className="play-area">
          <div className="install-state">
            <span
              className={`install-state-icon ${installed ? 'is-installed' : ''}`}
            >
              {installed ? <Check size={15} /> : <ArrowDownToLine size={15} />}
            </span>
            <div>
              <strong>
                {installed
                  ? 'Patilanci installed'
                  : 'We’ll install the latest pack'}
              </strong>
              <small>
                {installed
                  ? `Minecraft ${installed.minecraft} · Updates automatic`
                  : 'Checked and updated before every launch'}
              </small>
            </div>
          </div>
          <button
            className="play-button"
            disabled={
              busy ||
              game.stopping ||
              (!game.running &&
                mode === 'offline' &&
                !currentProfile?.remembered)
            }
            onClick={game.running ? onStop : onPlay}
            aria-label={
              game.running
                ? game.stopping
                  ? 'Stopping Minecraft'
                  : 'Stop Minecraft'
                : 'Play Minecraft'
            }
          >
            {game.running ? (
              <Square size={19} fill="currentColor" />
            ) : (
              <Play size={19} fill="currentColor" />
            )}
            <span>
              {game.stopping
                ? 'STOPPING…'
                : game.running
                  ? 'STOP MINECRAFT'
                  : busy
                    ? 'PREPARING…'
                    : `LAUNCH ${installed?.minecraft || 'MINECRAFT'}`}
            </span>
            <ArrowRight size={19} />
          </button>
        </div>
        <div className="progress-summary" aria-live="polite">
          <span className={`status-dot ${busy ? 'is-working' : ''}`} />
          <span>{progress.message}</span>
          {progress.percent !== null && <b>{progress.percent}%</b>}
        </div>
        {progress.percent !== null && (
          <div className="progress-track">
            <div style={{ width: `${progress.percent}%` }} />
          </div>
        )}
      </div>
    </section>
  );
}

function Preferences({
  draft,
  onChange,
  busy,
  onSave,
  saved,
  launcherUpdate,
  onCheckUpdate,
  onInstallUpdate,
  updateBusy,
}) {
  return (
    <section className="panel preferences">
      <div className="section-heading">
        <div>
          <span className="overline">MAKE IT YOURS</span>
          <h3>Launcher preferences</h3>
        </div>
        <Settings size={22} />
      </div>
      <MemorySettings
        api={launcher}
        allocation={draft.memory}
        onChange={(memory) => onChange({ ...draft, memory })}
      />
      <div className="settings-group">
        <label htmlFor="java-path">Java 21 executable</label>
        <input
          id="java-path"
          value={draft.javaPath}
          onChange={(event) =>
            onChange({ ...draft, javaPath: event.target.value })
          }
          placeholder="java or the full path to java.exe"
        />
        <small>
          Use the full executable path if Java 21 is not on your system PATH.
        </small>
      </div>
      <div className="preferences-actions">
        <button className="play-button" disabled={busy} onClick={onSave}>
          <Check size={18} />
          SAVE PREFERENCES
        </button>
        <span role="status">{saved ? 'Preferences saved.' : ''}</span>
      </div>
      <div className="launcher-update-preferences">
        <div>
          <strong>Launcher {launcherUpdate?.version || ''}</strong>
          <p>
            {launcherUpdate?.status === 'downloaded'
              ? `Version ${launcherUpdate.latestVersion} is ready to install.`
              : launcherUpdate?.status === 'current'
                ? 'Your launcher is up to date.'
                : launcherUpdate?.status === 'development'
                  ? 'Automatic updates are enabled in installed release builds.'
                  : 'Launcher updates are checked automatically at startup.'}
          </p>
        </div>
        <button
          className="outline-button"
          disabled={updateBusy}
          onClick={
            launcherUpdate?.status === 'downloaded'
              ? onInstallUpdate
              : onCheckUpdate
          }
        >
          <RefreshCw size={15} />
          {launcherUpdate?.status === 'downloaded'
            ? 'Restart and update'
            : 'Check launcher updates'}
        </button>
      </div>
    </section>
  );
}

function App() {
  const [page, setPage] = useState('home');
  const [config, setConfig] = useState(DEFAULT_SETTINGS);
  const [server, setServer] = useState(null);
  const [mode, setMode] = useState('microsoft');
  const [username, setUsername] = useState('');
  const [account, setAccount] = useState(null);
  const [game, setGame] = useState({ running: false, stopping: false });
  const sessionLoaded = useRef(false);
  const [busy, setBusy] = useState(Boolean(launcher));
  const [updateState, setUpdateState] = useState({
    status: launcher ? 'checking' : 'idle',
  });
  const [progress, setProgress] = useState({
    message: launcher
      ? 'Checking for modpack updates…'
      : 'Ready for your next adventure',
    percent: null,
  });
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  const [draft, setDraft] = useState(DEFAULT_SETTINGS);
  const [copied, setCopied] = useState(false);
  const [bootVisible, setBootVisible] = useState(Boolean(launcher));
  const [bootState, setBootState] = useState({
    status: 'checking',
    phase: 'launcher',
  });
  const [launcherUpdate, setLauncherUpdate] = useState(null);

  async function loadConfiguration({ resetDraft = true } = {}) {
    if (!launcher) return;
    const configuration = await launcher.config();
    setConfig(configuration);
    if (configuration.launcherUpdate)
      setLauncherUpdate(configuration.launcherUpdate);
    if (resetDraft) {
      setDraft({
        memory: configuration.memory,
        javaPath: configuration.javaPath,
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

  async function refreshServer() {
    if (launcher) setServer(await launcher.status());
  }
  async function runStartup(retry = false) {
    if (!launcher) return;
    setBootVisible(true);
    setBusy(true);
    setError('');
    setBootState({ status: 'checking', phase: 'launcher' });
    try {
      const result = await (retry
        ? launcher.retryStartup()
        : launcher.startup());
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
    const unsubscribe = launcher?.onProgress((update) => {
      if (!active) return;
      setProgress(update);
      setLogs((previous) => [...previous.slice(-99), update.message]);
    });
    const unsubscribeGame = launcher?.onGameState((state) => {
      if (active) setGame(state);
    });
    const unsubscribeStartup = launcher?.onStartupState((state) => {
      if (active) setBootState(state);
    });
    const unsubscribeLauncher = launcher?.onLauncherUpdate((state) => {
      if (active) setLauncherUpdate(state);
    });
    runStartup();
    refreshServer().catch(() => setServer({ online: false, players: [] }));
    const timer = setInterval(() => refreshServer().catch(() => {}), 30000);

    return () => {
      active = false;
      clearInterval(timer);
      unsubscribe?.();
      unsubscribeGame?.();
      unsubscribeStartup?.();
      unsubscribeLauncher?.();
    };
  }, []);

  async function performAction(callback) {
    if (!launcher) {
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
        await launcher.logout();
        setAccount(null);
      } else {
        setAccount(await launcher.login());
      }
      await loadConfiguration({ resetDraft: false });
    });
  }

  function handleOfflineLogin(credentials) {
    return performAction(async () => {
      await launcher.loginOffline({ name: username, ...credentials });
      await loadConfiguration({ resetDraft: false });
    });
  }

  function handlePlay() {
    return performAction(async () => {
      await launcher.play({ mode, name: username });
      await loadConfiguration();
    });
  }
  function handleStop() {
    return performAction(async () => {
      setGame(await launcher.stopMinecraft());
    });
  }

  function handleInstall() {
    return performAction(async () => {
      setUpdateState({ status: 'checking' });
      try {
        await launcher.install();
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
      await launcher.save(draft);
      await loadConfiguration();
      setProgress({ message: 'Settings saved', percent: null });
    });
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(SERVER_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy the server address.');
    }
  }
  const installLauncherUpdate = () =>
    performAction(() => launcher.installLauncherUpdate());
  if (bootVisible)
    return (
      <>
        <WindowTitleBar
          api={launcher}
          pageLabel="Starting up"
          onOpenFolder={() => launcher?.folder().catch(() => {})}
        />
        <StartupSplash
          state={bootState}
          progress={progress}
          update={launcherUpdate}
          onRetry={() => runStartup(true)}
          onContinue={openAfterStartupFailure}
          onInstall={installLauncherUpdate}
        />
      </>
    );

  const accountPanel = (
    <AccountPanel
      mode={mode}
      sessionMode={
        config.session?.authenticated
          ? config.session.mode
          : account
            ? 'microsoft'
            : null
      }
      game={game}
      onStop={handleStop}
      onModeChange={setMode}
      username={username}
      onUsernameChange={setUsername}
      account={account}
      busy={busy}
      onLogin={handleLogin}
      onOfflineLogin={handleOfflineLogin}
      onSignOut={() =>
        performAction(async () => {
          await launcher.logout();
          setAccount(null);
          await loadConfiguration({ resetDraft: false });
        })
      }
      onPlay={handlePlay}
      onCommunity={() => setPage('players')}
      installed={config.installed}
      progress={progress}
    />
  );

  return (
    <>
      <WindowTitleBar
        api={launcher}
        pageLabel={PAGES[page].label}
        onOpenFolder={() => performAction(() => launcher.folder())}
      />
      <div className={`app-shell ${page === 'home' ? 'is-home' : ''}`}>
        <Sidebar
          page={page}
          onNavigate={setPage}
          account={account}
          mode={mode}
          username={username}
        />
        <main className="main-shell">
          <div className="page-content">
            <div className="page-heading">
              <div>
                <span className="overline">
                  <span className="gold-square" />
                  THE GOOD TIMES START HERE
                </span>
                <h1>{PAGES[page].title}</h1>
                <p>{PAGES[page].description}</p>
              </div>
              <ServerStatus server={server} />
            </div>
            {error && (
              <div className="error-banner" role="alert">
                <span>{error}</span>
                <button aria-label="Dismiss error" onClick={() => setError('')}>
                  <X size={17} />
                </button>
              </div>
            )}
            {launcherUpdate &&
              ['error', 'downloaded'].includes(launcherUpdate.status) && (
                <div className="launcher-update-notice" role="status">
                  <span>
                    {launcherUpdate.status === 'downloaded'
                      ? `Launcher ${launcherUpdate.latestVersion} is ready to install.`
                      : 'Launcher updates could not be checked. Your modpack update check is separate.'}
                  </span>
                  <button
                    className="outline-button"
                    disabled={busy || game.running}
                    onClick={
                      launcherUpdate.status === 'downloaded'
                        ? installLauncherUpdate
                        : () =>
                            performAction(async () =>
                              setLauncherUpdate(
                                await launcher.checkLauncherUpdate(),
                              ),
                            )
                    }
                  >
                    {launcherUpdate.status === 'downloaded'
                      ? 'Restart and update'
                      : 'Retry update check'}
                  </button>
                </div>
              )}
            {page === 'home' && (
              <HomeOverview
                config={config}
                server={server}
                accountPanel={accountPanel}
                onNavigate={setPage}
              />
            )}
            {page === 'players' && (
              <div className="community-grid">
                <PlayerPanel
                  server={server}
                  onRefresh={refreshServer}
                  expanded
                />
                {accountPanel}
              </div>
            )}
            {page === 'modpack' && (
              <ModpackPage
                config={config}
                busy={busy}
                updateState={updateState}
                onRetry={handleInstall}
                onManageMods={() => setPage('mods')}
                onOpenCurseForge={() =>
                  performAction(() => launcher.packPage())
                }
                progress={progress}
                logs={logs}
              />
            )}
            {page === 'settings' && (
              <Preferences
                draft={draft}
                onChange={setDraft}
                busy={busy}
                onSave={handleSave}
                saved={progress.message === 'Settings saved'}
                launcherUpdate={launcherUpdate}
                onCheckUpdate={() =>
                  performAction(async () =>
                    setLauncherUpdate(await launcher.checkLauncherUpdate()),
                  )
                }
                onInstallUpdate={installLauncherUpdate}
                updateBusy={busy || game.running}
              />
            )}
            {page === 'mods' && (
              <ModsPage
                api={launcher}
                busy={busy}
                onAction={performAction}
                onInstall={() => setPage('modpack')}
              />
            )}
            <footer className="page-footer">
              <button className="server-address" onClick={copyAddress}>
                <span className="status-dot" />
                {copied ? 'Address copied' : SERVER_ADDRESS}
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
              <span>YOUR PEOPLE. YOUR PLACE.</span>
              <button className="refresh-link" onClick={refreshServer}>
                <RefreshCw size={12} />
                Refresh status
              </button>
            </footer>
          </div>
        </main>
      </div>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
