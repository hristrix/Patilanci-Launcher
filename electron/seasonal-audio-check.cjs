const assert = require('node:assert/strict');

async function beginSeasonalAudioChecks(window, waitForRenderer) {
  const run = (script) => window.webContents.executeJavaScript(script);
  const { SOUND_STORAGE_KEY, SOUNDTRACKS } =
    await import('../src/lib/seasonal-audio.mjs');
  const wasMuted = window.webContents.isAudioMuted();
  // Exercise real HTML audio playback without sending test music to the speakers.
  window.webContents.setAudioMuted(true);
  await run(`(() => {
    localStorage.removeItem(${JSON.stringify(SOUND_STORAGE_KEY)});
    window.loadingSoundFixture = { OriginalAudio: window.Audio, players: [], blocked: false };
    window.Audio = function(source) {
      const audio = new window.loadingSoundFixture.OriginalAudio(source);
      const play = audio.play.bind(audio);
      audio.play = () => window.loadingSoundFixture.blocked
        ? Promise.reject(new DOMException('Fixture: user gesture required', 'NotAllowedError')) : play();
      window.loadingSoundFixture.players.push(audio);
      return audio;
    };
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  })()`);

  return {
    async check(theme, firstMount) {
      if (theme === 'original') {
        assert.equal(
          await run(`document.querySelector('.splash-sound-toggle') === null`),
          true,
        );
        return;
      }
      await waitForRenderer(
        window,
        `document.querySelector('.splash-sound-toggle')?.dataset.soundTheme === ${JSON.stringify(theme)}`,
      );
      assert.equal(
        await run(`(() => {
        const box = document.querySelector('.splash-sound-toggle').getBoundingClientRect();
        return box.top >= 0 && box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth;
      })()`),
        true,
        'Sound control is visible without scrolling, even on compact loading screens',
      );
      if (!firstMount) {
        assert.equal(
          await run(
            `document.querySelector('.splash-sound-toggle').getAttribute('aria-pressed')`,
          ),
          'false',
          'Mute persists between loading-screen mounts',
        );
        assert.equal(
          await run(`window.loadingSoundFixture.players.at(-1).paused`),
          true,
        );
        await run(`document.querySelector('.splash-sound-toggle').click()`);
      }
      await waitForRenderer(
        window,
        `document.querySelector('.splash-sound-toggle').dataset.soundState === 'playing' && !window.loadingSoundFixture.players.at(-1).paused`,
      );
      assert.equal(
        await run(
          `window.loadingSoundFixture.players.at(-1).getAttribute('src')`,
        ),
        SOUNDTRACKS[theme],
      );
      assert.equal(
        await run(
          `window.loadingSoundFixture.players.filter(player => !player.paused).length`,
        ),
        1,
      );
      assert.equal(
        await run(`window.loadingSoundFixture.players.at(-1).loop`),
        true,
      );
      assert.equal(
        await run(`window.loadingSoundFixture.players.at(-1).volume`),
        0.22,
      );
      if (!firstMount) return;

      // Minimize / restore uses the real visibility subscription.
      await run(
        `Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'))`,
      );
      await waitForRenderer(
        window,
        `window.loadingSoundFixture.players.at(-1).paused`,
      );
      await run(
        `Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange'))`,
      );
      await waitForRenderer(
        window,
        `document.querySelector('.splash-sound-toggle').dataset.soundState === 'playing'`,
      );
      await run(
        `document.querySelector('.splash-sound-toggle').click(); window.loadingSoundFixture.blocked = true`,
      );
      await waitForRenderer(
        window,
        `document.querySelector('.splash-sound-toggle').dataset.soundState === 'muted'`,
      );
      await run(`document.querySelector('.splash-sound-toggle').click()`);
      await waitForRenderer(
        window,
        `document.querySelector('.splash-sound-toggle').dataset.soundState === 'blocked'`,
      );
      await run(
        `window.loadingSoundFixture.blocked = false; document.querySelector('.splash-sound-toggle').click()`,
      );
      await waitForRenderer(
        window,
        `document.querySelector('.splash-sound-toggle').dataset.soundState === 'playing'`,
      );
      await run(
        `window.loadingSoundFixture.players.at(-1).dispatchEvent(new Event('error'))`,
      );
      await waitForRenderer(
        window,
        `document.querySelector('.splash-sound-toggle').dataset.soundState === 'unavailable' && document.querySelector('.startup-splash')`,
      );
      await run(`document.querySelector('.splash-sound-toggle').click()`);
      await waitForRenderer(
        window,
        `document.querySelector('.splash-sound-toggle').dataset.soundState === 'playing'`,
      );
      await run(`document.querySelector('.splash-sound-toggle').click()`);
      await waitForRenderer(
        window,
        `window.loadingSoundFixture.players.at(-1).paused`,
      );
      assert.equal(
        await run(`localStorage.getItem(${JSON.stringify(SOUND_STORAGE_KEY)})`),
        'false',
      );
    },
    async switched(theme) {
      await waitForRenderer(
        window,
        `document.querySelector('.splash-sound-toggle')?.dataset.soundTheme === ${JSON.stringify(theme)} && document.querySelector('.splash-sound-toggle').dataset.soundState === 'playing'`,
      );
      assert.equal(
        await run(
          `window.loadingSoundFixture.players.at(-1).getAttribute('src')`,
        ),
        SOUNDTRACKS[theme],
      );
      assert.equal(
        await run(
          `window.loadingSoundFixture.players.filter(player => !player.paused).length`,
        ),
        1,
        'Only the current seasonal track plays after switching templates',
      );
      assert.equal(
        await run(
          `window.loadingSoundFixture.players.slice(0, -1).every(player => player.paused && player.getAttribute('src') === null)`,
        ),
        true,
      );
    },
    async stopped() {
      await waitForRenderer(
        window,
        `window.loadingSoundFixture.players.every(player => player.paused && player.getAttribute('src') === null)`,
      );
    },
    async finish() {
      await run(
        `window.Audio = window.loadingSoundFixture.OriginalAudio; delete window.loadingSoundFixture; delete document.hidden; localStorage.removeItem(${JSON.stringify(SOUND_STORAGE_KEY)})`,
      );
      window.webContents.setAudioMuted(wasMuted);
    },
  };
}

module.exports = { beginSeasonalAudioChecks };
