export const SOUND_STORAGE_KEY = 'patilanci.loadingSound.enabled';
export const SOUNDTRACKS = Object.freeze({
  halloween: './audio/halloween-loading.wav',
  christmas: './audio/christmas-loading.wav',
  newyear: './audio/newyear-loading.wav',
});

export function readSoundEnabled(storage) {
  try {
    return storage.getItem(SOUND_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

// A late play() result must never restart a muted or unmounted loading screen.
export function createLoadingSound({
  source,
  createAudio = (src) => new Audio(src),
  onState = () => {},
}) {
  const audio = createAudio(source);
  audio.loop = true;
  audio.volume = 0.22;
  audio.preload = 'auto';
  let disposed = false,
    revision = 0,
    pending = null,
    wanted = false;
  const state = (value) => {
    if (!disposed) onState(value);
  };
  const onError = () => {
    wanted = false;
    revision++;
    pending = null;
    audio.pause();
    state('unavailable');
  };
  audio.addEventListener('error', onError);
  return {
    play() {
      if (disposed) return Promise.resolve();
      wanted = true;
      if (pending) return pending;
      if (!audio.paused) {
        state('playing');
        return Promise.resolve();
      }
      const current = ++revision;
      // Call in the click handler's stack so browsers can grant user activation.
      let result;
      try {
        result = audio.play();
      } catch (error) {
        result = Promise.reject(error);
      }
      pending = Promise.resolve(result)
        .then(
          () => {
            if (disposed || !wanted) {
              audio.pause();
              return;
            }
            if (current !== revision) return;
            state('playing');
          },
          (error) => {
            if (disposed || current !== revision) return;
            state(
              error?.name === 'NotAllowedError' ? 'blocked' : 'unavailable',
            );
          },
        )
        .finally(() => {
          if (current === revision) pending = null;
        });
      return pending;
    },
    pause() {
      if (disposed) return;
      wanted = false;
      revision++;
      pending = null;
      audio.pause();
      state('idle');
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      wanted = false;
      revision++;
      audio.pause();
      audio.removeEventListener('error', onError);
      audio.removeAttribute('src');
      audio.load();
    },
  };
}
