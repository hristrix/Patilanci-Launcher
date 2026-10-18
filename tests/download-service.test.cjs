const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Writable } = require('node:stream');
const Zip = require('adm-zip');
const { createDownloadService } = require('../server/download-service.cjs');
const { serviceUrl } = require('../electron/download-service-config.cjs');

function fixture() {
  const requests = [];
  const zip = new Zip();
  zip.addFile(
    'manifest.json',
    Buffer.from(JSON.stringify({ files: [{ projectID: 5, fileID: 6 }] })),
  );
  const archive = zip.toBuffer();
  const latest = {
    id: 100,
    fileDate: '2026-10-18',
    releaseType: 1,
    isAvailable: true,
    isServerPack: false,
  };
  let unsafeDownload = false;
  const service = createDownloadService({
    apiKey: 'server-only-fixture',
    publicBaseUrl: 'https://downloads.example.com/launcher',
    fetchUpstream: async (url, options) => {
      requests.push({ url, options });
      assert.equal(options.headers['x-api-key'], 'server-only-fixture');
      if (url.includes('/files?'))
        return Response.json({
          data: [latest],
          pagination: { index: 0, resultCount: 1, totalCount: 1 },
        });
      if (url === 'https://edge.forgecdn.net/pack.zip')
        return new Response(archive);
      if (url === 'https://edge.forgecdn.net/mod.jar')
        return new Response('mod-file-fixture');
      if (url.endsWith('/mods/1746375/files/100'))
        return Response.json({
          data: {
            ...latest,
            downloadUrl: 'https://edge.forgecdn.net/pack.zip',
          },
        });
      if (url.endsWith('/mods/5/files/6'))
        return Response.json({
          data: {
            id: 6,
            downloadUrl: unsafeDownload
              ? 'https://evil.example.com/key-theft'
              : 'https://edge.forgecdn.net/mod.jar',
          },
        });
      throw new Error('Unexpected upstream request');
    },
  });
  async function call(url, method = 'GET') {
    const chunks = [];
    const response = new Writable({
      write(chunk, encoding, done) {
        chunks.push(Buffer.from(chunk));
        done();
      },
    });
    response.writeHead = (status, headers) => {
      response.statusCode = status;
      response.headers = headers;
      response.headersSent = true;
    };
    await service({ method, url }, response);
    return {
      status: response.statusCode,
      text: Buffer.concat(chunks).toString(),
      headers: response.headers,
    };
  }
  return {
    requests,
    call,
    setUnsafeDownload: () => {
      unsafeDownload = true;
    },
  };
}

test('fresh launchers obtain release metadata and download URLs without receiving the service credential', async () => {
  const { call } = fixture();
  const list = await call(
    '/launcher/v1/mods/1746375/files?index=0&pageSize=50',
  );
  assert.equal(list.status, 200);
  assert.equal(JSON.parse(list.text).data[0].id, 100);
  const metadata = await call('/launcher/v1/mods/5/files/6');
  assert.equal(metadata.status, 200);
  assert.equal(
    JSON.parse(metadata.text).data.downloadUrl,
    'https://downloads.example.com/launcher/download/5/6',
  );
  assert.equal(metadata.text.includes('server-only-fixture'), false);
  const downloaded = await call('/launcher/download/5/6');
  assert.equal(downloaded.status, 200);
  assert.equal(downloaded.text, 'mod-file-fixture');
});

test('the service cannot proxy arbitrary projects, old packs, or unrelated file IDs', async () => {
  const { call, requests } = fixture();
  assert.equal(
    (await call('/launcher/v1/mods/123/files?index=0&pageSize=50')).status,
    404,
  );
  assert.equal((await call('/launcher/download/1746375/99')).status, 403);
  assert.equal((await call('/launcher/download/999/888')).status, 403);
  assert.equal(
    requests.some(({ url }) => url.includes('/mods/999/')),
    false,
  );
});

test('download credentials cannot be redirected to an untrusted file host', async () => {
  const { call, requests, setUnsafeDownload } = fixture();
  setUnsafeDownload();
  const response = await call('/launcher/download/5/6');
  assert.equal(response.status, 502);
  assert.equal(response.text.includes('server-only-fixture'), false);
  assert.equal(
    requests.some(({ url }) => url.includes('evil.example.com')),
    false,
  );
});

test('invalid service routes, methods and pagination are rejected', async () => {
  const { call } = fixture();
  assert.equal((await call('/launcher/health')).status, 200);
  assert.equal((await call('/launcher/health', 'POST')).status, 405);
  assert.equal((await call('/other/health')).status, 404);
  assert.equal(
    (await call('/launcher/v1/mods/1746375/files?index=-1')).status,
    400,
  );
  assert.equal(
    (await call('/launcher/v1/mods/1746375/files?pageSize=1000')).status,
    400,
  );
  assert.equal(serviceUrl(''), null);
  assert.equal(
    serviceUrl('https://downloads.example.com/launcher/'),
    'https://downloads.example.com/launcher',
  );
  assert.throws(() => serviceUrl('http://downloads.example.com'));
  assert.throws(() => serviceUrl('https://secret@downloads.example.com'));
});
