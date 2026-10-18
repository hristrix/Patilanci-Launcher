const path = require('node:path');
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
  return {
    memory: Number(s.memory),
    javaPath: s.javaPath.trim(),
  };
}
module.exports = { safePath, validateSettings };
