const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createConsoleLog } = require('../electron/console-log.cjs');

test('Minecraft chunks preserve partial lines and redact split credentials and ANSI sequences', () => {
  const log = createConsoleLog({ now: () => 123 });
  log.start(['private-player-token']);
  log.write('\x1b[31m[ERROR] token private-player-');
  log.write('token\x1b[0m\r\n[WARN] next\npartial');
  assert.equal(log.snapshot().entries.length, 3);
  log.flush();
  const entries = log.snapshot().entries;
  assert.equal(entries[1].message, '[ERROR] token [redacted]');
  assert.equal(entries[1].level, 'error');
  assert.equal(entries[1].source, 'minecraft');
  assert.equal(entries[1].time, 123);
  assert.equal(entries[2].level, 'warn');
  assert.equal(entries[3].message, 'partial');
  assert.doesNotMatch(JSON.stringify(entries), /private-player-token|\x1b/);
});

test('history, pending lines, and individual messages are bounded; cursors survive clear and new sessions', () => {
  const log = createConsoleLog({ limit: 3, maxLength: 20 });
  log.start();
  for (let i = 0; i < 20; i++) log.append(`Line ${i}`);
  const before = log.snapshot();
  assert.equal(before.entries.length, 3);
  assert.equal(before.entries[0].message, 'Line 17');
  assert.equal(log.snapshot(before.lastId).entries.length, 0);
  log.clear();
  assert.notEqual(log.snapshot().generation, before.generation);
  log.write('x'.repeat(10000));
  assert.ok(log.snapshot(before.lastId).entries[0].message.length <= 21);
  log.start();
  assert.equal(log.snapshot().status, 'preparing');
  assert.equal(log.snapshot().entries.length, 1);
  log.setStatus('stopped');
  assert.equal(log.snapshot().status, 'stopped');
});

test('sensitive command arguments and bearer tokens are removed without treating output as markup', () => {
  const log = createConsoleLog();
  log.append('--accessToken abcdef --clientToken ghijkl Bearer mnopqr');
  log.append('<script>alert(1)</script>');
  const text = JSON.stringify(log.snapshot().entries);
  assert.doesNotMatch(text, /abcdef|ghijkl|mnopqr/);
  assert.match(text, /\[redacted\]/);
  assert.equal(log.snapshot().entries[1].message, '<script>alert(1)</script>');
});
