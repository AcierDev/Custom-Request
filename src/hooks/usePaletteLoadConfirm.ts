import { useState, useCallback } from "react";
import { useCustomStore } from "@/store/customStore";
import { ItemDesigns } from "@/typings/types";
import { DESIGN_COLORS } from "@/typings/color-maps";
import type { CustomColor } from "@/store/customStore";

interface PaletteToLoad {
  name: string;
  type: "saved" | "official";
  id?: string; // For saved palettes
  design?: ItemDesigns; // For official palettes
}

export function usePaletteLoadConfirm() {
  const { customPalette, savedPalettes } = useCustomStore();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [paletteToLoad, setPaletteToLoad] = useState<PaletteToLoad | null>(
    null
  );
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Helper function to compare two color arrays
  const colorsMatch = useCallback(
    (colors1: CustomColor[], colors2: CustomColor[]) => {
      if (colors1.length !== colors2.length) return false;

      return colors1.every((color1, index) => {
        const color2 = colors2[index];
        return color1.hex === color2.hex && color1.name === color2.name;
      });
    },
    []
  );

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
