const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { build, Platform, Arch } = require('electron-builder');
const baseConfig = require('./electron-builder.cjs');

const root = path.resolve(__dirname, '..');
const mode = process.argv[2];
const modes = new Set(['preview', 'installer', 'store', 'store-preview']);

function runNode(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${script} failed.`);
}

function storeIdentity(preview) {
  if (preview) {
    return {
      identityName: 'Patilanci.Launcher.Preview',
      publisher: 'CN=PatilanciPreview',
      publisherDisplayName: 'Patilanci Preview',
    };
  }

  const identityFile = path.join(__dirname, 'store-identity.json');
  if (!fs.existsSync(identityFile)) {
    throw new Error(
      'Reserve the app in Partner Center, copy packaging/store-identity.example.json to packaging/store-identity.json, and enter its exact identity values.',
    );
  }

  const identity = JSON.parse(fs.readFileSync(identityFile, 'utf8'));
  for (const field of ['identityName', 'publisher', 'publisherDisplayName']) {
    if (typeof identity[field] !== 'string' || !identity[field].trim()) {
      throw new Error(`Partner Center identity is missing ${field}.`);
    }
    if (/[<>&"']/.test(identity[field])) {
      throw new Error(`Unsupported XML characters in ${field}.`);
    }
  }
  if (!/^[A-Za-z0-9.-]{3,50}$/.test(identity.identityName)) {
    throw new Error(
      'identityName must be the package name assigned by Partner Center; it cannot contain spaces. The display name remains Patilanci Launcher.',
    );
  }
  if (!identity.publisher.startsWith('CN=')) {
    throw new Error('publisher must match the CN= value from Partner Center.');
  }
  return {
    identityName: identity.identityName,
    publisher: identity.publisher,
    publisherDisplayName: identity.publisherDisplayName,
  };
}

async function main() {
  if (!modes.has(mode))
    throw new Error('Choose preview, installer, store, or store-preview.');

  const preview = mode.includes('preview');
  const store = mode.startsWith('store');
  const identity = store ? storeIdentity(preview) : null;
  const sign =
    !preview &&
    !store &&
    Boolean(process.env.CSC_LINK?.trim() || process.env.WIN_CSC_LINK?.trim());
  if (!sign) {
    process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
    delete process.env.CSC_LINK;
    delete process.env.WIN_CSC_LINK;
  }

  // Preview packages exercise the installer without claiming release readiness.
  if (preview) {
    console.warn(
      'PREVIEW: unsigned test package; not for Store submission or player distribution.',
    );
  } else {
    runNode('electron/check-download-service.cjs');
  }

  const environment = { ...process.env };
  delete environment.ELECTRON_RUN_AS_NODE;
  const artwork = spawnSync(
    require('electron'),
    ['packaging/generate-artwork.cjs', '--disable-gpu'],
    { cwd: root, env: environment, stdio: 'inherit' },
  );
  if (artwork.error) throw artwork.error;
  if (artwork.status !== 0)
    throw new Error('Installer artwork generation failed.');
  if (!store) runNode('packaging/setup/build.cjs');
  runNode('node_modules/vite/bin/vite.js', ['build']);

  const config = {
    ...baseConfig,
    extends: null,
    forceCodeSigning: sign,
    ...(preview || store ? { publish: null } : {}),
    directories: {
      ...baseConfig.directories,
      output: `release/${preview ? 'preview' : 'production'}/${store ? 'store' : 'installer'}`,
    },
    nsis: {
      ...baseConfig.nsis,
      ...(preview && {
        artifactName:
          'Patilanci-Launcher-PREVIEW-Setup-${version}-${arch}.${ext}',
      }),
    },
    appx: {
      ...baseConfig.appx,
      ...identity,
      ...(preview && {
        artifactName:
          'Patilanci-Launcher-PREVIEW-Store-${version}-${arch}.${ext}',
      }),
    },
    ...(preview && { extraMetadata: { patilanciPreview: true } }),
    // Store packages are submitted unsigned; Microsoft signs accepted packages.
    ...(store && { win: { ...baseConfig.win, signtoolOptions: undefined } }),
  };

  const artifacts = await build({
    targets: Platform.WINDOWS.createTarget(store ? 'appx' : 'nsis', Arch.x64),
    config,
    publish: 'never',
  });
  if (sign) {
    if (process.platform !== 'win32')
      throw new Error(
        'Verify production Windows signatures on a Windows build runner.',
      );
    const version = require('../package.json').version;
    const output = path.join(root, config.directories.output);
    const verification = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        path.join(__dirname, 'verify-signatures.ps1'),
        '-InstallerPath',
        path.join(output, `Patilanci-Launcher-Setup-${version}-x64.exe`),
        '-LauncherPath',
        path.join(output, 'win-unpacked', 'Patilanci Launcher.exe'),
      ],
      { cwd: root, stdio: 'inherit' },
    );
    if (verification.error) throw verification.error;
    if (verification.status !== 0)
      throw new Error(
        'Production artifacts failed Windows signature verification.',
      );
  }
  for (const artifact of artifacts) console.log(`Created: ${artifact}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
