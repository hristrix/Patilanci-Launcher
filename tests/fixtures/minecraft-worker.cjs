const { runMinecraftWorker } = require('../../electron/minecraft-worker.cjs');
const {
  PatilanciMinecraftClient,
} = require('../../electron/minecraft-client.cjs');
const { spawn } = require('node:child_process');
const { parentPort } = require('node:worker_threads');
class FixtureClient extends PatilanciMinecraftClient {
  constructor() {
    super({
      spawnGame: (executable, args, options) =>
        spawn(executable, args, {
          ...options,
          env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        }),
    });
  }
  async launch(options) {
    this.options = { javaPath: process.execPath, root: process.cwd() };
    this.emit('progress', { type: 'fixture', task: 1, total: 2 });
    if (options.wait)
      await new Promise((resolve) => setTimeout(resolve, options.wait));
    const until = Date.now() + (options.work || 0);
    if (options.work)
      parentPort.postMessage({
        type: 'progress',
        value: { type: 'fixture-busy' },
      });
    while (Date.now() < until) {
      /* Simulate synchronous library preparation. */
    }
    if (options.fail) throw new Error('Fixture launch failed');
    return this.startMinecraft([
      '-e',
      options.naturalExit
        ? 'console.log("fixture output"); console.error("fixture stderr");'
        : 'console.log("fixture output"); setInterval(() => {}, 1000); setTimeout(() => process.exit(0), 10000);',
    ]);
  }
}
runMinecraftWorker({ ClientClass: FixtureClient });
