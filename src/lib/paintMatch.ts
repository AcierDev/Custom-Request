import {
  ANY_PAINT_BRAND,
  LOWES_MATCHES,
  LOWES_WITH_FALLBACK,
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

type PaintSourceNamedColor = {
  name?: string;
  paintSourceHex?: string;
  paintSourceName?: string;
};

export const DEFAULT_PAINT_MATCH_BRAND: BrandOption = LOWES_WITH_FALLBACK;
export const LAB_LIGHTNESS_INDEX = 0;
export const LOWES_FALLBACK_MAX_MATCH_PERCENT = 97;

const LIGHTNESS_DIRECTION_TOLERANCE = 0.25;
const MATCH_LIST_START_INDEX = 0;
const EQUAL_DISTANCE = 0;
const SORT_BEFORE = -1;
const SORT_AFTER = 1;
const PAINT_MATCH_PERCENT_MIN = 0;
const PAINT_MATCH_PERCENT_MAX = 100;
const PAINT_MATCH_DE_FALLOFF = 1;
const INDEPENDENT_LIGHTNESS_MODE: ResolvedPaintLightnessMode = "independent";

export type PaintMatchSelection = {
  primaryMatch?: PaintMatch;
  backupMatch?: PaintMatch;
  lowesMatchIsPoor: boolean;
};

export function paintMatchPercent(deltaE: number): number {
  return Math.round(
    Math.max(
      PAINT_MATCH_PERCENT_MIN,
      Math.min(
        PAINT_MATCH_PERCENT_MAX,
        PAINT_MATCH_PERCENT_MAX - deltaE * PAINT_MATCH_DE_FALLOFF,
      ),
    ),
  );
}

export function paintSourceNameOf(
  color: PaintSourceNamedColor,
): string | undefined {
  return color.paintSourceHex !== undefined
    ? color.paintSourceName
    : color.name;
}

export function getGroundablePaintColors(
  allPaintColors: PaintColor[],
  brand: BrandOption = DEFAULT_PAINT_MATCH_BRAND,
  verified = false,
): PaintColor[] {
  return allPaintColors.filter((color) => {
    if (color.available === false) return false;
    if (brand === LOWES_MATCHES || brand === LOWES_WITH_FALLBACK) {
      return isLowesMatchColor(color);
    }
    if (verified && !VERIFIED_BRANDS.has(color.brand)) return false;
    if (brand === ANY_PAINT_BRAND) return true;
    return color.brand === brand;
  });
}

export function getLowesFallbackPaintColors(
  allPaintColors: PaintColor[],
  verified = false,
): PaintColor[] {
  return getGroundablePaintColors(
    allPaintColors,
    ANY_PAINT_BRAND,
    verified,
  ).filter((color) => !isLowesMatchColor(color));
}

export function selectPaintMatchResults(
  matches: PaintMatch[],
  fallbackMatches: PaintMatch[],
  brand: BrandOption,
): PaintMatchSelection {
  const primaryMatch = matches[MATCH_LIST_START_INDEX];
  const lowesMatchIsPoor = Boolean(
    primaryMatch &&
      brand === LOWES_WITH_FALLBACK &&
      paintMatchPercent(primaryMatch.distance) <=
        LOWES_FALLBACK_MAX_MATCH_PERCENT,
  );
  const primaryLabel = primaryMatch
    ? purchaseLabel(primaryMatch.paintColor)
    : undefined;
  const samePoolBackup = primaryLabel
    ? matches.find(
        (match) => purchaseLabel(match.paintColor) !== primaryLabel,
      )
    : undefined;

  return {
    primaryMatch,
    backupMatch: lowesMatchIsPoor
      ? fallbackMatches[MATCH_LIST_START_INDEX]
      : samePoolBackup,
    lowesMatchIsPoor,
  };
}

export function findClosestPaintMatches(
  hex: string,
  paintLabs: PaintLab[],
  matchCount: number,
  lightnessMode: ResolvedPaintLightnessMode = INDEPENDENT_LIGHTNESS_MODE,
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

export function findClosestLowesFallbackMatches(
  hex: string,
  paintLabs: PaintLab[],
  matchCount: number,
  preferredPurchaseLabel?: string,
): PaintMatch[] {
  return findClosestPaintMatches(
    hex,
    paintLabs,
    matchCount,
    INDEPENDENT_LIGHTNESS_MODE,
    preferredPurchaseLabel,
  );
}
