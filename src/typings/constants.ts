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

export enum BlockSize {
  Mini = 0.4416,
  Normal = 0.5,
}
