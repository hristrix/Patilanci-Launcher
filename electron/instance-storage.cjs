const fs = require('node:fs/promises');

// Bound filesystem work and never traverse links into other folders. ENOENT is
// normal when Minecraft creates/removes files while a size request is running.
function directorySize(root, concurrency = 4) {
  const path = require('node:path');
  const queue = [root];
  let active = 0,
    bytes = 0,
    files = 0,
    partial = false;
  return new Promise((resolve) => {
    function pump() {
      while (active < concurrency && queue.length) {
        const file = queue.pop();
        active++;
        (async () => {
          const stat = await fs.lstat(file);
          if (stat.isSymbolicLink()) return;
          if (stat.isFile()) {
            bytes += stat.size;
            files++;
          } else if (stat.isDirectory()) {
            for (const name of await fs.readdir(file))
              queue.push(path.join(file, name));
          }
        })()
          .catch((error) => {
            if (error.code !== 'ENOENT') partial = true;
          })
          .finally(() => {
            active--;
            if (!active && !queue.length) resolve({ bytes, files, partial });
            else pump();
          });
      }
    }
    pump();
  });
}
function createInstanceStorage({
  instance,
  runtimes,
  now = Date.now,
  ttl = 60000,
  measure = directorySize,
}) {
  let cached, pending;
  let generation = 0;
  function invalidate() {
    cached = null;
    generation++;
  }
  function read(force = false) {
    if (pending) return pending;
    if (!force && cached && now() - cached.measuredAt < ttl)
      return Promise.resolve(cached);
    const started = generation;
    pending = Promise.all([measure(instance()), measure(runtimes())])
      .then(([game, java]) => {
        const result = {
          status: game.partial || java.partial ? 'partial' : 'ready',
          instanceBytes: game.bytes,
          javaBytes: java.bytes,
          totalBytes: game.bytes + java.bytes,
          files: game.files + java.files,
          measuredAt: now(),
        };
        if (started === generation) cached = result;
        return result;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  }
  return { read, invalidate };
}
module.exports = { directorySize, createInstanceStorage };
