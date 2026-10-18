const PAGE_SIZE = 50;
const MAX_FILES = 10000;
const PUBLISHED_RELEASE_TYPES = new Set([1, 2, 3]);

async function findLatestClientFile(fetchPage) {
  let latest = null;
  let index = 0;
  let totalCount = null;

  do {
    const response = await fetchPage({ index, pageSize: PAGE_SIZE });
    const files = response?.data;
    const pagination = response?.pagination;

    if (
      !Array.isArray(files) ||
      !pagination ||
      pagination.index !== index ||
      pagination.resultCount !== files.length ||
      !Number.isInteger(pagination.totalCount) ||
      pagination.totalCount < index + files.length ||
      files.length > PAGE_SIZE
    ) {
      throw new Error(
        'CurseForge returned an incomplete release list. Try again.',
      );
    }

    if (totalCount !== null && totalCount !== pagination.totalCount) {
      throw new Error('The release list changed while checking. Try again.');
    }

    totalCount = pagination.totalCount;
    if (totalCount > MAX_FILES) {
      throw new Error(
        'The complete release list exceeds the CurseForge API limit.',
      );
    }

    if (files.length === 0 && index < totalCount) {
      throw new Error(
        'CurseForge returned an incomplete release list. Try again.',
      );
    }

    for (const file of files) {
      if (file.isServerPack || !PUBLISHED_RELEASE_TYPES.has(file.releaseType)) {
        continue;
      }

      const publishedAt = Date.parse(file.fileDate);
      if (!Number.isFinite(publishedAt) || !Number.isInteger(file.id)) {
        throw new Error('CurseForge returned invalid release metadata.');
      }

      const latestDate = latest ? Date.parse(latest.fileDate) : -Infinity;
      if (
        publishedAt > latestDate ||
        (publishedAt === latestDate && file.id > latest.id)
      ) {
        latest = file;
      }
    }

    index += files.length;
  } while (index < totalCount);

  if (!latest) throw new Error('No published client modpack was found.');
  if (latest.isAvailable === false) {
    throw new Error(
      'The latest client modpack is unavailable. Older versions cannot be launched.',
    );
  }

  return latest;
}

async function verifyLatestInstalledPack(pack, getLatest) {
  let latest;
  try {
    latest = await getLatest();
  } catch (error) {
    throw new Error(
      `Launch blocked: the latest modpack could not be verified. ${error.message}`,
    );
  }

  if (!pack || pack.fileId !== latest.id) {
    throw new Error(
      'Launch blocked: a different client release is now the latest. Press Play again to update.',
    );
  }

  return pack;
}

module.exports = { findLatestClientFile, verifyLatestInstalledPack };
