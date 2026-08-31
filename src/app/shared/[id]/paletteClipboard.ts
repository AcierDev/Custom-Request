interface ClipboardWriter {
  writeText(text: string): Promise<void>;
}

type PaletteHexCopy = (hex: string) => void;

export function createPaletteCopyHandlers(
  hex: string,
  onCopy: PaletteHexCopy,
) {
  return {
    onMouseEnter: () => onCopy(hex),
    onClick: () => onCopy(hex),
  };
}

export async function copyPaletteHex(
  hex: string,
  clipboard: ClipboardWriter | undefined,
): Promise<boolean> {
  if (!clipboard) return false;

  try {
    await clipboard.writeText(hex.toUpperCase());
    return true;
  } catch {
    return false;
  }
}
