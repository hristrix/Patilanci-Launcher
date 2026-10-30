const assert = require('node:assert/strict');
const path = require('node:path');
const { beginSeasonalAudioChecks } = require('./seasonal-audio-check.cjs');

async function checkSeasonalThemes(
  window,
  { waitForRenderer, capture, setDevelopment },
) {
  const run = (script) => window.webContents.executeJavaScript(script);
  const { seasonalTheme, THEME_STORAGE_KEY, THEMES } =
    await import('../src/lib/seasonal-theme.mjs');
  setDevelopment(true);
  await window.loadFile(path.join(__dirname, '../dist/index.html'));
  await waitForRenderer(
    window,
    `document.querySelector('.app-shell') && document.querySelector('.theme-picker select')`,
  );
  const switchTheme = async (theme) => {
    await run(`(() => {
      const select = document.querySelector('.theme-picker select');
      select.value = ${JSON.stringify(theme)};
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await waitForRenderer(
      window,
      `document.documentElement.dataset.theme === ${JSON.stringify(theme)}`,
    );
  };
  const checkArtwork = async (theme) => {
    await waitForRenderer(
      window,
      `Array.from(document.querySelectorAll('.village-panorama')).every(image => image.complete && image.naturalWidth > 0 && image.getAttribute('src') === ${JSON.stringify('./artwork/' + THEMES[theme].artwork)})`,
    );
  };
  const checkAddButtonContrast = async (theme, state) => {
    await run(`new Promise(resolve => setTimeout(resolve, 220))`);
    const result = await run(`(() => {
      const button = document.querySelector('.mods-heading > .play-button');
      const style = getComputedStyle(button);
      const rgb = value => (value.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
      const light = value => rgb(value).map(channel => {
        channel /= 255;
        return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
      }).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
      const front = light(style.color), back = light(style.backgroundColor);
      return { ratio: (Math.max(front, back) + .05) / (Math.min(front, back) + .05), color: style.color, background: style.backgroundColor };
    })()`);
    assert.ok(
      result.ratio >= 4.5,
      `${theme} Add file ${state}: text contrast ${result.ratio.toFixed(2)} (${result.color} on ${result.background})`,
    );
  };
  const audioChecks = await beginSeasonalAudioChecks(window, waitForRenderer);
  for (const theme of ['original', 'halloween', 'christmas', 'newyear']) {
    await switchTheme(theme);
    await checkArtwork(theme);
    assert.equal(
      await run(`!!document.querySelector('.home-overview .seasonal-scenery')`),
      theme !== 'original',
    );
    for (const [width, height] of [
      [1360, 900],
      [960, 720],
    ]) {
      window.setContentSize(width, height);
      await waitForRenderer(
        window,
        `innerWidth === ${width} && innerHeight === ${height}`,
      );
      assert.equal(
        await run(`document.documentElement.scrollWidth > innerWidth`),
        false,
      );
      const pickerBounds = await run(`(() => {
        const picker = document.querySelector('.theme-picker').getBoundingClientRect();
        const brand = document.querySelector('.window-brand').getBoundingClientRect();
        return picker.left >= brand.right && picker.right <= innerWidth;
      })()`);
      assert.equal(
        pickerBounds,
        true,
        `${theme}: development controls fit at ${width}px`,
      );
      await capture(window, `launcher-theme-${theme}-${width}.png`);
      await run(`document.querySelector('.theme-picker button').click()`);
      await waitForRenderer(
        window,
        `document.querySelector('.startup-splash') && document.querySelector('.splash-progress b')?.textContent === '57%'`,
      );
      await checkArtwork(theme);
      await audioChecks.check(theme, width === 1360);
      if (theme === 'halloween' && width === 960) {
        await switchTheme('christmas');
        await audioChecks.switched('christmas');
        await switchTheme('halloween');
        await audioChecks.switched('halloween');
        await checkArtwork(theme);
      }
      assert.equal(
        await run(
          `!!document.querySelector('.splash-landscape .seasonal-scenery')`,
        ),
        theme !== 'original',
      );
      assert.equal(
        await run(`document.documentElement.scrollWidth > innerWidth`),
        false,
      );
      await capture(window, `launcher-theme-${theme}-loading-${width}.png`);
      await run(`document.querySelector('.theme-picker button').click()`);
      await waitForRenderer(window, `document.querySelector('.app-shell')`);
      await audioChecks.stopped();
    }
  }
  await audioChecks.finish();
  await window.loadFile(path.join(__dirname, '../dist/index.html'));
  await waitForRenderer(
    window,
    `document.querySelector('.theme-picker select')?.value === 'newyear' && document.documentElement.dataset.theme === 'newyear'`,
  );
  // The normal signed-in dashboard uses a shorter panorama than the sign-in page.
  await run(`window.launcher.login()`);
  await window.loadFile(path.join(__dirname, '../dist/index.html'));
  await waitForRenderer(
    window,
    `document.querySelector('.village-hero-art') && document.querySelector('.theme-picker select')`,
  );
  for (const theme of ['original', 'halloween', 'christmas', 'newyear']) {
    await switchTheme(theme);
    await checkArtwork(theme);
    for (const [width, height] of [
      [1360, 900],
      [960, 720],
    ]) {
      window.setContentSize(width, height);
      await waitForRenderer(
        window,
        `innerWidth === ${width} && innerHeight === ${height}`,
      );
      assert.equal(
        await run(`document.documentElement.scrollWidth > innerWidth`),
        false,
      );
      assert.equal(
        await run(`(() => {
        const button = document.querySelector('.launch-bar .play-button').getBoundingClientRect();
        return button.top >= 0 && button.bottom <= innerHeight && button.right <= innerWidth;
      })()`),
        true,
        `${theme}: Play remains visible at ${width}px`,
      );
      await capture(window, `launcher-theme-${theme}-dashboard-${width}.png`);
    }
    await run(`document.querySelector('[data-page="mods"]').click()`);
    await waitForRenderer(
      window,
      `document.querySelector('.mods-heading > .play-button')?.disabled === false`,
    );
    // Force real Chromium pseudo states: the hidden window cannot receive OS focus.
    window.webContents.debugger.attach('1.3');
    try {
      const command = (name, args = {}) =>
        window.webContents.debugger.sendCommand(name, args);
      await command('DOM.enable');
      await command('CSS.enable');
      const { root } = await command('DOM.getDocument');
      const { nodeId } = await command('DOM.querySelector', {
        nodeId: root.nodeId,
        selector: '.mods-heading > .play-button',
      });
      for (const [state, forcedPseudoClasses] of [
        ['idle', []],
        ['hover', ['hover']],
        ['pressed', ['hover', 'active']],
        ['keyboard focus', ['focus', 'focus-visible']],
      ]) {
        await command('CSS.forcePseudoState', { nodeId, forcedPseudoClasses });
        await checkAddButtonContrast(theme, state);
      }
      assert.equal(
        await run(
          `parseFloat(getComputedStyle(document.querySelector('.mods-heading > .play-button')).outlineWidth) >= 2`,
        ),
        true,
        `${theme}: keyboard focus has a visible outline`,
      );
      await capture(window, `launcher-theme-${theme}-add-file.png`);
      await command('CSS.forcePseudoState', {
        nodeId,
        forcedPseudoClasses: [],
      });
    } finally {
      window.webContents.debugger.detach();
    }
    await run(
      `document.querySelector('.mods-heading > .play-button').disabled = true; void 0`,
    );
    assert.equal(
      await run(
        `document.querySelector('.mods-heading > .play-button').disabled`,
      ),
      true,
    );
    await run(
      `document.querySelector('.mods-heading > .play-button').disabled = false; document.querySelector('[data-page="home"]').click()`,
    );
    await waitForRenderer(
      window,
      `document.querySelector('.village-hero-art')`,
    );
    await run(`document.querySelector('[data-page="modpack"]').click()`);
    await waitForRenderer(
      window,
      `document.querySelector('#pack-tab-overview[aria-selected="true"]')`,
    );
    const packColors = await run(`(() => {
      const tab = document.querySelector('#pack-tab-overview');
      return { border: getComputedStyle(tab).borderBottomColor, icon: getComputedStyle(tab.querySelector('svg')).color };
    })()`);
    await run(`document.querySelector('.settings-link').click()`);
    await waitForRenderer(
      window,
      `document.querySelector('.settings-toggle input')?.disabled === false`,
    );
    const controlColors = await run(`(() => {
      const root = getComputedStyle(document.documentElement);
      const normalize = color => {
        const probe = document.createElement('span'); probe.style.color = color;
        document.body.append(probe); const result = getComputedStyle(probe).color; probe.remove(); return result;
      };
      const accent = normalize(root.getPropertyValue('--selection-accent').trim() || '#ff3d30');
      const tab = document.querySelector('.preferences-tabs [aria-selected="true"]');
      const toggle = document.querySelector('.settings-toggle input');
      const checked = toggle.checked;
      if (!checked) toggle.click();
      const result = {
        accent, tabBorder: getComputedStyle(tab).borderBottomColor,
        tabIcon: getComputedStyle(tab.querySelector('svg')).color,
        switchOn: getComputedStyle(toggle).backgroundColor,
        thumb: getComputedStyle(toggle, '::before').backgroundColor,
        memory: getComputedStyle(document.querySelector('#memory')).backgroundImage,
      };
      if (!checked) toggle.click();
      return result;
    })()`);
    if (theme !== 'original') {
      assert.equal(
        packColors.border,
        controlColors.accent,
        `${theme}: pack tab underline`,
      );
      assert.equal(
        packColors.icon,
        controlColors.accent,
        `${theme}: pack tab icon`,
      );
      assert.equal(
        controlColors.tabBorder,
        controlColors.accent,
        `${theme}: settings tab underline`,
      );
      assert.equal(
        controlColors.tabIcon,
        controlColors.accent,
        `${theme}: settings tab icon`,
      );
      assert.equal(
        controlColors.switchOn,
        controlColors.accent,
        `${theme}: enabled switch`,
      );
      assert.notEqual(
        controlColors.thumb,
        controlColors.switchOn,
        `${theme}: switch thumb remains distinct`,
      );
      assert.ok(
        controlColors.memory.includes(controlColors.accent),
        `${theme}: memory slider fill`,
      );
    } else {
      assert.equal(packColors.border, 'rgb(250, 57, 46)');
      assert.equal(controlColors.tabBorder, 'rgb(255, 61, 46)');
      assert.equal(controlColors.switchOn, 'rgb(255, 61, 48)');
    }
    await capture(window, `launcher-theme-${theme}-settings.png`);
    await run(`document.querySelector('[data-page="home"]').click()`);
    await waitForRenderer(
      window,
      `document.querySelector('.village-hero-art')`,
    );
  }
  await run(`window.launcher.logout()`);
  await run(
    `(() => { const select = document.querySelector('.theme-picker select'); select.value = 'auto'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`,
  );
  await waitForRenderer(
    window,
    `document.documentElement.dataset.theme === ${JSON.stringify(seasonalTheme())}`,
  );

  // A stored debug choice must have no effect when Electron reports a packaged build.
  const opposite = seasonalTheme() === 'halloween' ? 'christmas' : 'halloween';
  await run(
    `localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)}, ${JSON.stringify(opposite)})`,
  );
  setDevelopment(false);
  await window.loadFile(path.join(__dirname, '../dist/index.html'));
  await waitForRenderer(window, `document.querySelector('.app-shell')`);
  assert.equal(
    await run(`document.querySelector('.theme-picker') === null`),
    true,
  );
  assert.equal(
    await run(`document.documentElement.dataset.theme`),
    seasonalTheme(),
  );
  // Simulate date rollover while the window remains open, including a resumed window.
  await run(`void (window.originalDateForThemeCheck = Date)`);
  try {
    for (const [month, day, theme] of [
      [12, 25, 'christmas'],
      [12, 31, 'newyear'],
      [1, 3, 'original'],
      [10, 31, 'halloween'],
    ]) {
      await run(`window.Date = class extends window.originalDateForThemeCheck {
        constructor(...args) { super(...(args.length ? args : [2026, ${month - 1}, ${day}, 12])); }
      }; window.dispatchEvent(new Event('focus'))`);
      await waitForRenderer(
        window,
        `document.documentElement.dataset.theme === ${JSON.stringify(theme)}`,
      );
    }
  } finally {
    await run(
      `window.Date = window.originalDateForThemeCheck; delete window.originalDateForThemeCheck; localStorage.removeItem(${JSON.stringify(THEME_STORAGE_KEY)}); window.dispatchEvent(new Event('focus'))`,
    );
  }
  window.setContentSize(1360, 900);
  console.log(
    'Seasonal templates passed: four bundled landscapes, loading previews, seasonal audio playback/mute/cleanup/recovery, compact layout, readable Add file controls (idle/hover/pressed/focus), persistence, production isolation, and live date changes.',
  );
}

module.exports = { checkSeasonalThemes };
