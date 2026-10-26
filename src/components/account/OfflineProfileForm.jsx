export default function OfflineProfileForm({
  form,
  username,
  onUsernameChange,
  sessionMode,
  busy,
  running,
  onSignOut,
}) {
  const {
    pin,
    setPin,
    confirmPin,
    setConfirmPin,
    currentProfile,
    locked,
    creatingPin,
    offlineReady,
    pinHelp,
    signInOffline,
    signOut,
  } = form;
  return (
    <form className="offline-profile" onSubmit={signInOffline}>
      <div className="offline-fields">
        <div>
          <label htmlFor="minecraft-username">Име в играта</label>
          <input
            id="minecraft-username"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            placeholder="Въведи потребителско име"
            maxLength={16}
            disabled={busy || running || sessionMode === 'offline'}
            autoComplete="off"
          />
        </div>
        {currentProfile && !currentProfile.remembered && (
          <div>
            <label htmlFor="offline-pin">
              {creatingPin ? 'Създай ПИН код' : 'ПИН код на профила'}
            </label>
            <input
              id="offline-pin"
              type="password"
              inputMode="numeric"
              autoComplete={creatingPin ? 'new-password' : 'current-password'}
              minLength={6}
              maxLength={12}
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="От 6 до 12 цифри"
              disabled={busy || !currentProfile || locked}
              aria-describedby="offline-pin-help"
            />
          </div>
        )}
        {creatingPin && (
          <div>
            <label htmlFor="offline-pin-confirm">Потвърди ПИН кода</label>
            <input
              id="offline-pin-confirm"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={12}
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value)}
              placeholder="Въведи ПИН кода отново"
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
          disabled={busy || running || !offlineReady}
        >
          {creatingPin
            ? 'Създай профил и влез'
            : currentProfile
              ? 'Потвърди ПИН кода и влез'
              : 'Продължи с местен профил'}
        </button>
      )}
      {(sessionMode === 'offline' || currentProfile?.remembered) && (
        <button
          type="button"
          className="secondary-button"
          disabled={busy || running}
          onClick={() => signOut(onSignOut)}
        >
          Излез от запомнените профили
        </button>
      )}
    </form>
  );
}
