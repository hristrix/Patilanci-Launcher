const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execute = promisify(execFile);

async function terminate(child) {
  if (process.platform === 'win32') {
    await execute('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      windowsHide: true,
    });
  } else if (!child.kill('SIGTERM')) {
    throw new Error(
      'Minecraft could not be stopped. Close its game window and try again.',
    );
  }
}

function createGameProcess({ onChange = () => {}, kill = terminate } = {}) {
  let child = null;
  let stopping = false;
  const state = () => ({ running: Boolean(child), stopping });
  function track(process) {
    if (child) throw new Error('Minecraft is already running.');
    if (
      !Number.isInteger(process?.pid) ||
      process.exitCode != null ||
      process.signalCode != null
    )
      throw new Error('Minecraft exited before it could start.');
    child = process;
    stopping = false;
    const finish = () => {
      if (child !== process) return;
      child = null;
      stopping = false;
      onChange(state());
    };
    process.once('exit', finish);
    process.once('close', finish);
    onChange(state());
  }
  async function stop() {
    if (!child || stopping) return state();
    const target = child;
    stopping = true;
    onChange(state());
    try {
      await kill(target);
    } catch (error) {
      if (child === target) {
        stopping = false;
        onChange(state());
        throw new Error(
          'Minecraft could not be stopped. Close its game window and try again.',
          { cause: error },
        );
      }
    }
    // Keep Play blocked until the actual process emits exit/close.
    return state();
  }
  return { state, track, stop };
}

module.exports = { createGameProcess };
