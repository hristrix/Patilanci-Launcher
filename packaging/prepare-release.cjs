const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { serviceUrl } = require('../electron/download-service-config.cjs');

function releaseDetails(pkg, lock, changelog) {
  const version = pkg.version;
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version))
    throw new Error(
      'Production releases require a stable MAJOR.MINOR.PATCH version.',
    );
  if (lock.version !== version || lock.packages?.['']?.version !== version)
    throw new Error('Package and lockfile versions must match.');
  const sections = changelog.split(/^## /m).slice(1);
  const section = sections.find((entry) => entry.startsWith(`${version} - `));
  if (!section || !section.slice(section.indexOf('\n') + 1).trim())
    throw new Error(`Add release notes for ${version} to CHANGELOG.md.`);
  return { version, tag: `v${version}`, notes: `## ${section.trim()}\n` };
}

function checkExistingRelease(release, sha) {
  if (!release) return false;
  if (!release.draft)
    throw new Error(
      'This version is already published. Bump the version and update CHANGELOG.md before pushing to master.',
    );
  if (release.target_commitish !== sha)
    throw new Error(
      'A draft for this version belongs to another commit. Use a new version or remove the abandoned draft.',
    );
  return true;
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const env = process.env;
  if (
    env.GITHUB_EVENT_NAME !== 'push' ||
    env.GITHUB_REF !== 'refs/heads/master'
  )
    throw new Error(
      'Installer releases are allowed only for pushes to master.',
    );
  for (const name of [
    'CSC_LINK',
    'CSC_KEY_PASSWORD',
    'PUBLIC_DOWNLOAD_SERVICE_URL',
  ]) {
    if (!env[name]?.trim())
      throw new Error(
        `Configure the ${name} GitHub Actions ${name === 'PUBLIC_DOWNLOAD_SERVICE_URL' ? 'variable' : 'secret'} before releasing.`,
      );
  }
  const downloadUrl = serviceUrl(env.PUBLIC_DOWNLOAD_SERVICE_URL);
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  const details = releaseDetails(
    JSON.parse(read('package.json')),
    JSON.parse(read('package-lock.json')),
    read('CHANGELOG.md'),
  );
  // Tags already present must identify this exact build, including annotated tags.
  let taggedCommit;
  try {
    taggedCommit = execFileSync('git', ['rev-list', '-n', '1', details.tag], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    /* A new version has no tag yet. GitHub creates it on release. */
  }
  if (taggedCommit && taggedCommit !== env.GITHUB_SHA)
    throw new Error(
      'This version tag belongs to another commit. Bump the version before releasing.',
    );
  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/releases/tags/${details.tag}`,
    {
      headers: {
        Authorization: `Bearer ${env.GH_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok && response.status !== 404)
    throw new Error(
      `Could not check existing GitHub release (HTTP ${response.status}).`,
    );
  const existingDraft = checkExistingRelease(
    response.status === 404 ? null : await response.json(),
    env.GITHUB_SHA,
  );
  // Bake the public URL into the installer; runner environment variables do not
  // exist on player computers. Never embed the server's CurseForge credential.
  const configPath = path.join(root, 'electron/download-service-config.cjs');
  const config = fs.readFileSync(configPath, 'utf8');
  const declaration = /^const PUBLIC_DOWNLOAD_SERVICE_URL = .*;$/m;
  if (!declaration.test(config))
    throw new Error('Public download service declaration was not found.');
  fs.writeFileSync(
    configPath,
    config.replace(
      declaration,
      () =>
        `const PUBLIC_DOWNLOAD_SERVICE_URL = ${JSON.stringify(downloadUrl)};`,
    ),
  );
  fs.writeFileSync(
    path.join(env.RUNNER_TEMP, 'release-notes.md'),
    details.notes,
  );
  fs.appendFileSync(
    env.GITHUB_OUTPUT,
    `version=${details.version}\ntag=${details.tag}\nexisting_draft=${existingDraft}\n`,
  );
  console.log(
    `Prepared ${details.tag}. The signed installer will be published after all checks pass.`,
  );
}

if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
module.exports = { releaseDetails, checkExistingRelease };
