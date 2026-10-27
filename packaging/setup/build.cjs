const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'artifacts/setup-ui');

// The launcher already ships licensed Fontsource WOFF fonts. Repack the same
// OpenType tables for WPF, without a font download or another dependency.
function openType(woff, rename) {
  if (woff.toString('ascii', 0, 4) !== 'wOFF')
    throw Error('Expected WOFF font');
  const count = woff.readUInt16BE(12);
  const tables = [];
  for (let i = 0; i < count; i++) {
    const at = 44 + i * 20;
    const tag = woff.toString('ascii', at, at + 4);
    const offset = woff.readUInt32BE(at + 4);
    const compressed = woff.readUInt32BE(at + 8);
    const length = woff.readUInt32BE(at + 12);
    let data = Buffer.from(woff.subarray(offset, offset + compressed));
    if (compressed !== length) data = zlib.inflateSync(data);
    if (data.length !== length) throw Error('Invalid font table length');
    if (tag === 'name' && rename) {
      const start = data.readUInt16BE(4);
      for (let j = 0; j < data.readUInt16BE(2); j++) {
        const record = 6 + j * 12;
        const platform = data.readUInt16BE(record);
        const offset = start + data.readUInt16BE(record + 10);
        const size = data.readUInt16BE(record + 8);
        const raw = Buffer.from(data.subarray(offset, offset + size));
        const value =
          platform === 3
            ? raw.swap16().toString('utf16le')
            : raw.toString('ascii');
        const changed = value.replaceAll(rename[0], rename[1]);
        const bytes =
          platform === 3
            ? Buffer.from(changed, 'utf16le').swap16()
            : Buffer.from(changed, 'ascii');
        if (bytes.length !== size)
          throw Error('Font family renames must preserve length');
        bytes.copy(data, offset);
      }
    }
    if (tag === 'head') data.writeUInt32BE(0, 8);
    tables.push({ tag, data });
  }
  const aligned = (n) => (n + 3) & ~3;
  const result = Buffer.alloc(
    12 + count * 16 + tables.reduce((n, t) => n + aligned(t.data.length), 0),
  );
  result.writeUInt32BE(woff.readUInt32BE(4), 0);
  result.writeUInt16BE(count, 4);
  const power = Math.floor(Math.log2(count));
  result.writeUInt16BE(2 ** power * 16, 6);
  result.writeUInt16BE(power, 8);
  result.writeUInt16BE(count * 16 - 2 ** power * 16, 10);
  const checksum = (b) => {
    let sum = 0;
    for (let i = 0; i < b.length; i += 4) {
      let word = 0;
      for (let j = 0; j < 4; j++) word = (word << 8) | (b[i + j] || 0);
      sum = (sum + (word >>> 0)) >>> 0;
    }
    return sum;
  };
  let offset = 12 + count * 16,
    head;
  tables.forEach((table, index) => {
    const at = 12 + index * 16;
    result.write(table.tag, at, 4, 'ascii');
    result.writeUInt32BE(checksum(table.data), at + 4);
    result.writeUInt32BE(offset, at + 8);
    result.writeUInt32BE(table.data.length, at + 12);
    table.data.copy(result, offset);
    if (table.tag === 'head') head = offset;
    offset += aligned(table.data.length);
  });
  result.writeUInt32BE((0xb1b0afba - checksum(result)) >>> 0, head + 8);
  return result;
}

function buildSetup() {
  if (process.platform !== 'win32')
    throw Error('Custom Windows setup must be built on Windows.');
  fs.mkdirSync(output, { recursive: true });
  for (const [family, weight, rename] of [
    ['oswald', 600, ['Oswald', 'OswCyr']],
    ['manrope', 500, ['Manrope', 'ManCyrl']],
  ]) {
    for (const subset of ['latin', 'cyrillic']) {
      const file = path.join(
        root,
        `node_modules/@fontsource/${family}/files/${family}-${subset}-${weight}-normal.woff`,
      );
      fs.writeFileSync(
        path.join(output, `${family}-${subset}.ttf`),
        openType(fs.readFileSync(file), subset === 'cyrillic' ? rename : null),
      );
    }
    fs.copyFileSync(
      path.join(root, `node_modules/@fontsource/${family}/LICENSE`),
      path.join(output, `${family}-LICENSE.txt`),
    );
  }
  fs.copyFileSync(
    path.join(
      root,
      'new_layout_and_ui/Patilanci Launcher Installer Settings.png',
    ),
    path.join(output, 'reference.png'),
  );
  fs.copyFileSync(
    path.join(root, 'public/brand/patilanci-icon.png'),
    path.join(output, 'brand.png'),
  );
  const framework = path.join(
    process.env.WINDIR || 'C:/Windows',
    'Microsoft.NET/Framework64/v4.0.30319',
  );
  const version = require('../../package.json').version;
  const metadata = path.join(root, 'artifacts/setup-version.cs');
  fs.writeFileSync(
    metadata,
    `using System.Reflection;\n[assembly: AssemblyVersion("${version}.0")]\n[assembly: AssemblyFileVersion("${version}.0")]\n[assembly: AssemblyInformationalVersion("${version}")]\n[assembly: AssemblyProduct("Patilanci Launcher Setup")]\n[assembly: AssemblyCompany("Hristrix")]\n`,
  );
  const references = [
    'PresentationFramework',
    'PresentationCore',
    'WindowsBase',
  ].map((name) => `/reference:${path.join(framework, 'WPF', name + '.dll')}`);
  references.push(
    `/reference:${path.join(framework, 'System.Xaml.dll')}`,
    `/reference:${path.join(framework, 'System.Windows.Forms.dll')}`,
  );
  const compiled = spawnSync(
    path.join(framework, 'csc.exe'),
    [
      '/nologo',
      '/target:winexe',
      '/platform:anycpu',
      '/optimize+',
      `/win32icon:${path.join(root, 'packaging/resources/patilanci.ico')}`,
      `/out:${path.join(output, 'PatilanciSetup.exe')}`,
      ...references,
      metadata,
      path.join(__dirname, 'Setup.cs'),
    ],
    { stdio: 'inherit' },
  );
  if (compiled.error) throw compiled.error;
  if (compiled.status !== 0) throw Error('Custom setup compilation failed.');
  console.log('Built the native custom installation and uninstall UI.');
}

if (require.main === module) buildSetup();
module.exports = { buildSetup, openType };
