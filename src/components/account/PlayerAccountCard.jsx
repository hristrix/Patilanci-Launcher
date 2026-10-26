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
  offlineSkin,
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
      {!sessionMode && (
        <div className="sign-in-intro">
          <h2>Влез в играта.</h2>
          <p>
            Влез с Microsoft профил, за да играеш на сървърите на Патиланци и да
            запазиш своя напредък.
          </p>
        </div>
      )}
      <div className="login-avatar-stage">
        {mode === 'microsoft' && account ? (
          <SkinPreview account={account} api={api} />
        ) : sessionMode === 'offline' ? (
          <SkinPreview
            account={{
              id: `offline:${username.toLowerCase()}`,
              name: username,
              mode: 'offline',
              skinRevision: offlineSkin?.revision,
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
            aria-label="Промени външния вид"
            title="Промени външния вид"
            disabled={busy}
            onClick={onManageSkin}
          >
            <Shirt size={16} />
          </button>
        )}
        <strong className="home-player-name">
          {mode === 'microsoft'
            ? account?.name || 'Твоят профил'
            : validName
              ? username
              : 'Твоят герой'}
        </strong>
        <span>
          {sessionMode === 'microsoft'
            ? 'Профил в Minecraft Java'
            : sessionMode === 'offline'
              ? 'Местен профил · Успешен вход'
              : 'Влез, за да започнеш приключението'}
        </span>
      </div>
      <div className="section-heading">
        <div>
          <span className="overline">ГОТОВО ЗА ИГРА</span>
          <h3>{sessionMode ? 'Твоят профил' : 'Избери как да продължиш'}</h3>
        </div>
        <Gamepad2 className="panel-heading-icon" size={24} />
      </div>
      <div className="account-tabs" role="group" aria-label="Вид на профила">
        {(!sessionMode || sessionMode === 'microsoft') && (
          <button
            className={mode === 'microsoft' ? 'is-selected' : ''}
            disabled={busy || game.running || Boolean(sessionMode)}
            onClick={() => onModeChange('microsoft')}
            aria-pressed={mode === 'microsoft'}
          >
            <MicrosoftMark />
            Профил в Microsoft{mode === 'microsoft' && <Check size={13} />}
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
            Местен профил{mode === 'offline' && <Check size={13} />}
          </button>
        )}
      </div>
      {(mode === 'microsoft' || !sessionMode) && (
        <div className="account-details">
          <div className="account-symbol">
            <ShieldCheck size={20} />
          </div>
          <div>
            <strong>
              {account?.name ||
                (sessionMode === 'microsoft'
                  ? 'Запомненият ти профил в Microsoft'
                  : 'Твоят профил в Minecraft')}
            </strong>
          </div>
          <button
            className="outline-button"
            disabled={busy || game.running}
            onClick={sessionMode === 'microsoft' ? onSignOut : onLogin}
            aria-label={
              account || sessionMode === 'microsoft'
                ? 'Излез от Microsoft'
                : 'Влез с Microsoft'
            }
          >
            {account || sessionMode === 'microsoft' ? (
              <>
                <LogOut size={14} /> Излез
              </>
            ) : (
              <>
                <MicrosoftMark /> Вход с Microsoft
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      )}
      {(!sessionMode || mode === 'offline') && (
        <>
          {!sessionMode && (
            <p className="microsoft-sign-in-help">
              Отваря защитен вход в браузъра.
            </p>
          )}
          {!sessionMode && <div className="sign-in-divider">или</div>}
          <div className={!sessionMode ? 'local-profile-card' : undefined}>
            {!sessionMode && (
              <div className="local-profile-heading">
                <h3>
                  Местен профил{' '}
                  <small className="offline-badge">● Местен</small>
                </h3>
                <p>
                  Продължи с местен профил, ако искаш да играеш на сървъри,
                  които позволяват местни профили.
                </p>
              </div>
            )}
            <OfflineProfileForm
              form={offlineForm}
              username={username}
              onUsernameChange={(value) => {
                if (mode !== 'offline') onModeChange('offline');
                onUsernameChange(value);
              }}
              sessionMode={sessionMode}
              busy={busy}
              running={game.running}
              onSignOut={onSignOut}
            />
          </div>
        </>
      )}
    </div>
  );
}
