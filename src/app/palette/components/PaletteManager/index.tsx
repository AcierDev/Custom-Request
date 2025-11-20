"use client";

import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { HexColorPicker } from "react-colorful";
import { useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
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
  Blend,
  MousePointerClick,
} from "lucide-react";
import { toast } from "sonner";

// Import sub-components
import { ColorSwatch } from "./ColorSwatch";
import { SortableColorSwatch } from "./SortableColorSwatch";
import { AddColorButton } from "./AddColorButton";
import { BlendingGuide } from "./BlendingGuide";
import { ColorHarmonyGenerator } from "./ColorHarmonyGenerator";

export function PaletteManager() {
  const {
    customPalette,
    selectedColors,
    addCustomColor,
    removeCustomColor,
    duplicateCustomColor,
    toggleColorSelection,
    addBlendedColors,
    moveColorLeft,
    moveColorRight,
    updateColorName,
    updateColorHex,
    reorderPalette,
    commitPaletteToHistory,
    editingPaletteId,
    resetPaletteEditor,
  } = useCustomStore();

  const [blendCount, setBlendCount] = useState(3);
  const [editingColor, setEditingColor] = useState<number | null>(null);
  const [editColorHex, setEditColorHex] = useState("#000000");
  const [editColorName, setEditColorName] = useState("");
  const [showBlendingGuide, setShowBlendingGuide] = useState(false);
  const [hasSeenBlendingGuide, setHasSeenBlendingGuide] = useState(false);
  const [showSelectionHint, setShowSelectionHint] = useState(false);
  const [showHarmonyGenerator, setShowHarmonyGenerator] = useState(false);
  const [tipsShown, setTipsShown] = useState<Record<string, boolean>>({
    blending: true,
    harmony: true,
    selection: true,
  });

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

  const handleDuplicateColor = (index: number) => {
    const color = customPalette[index];
    duplicateCustomColor(index);
    toast.success(`Duplicated color ${color.name || color.hex}`, {
      duration: 2000,
      position: "bottom-right",
    });
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
      ? customPalette.findIndex((color) => color.id === selectedColors[0])
      : -1;

  const handleAddHarmonyColors = (colors: string[]) => {
    // Add the harmony colors to the palette
    const newColors = colors.map((hex) => ({
      id: nanoid(),
      hex,
      name: "",
    }));
    useCustomStore.setState({
      customPalette: [...customPalette, ...newColors],
    });
    toast.success(`Added ${colors.length} harmony colors to your palette!`);
  };

  const handleClearPalette = () => {
    resetPaletteEditor();
    toast.success("Palette cleared successfully!");
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = customPalette.findIndex((item) => item.id === active.id);
      const newIndex = customPalette.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newPalette = arrayMove(customPalette, oldIndex, newIndex);
        reorderPalette(newPalette);
        commitPaletteToHistory();
      }
    }
  }

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
            {selectedColors.length > 0 && (
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
            )}

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
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 px-3 ml-2"
                      >
                        Reset Palette
                      </Button>
                    </AlertDialogTrigger>
                    <TooltipContent side="bottom">
                      <p>Reset your entire palette</p>
                    </TooltipContent>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset Palette?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove all colors from your palette. This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            handleResetEditor();
                            toast.success("Palette reset!");
                          }}
                        >
                          Yes, Reset
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </Tooltip>
              </TooltipProvider>

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={customPalette.map((c) => c.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 list-none p-0 m-0">
              <AnimatePresence>
                {customPalette.map((color, index) => (
                  <SortableColorSwatch
                    key={color.id}
                    id={color.id}
                    color={color.hex}
                    name={color.name}
                    index={index}
                    isSelected={selectedColors.includes(color.id)}
                    onSelect={() => toggleColorSelection(color.id)}
                    onRemove={() => removeCustomColor(index)}
                    onEdit={() => handleEditColor(index)}
                    onDuplicate={() => handleDuplicateColor(index)}
                    showBlendHint={selectedColors.length === 1}
                  />
                ))}
              </AnimatePresence>

              <div className="h-full min-h-[6rem]">
                <AddColorButton
                  onColorAdd={handleAddColor}
                  isEmpty={customPalette.length === 0}
                />
              </div>
            </div>
          </SortableContext>
        </DndContext>
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
