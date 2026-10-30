# Seasonal loading soundtracks

Three original, locally synthesized 16-second stereo loops accompany seasonal startup and the development loading-screen preview:

- `halloween-loading.wav`: low wind and a mysterious minor-key bell motif.
- `christmas-loading.wav`: a bright, original celesta-style bell melody.
- `newyear-loading.wav`: celebratory chimes with gentle distant firework swells.

These are original compositions, with no recorded samples, third-party songs, or network requests. Recreate the committed 22,050 Hz, 16-bit PCM WAV files with `node scripts/generate-seasonal-audio.cjs`. The synthesizer limits peak amplitude and uses short edge fades to avoid loop clicks. Playback uses 22% volume. Original mode is silent.

The loading screen has a sound toggle that remembers the player's choice locally. Hidden windows pause playback; leaving the loading screen releases its audio. Browsers that block autoplay show **Пусни звука** for explicit playback, and unavailable audio never blocks loading.
