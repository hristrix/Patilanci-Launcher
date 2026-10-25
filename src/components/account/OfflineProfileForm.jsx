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
          <label htmlFor="minecraft-username">Player name</label>
          <input
            id="minecraft-username"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            placeholder="Your in-game name"
            maxLength={16}
            disabled={busy || running || sessionMode === 'offline'}
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
              autoComplete={creatingPin ? 'new-password' : 'current-password'}
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
          disabled={busy || running || !offlineReady}
        >
          {creatingPin ? 'Create profile & sign in' : 'Confirm PIN & sign in'}
        </button>
      )}
      {(sessionMode === 'offline' || currentProfile?.remembered) && (
        <button
          type="button"
          className="secondary-button"
          disabled={busy || running}
          onClick={() => signOut(onSignOut)}
        >
          Sign out of saved sessions
        </button>
      )}
    </form>
  );
}
