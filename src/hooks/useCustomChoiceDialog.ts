import { useState, useEffect, useCallback } from "react";
import { useCustomStore } from "@/store/customStore";
import { ItemDesigns } from "@/typings/types";

export function useCustomChoiceDialog() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasShownDialog, setHasShownDialog] = useState(false);

  const {
    selectedDesign,
    customPalette,
    drawnPatternGrid,
    drawnPatternGridSize,
    setActiveCustomMode,
  } = useCustomStore();

  // Check if both custom palette and drawn pattern exist
  const hasBothCustomOptions = useCallback(() => {
    const hasCustomPalette = customPalette.length > 0;
    const hasDrawnPattern =
      drawnPatternGrid !== null &&
      drawnPatternGridSize !== null &&
      drawnPatternGrid.length > 0;

    return (
      selectedDesign === ItemDesigns.Custom &&
      hasCustomPalette &&
      hasDrawnPattern
    );
  }, [
    selectedDesign,
    customPalette.length,
    drawnPatternGrid,
    drawnPatternGridSize,
  ]);

  // Show dialog when conditions are met
  useEffect(() => {
    if (hasBothCustomOptions() && !hasShownDialog) {
      setIsDialogOpen(true);
      setHasShownDialog(true);
    }
  }, [hasBothCustomOptions, hasShownDialog]);

  // Reset the dialog state when design changes away from Custom
  useEffect(() => {
    if (selectedDesign !== ItemDesigns.Custom) {
      setHasShownDialog(false);
    }
  }, [selectedDesign]);

  const handleChoiceMade = useCallback(
    (choice: "palette" | "pattern") => {
      // Simply set the active custom mode - don't clear any data
      setActiveCustomMode(choice);
      setIsDialogOpen(false);
    },
    [setActiveCustomMode]
  );

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  // Reset dialog state when needed (e.g., when navigating to a new page)
  const resetDialogState = useCallback(() => {
    setHasShownDialog(false);
    setIsDialogOpen(false);
  }, []);

  return {
    isDialogOpen,
    hasBothCustomOptions: hasBothCustomOptions(),
    handleChoiceMade,
    handleDialogClose,
    resetDialogState,
  };
}
