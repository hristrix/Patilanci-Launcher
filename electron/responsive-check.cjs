const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const VIEWPORTS = [
  [1034, 675],
  [1280, 720],
  [1344, 835],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
  [3840, 2160],
];
const PAGES = ['home', 'modpack', 'players', 'mods', 'settings', 'console'];

async function verifyResponsiveText(window, waitForPaint, capture) {
  const report = [];

  for (const [width, height] of VIEWPORTS) {
    window.setContentSize(width, height);

    for (const page of PAGES) {
      await window.webContents.executeJavaScript(
        page === 'settings'
          ? `document.querySelector('.settings-link').click()`
          : `document.querySelector('[data-page="${page}"]').click()`,
      );
      await waitForPaint(window);

      // Use long content to exercise wrapping without touching user data.
      await window.webContents.executeJavaScript(`(() => {
        const replace = (selector, text) => {
          const element = document.querySelector(selector);
          if (element) element.textContent = text;
        };
        replace('.sidebar-profile strong', 'Adventurer1234567');
        replace('.mod-info h3', 'A Fabric mod with a very long display name and an additional descriptive subtitle');
        replace('.mod-file', 'an-unusually-long-fabric-mod-filename-with-a-detailed-release-and-build-identifier-for-minecraft-1.21.10.jar');
        replace('.mod-version', '2.2.0+community.release.with.long.build.metadata');
        replace('.install-state small', 'Installed 2.2.0-community-build-with-an-extended-version-name · Checked on every Play');
        replace('.pack-facts dd', 'Patilanci_Adventures_CurseForge_2.2.1-community-release-with-a-long-build-name.zip');
      })()`);
      await waitForPaint(window);

      const measurements = await window.webContents.executeJavaScript(`(() => {
        const issues = [];
        const sizes = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const text = node.textContent.trim();
          if (!text) continue;
          const element = node.parentElement;
          if (!element || element.closest('script, style, svg')) continue;
          const style = getComputedStyle(element);
          const range = document.createRange();
          range.selectNodeContents(node);
          const bounds = range.getBoundingClientRect();
          if (!bounds.width || !bounds.height || style.visibility === 'hidden') continue;
          const fontSize = parseFloat(style.fontSize);
          sizes.push(fontSize);
          if (fontSize < 12) issues.push('Small text: ' + text.slice(0, 70) + ' (' + fontSize + 'px)');
          if (bounds.left < -2 || bounds.right > innerWidth + 2) issues.push('Text outside viewport: ' + text.slice(0, 70));

          for (let ancestor = element; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
            const ancestorStyle = getComputedStyle(ancestor);
            const ancestorBounds = ancestor.getBoundingClientRect();
            if (['hidden', 'clip'].includes(ancestorStyle.overflowX) &&
                (bounds.left < ancestorBounds.left - 2 || bounds.right > ancestorBounds.right + 2)) {
              issues.push('Clipped horizontally: ' + text.slice(0, 70));
              break;
            }
            if (['hidden', 'clip'].includes(ancestorStyle.overflowY) &&
                (bounds.top < ancestorBounds.top - 2 || bounds.bottom > ancestorBounds.bottom + 2)) {
              issues.push('Clipped vertically: ' + text.slice(0, 70));
              break;
            }
          }
        }
        return {
          viewport: [innerWidth, innerHeight],
          rootFontSize: parseFloat(getComputedStyle(document.documentElement).fontSize),
          minimumTextSize: Math.min(...sizes),
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
          settingsVisible: document.querySelector('.settings-link').getBoundingClientRect().bottom <= innerHeight,
          issues,
        };
      })()`);

      assert.deepEqual(measurements.viewport, [width, height]);
      assert.equal(
        measurements.horizontalOverflow,
        false,
        `${page} overflows at ${width}×${height}`,
      );
      assert.deepEqual(
        measurements.issues,
        [],
        `${page} has unreadable text at ${width}×${height}`,
      );
      assert.equal(window.webContents.getZoomFactor(), 1);
      assert.equal(
        measurements.settingsVisible,
        true,
        `Settings must stay visible at ${width}×${height}`,
      );

      if (page === 'home') {
        assert.equal(
          await window.webContents.executeJavaScript(
            `document.querySelector('.play-button').getBoundingClientRect().bottom <= innerHeight`,
          ),
          true,
          `Play must remain visible at ${width}×${height}`,
        );
      }

      if (
        [1034, 1920].includes(width) &&
        ['home', 'mods', 'modpack'].includes(page)
      ) {
        await capture(window, `responsive-${page}-${width}.png`);
      }
      report.push({ page, ...measurements });
    }
  }

  assert.ok(
    report.find((entry) => entry.viewport[0] === 1920).rootFontSize >
      report[0].rootFontSize,
  );
  await fs.writeFile(
    path.join(__dirname, '../artifacts/responsive-report.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(
    `Responsive text checks passed for ${report.length} page/viewport combinations, from 1034×675 through 3840×2160.`,
  );
}

module.exports = { verifyResponsiveText };
