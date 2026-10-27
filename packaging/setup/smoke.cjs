const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { buildSetup } = require('./build.cjs');

if (process.platform !== 'win32') {
  console.log('Native setup checks require Windows.');
  process.exit(0);
}
buildSetup();
const root = path.resolve(__dirname, '../..');
const executable = path.join(root, 'artifacts/setup-ui/PatilanciSetup.exe');
const fixture = fs.mkdtempSync(path.join(root, 'artifacts/setup-model-'));
function run(args) {
  const result = spawnSync(executable, args, {
    windowsHide: true,
    timeout: 20000,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `Native setup failed: ${args.join(' ')}`);
}
run(['--test-model', fixture]);
for (const screen of [
  'settings',
  'progress',
  'complete',
  'uninstall',
  'uninstall-progress',
  'uninstall-complete',
]) {
  const file = path.join(root, `artifacts/setup-${screen}.png`);
  run(['--preview', screen, file]);
  const png = fs.readFileSync(file);
  assert.equal(png.readUInt32BE(16), 1448);
  assert.equal(png.readUInt32BE(20), 1086);
}
const harness = path.join(root, 'artifacts/setup-tests');
fs.mkdirSync(harness, { recursive: true });
for (const file of fs.readdirSync(path.dirname(executable)))
  fs.copyFileSync(
    path.join(path.dirname(executable), file),
    path.join(harness, file),
  );
const framework = path.join(
  process.env.WINDIR || 'C:/Windows',
  'Microsoft.NET/Framework64/v4.0.30319',
);
const references = [
  'PresentationFramework',
  'PresentationCore',
  'WindowsBase',
].map((name) => `/reference:${path.join(framework, 'WPF', name + '.dll')}`);
references.push(`/reference:${path.join(framework, 'System.Xaml.dll')}`);
for (const name of ['BackendFixture', 'NativeFlowTests']) {
  const target = path.join(harness, name + '.exe');
  const compiled = spawnSync(
    path.join(framework, 'csc.exe'),
    [
      '/nologo',
      '/target:winexe',
      `/out:${target}`,
      `/reference:${path.join(framework, 'System.Core.dll')}`,
      `/reference:${path.join(harness, 'PatilanciSetup.exe')}`,
      ...references,
      path.join(__dirname, 'tests', name + '.cs'),
    ],
    { stdio: 'inherit' },
  );
  assert.equal(compiled.status, 0, `Could not build ${name}`);
}
const flows = fs.mkdtempSync(path.join(root, 'artifacts/setup-flows-'));
for (const kind of ['install', 'remove', 'failure', 'cancel']) {
  const state = path.join(flows, kind);
  const result = spawnSync(
    path.join(harness, 'NativeFlowTests.exe'),
    [state, kind],
    { windowsHide: true, timeout: 20000 },
  );
  if (result.status !== 0 && fs.existsSync(path.join(state, 'flow-error.txt')))
    console.error(fs.readFileSync(path.join(state, 'flow-error.txt'), 'utf8'));
  assert.equal(result.status, 0, `Native ${kind} flow failed`);
}
console.log(
  'Custom setup checks passed: six native screens; destination guards; Unicode paths; shortcut choices; installation/removal through an isolated child-process fixture; failure recovery; close-to-cancel before starting; close protection while busy; preservation of fixture game data. No real application or registry entry was changed.',
);
