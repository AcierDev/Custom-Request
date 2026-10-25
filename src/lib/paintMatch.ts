import {
  ANY_PAINT_BRAND,
  LOWES_MATCHES,
  LOWES_WITH_FALLBACK,
  VERIFIED_BRANDS,
  VERIFIED_PAINT_COLORS,
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

type PaintSourceColor = PaintSourceNamedColor & {
  hex: string;
};

export const DEFAULT_PAINT_MATCH_BRAND: BrandOption = LOWES_WITH_FALLBACK;
export const LAB_LIGHTNESS_INDEX = 0;
/** @deprecated Match quality is now evaluated directly from Delta E. */
export const LOWES_FALLBACK_MAX_MATCH_PERCENT = 97;
export const LOWES_FALLBACK_MIN_DELTA_E = 3;
export const LOWES_FALLBACK_MATCH_COUNT = 1;

const LIGHTNESS_DIRECTION_TOLERANCE = 0.25;
const MATCH_LIST_START_INDEX = 0;
const EQUAL_DISTANCE = 0;
const SORT_BEFORE = -1;
const SORT_AFTER = 1;
const PAINT_MATCH_PERCENT_MIN = 0;
const PAINT_MATCH_PERCENT_MAX = 100;
const PAINT_MATCH_DE_FALLOFF = 1;
const INDEPENDENT_LIGHTNESS_MODE: ResolvedPaintLightnessMode = "independent";
const EXACT_MATCH_MAX_DELTA_E = 0.1;
const VERY_CLOSE_MATCH_MAX_DELTA_E = 2;
const CLOSE_MATCH_MAX_DELTA_E = 4;
const NOTICEABLE_MATCH_MAX_DELTA_E = 8;
const PAINT_MATCH_DELTA_E_DECIMAL_PLACES = 1;

export type PaintMatchQuality =
  | "Exact"
  | "Very close"
  | "Close"
  | "Noticeable difference"
  | "Poor match";

export type PaintMatchAssessment = {
  label: PaintMatchQuality;
};

export type PaintMatchSelection = {
  primaryMatch?: PaintMatch;
  backupMatch?: PaintMatch;
  lowesMatchIsPoor: boolean;
};

export type GroundedPaintMatches = PaintMatchSelection & {
  matches: PaintMatch[];
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

/**
 * Describe the perceptual Delta E 2000 distance without presenting it as a
 * made-up percentage. These are deliberately app-level display bands; the
 * exact Delta E remains available beside the label.
 */
export function assessPaintMatch(deltaE: number): PaintMatchAssessment {
  if (deltaE <= EXACT_MATCH_MAX_DELTA_E) return { label: "Exact" };
  if (deltaE <= VERY_CLOSE_MATCH_MAX_DELTA_E) return { label: "Very close" };
  if (deltaE <= CLOSE_MATCH_MAX_DELTA_E) return { label: "Close" };
  if (deltaE <= NOTICEABLE_MATCH_MAX_DELTA_E) {
    return { label: "Noticeable difference" };
  }
  return { label: "Poor match" };
}

export function formatPaintMatchDeltaE(deltaE: number): string {
  return deltaE.toFixed(PAINT_MATCH_DELTA_E_DECIMAL_PLACES);
}

/** User-facing labels make broad pools and Lowe's translation unambiguous. */
export function paintPoolLabel(brand: BrandOption): string {
  if (brand === ANY_PAINT_BRAND) return "All colors";
  if (brand === VERIFIED_PAINT_COLORS) return "All verified colors";
  if (brand === LOWES_MATCHES) return "Lowe's colors only";
  if (brand === LOWES_WITH_FALLBACK) {
    return "Lowe's first + other-brand fallback";
  }
  return brand;
}

export function paintSourceNameOf(
  color: PaintSourceNamedColor,
): string | undefined {
  return color.paintSourceHex !== undefined
    ? color.paintSourceName
    : color.name;
}

export function paintSourceHexOf(color: PaintSourceColor): string {
  return color.paintSourceHex ?? color.hex;
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
    if (brand === VERIFIED_PAINT_COLORS) {
      return VERIFIED_BRANDS.has(color.brand);
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
      primaryMatch.distance >= LOWES_FALLBACK_MIN_DELTA_E,
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

export function findGroundedPaintMatches(
  color: PaintSourceColor,
  paintLabs: PaintLab[],
  fallbackPaintLabs: PaintLab[],
  brand: BrandOption,
  matchCount: number,
  lightnessMode: ResolvedPaintLightnessMode = INDEPENDENT_LIGHTNESS_MODE,
): GroundedPaintMatches {
  const sourceHex = paintSourceHexOf(color);
  const sourceName = paintSourceNameOf(color);
  const matches = findClosestPaintMatches(
    sourceHex,
    paintLabs,
    matchCount,
    lightnessMode,
    sourceName,
  );
  const initialSelection = selectPaintMatchResults(matches, [], brand);
  const fallbackMatches =
    initialSelection.lowesMatchIsPoor &&
    fallbackPaintLabs.length > MATCH_LIST_START_INDEX
      ? findClosestLowesFallbackMatches(
          sourceHex,
          fallbackPaintLabs,
          LOWES_FALLBACK_MATCH_COUNT,
          sourceName,
        )
      : [];

  return {
    matches,
    ...selectPaintMatchResults(matches, fallbackMatches, brand),
  };
}
