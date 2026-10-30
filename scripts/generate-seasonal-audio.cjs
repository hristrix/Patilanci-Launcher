// Original, deterministic synthesis. No recorded samples or third-party music.
const fs = require('node:fs');
const path = require('node:path');

const SAMPLE_RATE = 22050;
const DURATION = 16;
const FRAMES = SAMPLE_RATE * DURATION;
const TAU = 2 * Math.PI;
const frequency = (midi) =>
  Math.round(440 * 2 ** ((midi - 69) / 12) * DURATION) / DURATION;

function renderSoundtrack(theme) {
  const left = new Float32Array(FRAMES);
  const right = new Float32Array(FRAMES);
  const melody = {
    halloween: [69, 76, 72, 75, 69, 67, 72, 64],
    christmas: [79, 83, 86, 88, 86, 83, 81, 79, 76, 79, 83, 86, 84, 83, 81, 79],
    newyear: [67, 71, 74, 79, 78, 74, 71, 74, 69, 73, 76, 81, 79, 76, 74, 71],
  }[theme];
  if (!melody) throw Error(`Unknown seasonal soundtrack: ${theme}`);
  let seed = 7281,
    wind = 0;
  for (let frame = 0; frame < FRAMES; frame++) {
    const time = frame / SAMPLE_RATE;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = (seed / 0x100000000) * 2 - 1;
    wind = wind * 0.985 + noise * 0.015;
    const base =
      theme === 'halloween'
        ? 0.035 *
            Math.sin(TAU * frequency(45) * time) *
            (1 + 0.2 * Math.sin((TAU * time) / 8)) +
          0.05 * wind
        : 0.015 *
          Math.sin(TAU * frequency(theme === 'christmas' ? 48 : 43) * time);
    let l = base,
      r = base;
    melody.forEach((note, index) => {
      const start = 0.25 + (index * DURATION) / melody.length;
      const age = (time - start + DURATION) % DURATION;
      if (age > 5) return;
      const hz = frequency(note);
      const envelope =
        (1 - Math.exp(-age * 55)) *
        Math.exp(-age * (theme === 'halloween' ? 1.25 : 1.8));
      const fundamental = Math.sin(TAU * hz * age);
      const bell =
        fundamental +
        0.26 * Math.sin(TAU * hz * 2.003 * age) * Math.exp(-age * 1.4) +
        0.09 * Math.sin(TAU * hz * 4.01 * age) * Math.exp(-age * 3);
      const sample = bell * envelope * 0.12;
      const pan = index % 2 ? 0.65 : 0.35;
      l += sample * Math.sqrt(1 - pan);
      r += sample * Math.sqrt(pan);
    });
    if (theme === 'newyear') {
      const age = (time + 1) % 4;
      const swell = (1 - Math.exp(-age * 16)) * Math.exp(-age * 3);
      const firework =
        (0.025 * Math.sin(TAU * 65 * age) + 0.025 * noise) * swell;
      l += firework;
      r += firework * 0.8;
    }
    const edge = Math.min(
      1,
      time / 0.04,
      (DURATION - time - 1 / SAMPLE_RATE) / 0.04,
    );
    left[frame] = l * Math.max(0, edge);
    right[frame] = r * Math.max(0, edge);
  }
  let peak = 0;
  for (let i = 0; i < FRAMES; i++)
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const wav = Buffer.alloc(44 + FRAMES * 4);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(SAMPLE_RATE * 4, 28);
  wav.writeUInt16LE(4, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(FRAMES * 4, 40);
  for (let i = 0; i < FRAMES; i++) {
    wav.writeInt16LE(Math.round((left[i] / peak) * 0.65 * 32767), 44 + i * 4);
    wav.writeInt16LE(Math.round((right[i] / peak) * 0.65 * 32767), 46 + i * 4);
  }
  return wav;
}

if (require.main === module) {
  const directory = path.resolve(__dirname, '../public/audio');
  fs.mkdirSync(directory, { recursive: true });
  for (const theme of ['halloween', 'christmas', 'newyear']) {
    const wav = renderSoundtrack(theme);
    fs.writeFileSync(path.join(directory, `${theme}-loading.wav`), wav);
    console.log(
      `Created ${theme}-loading.wav (${DURATION}s, stereo PCM, ${wav.length} bytes)`,
    );
  }
}
module.exports = { renderSoundtrack };
