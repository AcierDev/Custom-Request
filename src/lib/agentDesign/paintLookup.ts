// Server-side paint code lookup for the agent design API. Reads the
// normalized datasets in public/paints/<brand>/colors.json once per brand
// and caches them. Lookups are exact: unknown or ambiguous codes throw.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const PAINT_BRANDS = {
  sherwin: { dir: "sherwin", label: "Sherwin-Williams", codePrefix: "SW" },
  valspar: { dir: "valspar", label: "Valspar", codePrefix: null },
  behr: { dir: "behr", label: "Behr", codePrefix: null },
  ppg: { dir: "ppg", label: "PPG", codePrefix: null },
  benjamin_moore: {
    dir: "benjamin_moore",
    label: "Benjamin Moore",
    codePrefix: null,
  },
  hgtv_home: {
    dir: "hgtv_home",
    label: "HGTV Home by Sherwin-Williams",
    codePrefix: "HGSW",
  },
} as const;

export type PaintBrandKey = keyof typeof PAINT_BRANDS;

export const PAINT_BRAND_KEYS = Object.keys(PAINT_BRANDS) as PaintBrandKey[];

export interface PaintRecord {
  brand: PaintBrandKey;
  brandLabel: string;
  code: string;
  name: string;
  hex: string;
}

export class PaintLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaintLookupError";
  }
}

const NUMERIC_CODE_PATTERN = /^\d+$/;
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** Canonical comparison key: uppercase with all whitespace removed. */
export const normalizePaintCode = (code: string): string =>
  code.toUpperCase().replace(/\s+/g, "");

type RawPaint = { name?: unknown; code?: unknown; hex?: unknown };
type BrandIndex = Map<string, PaintRecord[]>;

export type PaintDatasetLoader = (brand: PaintBrandKey) => RawPaint[];

const defaultLoader: PaintDatasetLoader = (brand) =>
  JSON.parse(
    readFileSync(
      join(process.cwd(), "public", "paints", PAINT_BRANDS[brand].dir, "colors.json"),
      "utf8",
    ),
  );

export const isPaintBrandKey = (value: unknown): value is PaintBrandKey =>
  typeof value === "string" && value in PAINT_BRANDS;

export function createPaintLookup(loader: PaintDatasetLoader = defaultLoader) {
  const cache = new Map<PaintBrandKey, BrandIndex>();

  const indexFor = (brand: PaintBrandKey): BrandIndex => {
    const cached = cache.get(brand);
    if (cached) return cached;
    const index: BrandIndex = new Map();
    for (const raw of loader(brand)) {
      if (typeof raw.code !== "string" || typeof raw.hex !== "string") continue;
      if (typeof raw.name !== "string" || !HEX_PATTERN.test(raw.hex)) continue;
      const key = normalizePaintCode(raw.code);
      const record: PaintRecord = {
        brand,
        brandLabel: PAINT_BRANDS[brand].label,
        code: raw.code,
        name: raw.name,
        hex: raw.hex.toLowerCase(),
      };
      index.set(key, [...(index.get(key) ?? []), record]);
    }
    cache.set(brand, index);
    return index;
  };

  // Same code listed twice with identical hex is a dataset duplicate, not
  // an ambiguity; differing hexes are rejected.
  const pickUnique = (matches: PaintRecord[], label: string): PaintRecord => {
    const hexes = new Set(matches.map((m) => m.hex));
    if (hexes.size > 1) {
      throw new PaintLookupError(
        `${label} matches ${hexes.size} different colors in the dataset`,
      );
    }
    return matches[0];
  };

  const findInBrand = (brand: PaintBrandKey, code: string): PaintRecord[] => {
    const index = indexFor(brand);
    const key = normalizePaintCode(code);
    const direct = index.get(key);
    if (direct) return direct;
    const prefix = PAINT_BRANDS[brand].codePrefix;
    if (prefix && NUMERIC_CODE_PATTERN.test(key)) {
      return index.get(`${prefix}${key}`) ?? [];
    }
    return [];
  };

  return {
    /**
     * Resolve a paint code. With a brand, "SW6764", "SW 6764" and "6764"
     * all match Sherwin-Williams SW 6764. Without a brand the code must be
     * non-numeric and match exactly one brand.
     */
    lookup(code: string, brand?: string | null): PaintRecord {
      const trimmed = typeof code === "string" ? code.trim() : "";
      if (!trimmed) throw new PaintLookupError("code must be a non-empty string");
      if (brand !== undefined && brand !== null) {
        if (!isPaintBrandKey(brand)) {
          throw new PaintLookupError(
            `unknown brand "${brand}"; allowed: ${PAINT_BRAND_KEYS.join(", ")}`,
          );
        }
        const matches = findInBrand(brand, trimmed);
        if (matches.length === 0) {
          throw new PaintLookupError(
            `unknown ${PAINT_BRANDS[brand].label} code "${trimmed}"`,
          );
        }
        return pickUnique(matches, `code "${trimmed}"`);
      }
      if (NUMERIC_CODE_PATTERN.test(normalizePaintCode(trimmed))) {
        throw new PaintLookupError(
          `numeric-only code "${trimmed}" requires an explicit brand`,
        );
      }
      const key = normalizePaintCode(trimmed);
      const matches = PAINT_BRAND_KEYS.flatMap(
        (b) => indexFor(b).get(key) ?? [],
      );
      if (matches.length === 0) {
        throw new PaintLookupError(`unknown paint code "${trimmed}"`);
      }
      const brands = new Set(matches.map((m) => m.brand));
      if (brands.size > 1) {
        throw new PaintLookupError(
          `code "${trimmed}" exists in several brands (${[...brands].join(", ")}); pass brand`,
        );
      }
      return pickUnique(matches, `code "${trimmed}"`);
    },
  };
}

export type PaintLookup = ReturnType<typeof createPaintLookup>;

let sharedLookup: PaintLookup | null = null;

/** Process-wide cached lookup backed by public/paints. */
export const getPaintLookup = (): PaintLookup =>
  (sharedLookup ??= createPaintLookup());
