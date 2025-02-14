import { ItemSizes } from "./types";

export const SIZE_STRING = {
  [ItemSizes.Fourteen_By_Seven]: `18" x 3 Feet`,
  [ItemSizes.Sixteen_By_Six]: `18" x 4 Feet`,
  [ItemSizes.Sixteen_By_Ten]: `30" x 4 Feet`,
  [ItemSizes.Twenty_By_Ten]: `30" x 5 Feet`,
  [ItemSizes.TwentyFour_By_Ten]: `30" x 6 Feet`,
  [ItemSizes.Twenty_By_Twelve]: `36" x 6 Feet`,
  [ItemSizes.TwentyFour_By_Twelve]: `36" x 7 Feet`,
  [ItemSizes.TwentyEight_By_Twelve]: `36 x 8 Feet`,
  [ItemSizes.TwentyEight_By_Sixteen]: `48" x 7 Feet`,
  [ItemSizes.ThirtyTwo_By_Sixteen]: `48" x 8 Feet`,
  [ItemSizes.ThirtySix_By_Sixteen]: `48" x 9 Feet`,
};

export const BLOCK_SIZE = 3; // inches

export const getDimensionsDetails = (size: ItemSizes | null) => {
  if (!size) return null;

  const [width, height] = size.split(" x ").map(Number);

  const dimensions = {
    inches: {
      width: width * BLOCK_SIZE,
      height: height * BLOCK_SIZE,
    },
    feet: {
      width: (width * BLOCK_SIZE) / 12,
      height: (height * BLOCK_SIZE) / 12,
    },
    blocks: {
      width,
      height,
      total: width * height,
    },
    area: {
      squareInches: width * BLOCK_SIZE * (height * BLOCK_SIZE),
      squareFeet: (width * BLOCK_SIZE * (height * BLOCK_SIZE)) / 144,
    },
    weight: {
      // Assuming 1 lb per square inch
      pounds: width * BLOCK_SIZE * (height * BLOCK_SIZE),
      kilograms: width * BLOCK_SIZE * (height * BLOCK_SIZE) * 0.453592, // Convert to kg
    },
  };

  return dimensions;
};
