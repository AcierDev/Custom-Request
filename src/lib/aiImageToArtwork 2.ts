import {
  AI_ARTWORK_PALETTE_INDEX_SYMBOLS,
  type AiArtwork,
  type AiPaletteColor,
} from "@/lib/aiPalette";

const AI_IMAGE_PIXEL_CONFIG = {
  channelCount: 3,
  redOffset: 0,
  greenOffset: 1,
  blueOffset: 2,
  pixelIncrement: 1,
  countIncrement: 1,
  minChannelValue: 0,
  maxChannelValue: 255,
  quantizationStep: 16,
  hexRadix: 16,
  hexChannelLength: 2,
  firstPaletteIndex: 0,
} as const;

interface ConvertImagePixelsInput {
  pixels: Uint8Array;
  width: number;
  height: number;
  maxPaletteColors: number;
}

interface QuantizedRgb {
  red: number;
  green: number;
  blue: number;
}

interface ColorBucket extends QuantizedRgb {
  count: number;
  firstSeenAt: number;
}

export interface AiImageArtworkResult {
  palette: AiPaletteColor[];
  artwork: AiArtwork;
}

const quantizeChannel = (value: number): number =>
  Math.min(
    AI_IMAGE_PIXEL_CONFIG.maxChannelValue,
    Math.max(
      AI_IMAGE_PIXEL_CONFIG.minChannelValue,
      Math.round(value / AI_IMAGE_PIXEL_CONFIG.quantizationStep) *
        AI_IMAGE_PIXEL_CONFIG.quantizationStep,
    ),
  );

const getQuantizedPixel = (
  pixels: Uint8Array,
  pixelIndex: number,
): QuantizedRgb => {
  const offset = pixelIndex * AI_IMAGE_PIXEL_CONFIG.channelCount;
  return {
    red: quantizeChannel(pixels[offset + AI_IMAGE_PIXEL_CONFIG.redOffset]),
    green: quantizeChannel(
      pixels[offset + AI_IMAGE_PIXEL_CONFIG.greenOffset],
    ),
    blue: quantizeChannel(pixels[offset + AI_IMAGE_PIXEL_CONFIG.blueOffset]),
  };
};

const rgbKey = ({ red, green, blue }: QuantizedRgb): string =>
  `${red},${green},${blue}`;

const channelToHex = (channel: number): string =>
  channel
    .toString(AI_IMAGE_PIXEL_CONFIG.hexRadix)
    .padStart(AI_IMAGE_PIXEL_CONFIG.hexChannelLength, "0")
    .toUpperCase();

const rgbToHex = ({ red, green, blue }: QuantizedRgb): string =>
  `#${channelToHex(red)}${channelToHex(green)}${channelToHex(blue)}`;

const colorDistanceSquared = (
  first: QuantizedRgb,
  second: QuantizedRgb,
): number => {
  const redDistance = first.red - second.red;
  const greenDistance = first.green - second.green;
  const blueDistance = first.blue - second.blue;
  return (
    redDistance * redDistance +
    greenDistance * greenDistance +
    blueDistance * blueDistance
  );
};

const findNearestPaletteIndex = (
  color: QuantizedRgb,
  palette: readonly QuantizedRgb[],
): number => {
  let nearestIndex: number = AI_IMAGE_PIXEL_CONFIG.firstPaletteIndex;
  let nearestDistance = Number.POSITIVE_INFINITY;
  palette.forEach((candidate, index) => {
    const distance = colorDistanceSquared(color, candidate);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex;
};

export const convertImagePixelsToAiArtwork = ({
  pixels,
  width,
  height,
  maxPaletteColors,
}: ConvertImagePixelsInput): AiImageArtworkResult => {
  const pixelCount = width * height;
  const hasValidInput =
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > AI_IMAGE_PIXEL_CONFIG.minChannelValue &&
    height > AI_IMAGE_PIXEL_CONFIG.minChannelValue &&
    Number.isInteger(maxPaletteColors) &&
    maxPaletteColors > AI_IMAGE_PIXEL_CONFIG.minChannelValue &&
    maxPaletteColors <= AI_ARTWORK_PALETTE_INDEX_SYMBOLS.length &&
    pixels.length === pixelCount * AI_IMAGE_PIXEL_CONFIG.channelCount;
  if (!hasValidInput) {
    throw new RangeError("AI image pixels do not match the artwork size.");
  }

  const buckets = new Map<string, ColorBucket>();
  for (
    let pixelIndex = AI_IMAGE_PIXEL_CONFIG.firstPaletteIndex;
    pixelIndex < pixelCount;
    pixelIndex += AI_IMAGE_PIXEL_CONFIG.pixelIncrement
  ) {
    const color = getQuantizedPixel(pixels, pixelIndex);
    const key = rgbKey(color);
    const existing = buckets.get(key);
    if (existing) {
      existing.count += AI_IMAGE_PIXEL_CONFIG.countIncrement;
    } else {
      buckets.set(key, {
        ...color,
        count: AI_IMAGE_PIXEL_CONFIG.countIncrement,
        firstSeenAt: pixelIndex,
      });
    }
  }

  const paletteColors = Array.from(buckets.values())
    .sort(
      (first, second) =>
        second.count - first.count || first.firstSeenAt - second.firstSeenAt,
    )
    .slice(AI_IMAGE_PIXEL_CONFIG.firstPaletteIndex, maxPaletteColors);
  const palette = paletteColors.map((color) => {
    const hex = rgbToHex(color);
    return { hex, name: hex };
  });
  const rows = Array.from({ length: height }, (_, rowIndex) =>
    Array.from({ length: width }, (_, columnIndex) => {
      const pixelIndex = rowIndex * width + columnIndex;
      const paletteIndex = findNearestPaletteIndex(
        getQuantizedPixel(pixels, pixelIndex),
        paletteColors,
      );
      return AI_ARTWORK_PALETTE_INDEX_SYMBOLS[paletteIndex];
    }).join(""),
  );

  return {
    palette,
    artwork: { width, height, rows },
  };
};
