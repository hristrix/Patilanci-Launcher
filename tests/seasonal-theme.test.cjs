const { test } = require('node:test');
const assert = require('node:assert/strict');

const themeModule = import('../src/lib/seasonal-theme.mjs');
const localDate = (month, day, year = 2026) =>
  new Date(year, month - 1, day, 12);

test('seasonal windows include their boundaries and return to original outside them', async () => {
  const { seasonalTheme } = await themeModule;
  for (const [month, day, expected] of [
    [10, 23, 'original'],
    [10, 24, 'halloween'],
    [10, 31, 'halloween'],
    [11, 1, 'original'],
    [11, 30, 'original'],
    [12, 1, 'christmas'],
    [12, 25, 'christmas'],
    [12, 26, 'christmas'],
    [12, 27, 'newyear'],
    [12, 31, 'newyear'],
    [1, 1, 'newyear'],
    [1, 2, 'newyear'],
    [1, 3, 'original'],
    [2, 28, 'original'],
    [7, 1, 'original'],
  ])
    assert.equal(
      seasonalTheme(localDate(month, day)),
      expected,
      `${month}/${day}`,
    );
  assert.equal(seasonalTheme(localDate(2, 29, 2028)), 'original');
});

test('selection follows local midnight and recurs across years', async () => {
  const { seasonalTheme } = await themeModule;
  for (const year of [2026, 2027, 2028]) {
    assert.equal(seasonalTheme(new Date(year, 9, 23, 23, 59, 59)), 'original');
    assert.equal(seasonalTheme(new Date(year, 9, 24, 0, 0, 0)), 'halloween');
    assert.equal(
      seasonalTheme(new Date(year, 11, 26, 23, 59, 59)),
      'christmas',
    );
    assert.equal(seasonalTheme(new Date(year, 11, 27, 0, 0, 0)), 'newyear');
    assert.equal(seasonalTheme(new Date(year + 1, 0, 3, 0, 0, 0)), 'original');
  }
});

test('production always ignores development overrides; development can select all four templates', async () => {
  const { resolveTheme, THEMES } = await themeModule;
  for (const override of [
    ...Object.keys(THEMES),
    'auto',
    'invalid',
    'toString',
    '__proto__',
  ]) {
    assert.equal(
      resolveTheme({ date: localDate(12, 25), override }),
      'christmas',
    );
    assert.equal(
      resolveTheme({ date: localDate(6, 1), override, development: true }),
      Object.hasOwn(THEMES, override) ? override : 'original',
    );
  }
});

test('invalid or unavailable preview storage falls back to automatic selection', async () => {
  const { readThemeOverride } = await themeModule;
  for (const value of [null, 'auto', 'obsolete', '__proto__', 'constructor'])
    assert.equal(readThemeOverride({ getItem: () => value }), 'auto');
  assert.equal(
    readThemeOverride({
      getItem() {
        throw Error('Storage disabled');
      },
    }),
    'auto',
  );
  assert.equal(readThemeOverride({ getItem: () => 'halloween' }), 'halloween');
});
