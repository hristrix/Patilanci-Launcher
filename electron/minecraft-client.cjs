const { spawn } = require('node:child_process');
const { Client } = require('minecraft-launcher-core');

// MCLC's default spawn detaches Java and opens a Windows terminal. Keep its
// preparation/argument handling, but own the spawn so only our console appears.
class PatilanciMinecraftClient extends Client {
  constructor({ spawnGame = spawn } = {}) {
    super();
    this.spawnGame = spawnGame;
  }

  startMinecraft(launchArguments) {
    const child = this.spawnGame(
      this.options.javaPath || 'java',
      launchArguments,
      {
        cwd: this.options.overrides?.cwd || this.options.root,
        detached: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    child.stdout.on('data', (data) => this.emit('data', data.toString('utf8')));
    child.stderr.on('data', (data) => this.emit('data', data.toString('utf8')));
    child.once('error', (error) =>
      this.emit('data', `Minecraft process error: ${error.message}\n`),
    );
    child.once('close', (code) => this.emit('close', code));
    this.emit('spawned', child);
    return child;
  }
}

module.exports = { PatilanciMinecraftClient };
