const net = require('node:net');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function ipcPaths(platform = process.platform, env = process.env) {
  const directory =
    env.XDG_RUNTIME_DIR || env.TMPDIR || env.TMP || env.TEMP || '/tmp';
  return Array.from({ length: 10 }, (_, index) =>
    platform === 'win32'
      ? `\\\\?\\pipe\\discord-ipc-${index}`
      : path.posix.join(directory, `discord-ipc-${index}`),
  );
}
function frame(opcode, data) {
  const body = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data));
  const output = Buffer.alloc(8 + body.length);
  output.writeUInt32LE(opcode, 0);
  output.writeUInt32LE(body.length, 4);
  body.copy(output, 8);
  return output;
}
function activity(mode, started, imageKey) {
  const result = {
    type: 0,
    details:
      mode === 'playing'
        ? 'Playing Patilanci SMP'
        : mode === 'launching'
          ? 'Starting Minecraft'
          : 'In the launcher',
    state:
      mode === 'playing'
        ? 'Minecraft Java Edition'
        : mode === 'launching'
          ? 'Patilanci SMP'
          : 'Ready for Patilanci SMP',
    timestamps: { start: started },
    instance: false,
  };
  if (imageKey)
    result.assets = { large_image: imageKey, large_text: 'Patilanci SMP' };
  return result;
}

// Discord's local, documented IPC protocol. No Discord account authentication,
// external HTTP requests, or access to messages/friends are needed for presence.
function createDiscordPresence({
  applicationId,
  imageKey = '',
  paths = ipcPaths(),
  connect = net.createConnection,
  now = Date.now,
  retryMs = 15000,
  connectMs = 2000,
  updateMs = 5000,
} = {}) {
  let stopped = true,
    socket,
    connected = false,
    mode = 'launcher';
  const launcherStarted = Math.floor(now() / 1000);
  let started = launcherStarted,
    revision = 0,
    published = -1;
  let retryTimer,
    connectTimer,
    updateTimer,
    ackTimer,
    pending,
    lastSent = -Infinity;
  function cancelTimers() {
    clearTimeout(retryTimer);
    clearTimeout(connectTimer);
    clearTimeout(updateTimer);
    clearTimeout(ackTimer);
  }
  function publish() {
    if (stopped || !connected || pending || published === revision || !socket)
      return;
    const delay = updateMs - (now() - lastSent);
    if (delay > 0) {
      clearTimeout(updateTimer);
      updateTimer = setTimeout(publish, delay);
      updateTimer.unref?.();
      return;
    }
    pending = randomUUID();
    published = revision;
    lastSent = now();
    try {
      socket.write(
        frame(1, {
          cmd: 'SET_ACTIVITY',
          nonce: pending,
          args: {
            pid: process.pid,
            activity: activity(mode, started, imageKey),
          },
        }),
      );
    } catch {
      socket.destroy();
      return;
    }
    ackTimer = setTimeout(() => socket?.destroy(), connectMs);
    ackTimer.unref?.();
  }
  function attempt(index = 0) {
    if (stopped) return;
    if (index >= paths.length) {
      retryTimer = setTimeout(() => attempt(0), retryMs);
      retryTimer.unref?.();
      return;
    }
    let candidate;
    try {
      candidate = connect({ path: paths[index] });
    } catch {
      attempt(index + 1);
      return;
    }
    socket = candidate;
    candidate.unref?.();
    let buffer = Buffer.alloc(0),
      wasReady = false;
    connectTimer = setTimeout(() => candidate.destroy(), connectMs);
    connectTimer.unref?.();
    candidate.once('connect', () => {
      if (stopped) {
        candidate.destroy();
        return;
      }
      candidate.write(frame(0, { v: 1, client_id: applicationId }));
    });
    candidate.on('data', (chunk) => {
      if (stopped || socket !== candidate) return;
      if (buffer.length + chunk.length > 128 * 1024) {
        candidate.destroy();
        return;
      }
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 8) {
        const opcode = buffer.readUInt32LE(0),
          length = buffer.readUInt32LE(4);
        if (length > 64 * 1024) {
          candidate.destroy();
          return;
        }
        if (buffer.length < 8 + length) break;
        const body = buffer.subarray(8, 8 + length);
        buffer = buffer.subarray(8 + length);
        if (opcode === 3) {
          candidate.write(frame(4, body));
          continue;
        }
        if (opcode === 4) continue;
        if (opcode === 2) {
          candidate.destroy();
          return;
        }
        let message;
        try {
          message = JSON.parse(body.toString('utf8'));
        } catch {
          candidate.destroy();
          return;
        }
        if (opcode !== 1) continue;
        if (message.evt === 'READY') {
          clearTimeout(connectTimer);
          connected = wasReady = true;
          published = -1;
          lastSent = -Infinity;
          publish();
        } else if (message.evt === 'ERROR') {
          candidate.destroy();
          return;
        } else if (message.nonce === pending) {
          pending = null;
          clearTimeout(ackTimer);
          publish();
        }
      }
    });
    candidate.on('error', () => candidate.destroy());
    candidate.once('close', () => {
      if (socket !== candidate) return;
      connected = false;
      pending = null;
      socket = null;
      clearTimeout(connectTimer);
      clearTimeout(ackTimer);
      clearTimeout(updateTimer);
      if (stopped) return;
      if (wasReady) {
        retryTimer = setTimeout(() => attempt(0), retryMs);
        retryTimer.unref?.();
      } else attempt(index + 1);
    });
  }
  return {
    start() {
      if (!stopped || !/^[0-9]{16,22}$/.test(applicationId || '')) return;
      stopped = false;
      attempt();
    },
    setActivity(value) {
      if (
        !['launcher', 'launching', 'playing'].includes(value) ||
        value === mode
      )
        return;
      mode = value;
      started = mode === 'playing' ? Math.floor(now() / 1000) : launcherStarted;
      revision++;
      publish();
    },
    stop() {
      stopped = true;
      connected = false;
      cancelTimers();
      const previous = socket;
      socket = null;
      pending = null;
      if (previous) {
        try {
          previous.end(
            frame(1, {
              cmd: 'SET_ACTIVITY',
              nonce: randomUUID(),
              args: { pid: process.pid, activity: null },
            }),
          );
        } catch {
          previous.destroy();
        }
        const timer = setTimeout(() => previous.destroy(), 200);
        timer.unref?.();
      }
    },
    state: () => ({
      connected,
      configured: /^[0-9]{16,22}$/.test(applicationId || ''),
      mode,
    }),
  };
}

module.exports = { createDiscordPresence, ipcPaths, frame, activity };
