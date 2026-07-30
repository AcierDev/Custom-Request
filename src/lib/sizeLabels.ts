const MINI_PANEL_SIZE = "14 x 7";
const MINI_PANEL_HEIGHT_INCHES = 18;
const MINI_PANEL_WIDTH_FEET = 3;

export const PHYSICAL_SIZE_CONFIG = {
  inchesPerSquare: 3,
  inchesPerFoot: 12,
  measurementDecimalPlaces: 2,
  heightInchesOverrides: {
    [MINI_PANEL_SIZE]: MINI_PANEL_HEIGHT_INCHES,
  } as Readonly<Record<string, number>>,
  widthFeetOverrides: {
    [MINI_PANEL_SIZE]: MINI_PANEL_WIDTH_FEET,
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

  const widthFeet = getPhysicalWidthFeet(parsed);
  return `${formatPhysicalMeasurement(widthFeet)} ft wide`;
}

/**
 * Format a shared-view size with physical height first and width second.
 */
export function sizeToHeightInchesWidthFeetLabel(
  size: string | undefined | null,
): string {
  const parsed = parseSizeWh(size);
  if (!parsed) return size?.toString() ?? "";

  const normalizedSize = `${parsed.w} x ${parsed.h}`;
  const heightInches =
    PHYSICAL_SIZE_CONFIG.heightInchesOverrides[normalizedSize] ??
    parsed.h * PHYSICAL_SIZE_CONFIG.inchesPerSquare;
  const widthFeet = getPhysicalWidthFeet(parsed);

  return `${formatPhysicalMeasurement(
    heightInches,
  )}" × ${formatPhysicalMeasurement(widthFeet)} feet`;
}

function getPhysicalWidthFeet(parsed: { w: number; h: number }): number {
  const normalizedSize = `${parsed.w} x ${parsed.h}`;
  const overriddenWidth =
    PHYSICAL_SIZE_CONFIG.widthFeetOverrides[normalizedSize];
  return (
    overriddenWidth ??
    (parsed.w * PHYSICAL_SIZE_CONFIG.inchesPerSquare) /
      PHYSICAL_SIZE_CONFIG.inchesPerFoot
  );
}

function formatPhysicalMeasurement(value: number): string {
  return Number(
    value.toFixed(PHYSICAL_SIZE_CONFIG.measurementDecimalPlaces),
  ).toString();
}
