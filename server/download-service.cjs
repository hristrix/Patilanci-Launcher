const http = require('node:http');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const Zip = require('adm-zip');
const { findLatestClientFile } = require('../electron/releases.cjs');

const PROJECT_ID = 1746375;
const API_ORIGIN = 'https://api.curseforge.com';

function createDownloadService({
  apiKey,
  publicBaseUrl,
  fetchUpstream = fetch,
  now = Date.now,
}) {
  if (!apiKey) throw new Error('Set PATILANCI_CURSEFORGE_KEY on the server.');
  const base = new URL(publicBaseUrl);
  if (
    base.protocol !== 'https:' ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  ) {
    throw new Error(
      'PUBLIC_DOWNLOAD_URL must be an HTTPS URL without credentials.',
    );
  }
  const publicUrl = base.href.replace(/\/$/, '');
  const prefix = base.pathname.replace(/\/$/, '');
  let manifestCache;
  let manifestRequest;

  async function api(route) {
    const response = await fetchUpstream(`${API_ORIGIN}/v1${route}`, {
      headers: { 'x-api-key': apiKey, 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(30000),
      redirect: 'error',
    });
    if (!response.ok)
      throw new Error(`CurseForge request failed (${response.status}).`);
    return response.json();
  }

  async function cdn(url) {
    let target = new URL(url);
    for (let redirects = 0; redirects < 4; redirects += 1) {
      if (
        target.protocol !== 'https:' ||
        !target.hostname.endsWith('.forgecdn.net') ||
        target.username ||
        target.password ||
        target.port
      ) {
        throw new Error('CurseForge returned an unsupported download host.');
      }
      const response = await fetchUpstream(target.href, {
        headers: { 'x-api-key': apiKey },
        redirect: 'manual',
        signal: AbortSignal.timeout(180000),
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        target = new URL(response.headers.get('location'), target);
        continue;
      }
      if (!response.ok || !response.body)
        throw new Error(`CurseForge download failed (${response.status}).`);
      return response;
    }
    throw new Error('Too many download redirects.');
  }

  async function fileInfo(project, file) {
    const result = await api(`/mods/${project}/files/${file}`);
    const info = result.data;
    if (!info || info.isAvailable === false)
      throw new Error('This pack file is unavailable.');
    const downloadUrl =
      info.downloadUrl ||
      (await api(`/mods/${project}/files/${file}/download-url`)).data;
    if (!downloadUrl)
      throw new Error('This file is unavailable for third-party download.');
    return { info, downloadUrl };
  }

  async function allowedFiles(forceRefresh = false) {
    if (!forceRefresh && manifestCache && manifestCache.expires > now())
      return manifestCache;
    if (!manifestRequest) {
      manifestRequest = (async () => {
        const latest = await findLatestClientFile(({ index, pageSize }) =>
          api(`/mods/${PROJECT_ID}/files?index=${index}&pageSize=${pageSize}`),
        );
        const { downloadUrl } = await fileInfo(PROJECT_ID, latest.id);
        const archive = await cdn(downloadUrl);
        const chunks = [];
        let size = 0;
        for await (const chunk of archive.body) {
          size += chunk.length;
          if (size > 64 * 1024 * 1024)
            throw new Error('The modpack archive exceeds the service limit.');
          chunks.push(Buffer.from(chunk));
        }
        const entry = new Zip(Buffer.concat(chunks)).getEntry('manifest.json');
        if (!entry || entry.header.size > 1024 * 1024)
          throw new Error('Invalid modpack manifest.');
        const manifest = JSON.parse(entry.getData().toString('utf8'));
        if (!Array.isArray(manifest.files))
          throw new Error('Invalid modpack manifest.');
        const allowed = new Set([`${PROJECT_ID}/${latest.id}`]);
        for (const file of manifest.files) {
          if (
            !Number.isSafeInteger(file.projectID) ||
            file.projectID <= 0 ||
            !Number.isSafeInteger(file.fileID) ||
            file.fileID <= 0
          ) {
            throw new Error('Invalid modpack file reference.');
          }
          allowed.add(`${file.projectID}/${file.fileID}`);
        }
        manifestCache = { allowed, expires: now() + 60000 };
        return manifestCache;
      })().finally(() => {
        manifestRequest = null;
      });
    }
    return manifestRequest;
  }

  function json(response, status, body) {
    response.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(JSON.stringify(body));
  }

  return async function handle(request, response) {
    try {
      if (request.method !== 'GET')
        return json(response, 405, { error: 'GET required.' });
      const url = new URL(request.url, publicUrl);
      const route = url.pathname.slice(prefix.length);
      if (prefix && !url.pathname.startsWith(`${prefix}/`))
        return json(response, 404, { error: 'Not found.' });
      if (route === '/health')
        return json(response, 200, { service: 'Patilanci downloads' });

      if (route === `/v1/mods/${PROJECT_ID}/files`) {
        const index = Number(url.searchParams.get('index') || 0);
        const pageSize = Number(url.searchParams.get('pageSize') || 50);
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= 10000 ||
          !Number.isInteger(pageSize) ||
          pageSize < 1 ||
          pageSize > 50
        ) {
          return json(response, 400, { error: 'Invalid pagination.' });
        }
        const result = await api(
          `/mods/${PROJECT_ID}/files?index=${index}&pageSize=${pageSize}`,
        );
        result.data = result.data.map((file) => ({
          ...file,
          downloadUrl: `${publicUrl}/download/${PROJECT_ID}/${file.id}`,
        }));
        return json(response, 200, result);
      }

      const metadata = route.match(
        /^\/v1\/mods\/(\d+)\/files\/(\d+)(\/download-url)?$/,
      );
      const download = route.match(/^\/download\/(\d+)\/(\d+)$/);
      const match = metadata || download;
      if (!match || url.search)
        return json(response, 404, { error: 'Not found.' });
      const [, project, file] = match;
      let manifest = await allowedFiles();
      if (
        project === String(PROJECT_ID) &&
        !manifest.allowed.has(`${project}/${file}`)
      ) {
        manifest = await allowedFiles(true);
      }
      if (!manifest.allowed.has(`${project}/${file}`)) {
        return json(response, 403, {
          error:
            'Only files referenced by the current Patilanci pack are served.',
        });
      }
      const { info, downloadUrl } = await fileInfo(project, file);
      const proxyUrl = `${publicUrl}/download/${project}/${file}`;
      if (metadata) {
        return json(response, 200, {
          data: metadata[3] ? proxyUrl : { ...info, downloadUrl: proxyUrl },
        });
      }

      const upstream = await cdn(downloadUrl);
      response.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      });
      await pipeline(Readable.fromWeb(upstream.body), response);
    } catch {
      // Never return credentials, upstream URLs, or authentication headers.
      if (response.headersSent) response.destroy();
      else
        json(response, 502, {
          error:
            'The Patilanci download service could not prepare this file. Retry later.',
        });
    }
  };
}

if (require.main === module) {
  const service = createDownloadService({
    apiKey: process.env.PATILANCI_CURSEFORGE_KEY,
    publicBaseUrl: process.env.PUBLIC_DOWNLOAD_URL,
  });
  const port = Number(process.env.PORT || 8787);
  http.createServer(service).listen(port, '127.0.0.1', () => {
    console.log(
      `Patilanci download service listening on 127.0.0.1:${port}. Place it behind HTTPS.`,
    );
  });
}

module.exports = { createDownloadService };
