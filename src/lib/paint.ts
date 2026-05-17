// Shared paint-color schema + brand/retailer mapping.
//
// The datasets under public/paints/<brand>/colors.json are normalized
// by the importer scripts in scripts/paints/. Every record carries the
// manufacturer color CODE (what a paint counter actually tints by), the
// RETAILER that sells it, and an AVAILABLE flag (false = discontinued /
// fan-deck-only, i.e. the colors that "don't show up" at the store).
//
// `code`, `retailer`, `available`, `lrv` are optional so brands whose
// importer hasn't been built yet (only name/hex/brand) keep working.

export type Brand =
  | "Behr"
  | "Sherwin-Williams"
  | "Valspar"
  | "PPG"
  | "Benjamin Moore";

export interface PaintColor {
  name: string;
  hex: string;
  brand: Brand | string;
  /** Manufacturer color code, e.g. "SW 6258" — give this at the counter. */
  code?: string;
  /** Where this brand is actually sold. */
  retailer?: string;
  /** Currently orderable. false = discontinued / fan-deck only. */
  available?: boolean;
  /** Light Reflectance Value (0–100), if the source provides it. */
  lrv?: number;
  /** Transient: ΔE distance from a queried color. Not persisted. */
  distance?: number;
}

// Which store actually sells each brand. Behr is Home Depot–exclusive,
// Valspar is Lowe's–exclusive, Sherwin-Williams sells its own line,
// Benjamin Moore goes through independent dealers, PPG is at Home Depot.
export const BRAND_RETAILER: Record<Brand, string> = {
  "Sherwin-Williams": "Sherwin-Williams",
  Behr: "The Home Depot",
  PPG: "The Home Depot",
  Valspar: "Lowe's",
  "Benjamin Moore": "Benjamin Moore",
};

// Options for the brand selector used by the palette grounding flow.
// "Any" disables brand filtering. Ordered code-bearing brands first
// (those ground to a real, purchasable color number).
export const BRAND_OPTIONS = [
  "Any",
  "Sherwin-Williams",
  "Valspar",
  "Benjamin Moore",
  "Behr",
  "PPG",
] as const;
export type BrandOption = (typeof BRAND_OPTIONS)[number];

// Brands whose dataset carries verified, current manufacturer codes
// (so a grounded color is genuinely orderable at the counter). Behr
// and PPG are name/hex only until an authoritative feed exists.
export const VERIFIED_BRANDS: ReadonlySet<string> = new Set([
  "Sherwin-Williams",
  "Valspar",
  "Benjamin Moore",
]);

/** Resolve a color's retailer, falling back to the brand map. */
export function retailerFor(c: Pick<PaintColor, "brand" | "retailer">): string {
  if (c.retailer) return c.retailer;
  return BRAND_RETAILER[c.brand as Brand] ?? "";
}

/**
 * What to tell / search for at the counter. Always leads with the
 * brand (so the line is unambiguous even when the code alone doesn't
 * imply it, e.g. Valspar "5001-1A"), then the manufacturer code when
 * we have it, then the readable name — separated by " — " so the
 * swatch can stack the brand/code above the name.
 */
export function purchaseLabel(c: PaintColor): string {
  const brand = c.brand as string;
  return c.code
    ? `${brand} — ${c.code} — ${c.name}`
    : `${brand} — ${c.name}`;
}
