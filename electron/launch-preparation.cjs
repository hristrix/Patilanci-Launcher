const { verifyLatestInstalledPack } = require('./releases.cjs');

async function prepareLaunch({
  install,
  readSettings,
  readInstalled,
  getLatest,
  prepareRuntime,
  controller,
}) {
  const cancelled = () => {
    if (controller.signal.aborted)
      throw new Error('Minecraft launch cancelled.');
  };
  cancelled();
  await install({ refreshInventory: false });
  cancelled();
  const [settings, pack] = await Promise.all([readSettings(), readInstalled()]);
  if (!pack) throw new Error('Install the modpack before launching Minecraft.');
  try {
    const [, javaPath] = await Promise.all([
      verifyLatestInstalledPack(pack, getLatest),
      prepareRuntime(pack, settings),
    ]);
    cancelled();
    return { pack, settings, javaPath };
  } catch (error) {
    // In particular, stop a runtime download when the fresh release check fails.
    controller.abort();
    throw error;
  }
}
module.exports = { prepareLaunch };
