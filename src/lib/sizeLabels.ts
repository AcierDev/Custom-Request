const MINI_PANEL_SIZE = "14 x 7";

export const PHYSICAL_SIZE_CONFIG = {
  inchesPerSquare: 3,
  inchesPerFoot: 12,
  feetDecimalPlaces: 2,
  widthFeetOverrides: {
    [MINI_PANEL_SIZE]: 3,
  } as Readonly<Record<string, number>>,
} as const;

export function parseSizeWh(
  size: string | undefined | null,
): { w: number; h: number } | null {
  const match = size?.trim().match(/^(\d+)\s*[x×X]\s*(\d+)$/);
  if (!match) return null;

  const width = Number.parseInt(match[1] ?? "", 10);
  const height = Number.parseInt(match[2] ?? "", 10);
  if (!width || !height) return null;

  return { w: width, h: height };
}

/**
 * Convert a `"<w> x <h>"` squares label into an inches label, height-first.
 * Non-parseable input is returned unchanged.
 */
export function sizeToInchLabel(
  size: string | undefined | null,
): string {
  const parsed = parseSizeWh(size);
  if (!parsed) return size?.toString() ?? "";

  return `${parsed.h * PHYSICAL_SIZE_CONFIG.inchesPerSquare}" × ${
    parsed.w * PHYSICAL_SIZE_CONFIG.inchesPerSquare
  }"`;
}

/**
 * Convert a `"<w> x <h>"` squares label into its physical width in feet.
 * The mini-panel size uses its catalog width instead of the full-size square
 * conversion.
 */
export function sizeToFeetWideLabel(
  size: string | undefined | null,
): string {
  const parsed = parseSizeWh(size);
  if (!parsed) return size?.toString() ?? "";

  const normalizedSize = `${parsed.w} x ${parsed.h}`;
  const overriddenWidth =
    PHYSICAL_SIZE_CONFIG.widthFeetOverrides[normalizedSize];
  const widthFeet =
    overriddenWidth ??
    (parsed.w * PHYSICAL_SIZE_CONFIG.inchesPerSquare) /
      PHYSICAL_SIZE_CONFIG.inchesPerFoot;
  const formattedWidth = Number(
    widthFeet.toFixed(PHYSICAL_SIZE_CONFIG.feetDecimalPlaces),
  ).toString();

  return `${formattedWidth} ft wide`;
}
