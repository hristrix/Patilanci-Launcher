const assert = require('node:assert/strict');

async function checkModpackTabs(
  window,
  { waitForRenderer, fillInput, capture },
) {
  const run = (script) => window.webContents.executeJavaScript(script);
  await run(`document.querySelector('[data-page="modpack"]').click()`);
  await waitForRenderer(
    window,
    `document.querySelector('#pack-tab-overview') !== null`,
  );

  async function expectPanel(id) {
    await waitForRenderer(
      window,
      `document.querySelector('#pack-tab-${id}').getAttribute('aria-selected') === 'true'`,
    );
    assert.deepEqual(
      await run(`({
      page: document.querySelector('[aria-current="page"]').dataset.page,
      panels: Array.from(document.querySelectorAll('.pack-overview [role="tabpanel"]'))
        .filter(panel => !panel.hidden).map(panel => panel.id),
      selected: document.querySelectorAll('.pack-section-tabs [aria-selected="true"]').length,
      overflow: document.documentElement.scrollWidth > innerWidth,
    })`),
      {
        page: 'modpack',
        panels: [`pack-panel-${id}`],
        selected: 1,
        overflow: false,
      },
    );
  }

  await expectPanel('overview');
  await run(`document.querySelector('#pack-tab-mods').click()`);
  await expectPanel('mods');
  await waitForRenderer(
    window,
    `document.querySelectorAll('#pack-panel-mods [data-origin="bundled"]').length === 1`,
  );
  assert.equal(
    await run(
      `document.querySelector('#pack-panel-mods [data-origin="personal"], #pack-panel-mods .mods-heading, #pack-panel-mods .mods-collection-link, #pack-panel-mods .remove-mod-button') === null`,
    ),
    true,
    'Included mods stay inside Modpack without personal-mod actions',
  );
  assert.equal(
    await run(
      `document.querySelector('#pack-panel-mods [role="switch"]').disabled`,
    ),
    true,
    'Included mods cannot be disabled',
  );
  await fillInput(window, '#pack-panel-mods input', 'no-such-fixture-mod');
  await waitForRenderer(
    window,
    `document.querySelectorAll('#pack-panel-mods .mod-row').length === 0 && document.querySelector('#pack-panel-mods .mods-empty') !== null`,
  );
  await fillInput(window, '#pack-panel-mods input', '');
  await waitForRenderer(
    window,
    `document.querySelectorAll('#pack-panel-mods .mod-row').length === 1`,
  );
  await capture(window, 'launcher-modpack-included-mods.png');

  await run(`document.querySelector('#pack-tab-activity').click()`);
  await expectPanel('activity');
  window.webContents.send('progress', {
    message: 'Проверка на активността (fixture)',
    percent: null,
  });
  await waitForRenderer(
    window,
    `document.querySelector('#pack-panel-activity [role="log"]').textContent.includes('Проверка на активността (fixture)')`,
  );
  await capture(window, 'launcher-modpack-activity.png');

  await run(
    `document.querySelector('#pack-tab-activity').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))`,
  );
  await expectPanel('overview');
  assert.equal(await run(`document.activeElement.id`), 'pack-tab-overview');
  await run(
    `document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))`,
  );
  await expectPanel('activity');
  await run(
    `document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))`,
  );
  await expectPanel('overview');
  await run(
    `document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))`,
  );
  await expectPanel('activity');

  for (const [width, height] of [
    [1024, 720],
    [1344, 835],
  ]) {
    window.setContentSize(width, height);
    for (const id of ['overview', 'mods', 'activity']) {
      await run(`document.querySelector('#pack-tab-${id}').click()`);
      await expectPanel(id);
    }
  }
  await run(`document.querySelector('[data-page="mods"]').click()`);
  await waitForRenderer(
    window,
    `document.querySelector('.page-mods .mods-heading') !== null`,
  );
  assert.equal(
    await run(`document.querySelector('[data-origin="bundled"]') === null`),
    true,
    'My Mods still opens the personal collection',
  );
}

module.exports = { checkModpackTabs };
