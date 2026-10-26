import { useState } from 'react';
import SkinManager from '../SkinManager';
import useOfflineProfile from '../../hooks/useOfflineProfile';
import PlayerAccountCard from './PlayerAccountCard';
import LaunchControls from './LaunchControls';

export default function AccountPanel({
  api,
  mode,
  sessionMode,
  game,
  launchPhase,
  onStop,
  onModeChange,
  username,
  onUsernameChange,
  account,
  offlineSkin,
  busy,
  onLogin,
  onOfflineLogin,
  onSignOut,
  onPlay,
  onAction,
  onSkinApplied,
  installed,
  progress,
  showLaunch = true,
}) {
  const [managingSkin, setManagingSkin] = useState(false);
  const offlineForm = useOfflineProfile({
    api,
    mode,
    username,
    busy,
    running: game.running,
    onSignIn: onOfflineLogin,
  });
  return (
    <section className="panel account-panel">
      <PlayerAccountCard
        api={api}
        mode={mode}
        sessionMode={sessionMode}
        account={account}
        offlineSkin={offlineSkin}
        username={username}
        onUsernameChange={onUsernameChange}
        busy={busy}
        game={game}
        onModeChange={onModeChange}
        onLogin={onLogin}
        onSignOut={onSignOut}
        onManageSkin={() => setManagingSkin(true)}
        offlineForm={offlineForm}
      />
      {managingSkin && sessionMode && (
        <SkinManager
          api={api}
          account={account}
          name={sessionMode === 'offline' ? username : account?.name}
          mode={sessionMode}
          busy={busy}
          running={game.running}
          onAction={onAction}
          onApplied={onSkinApplied}
          onClose={() => setManagingSkin(false)}
        />
      )}

      {showLaunch && (
        <LaunchControls
          game={game}
          launchPhase={launchPhase}
          busy={busy}
          installed={installed}
          progress={progress}
          mode={mode}
          offlineRemembered={offlineForm.currentProfile?.remembered}
          onPlay={onPlay}
          onStop={onStop}
        />
      )}
    </section>
  );
}
