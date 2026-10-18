const {
  serviceUrl,
  PUBLIC_DOWNLOAD_SERVICE_URL,
} = require('./download-service-config.cjs');

if (!PUBLIC_DOWNLOAD_SERVICE_URL || !serviceUrl(PUBLIC_DOWNLOAD_SERVICE_URL)) {
  throw new Error(
    'Set PUBLIC_DOWNLOAD_SERVICE_URL in electron/download-service-config.cjs before distributing the launcher. New players cannot use the developer computer’s local credential.',
  );
}
console.log('The player installer has a public download service configured.');
