function verifyTransparentIcon(image, label) {
  if (image.isEmpty()) throw new Error(`${label}: icon is empty.`);
  const { width, height } = image.getSize();
  const pixels = image.toBitmap();
  let transparent = 0;
  let opaque = 0;
  let cream = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] === 0) transparent++;
    if (pixels[offset + 3] === 255) {
      opaque++;
      // NativeImage bitmaps use BGRA on Windows. The cream monogram is light
      // in all three channels, unlike the old red, black and gold SMP artwork.
      if (Math.min(...pixels.subarray(offset, offset + 3)) > 200) cream++;
    }
  }
  const count = width * height;
  if (
    transparent < count * 0.2 ||
    opaque < count * 0.1 ||
    cream < opaque * 0.99
  ) {
    throw new Error(
      `${label}: expected a visible cream monogram on a transparent background.`,
    );
  }
  for (const offset of [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    (count - 1) * 4,
  ]) {
    if (pixels[offset + 3] !== 0)
      throw new Error(`${label}: icon corners must be transparent.`);
  }
  return { width, height, transparent, opaque };
}

module.exports = { verifyTransparentIcon };
