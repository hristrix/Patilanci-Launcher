// Set the deployed HTTPS service URL before building a player installer.
// This is a public URL, never a CurseForge credential.
const PUBLIC_DOWNLOAD_SERVICE_URL = 'https://patilanci.net/launcher';

function serviceUrl(
  value = process.env.PATILANCI_DOWNLOAD_SERVICE_URL ||
    PUBLIC_DOWNLOAD_SERVICE_URL,
) {
  if (!value) return null;
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'The download service must use an HTTPS URL without credentials.',
    );
  }
  return url.href.replace(/\/$/, '');
}

module.exports = { serviceUrl, PUBLIC_DOWNLOAD_SERVICE_URL };
