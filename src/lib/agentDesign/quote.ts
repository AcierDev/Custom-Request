// Custom-size quote from LIVE listing prices (passed in: they change on Etsy and
// are not stored here). Rules from the Everwood SOP manual, Pricing section:
//   - the exact listing size: use its actual price as is;
//   - otherwise take the nearest listing size with the same height, scale its price by
//     area, round to the nearest $5; if none shares the height, use the nearest listing
//     with the same width the same way;
//   - custom colors are $12 each on top (the caller says how many; a per-customer
//     waiver is the owner's call and is not applied here).

export const QUOTE_CONFIG = {
  roundToUsd: 5,
  customColorFeeUsd: 12,
  /** Sizes within this many inches count as equal. */
  sizeToleranceInches: 0.01,
} as const;

export interface QuoteListing {
  widthInches: number;
  heightInches: number;
  priceUsd: number;
}

export interface QuoteInput {
  widthInches: number;
  heightInches: number;
  listings: QuoteListing[];
  customColors: number;
}

export type QuoteMethod = "exact-listing" | "same-height-area" | "same-width-area" | "none";

export interface QuoteResult {
  method: QuoteMethod;
  basis: QuoteListing | null;
  basePriceUsd: number | null;
  customColors: number;
  customColorFeeUsd: number;
  totalUsd: number | null;
  steps: string[];
}

const same = (a: number, b: number): boolean => Math.abs(a - b) <= QUOTE_CONFIG.sizeToleranceInches;
const roundToStep = (usd: number): number => Math.round(usd / QUOTE_CONFIG.roundToUsd) * QUOTE_CONFIG.roundToUsd;
const nearest = (candidates: QuoteListing[], distance: (l: QuoteListing) => number): QuoteListing =>
  // closest size; on a tie the larger listing (its scale-down is the gentler one)
  [...candidates].sort((a, b) => distance(a) - distance(b) || b.widthInches * b.heightInches - a.widthInches * a.heightInches)[0];
const dollars = (usd: number): string => `$${usd.toLocaleString("en-US")}`;

export function buildQuote(input: QuoteInput): QuoteResult {
  const { widthInches: w, heightInches: h, listings, customColors } = input;
  const colorFee = customColors * QUOTE_CONFIG.customColorFeeUsd;
  const finish = (
    method: QuoteMethod,
    basis: QuoteListing | null,
    base: number | null,
    steps: string[],
  ): QuoteResult => {
    if (base !== null && colorFee > 0) {
      steps.push(`${customColors} custom color${customColors === 1 ? "" : "s"} x ${dollars(QUOTE_CONFIG.customColorFeeUsd)} = ${dollars(colorFee)}`);
    }
    return {
      method,
      basis,
      basePriceUsd: base,
      customColors,
      customColorFeeUsd: colorFee,
      totalUsd: base === null ? null : base + colorFee,
      steps,
    };
  };

  const exact = listings.find((l) => same(l.widthInches, w) && same(l.heightInches, h));
  if (exact) {
    return finish("exact-listing", exact, exact.priceUsd, [`${w} x ${h} in is a live listing: ${dollars(exact.priceUsd)} as listed`]);
  }

  const sameHeight = listings.filter((l) => same(l.heightInches, h));
  if (sameHeight.length) {
    const basis = nearest(sameHeight, (l) => Math.abs(l.widthInches - w));
    const raw = (basis.priceUsd * w) / basis.widthInches;
    const base = roundToStep(raw);
    return finish("same-height-area", basis, base, [
      `nearest same-height listing: ${basis.widthInches} x ${basis.heightInches} in at ${dollars(basis.priceUsd)}`,
      `scale by area: ${dollars(basis.priceUsd)} x ${w}/${basis.widthInches} = ${dollars(Math.round(raw * 100) / 100)}`,
      `round to the nearest ${dollars(QUOTE_CONFIG.roundToUsd)}: ${dollars(base)}`,
    ]);
  }

  const sameWidth = listings.filter((l) => same(l.widthInches, w));
  if (sameWidth.length) {
    const basis = nearest(sameWidth, (l) => Math.abs(l.heightInches - h));
    const raw = (basis.priceUsd * h) / basis.heightInches;
    const base = roundToStep(raw);
    return finish("same-width-area", basis, base, [
      `no listing shares the height; nearest same-width listing: ${basis.widthInches} x ${basis.heightInches} in at ${dollars(basis.priceUsd)}`,
      `scale by area: ${dollars(basis.priceUsd)} x ${h}/${basis.heightInches} = ${dollars(Math.round(raw * 100) / 100)}`,
      `round to the nearest ${dollars(QUOTE_CONFIG.roundToUsd)}: ${dollars(base)}`,
    ]);
  }

  return finish("none", null, null, ["no live listing shares the width or the height; ask the owner which method to use"]);
}
