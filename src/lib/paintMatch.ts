import {
  LOWES_MATCHES,
  VERIFIED_BRANDS,
  isLowesMatchColor,
  purchaseLabel,
  type BrandOption,
  type PaintColor,
} from "./paint.ts";
import {
  deltaE2000,
  hexToLab,
  type Lab,
} from "./paintMixSimulator.ts";

export type ResolvedPaintLightnessMode =
  | "independent"
  | "lighter"
  | "darker";

export type PaintMatch = {
  paintColor: PaintColor;
  distance: number;
};

export type PaintLab = {
  paintColor: PaintColor;
  lab: Lab;
};

export const DEFAULT_PAINT_MATCH_BRAND: BrandOption = "Any";
export const LAB_LIGHTNESS_INDEX = 0;

const LIGHTNESS_DIRECTION_TOLERANCE = 0.25;
const MATCH_LIST_START_INDEX = 0;
const EQUAL_DISTANCE = 0;
const SORT_BEFORE = -1;
const SORT_AFTER = 1;

export function getGroundablePaintColors(
  allPaintColors: PaintColor[],
  brand: BrandOption = DEFAULT_PAINT_MATCH_BRAND,
  verified = false,
): PaintColor[] {
  return allPaintColors.filter((color) => {
    if (color.available === false) return false;
    if (brand === LOWES_MATCHES) return isLowesMatchColor(color);
    if (verified && !VERIFIED_BRANDS.has(color.brand)) return false;
    if (brand === DEFAULT_PAINT_MATCH_BRAND) return true;
    return color.brand === brand;
  });
}

export function findClosestPaintMatches(
  hex: string,
  paintLabs: PaintLab[],
  matchCount: number,
  lightnessMode: ResolvedPaintLightnessMode = "independent",
  preferredPurchaseLabel?: string,
): PaintMatch[] {
  const targetLab = hexToLab(hex);
  const directionalPaints = paintLabs.filter(({ lab }) => {
    if (lightnessMode === "independent") return true;
    const targetLightness = targetLab[LAB_LIGHTNESS_INDEX];
    const paintLightness = lab[LAB_LIGHTNESS_INDEX];
    return lightnessMode === "lighter"
      ? paintLightness >= targetLightness - LIGHTNESS_DIRECTION_TOLERANCE
      : paintLightness <= targetLightness + LIGHTNESS_DIRECTION_TOLERANCE;
  });
  const candidates =
    directionalPaints.length > MATCH_LIST_START_INDEX
      ? directionalPaints
      : paintLabs;
  const preferredLabel = preferredPurchaseLabel?.trim();

  return candidates
    .map(({ paintColor, lab }) => ({
      paintColor,
      distance: deltaE2000(targetLab, lab),
    }))
    .sort((first, second) => {
      const distanceDifference = first.distance - second.distance;
      if (distanceDifference !== EQUAL_DISTANCE) return distanceDifference;
      if (!preferredLabel) return EQUAL_DISTANCE;

      const firstIsPreferred = purchaseLabel(first.paintColor) === preferredLabel;
      const secondIsPreferred =
        purchaseLabel(second.paintColor) === preferredLabel;
      if (firstIsPreferred === secondIsPreferred) return EQUAL_DISTANCE;
      return firstIsPreferred ? SORT_BEFORE : SORT_AFTER;
    })
    .slice(MATCH_LIST_START_INDEX, matchCount);
}
