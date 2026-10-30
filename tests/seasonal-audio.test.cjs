const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const audioModule = import('../src/lib/seasonal-audio.mjs');

class FakeAudio extends EventTarget {
  constructor() {
    super();
    this.paused = true;
    this.starts = 0;
    this.stops = 0;
    this.loads = 0;
  }
  play() {
    this.starts++;
    this.paused = false;
    return this.handler?.() || Promise.resolve();
  }
  pause() {
    this.stops++;
    this.paused = true;
  }
  removeAttribute(name) {
    if (name === 'src') this.sourceRemoved = true;
  }
  load() {
    this.loads++;
  }
}

test('seasonal WAVs are distinct stereo loops, with audible content, safe peaks and silent edges', async () => {
  const { SOUNDTRACKS } = await audioModule;
  const hashes = new Set();
  assert.equal(SOUNDTRACKS.original, undefined);
  for (const source of Object.values(SOUNDTRACKS)) {
    const wav = fs.readFileSync(path.join(__dirname, '../public', source));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.toString('ascii', 8, 16), 'WAVEfmt ');
    assert.equal(wav.readUInt16LE(20), 1);
    assert.equal(wav.readUInt16LE(22), 2);
    assert.equal(wav.readUInt32LE(24), 22050);
    assert.equal(wav.readUInt16LE(34), 16);
    assert.equal(wav.length, 44 + 16 * 22050 * 4);
    assert.equal(wav.readUInt32LE(40), wav.length - 44);
    let peak = 0,
      energy = 0;
    for (let index = 44; index < wav.length; index += 2) {
      const value = wav.readInt16LE(index) / 32767;
      peak = Math.max(peak, Math.abs(value));
      energy += value * value;
    }
    assert.ok(peak > 0.6 && peak < 0.66, `Bounded peak for ${source}`);
    assert.ok(
      Math.sqrt(energy / ((wav.length - 44) / 2)) > 0.02,
      `Audible loop for ${source}`,
    );
    assert.equal(wav.readInt16LE(44), 0);
    assert.equal(wav.readInt16LE(wav.length - 2), 0);
    hashes.add(crypto.createHash('sha256').update(wav).digest('hex'));
  }
  assert.equal(hashes.size, 3);
});

test('sound preference defaults to enabled and tolerates unavailable storage', async () => {
  const { readSoundEnabled } = await audioModule;
  assert.equal(readSoundEnabled({ getItem: () => 'false' }), false);
  for (const value of [null, 'true', 'invalid'])
    assert.equal(readSoundEnabled({ getItem: () => value }), true);
  assert.equal(
    readSoundEnabled({
      getItem() {
        throw Error('Denied');
      },
    }),
    true,
  );
});

test('play requests coalesce, use quiet looping audio, and dispose all playback resources', async () => {
  const { createLoadingSound } = await audioModule;
  const audio = new FakeAudio(),
    states = [];
  const player = createLoadingSound({
    source: 'test.wav',
    createAudio: () => audio,
    onState: (value) => states.push(value),
  });
  assert.equal(audio.volume, 0.22);
  assert.equal(audio.loop, true);
  await Promise.all([player.play(), player.play()]);
  assert.equal(audio.starts, 1);
  assert.equal(states.at(-1), 'playing');
  player.pause();
  assert.equal(audio.paused, true);
  assert.equal(states.at(-1), 'idle');
  await player.play();
  assert.equal(audio.starts, 2);
  player.dispose();
  player.dispose();
  await player.play();
  assert.equal(audio.paused, true);
  assert.equal(audio.sourceRemoved, true);
  assert.equal(audio.loads, 1);
  const count = states.length;
  audio.dispatchEvent(new Event('error'));
  assert.equal(states.length, count);
});

test('a pending play cannot resurrect muted or disposed audio', async () => {
  const { createLoadingSound } = await audioModule;
  for (const operation of ['pause', 'dispose']) {
    const audio = new FakeAudio(),
      states = [];
    let finish;
    audio.handler = () =>
      new Promise((resolve) => {
        finish = () => {
          audio.paused = false;
          resolve();
        };
      });
    const player = createLoadingSound({
      source: 'test.wav',
      createAudio: () => audio,
      onState: (value) => states.push(value),
    });
    const pending = player.play();
    player[operation]();
    finish();
    await pending;
    assert.equal(audio.paused, true);
    assert.equal(states.includes('playing'), false);
  }
});

test('a media error cannot be overwritten by a pending successful play result', async () => {
  const { createLoadingSound } = await audioModule;
  const audio = new FakeAudio(),
    states = [];
  let finish;
  audio.handler = () =>
    new Promise((resolve) => {
      finish = () => {
        audio.paused = false;
        resolve();
      };
    });
  const player = createLoadingSound({
    source: 'test.wav',
    createAudio: () => audio,
    onState: (value) => states.push(value),
  });
  const pending = player.play();
  audio.dispatchEvent(new Event('error'));
  finish();
  await pending;
  assert.equal(audio.paused, true);
  assert.equal(states.at(-1), 'unavailable');
  player.dispose();
});

test('blocked autoplay and media failures stay recoverable without throwing into startup', async () => {
  const { createLoadingSound } = await audioModule;
  const audio = new FakeAudio(),
    states = [];
  audio.handler = () => {
    audio.paused = true;
    return Promise.reject(
      Object.assign(Error('Gesture required'), { name: 'NotAllowedError' }),
    );
  };
  const player = createLoadingSound({
    source: 'test.wav',
    createAudio: () => audio,
    onState: (value) => states.push(value),
  });
  await player.play();
  assert.equal(states.at(-1), 'blocked');
  audio.handler = null;
  await player.play();
  assert.equal(states.at(-1), 'playing');
  audio.dispatchEvent(new Event('error'));
  assert.equal(audio.paused, true);
  assert.equal(states.at(-1), 'unavailable');
  audio.handler = () => {
    audio.paused = true;
    throw Error('Missing device');
  };
  await player.play();
  assert.equal(states.at(-1), 'unavailable');
  player.dispose();
});
