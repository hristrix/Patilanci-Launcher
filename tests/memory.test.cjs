const { test } = require('node:test');
const assert = require('node:assert/strict');

const memoryModule = import('../src/lib/memory.mjs');

async function assess(allocation, total, available) {
  const { assessMemory, BYTES_PER_GB } = await memoryModule;
  return assessMemory(allocation, {
    totalBytes: total * BYTES_PER_GB,
    availableBytes: available * BYTES_PER_GB,
  });
}

test('normal pack allocation is healthy with enough physical and free RAM', async () => {
  const result = await assess(6, 16, 12);
  assert.equal(result.severity, 'ok');
  assert.equal(result.recommendedGb, 6);
});

test('allocation exceeding physical headroom warns even when memory is currently free', async () => {
  const result = await assess(7, 8, 8);
  assert.equal(result.severity, 'danger');
  assert.equal(result.recommendedGb, 5);
  assert.match(result.message, /забави компютъра|стартирането/);
});

test('a high allocation reserves RAM for the OS and Java outside the heap', async () => {
  const result = await assess(12, 16, 15);
  assert.equal(result.severity, 'warning');
  assert.equal(result.systemReserveGb, 4);
  assert.equal(result.javaOverheadGb, 1);
});

test('currently busy apps trigger a warning without changing total installed RAM', async () => {
  const busy = await assess(6, 16, 3);
  const free = await assess(6, 16, 12);
  assert.equal(busy.severity, 'warning');
  assert.equal(busy.recommendedGb, null);
  assert.equal(free.severity, 'ok');
});

test('low heap allocations warn about the pack needs', async () => {
  const result = await assess(2, 16, 10);
  assert.equal(result.severity, 'warning');
  assert.match(result.title, /нужда от повече памет/);
});

test('recommendations fit both physical and currently available headroom', async () => {
  for (const [total, available] of [
    [8, 8],
    [16, 7],
    [32, 24],
    [4, 3],
    [64, 60],
  ]) {
    const result = await assess(6, total, available);
    if (result.recommendedGb === null) continue;
    assert.ok(result.recommendedGb >= 4 && result.recommendedGb <= 6);
    assert.ok(
      result.recommendedGb + result.javaOverheadGb + result.systemReserveGb <=
        total,
    );
    assert.ok(result.recommendedGb + result.javaOverheadGb + 0.5 <= available);
  }
});

test('missing or invalid telemetry does not produce a false healthy result', async () => {
  const { assessMemory } = await memoryModule;
  assert.equal(assessMemory(6, null).severity, 'unknown');
  assert.equal((await assess(6, 0, 0)).severity, 'unknown');
  assert.equal((await assess(6, 8, 9)).severity, 'unknown');
  assert.equal((await assess(NaN, 16, 12)).severity, 'unknown');
});
