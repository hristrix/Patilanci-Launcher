const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { startMinecraftService } = require('../electron/minecraft-service.cjs');
const { createGameProcess } = require('../electron/game-process.cjs');
const { EventEmitter } = require('node:events');
const workerPath = path.join(__dirname, 'fixtures/minecraft-worker.cjs');

test('a worker crash retains process tracking if cleanup fails and allows stop to retry', async () => {
  let worker,
    service,
    attempts = 0;
  class FixtureWorker extends EventEmitter {
    constructor() {
      super();
      worker = this;
    }
    postMessage(message) {
      if (message.type === 'launch')
        queueMicrotask(() => {
          this.emit('message', { type: 'spawned', pid: 123 });
          this.emit('message', { type: 'ready' });
        });
    }
  }
  const game = createGameProcess({ kill: () => service.stop() });
  service = startMinecraftService(
    {},
    {
      WorkerClass: FixtureWorker,
      onSpawn: (child) => game.track(child),
      terminateChild: async () => {
        if (++attempts === 1) throw new Error('Fixture kill denied');
      },
    },
  );
  await service.ready;
  worker.emit('error', new Error('Fixture worker crash'));
  worker.emit('exit', 1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(game.state().running, true);
  await game.stop();
  await service.done;
  assert.equal(game.state().running, false);
  assert.equal(attempts, 2);
});

test(
  'the production worker exits cleanly when the Java executable is missing',
  { timeout: 15000 },
  async () => {
    const service = startMinecraftService({
      javaPath: path.join(__dirname, 'missing-fixture-java'),
      root: __dirname,
    });
    await assert.rejects(service.ready, /exited|could not start/);
    await service.done;
  },
);

test(
  'synchronous preparation runs off-thread and a stopped background game is tracked until exit',
  { timeout: 15000 },
  async () => {
    let output = '',
      ready = false,
      service;
    let started;
    const preparing = new Promise((resolve) => {
      started = resolve;
    });
    const game = createGameProcess({ kill: () => service.stop() });
    service = startMinecraftService(
      { work: 500 },
      {
        workerPath,
        onData: (text) => {
          output += text;
        },
        onSpawn: (child) => game.track(child),
        onProgress: (value) => {
          if (value.type === 'fixture-busy') started();
        },
      },
    );
    service.ready.then(() => {
      ready = true;
    });
    try {
      await preparing;
      await new Promise((resolve) => setTimeout(resolve, 30));
      assert.equal(
        ready,
        false,
        'The main event loop runs while preparation is busy',
      );
      await service.ready;
      assert.equal(game.state().running, true);
      await game.stop();
      assert.equal(game.state().running, false);
    } finally {
      await service.stop();
    }
  },
);

test(
  'cancelling during synchronous preparation also stops a process spawned before cancellation is handled',
  { timeout: 15000 },
  async () => {
    let started, child;
    const preparing = new Promise((resolve) => {
      started = resolve;
    });
    const service = startMinecraftService(
      { work: 300 },
      {
        workerPath,
        onProgress: (value) => {
          if (value.type === 'fixture-busy') started();
        },
        onSpawn: (process) => {
          child = process;
        },
      },
    );
    await preparing;
    await service.stop();
    await assert.rejects(service.ready, /cancelled/);
    if (child) assert.throws(() => process.kill(child.pid, 0));
  },
);

test(
  'closing during preparation cancels before Java can appear later',
  { timeout: 15000 },
  async () => {
    let spawned = false;
    const service = startMinecraftService(
      { wait: 1000 },
      {
        workerPath,
        onSpawn: () => {
          spawned = true;
        },
      },
    );
    await service.stop();
    await assert.rejects(service.ready, /cancelled/);
    assert.equal(spawned, false);
  },
);

test(
  'natural game exit preserves final output and failed launches release the worker',
  { timeout: 15000 },
  async () => {
    let output = '',
      closed = 0;
    const service = startMinecraftService(
      { naturalExit: true },
      {
        workerPath,
        onData: (text) => {
          output += text;
        },
        onClose: () => {
          closed++;
        },
      },
    );
    await service.ready;
    await service.done;
    assert.match(output, /fixture output/);
    assert.match(output, /fixture stderr/);
    assert.equal(closed, 1);
    const failed = startMinecraftService({ fail: true }, { workerPath });
    await assert.rejects(failed.ready, /Fixture launch failed/);
    await failed.done;
  },
);
