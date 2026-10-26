const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createConsoleLog } = require('./console-log.cjs');
const { createConsoleWindow } = require('./console-window.cjs');
const { startMinecraftService } = require('./minecraft-service.cjs');

async function waitFor(window, expression) {
  const until = Date.now() + 10000;
  while (Date.now() < until) {
    if (await window.webContents.executeJavaScript(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Console UI timed out: ${expression}`);
}
app.whenReady().then(async () => {
  const previousClipboard = clipboard.readText();
  try {
    const log = createConsoleLog();
    let service,
      stopFails = false;
    const controller = createConsoleWindow({
      BrowserWindow,
      ipcMain,
      log,
      onClose: async () => {
        if (stopFails) throw new Error('Fixture stop failed');
        if (service) await service.stop();
        log.setStatus('stopped');
      },
    });
    controller.open();
    const window = controller.getWindow();
    await new Promise((resolve) =>
      window.webContents.once('did-finish-load', resolve),
    );
    await waitFor(window, `document.querySelector('.console-empty') !== null`);
    assert.equal(
      await window.webContents.executeJavaScript('typeof window.launcher'),
      'undefined',
    );
    controller.open();
    assert.equal(
      controller.getWindow(),
      window,
      'Reopening focuses the existing console',
    );
    log.start(['secret-fixture-token']);
    log.setStatus('running');
    log.write(
      '[Render thread/INFO] Welcome to Patilanci!\n[Render thread/WARN] Example resource warning\n[Render thread/ERROR] Example fixture error\n',
    );
    log.write(
      'Private value secret-fixture-token\n<script>window.untrusted = true</script>\n',
    );
    await waitFor(
      window,
      `document.querySelectorAll('.console-line').length === 6`,
    );
    assert.equal(
      await window.webContents.executeJavaScript('window.untrusted'),
      undefined,
    );
    assert.doesNotMatch(
      await window.webContents.executeJavaScript('document.body.textContent'),
      /secret-fixture-token/,
    );
    await window.webContents.executeJavaScript(`(() => {
      const input = document.querySelector('[aria-label="Търси в Логовеа"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'warning');
      input.dispatchEvent(new Event('input', {bubbles:true}));
    })()`);
    await waitFor(
      window,
      `document.querySelectorAll('.console-line').length === 1`,
    );
    await window.webContents.executeJavaScript(
      `Array.from(document.querySelectorAll('.console-actions button')).find(b => b.textContent.includes('Копирай')).click()`,
    );
    await waitFor(
      window,
      `document.querySelector('.console-notice').textContent.includes('копирани')`,
    );
    assert.match(clipboard.readText(), /resource warning/);
    assert.doesNotMatch(clipboard.readText(), /fixture error/);
    await window.webContents.executeJavaScript(`(() => {
      const input = document.querySelector('[aria-label="Търси в Логовеа"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '');
      input.dispatchEvent(new Event('input', {bubbles:true}));
    })()`);
    await waitFor(
      window,
      `document.querySelectorAll('.console-line').length === 6`,
    );
    await fs.mkdir(path.join(__dirname, '../artifacts'), { recursive: true });
    await fs.writeFile(
      path.join(__dirname, '../artifacts/launcher-console.png'),
      (await window.webContents.capturePage()).toPNG(),
    );
    await window.webContents.executeJavaScript(`(() => {
      const select = document.querySelector('select');
      select.value = 'errors'; select.dispatchEvent(new Event('change', {bubbles:true}));
    })()`);
    await waitFor(
      window,
      `document.querySelectorAll('.console-line').length === 1 && document.querySelector('.console-message').textContent.includes('fixture error')`,
    );
    await window.webContents.executeJavaScript(`(() => {
      const select = document.querySelector('select');
      select.value = 'all'; select.dispatchEvent(new Event('change', {bubbles:true}));
      document.querySelector('.console-follow input').click();
      document.querySelector('.console-output').scrollTop = 0;
    })()`);
    for (let i = 0; i < 100; i++) log.write(`Fixture game output ${i}\n`);
    await waitFor(
      window,
      `document.querySelectorAll('.console-line').length === 106`,
    );
    assert.equal(
      await window.webContents.executeJavaScript(
        `document.querySelector('.console-output').scrollTop`,
      ),
      0,
    );
    await window.webContents.executeJavaScript(
      `document.querySelector('.console-follow input').click()`,
    );
    await waitFor(
      window,
      `document.querySelector('.console-output').scrollTop > 0`,
    );
    window.setContentSize(760, 480);
    await waitFor(window, `innerWidth === 760`);
    assert.equal(
      await window.webContents.executeJavaScript(
        'document.documentElement.scrollWidth > innerWidth',
      ),
      false,
    );
    stopFails = true;
    window.close();
    await waitFor(
      window,
      `Array.from(document.querySelectorAll('.console-line.is-error .console-message')).some(line => line.textContent.includes('Действието не можа да завърши'))`,
    );
    assert.equal(
      window.isDestroyed(),
      false,
      'A failed stop keeps the console open for retry',
    );
    stopFails = false;
    const closed = new Promise((resolve) => window.once('closed', resolve));
    await window.webContents
      .executeJavaScript(
        `document.querySelector('[aria-label="Затвори Логовеа"]').click()`,
      )
      .catch(() => {});
    await closed;
    assert.equal(
      log.snapshot().status,
      'stopped',
      'Closing the console requests Minecraft shutdown',
    );
    log.write('Output while the console was closed\n');
    controller.open();
    const reopened = controller.getWindow();
    await new Promise((resolve) =>
      reopened.webContents.once('did-finish-load', resolve),
    );
    await waitFor(
      reopened,
      `document.body.textContent.includes('Output while the console was closed')`,
    );
    await reopened.webContents.executeJavaScript(
      `document.querySelector('[aria-label="Изчисти Логовеа"]').click()`,
    );
    await waitFor(
      reopened,
      `document.querySelector('.console-empty') !== null`,
    );
    assert.equal(log.snapshot().entries.length, 0);
    const workerPath = path.join(
      __dirname,
      '../tests/fixtures/minecraft-worker.cjs',
    );
    let ready = false;
    let started;
    const preparing = new Promise((resolve) => {
      started = resolve;
    });
    log.start();
    service = startMinecraftService(
      { work: 600, naturalExit: true },
      {
        workerPath,
        onData: (text) => log.write(text),
        onProgress: (value) => {
          if (value.type === 'fixture-busy') started();
        },
        onSpawn: () => log.setStatus('running'),
        onClose: () => {
          log.flush();
          log.setStatus('stopped');
        },
      },
    );
    service.ready.then(() => {
      ready = true;
    });
    await preparing;
    assert.equal(await reopened.webContents.executeJavaScript('1 + 1'), 2);
    assert.equal(
      ready,
      false,
      'The renderer responds while launch preparation runs in the background',
    );
    await service.ready;
    await service.done;
    await waitFor(
      reopened,
      `document.body.textContent.includes('fixture stderr')`,
    );
    assert.equal(
      reopened.isDestroyed(),
      false,
      'Minecraft exiting leaves the console open',
    );
    service = startMinecraftService(
      {},
      { workerPath, onData: (text) => log.write(text) },
    );
    await service.ready;
    const gamePid = (await service.ready).pid;
    const stoppedWindow = new Promise((resolve) =>
      reopened.once('closed', resolve),
    );
    reopened.close();
    await stoppedWindow;
    await service.done;
    assert.throws(
      () => process.kill(gamePid, 0),
      'Closing the console stops the fixture game',
    );
    console.log(
      'Console UI checks passed: background preparation, responsive renderer, close-to-stop, stop-failure retry, natural-exit history, live output, filters, and compact layout.',
    );
    controller.close();
    clipboard.writeText(previousClipboard);
    app.exit(0);
  } catch (error) {
    clipboard.writeText(previousClipboard);
    console.error(error);
    app.exit(1);
  }
});
