const path = require('node:path');
const { normalizeGameWindow } = require('./game-window.cjs');
function safePath(root, relative) {
  if (
    typeof relative !== 'string' ||
    relative.includes('\\') ||
    relative.includes(':')
  )
    throw Error('Unsafe archive path');
  const target = path.resolve(root, relative);
  if (!target.startsWith(path.resolve(root) + path.sep))
    throw Error('Archive path escapes installation');
  return target;
}
function validateSettings(s) {
  if (
    !s ||
    !Number.isInteger(Number(s.memory)) ||
    s.memory < 2 ||
    s.memory > 32
  )
    throw Error('Memory must be 2–32 GB');
  if (typeof s.javaPath !== 'string') throw Error('Invalid settings');
  let javaPaths;
  if (s.javaPaths !== undefined) {
    if (
      !s.javaPaths ||
      typeof s.javaPaths !== 'object' ||
      Array.isArray(s.javaPaths)
    )
      throw Error('Invalid Java paths');
    javaPaths = {};
    for (const [major, executable] of Object.entries(s.javaPaths)) {
      if (
        !['8', '17', '21', '25'].includes(major) ||
        typeof executable !== 'string' ||
        executable.length > 4096 ||
        executable.includes('\0')
      )
        throw Error('Invalid Java path');
      if (executable.trim()) javaPaths[major] = executable.trim();
    }
  }
  return {
    memory: Number(s.memory),
    javaPath: s.javaPath.trim(),
    ...(javaPaths && { javaPaths }),
    ...(s.gameWindow !== undefined && {
      gameWindow: normalizeGameWindow(s.gameWindow),
    }),
  };
}
module.exports = { safePath, validateSettings };
