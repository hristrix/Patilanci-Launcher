const path = require('node:path');
const { Worker } = require('node:worker_threads');
const { EventEmitter } = require('node:events');
const { terminate } = require('./game-process.cjs');

function startMinecraftService(
  options,
  {
    WorkerClass = Worker,
    workerPath = path.join(__dirname, 'minecraft-worker.cjs'),
    terminateChild = terminate,
    onData = () => {},
    onProgress = () => {},
    onSpawn = () => {},
    onClose = () => {},
  } = {},
) {
  const worker = new WorkerClass(workerPath);
  let child,
    ended = false,
    stopping = false,
    readySettled = false,
    stopFailure;
  let workerExited = false,
    stopPromise;
  let resolveReady, rejectReady, resolveDone, rejectStop;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  // Cancellation can arrive before the caller begins awaiting launch completion.
  ready.catch(() => {});
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });
  function fail(message) {
    if (!readySettled) {
      readySettled = true;
      rejectReady(new Error(message));
    }
  }
  function finish(code) {
    if (ended) return;
    ended = true;
    if (child) {
      child.exitCode = code;
      child.emit('exit', code);
      child.emit('close', code);
    }
    fail(
      stopping
        ? 'Minecraft launch cancelled.'
        : 'Minecraft exited before it could start.',
    );
    onClose(code);
  }
  worker.on('message', (message) => {
    if (message.type === 'data') onData(message.text);
    if (message.type === 'progress') onProgress(message.value);
    if (message.type === 'spawned' && !child) {
      child = Object.assign(new EventEmitter(), {
        pid: message.pid,
        exitCode: null,
        signalCode: null,
        kill(signal) {
          return process.kill(message.pid, signal);
        },
      });
      onSpawn(child);
    }
    if (message.type === 'ready' && child && !stopping && !readySettled) {
      readySettled = true;
      resolveReady(child);
    }
    if (message.type === 'launchError') fail(message.message);
    if (message.type === 'cancelled') fail('Minecraft launch cancelled.');
    if (message.type === 'closed') finish(message.code);
    if (message.type === 'stopError') {
      stopping = false;
      stopFailure = new Error(message.message);
      rejectStop?.(stopFailure);
    }
  });
  worker.on('error', (error) => fail(error.message));
  worker.on('exit', async (code) => {
    workerExited = true;
    // If a worker crashes with Java alive, stop that exact process tree before
    // reporting completion. Never leave an untracked Minecraft process behind.
    if (!ended && child) {
      try {
        await terminateChild(child);
      } catch (error) {
        stopFailure = error;
        fail(error.message);
        onData(`Minecraft could not be stopped: ${error.message}\n`);
        rejectStop?.(error);
        return;
      }
    }
    finish(code);
    resolveDone();
  });
  try {
    worker.postMessage({ type: 'launch', options });
  } catch (error) {
    fail(error.message);
    worker.terminate();
  }
  return {
    ready,
    done,
    stop() {
      if (ended) return done;
      if (stopPromise) return stopPromise;
      stopping = true;
      stopFailure = null;
      if (workerExited) {
        stopPromise = terminateChild(child)
          .then(() => {
            finish(1);
            resolveDone();
          })
          .finally(() => {
            stopPromise = null;
          });
      } else {
        const failed = new Promise((_, reject) => {
          rejectStop = reject;
        });
        stopPromise = Promise.race([done, failed])
          .then(() => {
            if (stopFailure) throw stopFailure;
          })
          .finally(() => {
            stopPromise = null;
          });
        worker.postMessage({ type: 'stop' });
      }
      return stopPromise;
    },
  };
}

module.exports = { startMinecraftService };
