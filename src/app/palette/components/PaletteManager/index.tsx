"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HexColorPicker } from "react-colorful";
import { useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  X,
  ArrowLeft,
  ArrowRight,
  Info,
  Palette,
  Trash2,
  Blend,
  MousePointerClick,
} from "lucide-react";
import { toast } from "sonner";

// Import sub-components
import { ColorSwatch } from "./ColorSwatch";
import { AddColorButton } from "./AddColorButton";
import { BlendingGuide } from "./BlendingGuide";
import { ColorHarmonyGenerator } from "./ColorHarmonyGenerator";

export function PaletteManager() {
  const {
    customPalette,
    selectedColors,
    addCustomColor,
    removeCustomColor,
    toggleColorSelection,
    addBlendedColors,
    moveColorLeft,
    moveColorRight,
    updateColorName,
    updateColorHex,
    editingPaletteId,
    resetPaletteEditor,
    clearSelectedColors,
  } = useCustomStore();

  const [blendCount, setBlendCount] = useState(3);
  const [editingColor, setEditingColor] = useState<number | null>(null);
  const [editColorHex, setEditColorHex] = useState("");
  const [editColorName, setEditColorName] = useState("");
  const [showBlendingGuide, setShowBlendingGuide] = useState(false);
  const [hasSeenBlendingGuide, setHasSeenBlendingGuide] = useState(false);
  const [showSelectionHint, setShowSelectionHint] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showHarmonyGenerator, setShowHarmonyGenerator] = useState(false);

  // Initialize hasSeenBlendingGuide from localStorage
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem("hasSeenBlendingGuide");
    if (hasSeenGuide === "true") {
      setHasSeenBlendingGuide(true);
    }

    const hasSeenSelectionHint = localStorage.getItem("hasSeenSelectionHint");
    if (hasSeenSelectionHint === "true") {
      setShowSelectionHint(false);
    } else {
      setShowSelectionHint(true);
    }

    // Set up event listener for opening harmony generator from color swatches
    const handleOpenHarmonyGenerator = (event: CustomEvent) => {
      const { baseColor } = event.detail;
      setShowHarmonyGenerator(true);
      // We'll pass the base color to the harmony generator via another event
      // when it's mounted
      if (baseColor) {
        setTimeout(() => {
          document.dispatchEvent(
            new CustomEvent("setHarmonyBaseColor", {
              detail: { baseColor },
            })
          );
        }, 100); // Small delay to ensure the harmony generator is mounted
      }
    };

    // Set up event listener for closing harmony generator
    const handleCloseHarmonyGenerator = () => {
      setShowHarmonyGenerator(false);
    };

    document.addEventListener(
      "openHarmonyGenerator",
      handleOpenHarmonyGenerator as EventListener
    );

    document.addEventListener(
      "closeHarmonyGenerator",
      handleCloseHarmonyGenerator as EventListener
    );

    return () => {
      document.removeEventListener(
        "openHarmonyGenerator",
        handleOpenHarmonyGenerator as EventListener
      );
      document.removeEventListener(
        "closeHarmonyGenerator",
        handleCloseHarmonyGenerator as EventListener
      );
    };
  }, []);

  // Show blending guide when there are at least 2 colors but none are selected
  useEffect(() => {
    if (
      customPalette.length >= 2 &&
      selectedColors.length === 0 &&
      !hasSeenBlendingGuide
    ) {
      setShowBlendingGuide(true);
    } else if (selectedColors.length > 0) {
      setShowBlendingGuide(false);
    }

    // Only hide selection hint after user has selected TWO colors
    // This ensures we don't interfere with the ability to select a second color
    if (selectedColors.length === 2 && showSelectionHint) {
      setShowSelectionHint(false);
      localStorage.setItem("hasSeenSelectionHint", "true");
    }
  }, [
    customPalette.length,
    selectedColors.length,
    hasSeenBlendingGuide,
    showSelectionHint,
  ]);

  const dismissBlendingGuide = () => {
    setShowBlendingGuide(false);
    setHasSeenBlendingGuide(true);
    localStorage.setItem("hasSeenBlendingGuide", "true");
  };

  // Enhanced addColor function that shows the guide
  const handleAddColor = (hex: string) => {
    addCustomColor(hex);

    // If this is the second color and user hasn't seen the hint yet, show it
    if (customPalette.length === 1 && showSelectionHint) {
      // Use a safer approach with requestAnimationFrame to avoid DOM manipulation issues
      requestAnimationFrame(() => {
        setShowSelectionHint(true); // Ensure hint is visible
      });
    }
  };

  const handleEditColor = (index: number) => {
    const color = customPalette[index];
    setEditingColor(index);
    setEditColorHex(color.hex);
    setEditColorName(color.name || "");
  };

  const handleSaveEdit = () => {
    if (editingColor === null) return;

    // Validate hex color
    if (!/^#[0-9A-Fa-f]{6}$/.test(editColorHex)) {
      // Could add error handling here
      return;
    }

    // Update color hex and name
    updateColorHex(editingColor, editColorHex);
    updateColorName(editingColor, editColorName);

    // Close the edit modal
    setEditingColor(null);
  };

  const handleResetEditor = () => {
    resetPaletteEditor();
  };

  const resetAllTips = () => {
    // If tips are currently showing, close them
    if (showBlendingGuide) {
      setShowBlendingGuide(false);
      return;
    }

    // Otherwise, reset and show tips
    localStorage.removeItem("hasSeenBlendingGuide");
    localStorage.removeItem("hasSeenSelectionHint");
    setHasSeenBlendingGuide(false);
    setShowSelectionHint(true);
    if (customPalette.length >= 2) {
      setShowBlendingGuide(true);
    }
  };

  const selectedColorIndex =
    selectedColors.length === 1
      ? customPalette.findIndex((color) => color.hex === selectedColors[0])
      : -1;

  const handleExportPalette = () => {
    setShowExportDialog(true);
  };

  const handleCopyToClipboard = () => {
    const exportData = JSON.stringify(
      customPalette.map((color) => ({
        hex: color.hex,
        name: color.name || "",
      })),
      null,
      2
    );
    navigator.clipboard.writeText(exportData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPalette = () => {
    const exportData = JSON.stringify(
      {
        version: "1.0.0",
        format: "evpal",
        name: "Everwood Palette",
        created: new Date().toISOString(),
        colors: customPalette.map((color) => ({
          hex: color.hex,
          name: color.name || "",
        })),
      },
      null,
      2
    );

    // Create a Blob and download link
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `palette-${new Date().toISOString().slice(0, 10)}.evpal`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setShowExportDialog(false);
    toast.success("Palette downloaded successfully!");
  };

  const handleImportPalette = () => {
    try {
      setImportError("");
      const importData = JSON.parse(importText);

      // Handle both formats: array of colors or .evpal format
      let colorsArray;

      if (Array.isArray(importData)) {
        colorsArray = importData;
      } else if (
        importData.format === "evpal" &&
        Array.isArray(importData.colors)
      ) {
        colorsArray = importData.colors;
      } else {
        setImportError("Invalid format: Could not find color data");
        return;
      }

      const validColors = colorsArray.filter((item: { hex: string }) => {
        if (!item.hex || typeof item.hex !== "string") return false;
        return /^#[0-9A-Fa-f]{6}$/.test(item.hex);
      });

      if (validColors.length === 0) {
        setImportError("No valid colors found in the imported data");
        return;
      }

      // Reset the palette
      resetPaletteEditor();

      // Add each color
      validColors.forEach((color: { hex: string; name?: string }) => {
        addCustomColor(color.hex);
        if (color.name) {
          const index = customPalette.length;
          updateColorName(index, color.name);
        }
      });

      setShowImportDialog(false);
      setImportText("");

      toast.success(`Imported ${validColors.length} colors successfully!`);
    } catch (error) {
      setImportError("Invalid JSON format. Please check your data.");
    }
  };

  // File upload handler for import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file extension
    if (!file.name.endsWith(".evpal") && !file.name.endsWith(".json")) {
      setImportError("Please upload a .evpal or .json file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImportText(event.target.result as string);
      }
    };
    reader.onerror = () => {
      setImportError("Error reading file");
    };
    reader.readAsText(file);
  };

  const handleAddHarmonyColors = (colors: string[]) => {
    // Reset the palette if it's empty
    if (customPalette.length === 0) {
      colors.forEach((color) => {
        addCustomColor(color);
      });
    } else {
      // Otherwise just add the new colors
      colors.forEach((color) => {
        addCustomColor(color);
      });
    }

    // Close the harmony generator after adding colors
    setShowHarmonyGenerator(false);

    toast.success(`Added ${colors.length} colors to your palette!`);
  };

  const handleClearPalette = () => {
    resetPaletteEditor();
    toast.success("Palette cleared successfully!");
  };

  return (
    <div className="space-y-8">
      {/* Color Palette Display */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingPaletteId ? "Edit Palette" : "Your Palette"}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({customPalette.length} colors)
            </span>
            {editingPaletteId && (
              <span className="ml-2 text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                Editing
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Actions Group */}
            <div className="flex items-center rounded-md border border-gray-200 dark:border-gray-800 p-0.5 bg-white dark:bg-gray-900 shadow-sm">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveColorLeft(selectedColorIndex)}
                      disabled={
                        selectedColors.length !== 1 || selectedColorIndex <= 0
                      }
                      className="h-8 w-8 p-0 rounded-none rounded-l-sm"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {selectedColors.length === 0
                      ? "Select a color to move"
                      : selectedColors.length > 1
                      ? "Select only one color to move"
                      : selectedColorIndex <= 0
                      ? "Color is at the start"
                      : "Move color left"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveColorRight(selectedColorIndex)}
                      disabled={
                        selectedColors.length !== 1 ||
                        selectedColorIndex === customPalette.length - 1 ||
                        selectedColorIndex === -1
                      }
                      className="h-8 w-8 p-0 rounded-none rounded-r-sm border-l border-gray-200 dark:border-gray-800"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {selectedColors.length === 0
                      ? "Select a color to move"
                      : selectedColors.length > 1
                      ? "Select only one color to move"
                      : selectedColorIndex === customPalette.length - 1
                      ? "Color is at the end"
                      : "Move color right"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Main Actions Group */}
            <div className="flex items-center gap-2">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setShowHarmonyGenerator(!showHarmonyGenerator)
                      }
                      className="h-8 px-3 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50"
                    >
                      <Palette className="h-4 w-4 mr-1 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                        Harmony
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Generate color harmonies</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {editingPaletteId && (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetEditor}
                        className="h-8 px-3 border-orange-200 hover:border-orange-300 dark:border-orange-800/50 dark:hover:border-orange-700/50 bg-orange-50 dark:bg-orange-950/20"
                      >
                        <X className="h-4 w-4 mr-1 text-orange-600 dark:text-orange-400" />
                        <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                          Cancel Edit
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Cancel editing and reset palette
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearPalette}
                      disabled={customPalette.length === 0}
                      className="h-8 px-3 border-red-200 hover:border-red-300 dark:border-red-800/30 dark:hover:border-red-700/30 bg-red-50 dark:bg-red-950/20"
                    >
                      <Trash2 className="h-4 w-4 mr-1 text-red-600 dark:text-red-400" />
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">
                        Clear
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Clear all colors</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Utility Actions */}
            <div className="flex items-center gap-1 ml-1">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {(customPalette.length >= 2 || showBlendingGuide) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={resetAllTips}
                        className={`h-7 w-7 rounded-full ${
                          showBlendingGuide
                            ? "bg-purple-100 dark:bg-purple-900/30"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        {showBlendingGuide ? (
                          <X className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <Info className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                        )}
                      </Button>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{showBlendingGuide ? "Hide tips" : "Show tips"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Blending Guide */}
        <AnimatePresence>
          {showBlendingGuide && (
            <BlendingGuide onDismiss={dismissBlendingGuide} />
          )}
        </AnimatePresence>

        {/* Selection Hint */}
        <AnimatePresence>
          {showSelectionHint &&
            customPalette.length >= 2 &&
            selectedColors.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-2 text-center pointer-events-none"
              >
                <div className="inline-block bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm px-3 py-1.5 rounded-full">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      repeatDelay: 1,
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <MousePointerClick className="h-3.5 w-3.5" />
                    <span>Click on two colors to blend them together</span>
                  </motion.div>
                </div>
              </motion.div>
            )}
        </AnimatePresence>

        {/* Color Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <AnimatePresence>
            {customPalette.map((color, index) => (
              <ColorSwatch
                key={`${color.hex}-${index}`}
                color={color.hex}
                name={color.name}
                index={index}
                isSelected={selectedColors.includes(color.hex)}
                onSelect={() => toggleColorSelection(color.hex)}
                onRemove={() => removeCustomColor(index)}
                onEdit={() => handleEditColor(index)}
                showBlendHint={selectedColors.length === 1}
              />
            ))}
          </AnimatePresence>

          <AddColorButton
            onColorAdd={handleAddColor}
            isEmpty={customPalette.length === 0}
          />
        </div>
      </div>

      {/* Blend Controls - Only show when 2 colors are selected */}
      {selectedColors.length === 2 && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -10 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -10 }}
          transition={{
            duration: 0.4,
            type: "spring",
            stiffness: 300,
            damping: 25,
          }}
          className="p-4 border border-purple-200 dark:border-purple-900/50 rounded-lg bg-purple-50 dark:bg-purple-900/20 backdrop-blur-sm shadow-md"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <motion.div
              className="flex items-center gap-2"
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Blend className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-purple-700 dark:text-purple-300">
                Blend Colors
              </span>
            </motion.div>

            <div className="flex-1 flex items-center gap-4">
              <div className="w-full max-w-xs flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Steps:
                </span>
                <Slider
                  value={[blendCount]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(value) => setBlendCount(value[0])}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-6 text-center">
                  {blendCount}
                </span>
              </div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => {
                    setHasSeenBlendingGuide(true);
                    addBlendedColors(blendCount);
                  }}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white whitespace-nowrap shadow-md hover:shadow-lg transition-all"
                >
                  <Blend className="mr-2 h-4 w-4" />
                  Create Blend
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Edit Color Modal */}
      {editingColor !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Edit Color
            </h3>

            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div
                  className="w-full md:w-1/3 h-24 rounded-lg"
                  style={{ backgroundColor: editColorHex }}
                />
                <div className="w-full md:w-2/3">
                  <HexColorPicker
                    color={editColorHex}
                    onChange={setEditColorHex}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-hex">Hex Value</Label>
                <div className="relative">
                  <Input
                    id="edit-hex"
                    value={editColorHex}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      setEditColorHex(value);
                    }}
                    maxLength={7}
                    className="pl-8"
                  />
                  <div
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full border border-gray-200 dark:border-gray-700"
                    style={{ backgroundColor: editColorHex }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name">Color Name (optional)</Label>
                <Input
                  id="edit-name"
                  value={editColorName}
                  onChange={(e) => setEditColorName(e.target.value)}
                  placeholder="e.g. Deep Purple"
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setEditingColor(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Color Harmony Generator */}
      <AnimatePresence>
        {showHarmonyGenerator && (
          <ColorHarmonyGenerator onAddColors={handleAddHarmonyColors} />
        )}
      </AnimatePresence>
    </div>
  );
}
