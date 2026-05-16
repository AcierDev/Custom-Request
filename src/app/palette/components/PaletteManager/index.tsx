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
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { HexColorPicker } from "react-colorful";
import { useCustomStore } from "@/store/customStore";
import { cn } from "@/lib/utils";
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

// Hex -> readable RGB / HSL strings for the color info readout.
function describeColor(hex: string): { rgb: string; hsl: string } | null {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return {
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(
      l * 100
    )}%)`,
  };
}

export function PaletteManager() {
  const {
    customPalette,
    selectedColors,
    addCustomColor,
    removeCustomColor,
    duplicateCustomColor,
    toggleColorSelection,
    clearSelectedColors,
    addBlendedColors,
    updateColorName,
    updateColorHex,
    reorderPalette,
    commitPaletteToHistory,
    editingPaletteId,
    resetPaletteEditor,
  } = useCustomStore();

  const [mixMode, setMixMode] = useState(false);
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
    if (customPalette.length >= 2 && !hasSeenBlendingGuide) {
      setShowBlendingGuide(true);
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

  const toggleMixMode = () => {
    if (mixMode) clearSelectedColors();
    setMixMode((prev) => !prev);
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
            <h3 className="text-lg font-semibold text-white">
              {editingPaletteId ? "Edit Palette" : "Your Palette"}
            </h3>
            <span className="text-sm text-slate-400">
              ({customPalette.length} colors)
            </span>
            {editingPaletteId && (
              <span className="ml-2 text-xs px-2 py-1 bg-blue-500/10 dark:bg-blue-900/30 text-blue-300 rounded-full">
                Editing
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                      className="h-8 px-3 dark:bg-blue-900/20 border-blue-500/30/50"
                    >
                      <Palette className="h-4 w-4 mr-1 text-blue-300" />
                      <span className="text-xs font-medium text-blue-300">
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
                              ? "bg-blue-500/10 dark:bg-blue-900/30"
                              : "bg-gray-800/60"
                          }`}
                        >
                          {showBlendingGuide ? (
                            <X className="h-3.5 w-3.5 text-blue-300" />
                          ) : (
                            <Info className="h-3.5 w-3.5 text-blue-300" />
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
          {mixMode &&
            showSelectionHint &&
            customPalette.length >= 2 &&
            selectedColors.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-2 text-center pointer-events-none"
              >
                <div className="inline-block bg-blue-500/10 dark:bg-blue-900/30 text-blue-300 text-sm px-3 py-1.5 rounded-full">
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
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex w-full items-stretch gap-2 list-none p-0 m-0">
              {customPalette.length > 0 && (
                <div
                  className="flex min-w-0 basis-0 gap-1"
                  style={{ flexGrow: customPalette.length }}
                >
                  <AnimatePresence>
                    {customPalette.map((color, index) => (
                      <SortableColorSwatch
                        key={color.id}
                        id={color.id}
                        color={color.hex}
                        name={color.name}
                        index={index}
                        isSelected={
                          mixMode && selectedColors.includes(color.id)
                        }
                        selectionOrder={
                          mixMode && selectedColors.indexOf(color.id) >= 0
                            ? selectedColors.indexOf(color.id) + 1
                            : undefined
                        }
                        onSelect={() =>
                          mixMode
                            ? toggleColorSelection(color.id)
                            : handleEditColor(index)
                        }
                        onRemove={() => removeCustomColor(index)}
                        onEdit={() => handleEditColor(index)}
                        onDuplicate={() => handleDuplicateColor(index)}
                        showBlendHint={
                          mixMode && selectedColors.length === 1
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              <AddColorButton
                onColorAdd={handleAddColor}
                isEmpty={customPalette.length === 0}
              />

              {/* Mix toggle - color selection for blending is only
                  enabled while mix mode is active */}
              {customPalette.length >= 2 && (
                <button
                  type="button"
                  onClick={toggleMixMode}
                  className={cn(
                    "h-64 sm:h-80 w-16 sm:w-20 flex-shrink-0 rounded-lg",
                    "flex flex-col items-center justify-center gap-2",
                    "cursor-pointer transition-colors duration-300 border-2",
                    mixMode
                      ? "bg-blue-600 hover:bg-blue-500 border-blue-400/60 text-white"
                      : "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 hover:border-blue-400/70 text-blue-300"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full ring-1 transition-colors duration-300",
                      mixMode
                        ? "bg-white/15 ring-white/40"
                        : "bg-white/5 ring-white/15"
                    )}
                  >
                    <Blend className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium tracking-wide">
                    {mixMode ? "Cancel Mix" : "Mix"}
                  </span>
                </button>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Blend Controls - Only show when 2 colors are selected */}
      {mixMode && selectedColors.length === 2 && (
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
          className="p-4 border border-blue-500/30 dark:border-blue-900/50 rounded-lg bg-blue-500/5 dark:bg-blue-900/20 backdrop-blur-sm shadow-md"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <motion.div
              className="flex items-center gap-2"
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Blend className="h-5 w-5 text-blue-300" />
              <span className="font-medium text-blue-300">
                Blend Colors
              </span>
            </motion.div>

            <div className="flex-1 flex items-center gap-4">
              <div className="w-full max-w-xs flex items-center gap-4">
                <span className="text-sm text-slate-400 whitespace-nowrap">
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
                <span className="text-sm font-medium text-white w-6 text-center">
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
                    setMixMode(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 ring-1 ring-blue-400/40 text-white whitespace-nowrap shadow-md hover:shadow-lg transition-all"
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
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setEditingColor(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-white/10"
          >
            <h3 className="text-xl font-bold text-white mb-4">
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
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full border border-white/10"
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

              {(() => {
                const info = describeColor(editColorHex);
                if (!info) return null;
                return (
                  <div className="rounded-md bg-white/5 px-3 py-2 text-xs font-mono text-slate-300 space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">RGB</span>
                      <span>{info.rgb}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">HSL</span>
                      <span>{info.hsl}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setEditingColor(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  className="bg-blue-600 hover:bg-blue-500 ring-1 ring-blue-400/40 text-white"
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
