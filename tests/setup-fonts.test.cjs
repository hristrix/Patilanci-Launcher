const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { openType } = require('../packaging/setup/build.cjs');

test('bundled setup fonts retain valid OpenType tables and whole-font checksums', () => {
  for (const [family, weight, replacement] of [
    ['oswald', 600, 'OswCyr'],
    ['manrope', 500, 'ManCyrl'],
  ]) {
    const source = fs.readFileSync(
      require.resolve(
        `@fontsource/${family}/files/${family}-cyrillic-${weight}-normal.woff`,
      ),
    );
    const ttf = openType(source, [
      family === 'oswald' ? 'Oswald' : 'Manrope',
      replacement,
    ]);
    assert.equal(ttf.readUInt32BE(0), 0x00010000);
    let checksum = 0;
    for (let i = 0; i < ttf.length; i += 4)
      checksum = (checksum + ttf.readUInt32BE(i)) >>> 0;
    assert.equal(checksum, 0xb1b0afba);
    assert.ok(ttf.includes(Buffer.from(replacement, 'utf16le').swap16()));
    const tables = ttf.readUInt16BE(4);
    for (let i = 0; i < tables; i++) {
      const at = 12 + i * 16;
      const offset = ttf.readUInt32BE(at + 8),
        length = ttf.readUInt32BE(at + 12);
      assert.equal(offset % 4, 0);
      assert.ok(offset + length <= ttf.length);
    }
  }
});
