const https = require('node:https');
const dns = require('node:dns');
const { BlockList, isIP } = require('node:net');

const blocked4 = new BlockList();
const blocked6 = new BlockList();
const globalIPv6 = new BlockList();
globalIPv6.addSubnet('2000::', 3, 'ipv6');
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
])
  blocked4.addSubnet(address, prefix, 'ipv4');
for (const [address, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['::ffff:0:0', 96],
  ['64:ff9b::', 96],
  ['2001::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
])
  blocked6.addSubnet(address, prefix, 'ipv6');

function isPublicAddress(address) {
  const family = isIP(address);
  return (
    family !== 0 &&
    (family !== 6 || globalIPv6.check(address, 'ipv6')) &&
    !(family === 6 ? blocked6 : blocked4).check(
      address,
      family === 6 ? 'ipv6' : 'ipv4',
    )
  );
}

// Validate DNS results inside the connection lookup, so the socket uses the
// checked address. Redirects, local services, credentials, and custom ports are refused.
function publicSkinResponse(
  input,
  { lookup = dns.lookup, request = https.get } = {},
) {
  const url = new URL(input);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    (isIP(hostname) && !isPublicAddress(hostname))
  )
    throw new Error('Use a public HTTPS skin PNG URL.');
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        signal: AbortSignal.timeout(12000),
        lookup(host, options, callback) {
          lookup(host, { all: true }, (error, addresses) => {
            if (error) return callback(error);
            if (
              !addresses?.length ||
              addresses.some(({ address }) => !isPublicAddress(address))
            )
              return callback(
                new Error('Private and local skin URLs are not supported.'),
              );
            if (options.all) callback(null, addresses);
            else callback(null, addresses[0].address, addresses[0].family);
          });
        },
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.destroy();
          reject(
            new Error('Use a direct public skin PNG URL without redirects.'),
          );
        } else resolve({ ok: true, body: response });
      },
    );
    req.once('error', reject);
  });
}

module.exports = { publicSkinResponse, isPublicAddress };
