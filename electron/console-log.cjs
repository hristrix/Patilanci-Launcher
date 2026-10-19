const { stripVTControlCharacters } = require('node:util');

function createConsoleLog({
  limit = 2000,
  maxLength = 4000,
  now = Date.now,
} = {}) {
  let entries = [],
    pending = '',
    nextId = 0,
    generation = 0;
  let status = 'idle',
    secrets = [];
  function clean(value) {
    let text = stripVTControlCharacters(String(value)).replace(
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,
      '',
    );
    for (const secret of secrets) text = text.split(secret).join('[redacted]');
    return text
      .replace(/(Bearer\s+)[^\s"']+/gi, '$1[redacted]')
      .replace(
        /((?:--|["']?)(?:access[_-]?token|client[_-]?token|refresh[_-]?token|api[_-]?key)["']?\s*(?:=|:|\s)\s*["']?)[^\s,"']+/gi,
        '$1[redacted]',
      );
  }
  function append(text, source = 'launcher', level) {
    for (const line of String(text).split(/\r\n|[\r\n]/)) {
      const message = clean(line);
      if (!message) continue;
      entries.push({
        id: ++nextId,
        time: now(),
        source,
        level:
          level ||
          (/\b(ERROR|FATAL)\b|Exception(?:[:\s]|$)/i.test(message)
            ? 'error'
            : /\bWARN(?:ING)?\b/i.test(message)
              ? 'warn'
              : 'info'),
        message:
          message.length > maxLength
            ? message.slice(0, maxLength) + '…'
            : message,
      });
    }
    if (entries.length > limit) entries = entries.slice(-limit);
  }
  function write(chunk) {
    const lines = (pending + String(chunk)).split(/\r\n|[\r\n]/);
    pending = lines.pop();
    for (const line of lines) append(line, 'minecraft');
    if (pending.length > maxLength * 2) {
      append(pending, 'minecraft');
      pending = '';
    }
  }
  function flush() {
    if (pending) append(pending, 'minecraft');
    pending = '';
  }
  function clear() {
    entries = [];
    pending = '';
    generation++;
  }
  return {
    append,
    write,
    flush,
    clear,
    start(values = []) {
      clear();
      secrets = values.filter(
        (value) => typeof value === 'string' && value.length >= 4,
      );
      status = 'preparing';
      append('Preparing your Patilanci adventure.');
    },
    setStatus(value) {
      status = value;
    },
    active: () => status !== 'idle',
    snapshot(after = 0) {
      return {
        entries: entries.filter((entry) => entry.id > after),
        lastId: nextId,
        generation,
        status,
        limit,
      };
    },
  };
}

module.exports = { createConsoleLog };
