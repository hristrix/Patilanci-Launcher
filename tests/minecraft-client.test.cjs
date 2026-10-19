const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter, once } = require('node:events');
const {
  PatilanciMinecraftClient,
} = require('../electron/minecraft-client.cjs');
const { createGameProcess } = require('../electron/game-process.cjs');

test('Java launches without a native terminal while retaining output, errors and process tracking', () => {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.pid = 123;
  const args = ['--username', 'Fixture Player', '--gameDir', 'C:\\Game Folder'];
  const client = new PatilanciMinecraftClient({
    spawnGame(executable, actualArgs, options) {
      assert.equal(executable, 'C:\\Program Files\\Java\\bin\\java.exe');
      assert.equal(actualArgs, args);
      assert.equal(options.cwd, 'C:\\Game Folder');
      assert.equal(options.detached, false);
      assert.equal(options.windowsHide, true);
      assert.deepEqual(options.stdio, ['ignore', 'pipe', 'pipe']);
      assert.ok(!options.shell);
      return child;
    },
  });
  client.options = {
    javaPath: 'C:\\Program Files\\Java\\bin\\java.exe',
    root: 'C:\\Game Folder',
  };
  const output = [];
  let exitCode;
  client.on('data', (text) => output.push(text));
  client.on('close', (code) => {
    exitCode = code;
  });
  const game = createGameProcess();
  game.track(client.startMinecraft(args));
  assert.equal(game.state().running, true);
  child.stdout.emit('data', Buffer.from('Game output\n'));
  child.stderr.emit('data', Buffer.from('Game error\n'));
  child.emit('error', new Error('Java could not start'));
  child.emit('close', 1);
  assert.deepEqual(output, [
    'Game output\n',
    'Game error\n',
    'Minecraft process error: Java could not start\n',
  ]);
  assert.equal(exitCode, 1);
  assert.equal(game.state().running, false);
});

test('real child stdout and stderr reach the game console without a shell', async () => {
  const client = new PatilanciMinecraftClient();
  client.options = { javaPath: process.execPath, root: process.cwd() };
  let output = '';
  client.on('data', (chunk) => {
    output += chunk;
  });
  const closed = once(client, 'close');
  client.startMinecraft([
    '-e',
    'console.log("stdout fixture"); console.error("stderr fixture");',
  ]);
  assert.deepEqual(await closed, [0]);
  assert.match(output, /stdout fixture/);
  assert.match(output, /stderr fixture/);
});
