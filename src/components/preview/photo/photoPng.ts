import { PHOTO_ASSET_CONFIG as A, PHOTO_MATH as M } from "./photoConfig.ts";

const PNG = { signatureBytes: 8, wordBytes: 4, chunkOverhead: 12, bitsPerByte: 8,
  crcPolynomial: 0xedb88320, crcInitial: 0xffffffff, keyword: "Description", textType: "tEXt", endType: "IEND" } as const;

/** Keep the asset credits with the photo without adding a visible watermark
 * or touching the encoded pixels. PNG tEXt is an ancillary, portable chunk. */
export async function addPhotoPngCredits(blob: Blob): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const insert = bytes.length - PNG.chunkOverhead;
  const decode = new TextDecoder();
  if (insert < PNG.signatureBytes || decode.decode(bytes.subarray(insert + PNG.wordBytes, insert + PNG.wordBytes * M.two)) !== PNG.endType)
    throw new Error("The photograph could not be encoded as PNG.");
  const encoder = new TextEncoder();
  const content = encoder.encode(`${PNG.keyword}\0${A.credits}`);
  const chunk = new Uint8Array(content.length + PNG.chunkOverhead);
  const view = new DataView(chunk.buffer);
  view.setUint32(M.zero, content.length);
  chunk.set(encoder.encode(PNG.textType), PNG.wordBytes);
  chunk.set(content, PNG.wordBytes * M.two);
  let crc: number = PNG.crcInitial;
  for (const byte of chunk.subarray(PNG.wordBytes, chunk.length - PNG.wordBytes)) {
    crc ^= byte;
    for (let bit = M.zero; bit < PNG.bitsPerByte; bit += M.one)
      crc = (crc >>> M.one) ^ (crc & M.one ? PNG.crcPolynomial : M.zero);
  }
  view.setUint32(chunk.length - PNG.wordBytes, (crc ^ PNG.crcInitial) >>> M.zero);
  return new Blob([bytes.subarray(M.zero, insert), chunk, bytes.subarray(insert)], { type: blob.type });
}
