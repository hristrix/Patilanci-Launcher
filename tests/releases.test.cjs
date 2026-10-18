const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  findLatestClientFile,
  verifyLatestInstalledPack,
} = require('../electron/releases.cjs');

function release(id, date, overrides = {}) {
  return {
    id,
    fileDate: date,
    releaseType: 1,
    isServerPack: false,
    isAvailable: true,
    ...overrides,
  };
}

function releasePages(files) {
  return async ({ index, pageSize }) => {
    const data = files.slice(index, index + pageSize);
    return {
      data,
      pagination: { index, resultCount: data.length, totalCount: files.length },
    };
  };
}

test('finds the newest client across pages without relying on API ordering', async () => {
  const files = Array.from({ length: 51 }, (_, index) =>
    release(index + 1, '2026-10-01'),
  );
  files.push(release(80, '2026-10-17', { releaseType: 2 }));
  files.push(release(90, '2026-10-18', { isServerPack: true }));
  const requests = [];
  const fetchPage = releasePages(files);
  const latest = await findLatestClientFile(async (page) => {
    requests.push(page.index);
    return fetchPage(page);
  });
  assert.equal(latest.id, 80);
  assert.deepEqual(requests, [0, 50]);
});

test('a newer alpha also takes precedence and equal dates use file IDs', async () => {
  const latest = await findLatestClientFile(
    releasePages([
      release(10, '2026-10-01'),
      release(11, '2026-10-18', { releaseType: 3 }),
      release(12, '2026-10-18', { releaseType: 3 }),
    ]),
  );
  assert.equal(latest.id, 12);
});

test('an unavailable newest release blocks instead of selecting an older pack', async () => {
  await assert.rejects(
    findLatestClientFile(
      releasePages([
        release(1, '2026-10-01'),
        release(2, '2026-10-18', { isAvailable: false }),
      ]),
    ),
    /latest client modpack is unavailable/,
  );
});

test('incomplete, changing and empty release lists cannot confirm an older pack', async () => {
  await assert.rejects(
    findLatestClientFile(async () => ({ data: [] })),
    /incomplete release list/,
  );
  await assert.rejects(
    findLatestClientFile(releasePages([])),
    /No published client modpack/,
  );
  const files = Array.from({ length: 51 }, (_, index) =>
    release(index + 1, '2026-10-01'),
  );
  const fetchPage = releasePages(files);
  await assert.rejects(
    findLatestClientFile(async (page) => {
      const response = await fetchPage(page);
      if (page.index > 0) response.pagination.totalCount += 1;
      return response;
    }),
    /release list changed/,
  );
});

test('launch requires the installed ID to match a fresh latest-release check', async () => {
  const pack = { fileId: 10 };
  assert.equal(
    await verifyLatestInstalledPack(pack, async () => ({ id: 10 })),
    pack,
  );
  await assert.rejects(
    verifyLatestInstalledPack(pack, async () => ({ id: 11 })),
    /Launch blocked/,
  );
  await assert.rejects(
    verifyLatestInstalledPack(null, async () => ({ id: 10 })),
    /Launch blocked/,
  );
});

test('API failure after installation blocks launch even with a cached pack', async () => {
  await assert.rejects(
    verifyLatestInstalledPack({ fileId: 10 }, async () => {
      throw new Error('HTTP 403');
    }),
    /Launch blocked.*could not be verified.*HTTP 403/,
  );
});
