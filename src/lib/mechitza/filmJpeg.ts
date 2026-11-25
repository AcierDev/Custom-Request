export const MAX_FILM_BYTES = 140_000;
const MAX_IMAGE_DIMENSION = 2048;
const SUPPORTED_FRAMES = new Set([0xc0, 0xc1, 0xc2]);

export function isUploadedFilmJpeg(jpeg: Uint8Array): boolean {
  if (jpeg.length < 4 || jpeg.length > MAX_FILM_BYTES) return false;
  const view = new DataView(jpeg.buffer, jpeg.byteOffset, jpeg.byteLength);
  if (view.getUint16(0) !== 0xffd8 || view.getUint16(jpeg.length - 2) !== 0xffd9) {
    return false;
  }

  let offset = 2;
  let hasFrame = false;
  const end = jpeg.length - 2;
  while (offset < end) {
    if (jpeg[offset++] !== 0xff) return false;
    while (offset < end && jpeg[offset] === 0xff) offset++;
    if (offset + 2 >= end) return false;
    const marker = jpeg[offset++];
    const length = view.getUint16(offset);
    if (length < 2 || offset + length > end) return false;

    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4) {
      if (!SUPPORTED_FRAMES.has(marker) || hasFrame || length < 8 || jpeg[offset + 2] !== 8) return false;
      const height = view.getUint16(offset + 3);
      const width = view.getUint16(offset + 5);
      const channels = jpeg[offset + 7];
      if (
        width < 1 || height < 1 ||
        width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION ||
        (channels !== 1 && channels !== 3) || length !== 8 + 3 * channels
      ) return false;
      hasFrame = true;
    } else if (marker === 0xda) {
      const channels = jpeg[offset + 2];
      return hasFrame && channels >= 1 && channels <= 3 &&
        length === 6 + 2 * channels && offset + length < end;
    } else if (marker < 0xc0 || (marker >= 0xd0 && marker <= 0xd9)) {
      return false;
    }
    offset += length;
  }
  return false;
}
