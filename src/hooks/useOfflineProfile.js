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
            'Защитата с ПИН код не може да бъде проверена. Рестартирай приложението и опитай отново.',
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
      return 'Профилът е временно заключен след няколко грешни ПИН кода.';
    if (!validName)
      return 'Избери име от 3 до 16 латински букви, цифри или долни черти.';
    if (!currentProfile) return 'Проверка на защитата на профила…';
    if (currentProfile.remembered)
      return 'Вече си влязъл на този компютър. Входът ти е запомнен.';
    if (creatingPin)
      return 'Създай ПИН код от 6 до 12 цифри. Той защитава профила само на този компютър.';
    return 'Въведи ПИН кода си от 6 до 12 цифри. Той важи само за този компютър.';
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
