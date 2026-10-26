const assert = require('node:assert/strict');

async function verifyBulgarianInterface(window, screen) {
  const untranslated = await window.webContents.executeJavaScript(`(() => {
    const banned = /\\b(?:Launcher|Offline|RAM|Sign in|Sign out|Choose PNG|Your account|Skin model|Skin source|Open launcher|Minecraft console|Waiting for|Click here)\\b|модпак|логовете|скин/i;
    const external = '.console-output, .mod-info, .skin-file-name, .pack-facts dd, .dashboard-facts dd';
    const issues = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const element = walker.currentNode.parentElement;
      if (!element || element.closest('script, style, svg, [hidden], [inert]') || element.closest(external)) continue;
      const text = walker.currentNode.textContent.trim();
      if (text && element.getClientRects().length && banned.test(text)) issues.push(text);
    }
    for (const element of document.querySelectorAll('[aria-label], [placeholder], [title]')) {
      if (element.closest(external)) continue;
      for (const attribute of ['aria-label', 'placeholder', 'title']) {
        const text = element.getAttribute(attribute);
        if (text && banned.test(text)) issues.push(attribute + ': ' + text);
      }
    }
    return [...new Set(issues)];
  })()`);
  assert.deepEqual(
    untranslated,
    [],
    `Untranslated interface text on ${screen}`,
  );
}

module.exports = { verifyBulgarianInterface };
