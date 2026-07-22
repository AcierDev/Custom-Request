"use client";

import { useState, useEffect, useMemo } from "react";
import { nanoid } from "nanoid";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
import type { PaintEstimateMode } from "@/store/customStore";
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
  RotateCcw,
  Trash2,
  ListChecks,
  PaintBucket,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

// Import sub-components
import { ColorSwatch } from "./ColorSwatch";
import { SortableColorSwatch } from "./SortableColorSwatch";
import { AddColorButton } from "./AddColorButton";
import { BlendingGuide } from "./BlendingGuide";
import { MixControls, type MixScope } from "./MixControls";
import {
  PALETTE_WIDE_BLEND_CONFIG,
  getPaletteWideBlendColorCount,
  insertBlendsBetweenAll,
} from "./paletteWideBlend";
import { computePaintTotals, hasSharedParts } from "./mixTotals";
import {
  paintAmountForSquares,
  paintAmountForColorGrams,
  GRAMS_PER_SQUARE,
} from "./paintEstimate";
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
      l * 100,
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
const ACTION_RESET = `${ACTION_BTN} bg-slate-700 hover:bg-rose-600 ring-slate-400/30 hover:ring-rose-400/40`;
const SELECTED_BLEND_COLOR_COUNT = 2;
// Paint-estimate input modes: derive the per-color mass from the square
// count, or type the total grams for one color directly.
const PAINT_MODE_OPTIONS: { value: PaintEstimateMode; label: string }[] = [
  { value: "perSquare", label: "g / square" },
  { value: "perColor", label: "g / color" },
];
// Drag-to-reorder activation. Mouse starts after a small movement; touch
// requires a long-press so quick swipes over the palette scroll the page
// instead of grabbing a swatch.
const MOUSE_DRAG_DISTANCE_PX = 8;
const TOUCH_DRAG_DELAY_MS = 250;
const TOUCH_DRAG_TOLERANCE_PX = 8;
const FIRST_SELECTED_INDEX = 0;
const SECOND_SELECTED_INDEX = 1;
const MISSING_COLOR_INDEX = -1;
const DEFAULT_MIX_SCOPE: MixScope = "pair";

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
    pieceSize,
    setPieceSize,
  } = useCustomStore();

  const [mixMode, setMixMode] = useState(false);
  const [mixScope, setMixScope] = useState<MixScope>(DEFAULT_MIX_SCOPE);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteSelected, setDeleteSelected] = useState<string[]>([]);
  // Index of the last swatch toggled in delete mode — anchor for
  // shift-click range selection.
  const [deleteAnchor, setDeleteAnchor] = useState<number | null>(null);
  const [blendCount, setBlendCount] = useState<number>(
    PALETTE_WIDE_BLEND_CONFIG.defaultColorsBetween,
  );
  const [editingColor, setEditingColor] = useState<number | null>(null);
  const [editColorHex, setEditColorHex] = useState("#000000");
  const [editColorName, setEditColorName] = useState("");
  const [showBlendingGuide, setShowBlendingGuide] = useState(false);
  // Seed synchronously from localStorage so a browser that already dismissed
  // the Pro tip never re-shows it on load (an async effect would read the
  // flag too late and the guide would flash back in).
  const [hasSeenBlendingGuide, setHasSeenBlendingGuide] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("hasSeenBlendingGuide") === "true",
  );
  const [showHarmonyGenerator, setShowHarmonyGenerator] = useState(false);

  // Palette-wide parts-per-paint so each color's recipe can flag paints
  // that are used heavily across other colors (white/black excluded).
  // Only expose it when mixing actually shares paint between colors — if
  // every color is just 1 part the badges add nothing.
  const paintTotals = useMemo(() => {
    const totals = computePaintTotals(customPalette);
    return hasSharedParts(totals) ? totals : undefined;
  }, [customPalette]);

  // Piece-size inputs live in the store (as raw entered text) so they save
  // onto the palette and come back when it's reopened — no re-entering. The
  // "how much paint to buy" estimate has two modes: derive the per-color
  // mass from the square count (squares ÷ colors × grams-per-square), or
  // take a directly-entered total grams-per-color. A blank or non-positive
  // grams-per-square value falls back to the default.
  const paintMode = pieceSize.paintMode ?? "perSquare";
  const effectiveGramsPerSquare =
    Number(pieceSize.gramsPerSquare) > 0
      ? Number(pieceSize.gramsPerSquare)
      : GRAMS_PER_SQUARE;
  const paintAmount = useMemo(
    () =>
      paintMode === "perColor"
        ? paintAmountForColorGrams(Number(pieceSize.gramsPerColor))
        : paintAmountForSquares(
            Number(pieceSize.squares),
            customPalette.length,
            effectiveGramsPerSquare,
          ),
    [
      paintMode,
      pieceSize.gramsPerColor,
      pieceSize.squares,
      customPalette.length,
      effectiveGramsPerSquare,
    ],
  );

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
      const t =
        (index + PALETTE_WIDE_BLEND_CONFIG.firstBlendStep) /
        (blendCount + PALETTE_WIDE_BLEND_CONFIG.firstBlendStep);
      const targetHex = blendHexColors(fromColor.hex, toColor.hex, t);
      return simulatePaintLikeMix(fromColor.hex, toColor.hex, t, targetHex);
    });
  }, [blendCount, customPalette, selectedColors]);

  useEffect(() => {
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
            }),
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
      handleOpenHarmonyGenerator as EventListener,
    );

    document.addEventListener(
      "closeHarmonyGenerator",
      handleCloseHarmonyGenerator as EventListener,
    );

    return () => {
      document.removeEventListener(
        "openHarmonyGenerator",
        handleOpenHarmonyGenerator as EventListener,
      );
      document.removeEventListener(
        "closeHarmonyGenerator",
        handleCloseHarmonyGenerator as EventListener,
      );
    };
  }, []);

  // Show the one-time mixing guide as soon as blending becomes available.
  useEffect(() => {
    if (customPalette.length >= 2 && !hasSeenBlendingGuide) {
      setShowBlendingGuide(true);
    }
  }, [customPalette.length, hasSeenBlendingGuide]);

  const dismissBlendingGuide = () => {
    setShowBlendingGuide(false);
    setHasSeenBlendingGuide(true);
    localStorage.setItem("hasSeenBlendingGuide", "true");
  };

  const handleAddColor = (hex: string) => {
    addCustomColor(hex);
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
    setHasSeenBlendingGuide(false);
    if (customPalette.length >= 2) {
      setShowBlendingGuide(true);
    }
  };

  // Bulk-add colors resolved from pasted paint codes (e.g. "SW 6910").
  // Names already carry the full purchase label, and setCustomPalette
  // records one undo step for the whole paste.
  const handleAddColorsByCode = (colors: { hex: string; name: string }[]) => {
    if (colors.length === 0) return;
    setCustomPalette([
      ...customPalette,
      ...colors.map((c) => ({ id: nanoid(), hex: c.hex, name: c.name })),
    ]);
    toast.success(
      `Added ${colors.length} color${colors.length === 1 ? "" : "s"} from codes`,
    );
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

  const handleMixScopeChange = (scope: MixScope) => {
    clearSelectedColors();
    setMixScope(scope);
  };

  const handleCreateBlend = () => {
    setHasSeenBlendingGuide(true);

    if (mixScope === "pair") {
      addBlendedColors(blendCount);
    } else {
      if (
        customPalette.length <
        PALETTE_WIDE_BLEND_CONFIG.minimumBlendableColorCount
      ) {
        return;
      }

      const resultColorCount = getPaletteWideBlendColorCount(
        customPalette.length,
        blendCount,
      );
      const blendedPalette = insertBlendsBetweenAll(
        customPalette,
        blendCount,
        (fromColor, toColor, t) => {
          const hex = blendHexColors(fromColor.hex, toColor.hex, t);
          return {
            id: nanoid(),
            hex,
            mix: { fromId: fromColor.id, toId: toColor.id, t },
            handMix: simulatePaintLikeMix(fromColor.hex, toColor.hex, t, hex),
          };
        },
      );

      setCustomPalette(blendedPalette);
      clearSelectedColors();
      toast.success(`Created ${resultColorCount}-color blend`);
    }

    setMixMode(false);
    setMixScope(DEFAULT_MIX_SCOPE);
  };

  const toggleMixMode = () => {
    const nextMixMode = !mixMode;
    clearSelectedColors();
    setMixScope(DEFAULT_MIX_SCOPE);
    if (deleteMode) {
      setDeleteMode(false);
      setDeleteSelected([]);
    }
    setMixMode(nextMixMode);
  };

  const toggleDeleteMode = () => {
    setDeleteMode((prev) => {
      const next = !prev;
      if (next && mixMode) {
        clearSelectedColors();
        setMixMode(false);
        setMixScope(DEFAULT_MIX_SCOPE);
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
      const rangeIds = customPalette.slice(start, end + 1).map((c) => c.id);
      setDeleteSelected((prev) => Array.from(new Set([...prev, ...rangeIds])));
      return;
    }

    setDeleteSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setDeleteAnchor(index);
  };

  const handleDeleteSelected = () => {
    if (deleteSelected.length === 0) return;
    const count = deleteSelected.length;
    const newPalette = customPalette.filter(
      (c) => !deleteSelected.includes(c.id),
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
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: MOUSE_DRAG_DISTANCE_PX,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: TOUCH_DRAG_DELAY_MS,
        tolerance: TOUCH_DRAG_TOLERANCE_PX,
      },
    }),
    useSensor(KeyboardSensor),
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
    <div className="space-y-5">
      {/* Color Palette Display */}
      <div className="space-y-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
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

            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
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
                        className={ACTION_RESET}
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
                          className={ACTION_RESET}
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
                        aria-label={
                          showBlendingGuide
                            ? "Hide mixing tip"
                            : "Show mixing tip"
                        }
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
        </div>

        {/* Piece size → paint to buy. Two ways to size each color's paint:
            derive it from the square count (grams-per-square × squares ÷
            colors), or enter a total grams-per-color directly. Saved with
            the palette, so it comes back when you reopen it. */}
        {customPalette.length > 0 && (
          <details className="group rounded-xl border border-amber-400/25 bg-amber-500/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm text-slate-200 [&::-webkit-details-marker]:hidden">
              <PaintBucket className="h-4 w-4 shrink-0 text-amber-300" />
              <span className="font-medium">Paint estimate</span>
              <span className="ml-auto text-xs text-slate-400">
                {paintAmount ? `≈ ${paintAmount.label} per color` : "Optional"}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-amber-400/15 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                {/* Mode toggle: per-square vs. per-color */}
                <div className="inline-flex items-center gap-0.5 rounded-xl border border-amber-400/40 bg-amber-500/10 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_1px_3px_rgba(0,0,0,0.20)]">
                  {PAINT_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPieceSize({ paintMode: option.value })}
                      className={cn(
                        "rounded-[10px] px-2.5 py-1 text-xs font-medium transition-colors",
                        paintMode === option.value
                          ? "bg-amber-600/85 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.10)]"
                          : "text-slate-300 hover:text-white",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Piece size (squares) — only needed when deriving from squares */}
                {paintMode === "perSquare" && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_1px_3px_rgba(0,0,0,0.20)]">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-amber-600/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.10)]">
                      <PaintBucket className="h-4 w-4 text-white" />
                    </span>
                    <Label
                      htmlFor="square-count"
                      className="whitespace-nowrap text-sm text-slate-200"
                    >
                      Piece size
                    </Label>
                    <Input
                      id="square-count"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={pieceSize.squares}
                      onChange={(e) =>
                        setPieceSize({ squares: e.target.value })
                      }
                      placeholder="e.g. 400"
                      className="h-8 w-24"
                    />
                    <span className="whitespace-nowrap text-xs text-slate-400">
                      squares
                    </span>
                  </div>
                )}

                {/* Paint amount — grams-per-square (defaults to GRAMS_PER_SQUARE)
                or total grams-per-color, depending on mode. */}
                <div className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_1px_3px_rgba(0,0,0,0.20)]">
                  {paintMode === "perColor" && (
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-amber-600/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.10)]">
                      <PaintBucket className="h-4 w-4 text-white" />
                    </span>
                  )}
                  <Label
                    htmlFor="paint-grams"
                    className="whitespace-nowrap text-sm text-slate-200"
                  >
                    Paint
                  </Label>
                  {paintMode === "perColor" ? (
                    <Input
                      id="paint-grams"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="1"
                      value={pieceSize.gramsPerColor}
                      onChange={(e) =>
                        setPieceSize({ gramsPerColor: e.target.value })
                      }
                      placeholder="e.g. 120"
                      className="h-8 w-24"
                    />
                  ) : (
                    <Input
                      id="paint-grams"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.5"
                      value={pieceSize.gramsPerSquare}
                      onChange={(e) =>
                        setPieceSize({ gramsPerSquare: e.target.value })
                      }
                      placeholder={String(GRAMS_PER_SQUARE)}
                      className="h-8 w-20"
                    />
                  )}
                  <span className="whitespace-nowrap text-xs text-slate-400">
                    {paintMode === "perColor" ? "g / color" : "g / square"}
                  </span>
                </div>

                <p className="text-xs text-slate-400 sm:ml-auto">
                  {paintAmount ? (
                    <>
                      <span className="font-semibold text-slate-200">
                        ≈ {paintAmount.label}
                      </span>{" "}
                      of each color ·{" "}
                      <span className="tabular-nums">
                        {Math.round(paintAmount.grams)} g
                      </span>
                      {paintMode === "perSquare" && (
                        <> · {effectiveGramsPerSquare} g/square</>
                      )}
                    </>
                  ) : paintMode === "perColor" ? (
                    <>Enter grams per color to size each color&apos;s paint.</>
                  ) : (
                    <>Enter the square count to size each color&apos;s paint.</>
                  )}
                </p>
              </div>
            </div>
          </details>
        )}

        {/* Blending Guide */}
        <AnimatePresence>
          {showBlendingGuide && (
            <BlendingGuide onDismiss={dismissBlendingGuide} />
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
            {/* Mobile: full-width color bands stacked vertically (one per
                row) so each is a comfortable tap target and its label reads
                left-to-right. Desktop (sm+): the original side-by-side
                paint-strip row. */}
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch list-none p-0 m-0 sm:-mx-3 sm:w-[calc(100%_+_1.5rem)]">
              {customPalette.length > 0 && (
                <div
                  className="flex flex-col gap-1.5 sm:flex sm:flex-row sm:min-w-0 sm:basis-0 sm:gap-1"
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
                        paintSourceHex={color.paintSourceHex}
                        paintMixRecipe={color.paintMixRecipe}
                        paintTotals={paintTotals}
                        paintAmount={paintAmount ?? undefined}
                        handMix={color.handMix}
                        index={index}
                        isSelected={
                          (mixMode &&
                            mixScope === "pair" &&
                            selectedColors.includes(color.id)) ||
                          (deleteMode && deleteSelected.includes(color.id))
                        }
                        selectionOrder={
                          mixMode &&
                          mixScope === "pair" &&
                          selectedColors.indexOf(color.id) >= 0
                            ? selectedColors.indexOf(color.id) +
                              PALETTE_WIDE_BLEND_CONFIG.nextColorOffset
                            : undefined
                        }
                        onSelect={(e) => {
                          if (deleteMode) {
                            toggleDeleteSelection(index, !!e?.shiftKey);
                          } else if (mixMode) {
                            if (mixScope === "pair") {
                              toggleColorSelection(color.id);
                            }
                          } else {
                            handleEditColor(index);
                          }
                        }}
                        onRemove={() => removeCustomColor(index)}
                        onEdit={() => handleEditColor(index)}
                        onDuplicate={() => handleDuplicateColor(index)}
                        showBlendHint={
                          mixMode &&
                          mixScope === "pair" &&
                          selectedColors.length === 1
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Mobile: Add + Mix share a full-width row of comfortable
                  touch targets. Desktop (sm:contents): they rejoin the
                  strip row as the original slim side columns. */}
              <div className="flex w-full items-stretch gap-2 sm:contents">
                <AddColorButton
                  onColorAdd={handleAddColor}
                  onColorsAdd={handleAddColorsByCode}
                  isEmpty={customPalette.length === 0}
                />

                {/* Mix toggle - color selection for blending is only
                    enabled while mix mode is active */}
                {customPalette.length >= 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    aria-pressed={mixMode}
                    onClick={toggleMixMode}
                    className={cn(
                      "h-16 min-w-0 flex-1 sm:h-80 sm:w-20 sm:flex-none rounded-lg",
                      "flex flex-row sm:flex-col items-center justify-center gap-2",
                      "cursor-pointer transition-colors duration-300 border-2",
                      mixMode
                        ? "bg-blue-600 hover:bg-blue-500 border-blue-400/60 text-white"
                        : "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 hover:border-blue-400/70 text-blue-300",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full ring-1 transition-colors duration-300",
                        mixMode
                          ? "bg-white/15 ring-white/40"
                          : "bg-white/5 ring-white/15",
                      )}
                    >
                      <Blend className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <span className="text-xs font-medium tracking-wide">
                      {mixMode ? "Cancel Mix" : "Mix"}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {mixMode && (
        <MixControls
          scope={mixScope}
          colorsBetween={blendCount}
          paletteColorCount={customPalette.length}
          selectedColorCount={selectedColors.length}
          handMixPreview={handMixPreview}
          onScopeChange={handleMixScopeChange}
          onColorsBetweenChange={setBlendCount}
          onCreate={handleCreateBlend}
        />
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
            <h3 className="text-xl font-bold text-white mb-4">Edit Color</h3>

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
