const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createGameProcess } = require('../electron/game-process.cjs');

function processFixture(pid = 123) {
  return Object.assign(new EventEmitter(), {
    pid,
    exitCode: null,
    signalCode: null,
  });
}

test('stop targets only the tracked Minecraft process and blocks relaunch until exit', async () => {
  const states = [];
  const child = processFixture();
  const killed = [];
  const game = createGameProcess({
    onChange: (state) => states.push(state),
    kill: async (target) => killed.push(target),
  });
  assert.deepEqual(game.state(), { running: false, stopping: false });
  await game.stop();
  assert.deepEqual(killed, []);
  game.track(child);
  await game.stop();
  await game.stop();
  assert.deepEqual(killed, [child]);
  assert.deepEqual(game.state(), { running: true, stopping: true });
  assert.throws(() => game.track(processFixture(456)), /already running/);
  child.emit('exit', 0);
  assert.deepEqual(game.state(), { running: false, stopping: false });
  const next = processFixture(456);
  game.track(next);
  child.emit('close', 0);
  assert.equal(
    game.state().running,
    true,
    'A previous process cannot clear the next process',
  );
  next.emit('close', 0);
  assert.equal(game.state().running, false);
});

test('failed stops keep Minecraft marked running and can be retried', async () => {
  const child = processFixture();
  let attempts = 0;
  const game = createGameProcess({
    kill: async () => {
      attempts++;
      if (attempts === 1) throw new Error('Access denied');
      child.emit('exit', 0);
    },
  });
  game.track(child);
  await assert.rejects(game.stop(), /could not be stopped/);
  assert.deepEqual(game.state(), { running: true, stopping: false });
  await game.stop();
  assert.deepEqual(game.state(), { running: false, stopping: false });
});

test('a natural exit restores Play and an already exited process cannot be tracked', () => {
  const game = createGameProcess();
  const child = processFixture();
  game.track(child);
  child.emit('exit', 0);
  assert.equal(game.state().running, false);
  assert.throws(
    () => game.track({ ...processFixture(), exitCode: 1 }),
    /exited/,
  );
});
