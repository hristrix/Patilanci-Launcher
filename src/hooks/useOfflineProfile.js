import { useEffect, useState } from 'react';

export default function useOfflineProfile({
  api,
  mode,
  username,
  busy,
  running,
  onSignIn,
}) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileRefresh, setProfileRefresh] = useState(0);
  const validName = /^[A-Za-z0-9_]{3,16}$/.test(username);

  useEffect(() => {
    setPin('');
    setConfirmPin('');
    setProfile(null);
    setProfileError('');
  }, [username, mode]);

  useEffect(() => {
    if (mode !== 'offline' || !validName || !api) return;
    let active = true;
    let unlockTimer;
    const timer = setTimeout(async () => {
      try {
        const result = await api.offlineProfile(username);
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
  }, [api, username, mode, validName, profileRefresh]);

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
  function getPinHelp() {
    if (profileError) return profileError;
    if (locked)
      return 'This profile is temporarily locked after repeated incorrect PINs.';
    if (!validName)
      return 'Choose a name with 3–16 letters, numbers or underscores.';
    if (!currentProfile) return 'Checking local profile protection…';
    if (currentProfile.remembered)
      return 'Signed in on this computer. Your session is saved.';
    if (creatingPin)
      return 'Create a 6–12 digit PIN. Protects this profile on this computer only.';
    return 'Enter your 6–12 digit PIN. Local protection only.';
  }

  async function signInOffline(event) {
    event.preventDefault();
    if (!offlineReady || busy || running) return;
    const credentials = { pin, confirmPin };
    setPin('');
    setConfirmPin('');
    await onSignIn(credentials);
    setProfileRefresh((value) => value + 1);
  }

  async function signOut(onSignOut) {
    await onSignOut();
    setProfileRefresh((value) => value + 1);
  }
  return {
    pin,
    setPin,
    confirmPin,
    setConfirmPin,
    validName,
    currentProfile,
    locked,
    creatingPin,
    offlineReady,
    pinHelp: getPinHelp(),
    signInOffline,
    signOut,
  };
}
