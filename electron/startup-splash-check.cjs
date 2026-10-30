const assert = require('node:assert/strict');
const { version } = require('../package.json');

async function checkStartupSplash(window, { waitForRenderer, capture }) {
  const run = (script) => window.webContents.executeJavaScript(script);
  const state = {
    status: 'checking',
    phase: 'modpack',
    launcher: { status: 'current' },
    account: { status: 'signed-out' },
    steps: {
      launcher: { status: 'done', message: 'Launcher is up to date' },
      account: { status: 'done', message: 'Choose an account after startup' },
      modpack: {
        status: 'active',
        message: 'Checking and updating the latest modpack…',
      },
    },
  };
  const progress = {
    message: 'Изтегляне на модове…',
    percent: 57,
    stage: 'mods',
    completedFiles: 21,
    totalFiles: 32,
    transferred: 128_000_000,
    total: 224_000_000,
    bytesPerSecond: 8_400_000,
  };
  window.webContents.send('startupState', state);
  window.webContents.send('progress', progress);
  window.setContentSize(1450, 1088);
  await waitForRenderer(
    window,
    `document.querySelector('.splash-progress b')?.textContent === '57%'`,
  );
  assert.equal(
    await run(
      `document.querySelector('[data-step="account"]').classList.contains('is-neutral')`,
    ),
    true,
  );
  assert.equal(
    await run(
      `document.querySelector('.splash-transfer-details').textContent.includes('21 от 32 файла')`,
    ),
    true,
  );
  assert.equal(
    await run(
      `document.querySelector('.splash-transfer-rate').textContent.includes('128 МБ / 224 МБ')`,
    ),
    true,
  );
  assert.equal(
    await run(`document.querySelector('.splash-footer > span').textContent`),
    `v${version}`,
  );
  assert.equal(
    await run(
      `document.querySelector('.window-titlebar.is-startup .window-brand > img').naturalWidth > 0`,
    ),
    true,
  );
  await capture(window, 'launcher-startup-reference.png');

  await run(
    `document.querySelector('.splash-log-button').focus(); document.querySelector('.splash-log-button').click()`,
  );
  await waitForRenderer(
    window,
    `document.querySelector('.splash-log-dialog').open`,
  );
  assert.equal(
    await run(
      `document.querySelector('.splash-log-output').textContent.includes('Изтегляне на модове…')`,
    ),
    true,
  );
  window.webContents.send('progress', {
    ...progress,
    message: 'Проверка на изтеглените файлове…',
  });
  await waitForRenderer(
    window,
    `document.querySelector('.splash-log-output').textContent.includes('Проверка на изтеглените файлове…')`,
  );
  await run(`document.querySelector('[aria-label="Затвори лога"]').click()`);
  await waitForRenderer(
    window,
    `!document.querySelector('.splash-log-dialog').open`,
  );
  assert.equal(
    await run(
      `document.activeElement === document.querySelector('.splash-log-button')`,
    ),
    true,
  );

  for (const [width, height] of [
    [1034, 675],
    [1344, 835],
    [1450, 1088],
    [1920, 1080],
  ]) {
    window.setContentSize(width, height);
    await waitForRenderer(
      window,
      `innerWidth === ${width} && innerHeight === ${height}`,
    );
    const layout = await run(`(() => {
      const footer = document.querySelector('.splash-footer').getBoundingClientRect();
      const progress = document.querySelector('.splash-progress-track').getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        footerVisible: footer.bottom <= innerHeight + 1,
        progressVisible: progress.bottom < footer.top,
      };
    })()`);
    assert.deepEqual(
      layout,
      { overflow: false, footerVisible: true, progressVisible: true },
      `${width} × ${height}`,
    );
    if (width === 1034) await capture(window, 'launcher-startup-compact.png');
  }

  window.webContents.send('startupState', { ...state, phase: 'launcher' });
  await waitForRenderer(
    window,
    `document.querySelector('.splash-progress-track').classList.contains('is-indeterminate')`,
  );
  assert.equal(
    await run(
      `document.querySelector('.splash-transfer-rate') === null && !document.querySelector('[role="progressbar"]').hasAttribute('aria-valuenow')`,
    ),
    true,
    'Checks without measured progress must not invent percentages or transfer values',
  );
  window.webContents.send('launcherUpdate', {
    status: 'downloading',
    percent: 25,
    transferred: 5_000_000,
    total: 20_000_000,
    bytesPerSecond: 1_000_000,
  });
  await waitForRenderer(
    window,
    `document.querySelector('.splash-progress b')?.textContent === '25%'`,
  );
  assert.equal(
    await run(
      `document.querySelector('.splash-transfer-rate').textContent.includes('5 МБ / 20 МБ')`,
    ),
    true,
  );
  window.webContents.send('launcherUpdate', { status: 'current' });

  const failed = {
    ...state,
    status: 'failed',
    error: 'Няма връзка. Опитай отново.',
    steps: {
      ...state.steps,
      modpack: { status: 'error', message: 'Няма връзка. Опитай отново.' },
    },
  };
  window.webContents.send('startupState', failed);
  window.setContentSize(1344, 835);
  await waitForRenderer(
    window,
    `document.querySelectorAll('.splash-actions button').length === 2`,
  );
  assert.equal(
    await run(
      `document.querySelector('[data-step="modpack"][role="alert"]') !== null`,
    ),
    true,
  );
  await capture(window, 'launcher-startup-error.png');
  window.webContents.send('startupState', {
    ...state,
    status: 'update-ready',
    phase: 'launcher',
    launcher: { latestVersion: '99.0.0' },
  });
  await waitForRenderer(
    window,
    `document.querySelector('.splash-actions .play-button')?.textContent.includes('Рестартирай и обнови')`,
  );
  await capture(window, 'launcher-startup-update-ready.png');

  window.webContents.send('startupState', state);
  window.webContents.send('progress', { ...progress, percent: 150 });
  await waitForRenderer(
    window,
    `document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow') === '100'`,
  );
  assert.equal(
    await run(`document.querySelector('.app-shell') === null`),
    true,
    'The new screen must continue to block launch during startup',
  );
}

module.exports = { checkStartupSplash };
