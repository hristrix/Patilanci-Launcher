// Keep the same in-memory download and integrity checks while reporting real
// transfer measurements. Progress notifications are limited to ten per second.
async function readDownload(
  response,
  { totalBytes, onProgress, now = Date.now } = {},
) {
  const length = Number(response.headers.get('content-length'));
  const total =
    Number.isFinite(totalBytes) && totalBytes > 0
      ? totalBytes
      : !response.headers.get('content-encoding') &&
          Number.isFinite(length) &&
          length > 0
        ? length
        : undefined;
  const chunks = [];
  const started = now();
  let transferred = 0;
  let published = started;
  const publish = (time) =>
    onProgress?.({
      transferred,
      total,
      bytesPerSecond: transferred / Math.max((time - started) / 1000, 0.001),
    });
  if (response.body) {
    for await (const chunk of response.body) {
      chunks.push(Buffer.from(chunk));
      transferred += chunk.byteLength;
      const time = now();
      if (time - published >= 100) {
        publish(time);
        published = time;
      }
    }
  }
  publish(now());
  return Buffer.concat(chunks, transferred);
}

module.exports = { readDownload };
