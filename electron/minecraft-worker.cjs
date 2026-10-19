const { parentPort, isMainThread } = require('node:worker_threads');
const { PatilanciMinecraftClient } = require('./minecraft-client.cjs');
const { terminate } = require('./game-process.cjs');

function runMinecraftWorker({ ClientClass = PatilanciMinecraftClient } = {}) {
  let child,
    started = false,
    cancelled = false,
    stopping = false;
  let progress, progressTimer;
  const post = (message) => parentPort.postMessage(message);
  function flushProgress() {
    clearTimeout(progressTimer);
    progressTimer = null;
    if (progress) {
      post({ type: 'progress', value: progress });
      progress = null;
    }
  }
  async function stop() {
    cancelled = true;
    if (!child) {
      post({ type: 'cancelled' });
      process.exit(0);
    }
    if (stopping) return;
    stopping = true;
    try {
      await terminate(child);
    } catch (error) {
      stopping = false;
      cancelled = false;
      post({ type: 'stopError', message: error.message });
    }
  }
  parentPort.on('message', async (message) => {
    if (message.type === 'stop') {
      await stop();
      return;
    }
    if (message.type !== 'launch' || started) return;
    started = true;
    const client = new ClientClass();
    client.on('data', (text) => post({ type: 'data', text }));
    client.on('progress', (value) => {
      progress = value;
      progressTimer ||= setTimeout(flushProgress, 100);
    });
    client.on('spawned', (process) => {
      child = process;
      if (Number.isInteger(child.pid))
        post({ type: 'spawned', pid: child.pid });
      if (cancelled) stop();
    });
    client.on('close', (code) => {
      flushProgress();
      post({ type: 'closed', code });
      process.exit(0);
    });
    try {
      const process = await client.launch(message.options);
      flushProgress();
      if (!process || !Number.isInteger(process.pid))
        throw new Error(
          'Minecraft could not start. Check the Java path in Settings.',
        );
      if (!cancelled) post({ type: 'ready' });
    } catch (error) {
      post({ type: 'launchError', message: error.message });
      if (child?.pid) await stop();
      else process.exit(1);
    }
  });
}

if (!isMainThread && require.main === module) runMinecraftWorker();
module.exports = { runMinecraftWorker };
