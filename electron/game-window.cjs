const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function normalizeGameWindow(
  value = { width: 1920, height: 1080, fullscreen: false },
) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !['number', 'string'].includes(typeof value.width) ||
    !['number', 'string'].includes(typeof value.height) ||
    !Number.isInteger(Number(value.width)) ||
    Number(value.width) < 640 ||
    Number(value.width) > 7680 ||
    !Number.isInteger(Number(value.height)) ||
    Number(value.height) < 480 ||
    Number(value.height) > 4320 ||
    typeof value.fullscreen !== 'boolean'
  )
    throw new Error(
      'Game window must be 640–7680 × 480–4320 with a fullscreen preference',
    );
  return {
    width: Number(value.width),
    height: Number(value.height),
    fullscreen: value.fullscreen,
  };
}

async function prepareGameWindow(instance, value, workArea) {
  const window = normalizeGameWindow(value);
  if (!window.fullscreen && workArea) {
    // Minecraft dimensions describe its client area. Leave room for the native
    // title bar and resize borders, including on displays with a taskbar.
    window.width = Math.min(window.width, Math.max(1, workArea.width - 32));
    window.height = Math.min(window.height, Math.max(1, workArea.height - 64));
  }
  const file = path.join(instance, 'options.txt');
  let original = '';
  try {
    original = await fs.readFile(file, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  // Minecraft also restores these values from its own video settings. Keep
  // them in sync so an earlier F11 choice or size override cannot win at launch.
  const remaining = new Map(
    Object.entries({
      fullscreen: String(window.fullscreen),
      overrideWidth: String(window.width),
      overrideHeight: String(window.height),
    }),
  );
  const managed = new Set(remaining.keys());
  const lines = [];
  for (const line of original.split(/\r?\n/)) {
    const key = line.slice(0, line.indexOf(':'));
    if (!managed.has(key)) {
      lines.push(line);
      continue;
    }
    if (remaining.has(key)) lines.push(`${key}:${remaining.get(key)}`);
    remaining.delete(key);
  }
  if (lines.at(-1) === '') lines.pop();
  for (const [key, setting] of remaining) lines.push(`${key}:${setting}`);
  const content =
    lines.join(original.includes('\r\n') ? '\r\n' : '\n') +
    (original.includes('\r\n') ? '\r\n' : '\n');
  if (content !== original) {
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, content, { flag: 'wx' });
      await fs.rename(temporary, file);
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }
  return window;
}

module.exports = { normalizeGameWindow, prepareGameWindow };
