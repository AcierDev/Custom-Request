const COMPONENTS = [0x52, 0x47, 0x42]; // RGB, as indicated by the Adobe transform marker.
const BLOCK_SIZE = 8;

function segment(marker: number, data: number[]): Buffer {
  const size = data.length + 2;
  return Buffer.from([0xff, marker, size >> 8, size & 0xff, ...data]);
}

const HEADER = Buffer.concat([
  Buffer.from([0xff, 0xd8]),
  segment(0xee, [...Buffer.from("Adobe"), 0, 100, 0, 0, 0, 0, 0]),
  segment(0xdb, [0, ...Array<number>(64).fill(1)]), // Unit quantization keeps RGB exact.
  segment(0xc0, [
    8, 0, BLOCK_SIZE, 0, BLOCK_SIZE, COMPONENTS.length,
    ...COMPONENTS.flatMap((channel) => [channel, 0x11, 0]),
  ]),
  segment(0xc4, [
    // DC table: 12 amplitude categories, all assigned four-bit codes.
    0x00, 0, 0, 0, 12, ...Array<number>(12).fill(0),
    ...Array.from({ length: 12 }, (_, index) => index),
    // AC table: a single one-bit end-of-block code.
    0x10, 1, ...Array<number>(15).fill(0), 0,
  ]),
  segment(0xda, [
    COMPONENTS.length, ...COMPONENTS.flatMap((channel) => [channel, 0]),
    0, 63, 0,
  ]),
]);

/** Encode one constant 8×8 RGB block per channel for the USDZ artwork texture. */
export function encodeSolidJpeg(swatch: string): Buffer {
  if (!/^#[\da-f]{6}$/i.test(swatch)) throw new Error("Invalid artwork color");

  const output: number[] = [];
  let bits = 0;
  let bitCount = 0;
  function write(value: number, length: number) {
    bits = (bits << length) | value;
    bitCount += length;
    while (bitCount >= 8) {
      bitCount -= 8;
      const byte = (bits >> bitCount) & 0xff;
      output.push(byte);
      if (byte === 0xff) output.push(0);
    }
    bits &= (1 << bitCount) - 1;
  }

  for (const sample of Buffer.from(swatch.slice(1), "hex")) {
    const dc = BLOCK_SIZE * (sample - 128);
    const category = dc === 0 ? 0 : Math.floor(Math.log2(Math.abs(dc))) + 1;
    write(category, 4);
    if (category) write(dc < 0 ? (1 << category) - 1 + dc : dc, category);
    write(0, 1); // A solid channel has no AC frequencies.
  }

  if (bitCount) {
    const padding = 8 - bitCount;
    write((1 << padding) - 1, padding);
  }
  return Buffer.concat([HEADER, Buffer.from([...output, 0xff, 0xd9])]);
}
