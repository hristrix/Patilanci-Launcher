const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const {
  createDiscordPresence,
  ipcPaths,
  frame,
} = require('../electron/discord-presence.cjs');
const tick = () => new Promise((resolve) => setImmediate(resolve));

function fixture({ failures = 0, ready = true } = {}) {
  const sockets = [],
    packets = [];
  class Socket extends EventEmitter {
    unref() {}
    write(bytes) {
      const opcode = bytes.readUInt32LE(0);
      assert.equal(bytes.length, 8 + bytes.readUInt32LE(4));
      const body = bytes.subarray(8);
      let value;
      try {
        value = JSON.parse(body);
      } catch {
        value = body.toString();
      }
      packets.push({ opcode, value });
      if (opcode === 0 && ready)
        queueMicrotask(() => {
          const bytes = frame(1, {
            cmd: 'DISPATCH',
            evt: 'READY',
            data: { user: { id: 'ignored-user' } },
          });
          this.emit('data', bytes.subarray(0, 3));
          this.emit('data', bytes.subarray(3));
        });
      if (opcode === 1 && value.cmd === 'SET_ACTIVITY')
        queueMicrotask(() => {
          if (!this.destroyed)
            this.emit(
              'data',
              frame(1, { cmd: 'SET_ACTIVITY', nonce: value.nonce }),
            );
        });
    }
    destroy() {
      if (!this.destroyed) {
        this.destroyed = true;
        this.emit('close');
      }
    }
    end(bytes) {
      this.write(bytes);
      this.destroy();
    }
  }
  return {
    sockets,
    packets,
    connect() {
      const socket = new Socket();
      sockets.push(socket);
      const failed = sockets.length <= failures;
      queueMicrotask(() =>
        failed
          ? socket.emit('error', new Error('Discord unavailable'))
          : socket.emit('connect'),
      );
      return socket;
    },
  };
}

test('Discord presence follows launcher, preparation and game lifecycle and clears on quit', async () => {
  const f = fixture();
  let clock = 100000;
  const presence = createDiscordPresence({
    applicationId: '1561729347394478172',
    connect: f.connect,
    now: () => clock,
    updateMs: 0,
  });
  try {
    presence.start();
    await tick();
    assert.equal(presence.state().connected, true);
    assert.deepEqual(f.packets[0].value, {
      v: 1,
      client_id: '1561729347394478172',
    });
    presence.setActivity('launching');
    await tick();
    clock = 130000;
    presence.setActivity('playing');
    await tick();
    clock = 160000;
    presence.setActivity('playing');
    await tick();
    presence.setActivity('launcher');
    await tick();
    const activities = f.packets
      .filter((packet) => packet.value.cmd === 'SET_ACTIVITY')
      .map((packet) => packet.value.args.activity);
    assert.deepEqual(
      activities.map((value) => value.details),
      [
        'In the launcher',
        'Starting Minecraft',
        'Playing Patilanci SMP',
        'In the launcher',
      ],
    );
    assert.deepEqual(
      activities.map((value) => value.timestamps.start),
      [100, 100, 130, 100],
    );
    assert.doesNotMatch(
      JSON.stringify(activities),
      /ignored-user|token|username|uuid/i,
    );
    presence.stop();
    assert.equal(f.packets.at(-1).value.args.activity, null);
    assert.equal(f.sockets[0].destroyed, true);
  } finally {
    presence.stop();
  }
});

test('Discord being absent, disconnecting or starting later never blocks the launcher', async () => {
  const f = fixture({ failures: 10 });
  const presence = createDiscordPresence({
    applicationId: '1561729347394478172',
    connect: f.connect,
    retryMs: 10,
    updateMs: 0,
  });
  try {
    presence.start();
    await tick();
    assert.equal(f.sockets.length, 10);
    assert.equal(presence.state().connected, false);
    presence.setActivity('playing');
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(presence.state().connected, true);
    assert.equal(
      f.packets.at(-1).value.args.activity.details,
      'Playing Patilanci SMP',
    );
    f.sockets.at(-1).destroy();
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(presence.state().connected, true);
  } finally {
    presence.stop();
  }
});

test('IPC handles ping, fragmented frames, bad lengths, and disabled configuration safely', async () => {
  const f = fixture();
  const presence = createDiscordPresence({
    applicationId: '1561729347394478172',
    connect: f.connect,
  });
  try {
    presence.start();
    await tick();
    f.sockets[0].emit('data', frame(3, Buffer.from('ping fixture')));
    assert.equal(f.packets.at(-1).opcode, 4);
    assert.equal(f.packets.at(-1).value, 'ping fixture');
    const oversized = Buffer.alloc(8);
    oversized.writeUInt32LE(1, 0);
    oversized.writeUInt32LE(1000000, 4);
    f.sockets[0].emit('data', oversized);
    assert.equal(f.sockets[0].destroyed, true);
  } finally {
    presence.stop();
  }
  const disabled = createDiscordPresence({
    applicationId: '',
    connect() {
      throw new Error('Should not connect');
    },
  });
  disabled.start();
  assert.equal(disabled.state().configured, false);
  disabled.stop();
  assert.equal(ipcPaths('win32')[0], '\\\\?\\pipe\\discord-ipc-0');
  assert.equal(
    ipcPaths('linux', { XDG_RUNTIME_DIR: '/run/user/1000' })[9],
    '/run/user/1000/discord-ipc-9',
  );
});
