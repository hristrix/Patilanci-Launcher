import { useEffect, useState } from 'react';

export const STEVE_SKIN = {
  dataUrl: new URL('../../public/skins/steve.png', import.meta.url).href,
  model: 'default',
};

const requests = new WeakMap();

// Share a skin lookup between the account preview and sidebar head. Release it
// when the profile is no longer displayed, so signing in again refreshes it.
export default function usePlayerSkin(account, api) {
  const key = account
    ? `${account.mode || 'microsoft'}:${account.id}:${account.name}:${account.skin?.url || ''}:${account.skin?.model || ''}:${account.skinRevision || ''}`
    : 'default';
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!account || !api) return;
    let cache = requests.get(api);
    if (!cache) requests.set(api, (cache = new Map()));
    let entry = cache.get(key);
    if (!entry) {
      entry = {
        users: 0,
        promise: Promise.resolve().then(() =>
          api.skin(
            account.mode === 'offline'
              ? { mode: 'offline', name: account.name }
              : undefined,
          ),
        ),
      };
      cache.set(key, entry);
    }
    entry.users++;
    let active = true;
    entry.promise.then(
      (texture) =>
        active &&
        setResult({ key, texture, phase: texture ? 'ready' : 'missing' }),
      () => active && setResult({ key, texture: null, phase: 'unavailable' }),
    );
    return () => {
      active = false;
      if (--entry.users === 0) cache.delete(key);
    };
  }, [key, api]);

  if (!account) return { texture: STEVE_SKIN, phase: 'ready' };
  if (result?.key === key) return result;
  return { texture: null, phase: api ? 'loading' : 'unavailable' };
}
