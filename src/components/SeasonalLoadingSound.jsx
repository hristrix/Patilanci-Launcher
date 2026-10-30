import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useSeasonalTheme } from './SeasonalTheme';
import {
  SOUND_STORAGE_KEY,
  SOUNDTRACKS,
  readSoundEnabled,
  createLoadingSound,
} from '../lib/seasonal-audio.mjs';

export default function SeasonalLoadingSound() {
  const { theme } = useSeasonalTheme();
  const source = SOUNDTRACKS[theme];
  const player = useRef(null);
  const [enabled, setEnabled] = useState(() => {
    try {
      return readSoundEnabled(window.localStorage);
    } catch {
      return true;
    }
  });
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    setStatus('idle');
    if (!source) return;
    let controller;
    try {
      controller = createLoadingSound({ source, onState: setStatus });
      player.current = controller;
    } catch {
      setStatus('unavailable');
    }
    return () => {
      player.current = null;
      controller?.dispose();
    };
  }, [source]);

  useEffect(() => {
    const refresh = () => {
      if (enabled && !document.hidden) void player.current?.play();
      else player.current?.pause();
    };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [source, enabled]);

  if (!source) return null;
  const retry = enabled && ['blocked', 'unavailable'].includes(status);
  function toggle() {
    const next = retry || !enabled;
    setEnabled(next);
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, String(next));
    } catch {}
    if (next) void player.current?.play();
    else player.current?.pause();
  }
  const label = retry
    ? 'Пусни звука'
    : enabled
      ? 'Звук: включен'
      : 'Звук: изключен';
  return (
    <button
      type="button"
      className="splash-sound-toggle"
      data-sound-state={enabled ? status : 'muted'}
      data-sound-theme={theme}
      aria-pressed={enabled}
      aria-label={label}
      onClick={toggle}
      title={label}
    >
      {enabled ? (
        <Volume2 aria-hidden="true" />
      ) : (
        <VolumeX aria-hidden="true" />
      )}
      <span>{label}</span>
    </button>
  );
}
