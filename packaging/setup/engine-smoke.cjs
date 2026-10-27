// An optional real NSIS round trip with a separate application identity and
// shortcut names. Never run the production installer against a user's setup.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { build, Platform, Arch } = require('electron-builder');
const base = require('../electron-builder.cjs');
const { buildSetup } = require('./build.cjs');

async function main() {
  assert.equal(process.platform, 'win32', 'The engine check requires Windows');
  const root = path.resolve(__dirname, '../..');
  buildSetup();
  const directory = fs.mkdtempSync(
    path.join(root, 'artifacts/setup-engine-flow-'),
  );
  const application = path.resolve(directory, 'app');
  assert.ok(application.startsWith(path.resolve(root, 'artifacts') + path.sep));
  assert.equal(path.dirname(application), directory);
  assert.equal(fs.existsSync(application), false);
  const state = path.join(directory, 'state');
  fs.mkdirSync(state);
  fs.writeFileSync(
    path.join(state, 'options.ini'),
    '[setup]\r\ndesktop=0\r\nstartMenu=0\r\n',
  );
  process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
  const product = 'Patilanci Setup Fixture';
  const artifacts = await build({
    targets: Platform.WINDOWS.createTarget('nsis', Arch.x64),
    config: {
      ...base,
      extends: null,
      appId: 'com.patilanci.launcher.setup-fixture',
      productName: product,
      executableName: product,
      compression: 'store',
      publish: null,
      directories: {
        ...base.directories,
        output: path.join(directory, 'package'),
      },
      nsis: {
        ...base.nsis,
        artifactName: 'SetupFixture.exe',
        shortcutName: product,
        menuCategory: product,
      },
    },
    publish: 'never',
  });
  const installer = artifacts.find((file) => file.endsWith('.exe'));
  assert.ok(installer);
  function run(file, action, tail) {
    fs.rmSync(path.join(state, 'progress.ini'), { force: true });
    const result = spawnSync(
      file,
      [
        '/S',
        '/currentuser',
        `--patilanci-state="${state}"`,
        `--patilanci-action=${action}`,
        tail,
      ],
      {
        windowsHide: true,
        windowsVerbatimArguments: true,
        timeout: 120000,
      },
    );
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `NSIS ${action} failed`);
    const progress = fs.readFileSync(path.join(state, 'progress.ini'));
    const content =
      progress[0] === 0xff
        ? progress.toString('utf16le')
        : progress.toString('utf8');
    assert.match(
      content,
      /complete=1/,
      `NSIS ${action} did not report success to the UI`,
    );
  }
  run(installer, 'install', `/D=${application}`);
  assert.ok(fs.existsSync(path.join(application, product + '.exe')));
  const removalEngine = path.join(state, 'RemovalFixture.exe');
  fs.copyFileSync(
    path.join(application, 'Uninstall ' + product + '.exe'),
    removalEngine,
  );
  run(removalEngine, 'uninstall', `_?=${application}`);
  assert.equal(fs.existsSync(path.join(application, product + '.exe')), false);
  console.log(
    'Real NSIS install/uninstall round trip passed with a separate fixture identity, workspace-contained target, both shortcuts disabled, and UI completion markers.',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
