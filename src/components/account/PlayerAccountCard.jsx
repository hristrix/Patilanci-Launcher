import {
  ArrowRight,
  Check,
  Gamepad2,
  LogOut,
  ShieldCheck,
  Shirt,
  Users,
} from 'lucide-react';
import SkinPreview from '../SkinPreview';
import OfflineProfileForm from './OfflineProfileForm';

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

export default function PlayerAccountCard({
  api,
  mode,
  sessionMode,
  account,
  username,
  onUsernameChange,
  busy,
  game,
  onModeChange,
  onLogin,
  onSignOut,
  onManageSkin,
  offlineForm,
}) {
  const { validName } = offlineForm;
  return (
    <div className={`login-card ${sessionMode ? 'is-signed-in' : ''}`}>
      <div className="login-avatar-stage">
        {mode === 'microsoft' && account ? (
          <SkinPreview account={account} api={api} />
        ) : sessionMode === 'offline' ? (
          <SkinPreview
            account={{
              id: `offline:${username.toLowerCase()}`,
              name: username,
              mode: 'offline',
            }}
            api={api}
          />
        ) : (
          <SkinPreview api={api} />
        )}
      </div>
      <div className="login-accent" />
      <div className="login-player-heading">
        {sessionMode && (
          <button
            className="icon-button set-skin-button"
            aria-label="Set skin"
            title="Set skin"
            disabled={busy}
            onClick={onManageSkin}
          >
            <Shirt size={16} />
          </button>
        )}
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
        <OfflineProfileForm
          form={offlineForm}
          username={username}
          onUsernameChange={onUsernameChange}
          sessionMode={sessionMode}
          busy={busy}
          running={game.running}
          onSignOut={onSignOut}
        />
      )}
    </div>
  );
}
