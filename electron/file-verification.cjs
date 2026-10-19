const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Runs in the Minecraft worker. Cache only successful verification, and require
// both timestamps, file identity, size and expected digest to remain unchanged.
class FileVerification {
  constructor(root, { read = fs.readFileSync } = {}) {
    this.root = path.resolve(root);
    this.file = path.join(this.root, 'patilanci-checksums.json');
    this.read = read;
    this.previous = {};
    this.current = Object.create(null);
    try {
      const cached = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (
        cached.version === 1 &&
        cached.entries &&
        typeof cached.entries === 'object'
      )
        this.previous = cached.entries;
    } catch {}
  }
  check(hash, file) {
    try {
      const stat = fs.statSync(file);
      if (!stat.isFile()) return false;
      if (!hash) return true;
      if (!/^[a-f0-9]{40}$/i.test(hash)) return false;
      const expected = hash.toLowerCase();
      const key = path.relative(this.root, path.resolve(file));
      const inside =
        key &&
        !key.startsWith(`..${path.sep}`) &&
        key !== '..' &&
        !path.isAbsolute(key);
      const fingerprint = [
        expected,
        stat.size,
        stat.mtimeMs,
        stat.ctimeMs,
        stat.dev,
        stat.ino,
      ];
      const cached = this.current[key] || this.previous[key];
      if (
        inside &&
        Array.isArray(cached) &&
        fingerprint.every((value, index) => value === cached[index])
      ) {
        this.current[key] = fingerprint;
        return true;
      }
      const verified =
        crypto.createHash('sha1').update(this.read(file)).digest('hex') ===
        expected;
      if (verified && inside) this.current[key] = fingerprint;
      return verified;
    } catch {
      return false;
    }
  }
  save() {
    const temporary = `${this.file}.tmp`;
    try {
      fs.writeFileSync(
        temporary,
        JSON.stringify({ version: 1, entries: this.current }),
      );
      fs.renameSync(temporary, this.file);
    } catch {
      // A read-only cache must never prevent Minecraft from starting.
      try {
        fs.unlinkSync(temporary);
      } catch {}
    }
  }
}
module.exports = { FileVerification };
