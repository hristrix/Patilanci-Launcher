const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readDownload } = require('../electron/download-progress.cjs');

test('downloads preserve the exact bytes and publish bounded transfer measurements', async () => {
  const events = [];
  let time = 0;
  const response = {
    headers: new Headers({ 'content-length': '6' }),
    body: (async function* () {
      yield Buffer.from('ab');
      yield Buffer.from('cd');
      yield Buffer.from('ef');
    })(),
  };
  const data = await readDownload(response, {
    onProgress: (event) => events.push(event),
    now: () => {
      time += 50;
      return time;
    },
  });
  assert.equal(data.toString(), 'abcdef');
  assert.equal(
    events.length,
    2,
    'Fast chunks are coalesced, then completion is published',
  );
  assert.deepEqual(events.at(-1), {
    transferred: 6,
    total: 6,
    bytesPerSecond: 30,
  });
});

test('metadata lengths take priority and compressed or unknown totals stay indeterminate', async () => {
  for (const [headers, totalBytes, expected] of [
    [{ 'content-length': '4' }, 12, 12],
    [
      { 'content-length': '4', 'content-encoding': 'gzip' },
      undefined,
      undefined,
    ],
    [{}, undefined, undefined],
  ]) {
    let final;
    await readDownload(
      { headers: new Headers(headers), body: [Buffer.from('data')] },
      {
        totalBytes,
        onProgress: (event) => {
          final = event;
        },
      },
    );
    assert.equal(final.total, expected);
    assert.equal(final.transferred, 4);
    assert.ok(Number.isFinite(final.bytesPerSecond));
  }
});

test('a failed stream rejects without returning partial download data', async () => {
  const response = {
    headers: new Headers(),
    body: (async function* () {
      yield Buffer.from('partial');
      throw new Error('Transfer interrupted');
    })(),
  };
  await assert.rejects(readDownload(response), /Transfer interrupted/);
});
