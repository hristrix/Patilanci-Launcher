export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Няма данни';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['КиБ', 'МиБ', 'ГиБ', 'ТиБ'];
  const power = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length,
  );
  return `${(bytes / 1024 ** power).toFixed(power >= 3 ? 2 : 1)} ${units[power - 1]}`;
}
export function storageLabel(storage) {
  if (!storage || storage.status === 'busy') return 'Изчисляване…';
  if (storage.status === 'error') return 'Няма данни';
  return `${storage.status === 'partial' ? 'Поне ' : ''}${formatBytes(storage.instanceBytes)}`;
}
