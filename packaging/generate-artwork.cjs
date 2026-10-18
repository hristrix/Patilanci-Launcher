const fs = require('node:fs/promises');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const resources = path.join(__dirname, 'resources');
const artworkProfile = path.resolve(__dirname, '../artifacts/artwork-profile');
require('node:fs').mkdirSync(artworkProfile, { recursive: true });
app.setPath('userData', artworkProfile);
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.on('window-all-closed', () => {});

function bitmap24(image) {
  const { width, height } = image.getSize();
  const pixels = image.toBitmap();
  const stride = Math.ceil((width * 3) / 4) * 4;
  const output = Buffer.alloc(54 + stride * height);
  output.write('BM');
  output.writeUInt32LE(output.length, 2);
  output.writeUInt32LE(54, 10);
  output.writeUInt32LE(40, 14);
  output.writeInt32LE(width, 18);
  output.writeInt32LE(height, 22);
  output.writeUInt16LE(1, 26);
  output.writeUInt16LE(24, 28);
  output.writeUInt32LE(stride * height, 34);

  // NativeImage is BGRA on Windows; BMP stores bottom-up BGR scanlines.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const source = (y * width + x) * 4;
      const target = 54 + (height - y - 1) * stride + x * 3;
      pixels.copy(output, target, source, source + 3);
    }
  }
  return output;
}

function icon(image) {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const frames = sizes.map((size) =>
    image.resize({ width: size, height: size }).toPNG(),
  );
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;

  sizes.forEach((size, index) => {
    const entry = 6 + index * 16;
    header[entry] = size === 256 ? 0 : size;
    header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(frames[index].length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += frames[index].length;
  });
  return Buffer.concat([header, ...frames]);
}

async function render(layout, width, height) {
  const window = new BrowserWindow({
    show: false,
    useContentSize: true,
    width,
    height,
    webPreferences: {
      sandbox: true,
      offscreen: true,
      backgroundThrottling: false,
    },
  });
  try {
    await window.loadFile(path.join(__dirname, 'installer-artwork.html'), {
      query: { layout },
    });
    await window.webContents.executeJavaScript(`
      Promise.all([
        document.fonts.ready,
        ...Array.from(document.images, image => image.decode()),
      ]).then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    `);
    const image = await window.webContents.capturePage();
    if (image.isEmpty() || image.toPNG().length === 0) {
      throw new Error(`The ${layout} artwork did not render.`);
    }
    return image;
  } finally {
    window.destroy();
  }
}

app
  .whenReady()
  .then(async () => {
    await fs.mkdir(path.join(resources, 'appx'), { recursive: true });
    await fs.mkdir(path.join(resources, 'store-listing'), { recursive: true });

    const sidebar = await render('sidebar', 164, 314);
    await fs.writeFile(
      path.join(resources, 'installer-sidebar.bmp'),
      bitmap24(sidebar),
    );
    await fs.writeFile(
      path.join(resources, 'installer-sidebar.png'),
      sidebar.toPNG(),
    );
    const header = await render('header', 150, 57);
    await fs.writeFile(
      path.join(resources, 'installer-header.bmp'),
      bitmap24(header),
    );

    const tile = await render('tile', 1024, 1024);
    await fs.writeFile(path.join(resources, 'patilanci.ico'), icon(tile));
    for (const [name, size] of [
      ['StoreLogo', 50],
      ['Square44x44Logo', 44],
      ['Square150x150Logo', 150],
      ['Square310x310Logo', 310],
    ]) {
      await fs.writeFile(
        path.join(resources, 'appx', `${name}.png`),
        tile.resize({ width: size, height: size }).toPNG(),
      );
    }
    const wide = await render('wide', 310, 150);
    await fs.writeFile(
      path.join(resources, 'appx', 'Wide310x150Logo.png'),
      wide.toPNG(),
    );
    await fs.writeFile(
      path.join(resources, 'store-listing', 'StoreLogo-300.png'),
      tile.resize({ width: 300, height: 300 }).toPNG(),
    );
    console.log(
      'Generated branded installer icons, wizard artwork, and Store tile assets.',
    );
    app.quit();
  })
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
