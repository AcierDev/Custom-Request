"use client";

import { useState, useEffect, useMemo } from "react";
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
import { blendHexColors } from "@/lib/colorUtils";
import { simulatePaintLikeMix } from "@/lib/paintMixSimulator";
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
  RotateCcw,
  Trash2,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";

// Import sub-components
import { ColorSwatch } from "./ColorSwatch";
import { SortableColorSwatch } from "./SortableColorSwatch";
import { AddColorButton } from "./AddColorButton";
import { BlendingGuide } from "./BlendingGuide";
import { ColorHarmonyGenerator } from "./ColorHarmonyGenerator";
import { VersionHistoryDialog } from "../PaletteList/VersionHistoryDialog";

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

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 ACTION BUTTON THEME                                                ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// One shared pill so every Custom-tab action button matches the rest of
// the app (same shape/height/shadow as the page's BTN_* family). Hue is
// the only thing that differs between them.
const ACTION_BTN =
  "h-8 px-3 rounded-[10px] ring-1 text-white text-xs font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_3px_rgba(0,0,0,0.25)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_48%)] transition-all disabled:opacity-50";
const ACTION_BLUE = `${ACTION_BTN} bg-blue-600 hover:bg-blue-500 ring-blue-400/40`;
const ACTION_SLATE = `${ACTION_BTN} bg-slate-700 hover:bg-slate-600 ring-slate-400/30`;
const ACTION_RED = `${ACTION_BTN} bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 ring-red-400/40`;
const SELECTED_BLEND_COLOR_COUNT = 2;
const FIRST_SELECTED_INDEX = 0;
const SECOND_SELECTED_INDEX = 1;
const FIRST_BLEND_STEP = 1;
const MISSING_COLOR_INDEX = -1;
const HAND_MIX_PREVIEW_THEME = {
  mix: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100",
  test: "border-amber-400/40 bg-amber-500/15 text-amber-100",
  buy: "border-rose-400/40 bg-rose-500/15 text-rose-100",
} as const;

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
    updateColor,
    reorderPalette,
    commitPaletteToHistory,
    editingPaletteId,
    resetPaletteEditor,
    setCustomPalette,
    savedPalettes,
  } = useCustomStore();

  const [mixMode, setMixMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteSelected, setDeleteSelected] = useState<string[]>([]);
  // Index of the last swatch toggled in delete mode — anchor for
  // shift-click range selection.
  const [deleteAnchor, setDeleteAnchor] = useState<number | null>(null);
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

  const handMixPreview = useMemo(() => {
    if (selectedColors.length !== SELECTED_BLEND_COLOR_COUNT) return [];

    const indices = selectedColors
      .map((id) => customPalette.findIndex((color) => color.id === id))
      .filter((index) => index !== MISSING_COLOR_INDEX)
      .sort((a, b) => a - b);

    if (indices.length !== SELECTED_BLEND_COLOR_COUNT) return [];

    const fromColor = customPalette[indices[FIRST_SELECTED_INDEX]];
    const toColor = customPalette[indices[SECOND_SELECTED_INDEX]];
    if (!fromColor || !toColor) return [];

    return Array.from({ length: blendCount }, (_, index) => {
      const t = (index + FIRST_BLEND_STEP) / (blendCount + FIRST_BLEND_STEP);
      const targetHex = blendHexColors(fromColor.hex, toColor.hex, t);
      return simulatePaintLikeMix(fromColor.hex, toColor.hex, t, targetHex);
    });
  }, [blendCount, customPalette, selectedColors]);

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

    // Apply hex + name as one history entry so a single undo reverts it.
    updateColor(editingColor, { hex: editColorHex, name: editColorName });

    // Close the edit modal
    setEditingColor(null);
  };

  const handleResetEditor = () => {
    resetPaletteEditor();
  };

  // Resetting only loses work if the editor holds colors that aren't already
  // persisted. Empty palette → nothing to lose. Editing a saved palette whose
  // colors still match what's stored → nothing to lose. Otherwise (a new,
  // unsaved palette or unsaved edits) → warn before wiping it.
  const hasUnsavedChanges = useMemo(() => {
    if (customPalette.length === 0) return false;
    const saved = editingPaletteId
      ? savedPalettes.find((p) => p.id === editingPaletteId)
      : undefined;
    if (!saved) return true;
    if (saved.colors.length !== customPalette.length) return true;
    return saved.colors.some((c, i) => {
      const cur = customPalette[i];
      return (
        c.hex.toLowerCase() !== cur.hex.toLowerCase() ||
        (c.name ?? "") !== (cur.name ?? "") ||
        (c.extraPercent ?? 0) !== (cur.extraPercent ?? 0)
      );
    });
  }, [customPalette, editingPaletteId, savedPalettes]);

  const performReset = () => {
    handleResetEditor();
    toast.success("Palette reset!");
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
    if (deleteMode) {
      setDeleteMode(false);
      setDeleteSelected([]);
    }
    setMixMode((prev) => !prev);
  };

  const toggleDeleteMode = () => {
    setDeleteMode((prev) => {
      const next = !prev;
      if (next && mixMode) {
        clearSelectedColors();
        setMixMode(false);
      }
      if (!next) {
        setDeleteSelected([]);
        setDeleteAnchor(null);
      }
      return next;
    });
  };

  const toggleDeleteSelection = (index: number, shiftKey: boolean) => {
    const id = customPalette[index]?.id;
    if (!id) return;

    // Shift-click extends a range from the last toggled swatch to this
    // one, selecting everything in between.
    if (shiftKey && deleteAnchor !== null) {
      const start = Math.min(deleteAnchor, index);
      const end = Math.max(deleteAnchor, index);
      const rangeIds = customPalette
        .slice(start, end + 1)
        .map((c) => c.id);
      setDeleteSelected((prev) =>
        Array.from(new Set([...prev, ...rangeIds]))
      );
      return;
    }

    setDeleteSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setDeleteAnchor(index);
  };

  const handleDeleteSelected = () => {
    if (deleteSelected.length === 0) return;
    const count = deleteSelected.length;
    const newPalette = customPalette.filter(
      (c) => !deleteSelected.includes(c.id)
    );
    if (newPalette.length === 0) {
      resetPaletteEditor();
    } else {
      setCustomPalette(newPalette);
    }
    setDeleteSelected([]);
    setDeleteAnchor(null);
    setDeleteMode(false);
    toast.success(`Deleted ${count} ${count === 1 ? "color" : "colors"}`);
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
            <TooltipProvider delayDuration={300}>
              {/* Harmony */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={() =>
                      setShowHarmonyGenerator(!showHarmonyGenerator)
                    }
                    className={ACTION_BLUE}
                  >
                    <Palette className="h-3.5 w-3.5 mr-1.5" />
                    Harmony
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Generate color harmonies</p>
                </TooltipContent>
              </Tooltip>

              {/* Select & delete colors */}
              {deleteMode ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleDeleteSelected}
                    disabled={deleteSelected.length === 0}
                    className={ACTION_RED}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete
                    {deleteSelected.length > 0
                      ? ` (${deleteSelected.length})`
                      : ""}
                  </Button>
                  <Button
                    size="sm"
                    onClick={toggleDeleteMode}
                    className={ACTION_SLATE}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={toggleDeleteMode}
                      disabled={customPalette.length === 0}
                      className={ACTION_SLATE}
                    >
                      <ListChecks className="h-3.5 w-3.5 mr-1.5" />
                      Select &amp; Delete
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Select multiple colors, then delete them</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Divider before the destructive action */}
              <div className="h-6 w-px bg-white/10" />

              {/* Reset entire palette — warn only when unsaved work is at stake */}
              {!hasUnsavedChanges ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      disabled={customPalette.length === 0}
                      onClick={performReset}
                      className={ACTION_RED}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Reset Palette
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Reset your entire palette</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
              <Tooltip>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      disabled={customPalette.length === 0}
                      className={ACTION_RED}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Reset Palette
                    </Button>
                  </AlertDialogTrigger>
                  <TooltipContent side="bottom">
                    <p>Reset your entire palette</p>
                  </TooltipContent>
                  <AlertDialogContent className="border border-red-400/30 bg-gradient-to-br from-gray-900 via-gray-900 to-rose-950/40 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_30px_rgba(0,0,0,0.5)]">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-white">
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-[10px] bg-red-600/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.10)]">
                          <RotateCcw className="h-4 w-4 text-white" />
                        </span>
                        Reset Palette?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400">
                        This will remove all colors from your palette. This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-[10px] border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="rounded-[10px] bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 ring-1 ring-red-400/40 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_3px_rgba(0,0,0,0.25)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_48%)]"
                        onClick={performReset}
                      >
                        Yes, Reset
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </Tooltip>
              )}

              {/* Tips toggle */}
              {(customPalette.length >= 2 || showBlendingGuide) && (
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{showBlendingGuide ? "Hide tips" : "Show tips"}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
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
                        mixed={!!color.mix}
                        paintMatch={color.paintMatch}
                        handMix={color.handMix}
                        index={index}
                        isSelected={
                          (mixMode && selectedColors.includes(color.id)) ||
                          (deleteMode && deleteSelected.includes(color.id))
                        }
                        selectionOrder={
                          mixMode && selectedColors.indexOf(color.id) >= 0
                            ? selectedColors.indexOf(color.id) + 1
                            : undefined
                        }
                        onSelect={(e) =>
                          deleteMode
                            ? toggleDeleteSelection(
                                index,
                                !!e?.shiftKey
                              )
                            : mixMode
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
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="rounded-xl border border-blue-400/30 bg-gradient-to-br from-blue-600/15 to-indigo-600/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_2px_8px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:p-4"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <motion.div
              className="inline-flex items-center justify-center gap-1.5 px-[0.675rem] h-6 text-xs font-medium text-white rounded-[10px] bg-blue-600/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.10)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_48%)]"
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Blend className="h-3.5 w-3.5" />
              <span>Blend Colors</span>
            </motion.div>

            <div className="flex w-full flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex w-full max-w-xs items-center gap-4">
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
                  trackClassName="h-2 bg-blue-400/20"
                  rangeClassName="bg-gradient-to-r from-blue-500 to-indigo-500"
                  thumbClassName="h-5 w-9 rounded-[10px] border-transparent bg-blue-600/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_3px_rgba(0,0,0,0.35)] focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                />
                <span className="inline-flex items-center justify-center h-6 min-w-[1.75rem] px-2 text-xs font-medium text-white rounded-[10px] bg-blue-600/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.10)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_48%)]">
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
                  className="rounded-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 ring-1 ring-blue-400/40 text-white whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_3px_rgba(0,0,0,0.25)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_48%)] transition-all"
                >
                  <Blend className="mr-2 h-4 w-4" />
                  Create Blend
                </Button>
              </motion.div>
            </div>
          </div>

          {handMixPreview.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {handMixPreview.map((mix) => (
                <TooltipProvider
                  key={`${mix.recipe}-${mix.targetHex}-${mix.predictedHex}`}
                  delayDuration={225}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "flex min-w-0 items-center gap-1.5 rounded-[10px] border px-2 py-1 text-xs font-medium",
                          HAND_MIX_PREVIEW_THEME[mix.decision]
                        )}
                      >
                        <span
                          className="h-4 w-5 rounded-sm ring-1 ring-white/25"
                          style={{ backgroundColor: mix.targetHex }}
                        />
                        <span
                          className="h-4 w-5 rounded-sm ring-1 ring-white/25"
                          style={{ backgroundColor: mix.predictedHex }}
                        />
                        <span className="truncate">{mix.label}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-64">
                      <div className="space-y-1 text-xs">
                        <div className="font-medium">{mix.recipe}</div>
                        <div>Target {mix.targetHex}</div>
                        <div>Hand mix {mix.predictedHex}</div>
                        <div>ΔE {mix.deltaE}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Edit Color Modal */}
      {editingColor !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-4"
          onClick={() => setEditingColor(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg border-2 border-white/10 bg-gray-900 p-4 shadow-2xl sm:p-6"
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

      <VersionHistoryDialog />
    </div>
  );
}
