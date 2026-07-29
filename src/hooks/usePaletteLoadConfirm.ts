import { useState, useCallback } from "react";
import { useCustomStore } from "@/store/customStore";
import { ItemDesigns } from "@/typings/types";
import { DESIGN_COLORS } from "@/typings/color-maps";

interface PaletteToLoad {
  name: string;
  type: "saved" | "official";
  id?: string; // For saved palettes
  design?: ItemDesigns; // For official palettes
}

type PaletteLoadColor = {
  hex: string;
  name?: string;
  paintSourceHex?: string;
  paintSourceName?: string;
};

export function paletteColorsMatchForLoad(
  colors1: ReadonlyArray<PaletteLoadColor>,
  colors2: ReadonlyArray<PaletteLoadColor>
) {
  if (colors1.length !== colors2.length) return false;

  return colors1.every((color1, index) => {
    const color2 = colors2[index];
    const color1Hex = color1.paintSourceHex ?? color1.hex;
    const color2Hex = color2.paintSourceHex ?? color2.hex;
    const color1Name =
      color1.paintSourceHex === undefined
        ? color1.name
        : color1.paintSourceName;
    const color2Name =
      color2.paintSourceHex === undefined
        ? color2.name
        : color2.paintSourceName;

    return color1Hex === color2Hex && color1Name === color2Name;
  });
}

export function usePaletteLoadConfirm() {
  const { customPalette, savedPalettes } = useCustomStore();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [paletteToLoad, setPaletteToLoad] = useState<PaletteToLoad | null>(
    null
  );
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Paint grounding is a derived representation, not an editor change.
  // Compare its preserved source color so switching palettes stays quiet.
  const colorsMatch = paletteColorsMatchForLoad;

  // Check if current palette matches any official palette
  const matchesOfficialPalette = useCallback(() => {
    if (customPalette.length === 0) return false;

    return Object.values(ItemDesigns)
      .filter((design) => design !== ItemDesigns.Custom)
      .some((design) => {
        const officialColors = Object.values(DESIGN_COLORS[design]);
        return colorsMatch(customPalette, officialColors);
      });
  }, [customPalette, colorsMatch]);

  // Check if current palette matches any saved palette
  const matchesSavedPalette = useCallback(() => {
    if (customPalette.length === 0) return false;

    return savedPalettes.some((palette) =>
      colorsMatch(customPalette, palette.colors)
    );
  }, [customPalette, savedPalettes, colorsMatch]);

  // Check if the palette being loaded is the same as current
  const isLoadingSamePalette = useCallback(
    (palette: PaletteToLoad) => {
      if (customPalette.length === 0) return false;

      if (palette.type === "official" && palette.design) {
        const officialColors = Object.values(DESIGN_COLORS[palette.design]);
        return colorsMatch(customPalette, officialColors);
      }

      if (palette.type === "saved" && palette.id) {
        const savedPalette = savedPalettes.find((p) => p.id === palette.id);
        if (savedPalette) {
          return colorsMatch(customPalette, savedPalette.colors);
        }
      }

      return false;
    },
    [customPalette, savedPalettes, colorsMatch]
  );

  const shouldShowConfirmation = useCallback(() => {
    // Show confirmation if there's a custom palette with colors
    // BUT skip if it matches an existing official or saved palette
    if (customPalette.length === 0) return false;

    // If it matches an official or saved palette, no confirmation needed
    if (matchesOfficialPalette() || matchesSavedPalette()) {
      return false;
    }

    // Otherwise, show confirmation for custom work
    return true;
  }, [customPalette.length, matchesOfficialPalette, matchesSavedPalette]);

  const requestPaletteLoad = useCallback(
    (palette: PaletteToLoad, loadAction: () => void) => {
      // If loading the same palette, just skip entirely
      if (isLoadingSamePalette(palette)) {
        return;
      }

      if (shouldShowConfirmation()) {
        setPaletteToLoad(palette);
        setPendingAction(() => loadAction);
        setIsConfirmDialogOpen(true);
      } else {
        // No confirmation needed, load directly
        loadAction();
      }
    },
    [shouldShowConfirmation, isLoadingSamePalette]
  );

  const handleConfirm = useCallback(() => {
    if (pendingAction) {
      pendingAction();
    }
    setIsConfirmDialogOpen(false);
    setPaletteToLoad(null);
    setPendingAction(null);
  }, [pendingAction]);

  const handleCancel = useCallback(() => {
    setIsConfirmDialogOpen(false);
    setPaletteToLoad(null);
    setPendingAction(null);
  }, []);

  return {
    isConfirmDialogOpen,
    paletteToLoad,
    requestPaletteLoad,
    handleConfirm,
    handleCancel,
    shouldShowConfirmation: shouldShowConfirmation(),
  };
}
