"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useStore } from "zustand";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  PATTERN_BRUSH_SIZE_CONFIG,
  hoverStore,
  useCustomStore,
  type PatternBrushShape,
  type PatternEditingMode,
  type SquareDirection,
} from "@/store/customStore";
import { getColorEntries } from "@/components/preview/patternUtils";
import {
  ChevronRight,
  ChevronDown,
  Eraser,
  RotateCcw,
  Palette,
  MousePointer,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  ArrowRightLeft,
  Rows3,
  Columns3,
  Square,
  Circle,
  EyeOff,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemDesigns } from "@/typings/types";
import { AiPatternPrompt } from "./AiPatternPrompt";
import { PatternHistoryControls } from "./PatternHistoryControls";

interface PatternEditorProps {
  className?: string;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧭 PATTERN EDITOR TOOLS                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const DIRECTION_OPTIONS = [
  { direction: "north", label: "Up", Icon: ArrowUp },
  { direction: "east", label: "Right", Icon: ArrowRight },
  { direction: "south", label: "Down", Icon: ArrowDown },
  { direction: "west", label: "Left", Icon: ArrowLeft },
] as const satisfies ReadonlyArray<{
  direction: SquareDirection;
  label: string;
  Icon: typeof ArrowUp;
}>;

const BRUSH_OPTIONS = [
  { shape: "single", label: "Single square", Icon: MousePointer },
  { shape: "row", label: "Entire row", Icon: Rows3 },
  { shape: "column", label: "Entire column", Icon: Columns3 },
  { shape: "square", label: "Square area", Icon: Square },
  { shape: "circle", label: "Circle area", Icon: Circle },
] as const satisfies ReadonlyArray<{
  shape: PatternBrushShape;
  label: string;
  Icon: typeof MousePointer;
}>;
const HUMAN_INDEX_OFFSET = 1;
const EMPTY_SQUARE_COUNT = 0;
const SINGULAR_SQUARE_COUNT = 1;
const MINIMUM_REPLACE_COLOR_COUNT = 2;
const MISSING_PALETTE_INDEX = -1;
const PATTERN_EDITOR_CONTENT_ID = "viewer-pattern-editor-controls";
const COMPACT_ACTION_BUTTON_CLASS = "h-7 px-2 text-xs";
const COMPACT_ACTION_ICON_CLASS = "mr-1 h-3 w-3";
const DIRECTION_HEADER_CLASS = "flex items-center justify-between gap-2";
const COLOR_CONTEXT_MENU_ID = "pattern-editor-color-context-menu";
const CONTEXT_MENU_WIDTH_PX = 160;
const CONTEXT_MENU_HEIGHT_PX = 40;
const CONTEXT_MENU_VIEWPORT_GAP_PX = 8;
const CONTEXT_MENU_ANCHOR_DIVISOR = 2;
const TOOL_INSTRUCTIONS: Record<PatternEditingMode["tool"], string> = {
  none: "Select a color, direction, or visibility tool to start editing",
  color: "Click or drag across squares to paint them",
  direction: "Click or drag across squares to turn them",
  hide: "Click or drag across squares to hide them",
  eraser: "Click or drag across squares to reset them",
};

const normalizePaletteHex = (hex: string): string =>
  hex.trim().toLowerCase();

const formatSquareCount = (count: number): string =>
  `${count} square${count === SINGULAR_SQUARE_COUNT ? "" : "s"}`;

interface ColorContextMenuState {
  colorIndex: number;
  colorLabel: string;
  left: number;
  top: number;
}

export function PatternEditor({ className }: PatternEditorProps) {
  const selectedDesign = useCustomStore((s) => s.selectedDesign);
  const customPalette = useCustomStore((s) => s.customPalette);
  const removeCustomColor = useCustomStore((s) => s.removeCustomColor);
  const patternOverride = useCustomStore((s) => s.patternOverride);
  const patternDirectionOverride = useCustomStore(
    (s) => s.patternDirectionOverride
  );
  const patternHiddenOverride = useCustomStore(
    (s) => s.patternHiddenOverride
  );
  const clearPatternDirectionOverride = useCustomStore(
    (s) => s.clearPatternDirectionOverride
  );
  const clearPatternHiddenOverride = useCustomStore(
    (s) => s.clearPatternHiddenOverride
  );
  const clearPatternOverride = useCustomStore((s) => s.clearPatternOverride);
  const patternEditingMode = useCustomStore((s) => s.patternEditingMode);
  const setPatternEditingMode = useCustomStore((s) => s.setPatternEditingMode);
  const patternBrush = useCustomStore((s) => s.patternBrush);
  const setPatternBrushShape = useCustomStore(
    (s) => s.setPatternBrushShape
  );
  const setPatternBrushSize = useCustomStore(
    (s) => s.setPatternBrushSize
  );
  const isPatternEditorActive = useCustomStore((s) => s.isPatternEditorActive);
  const setIsPatternEditorActive = useCustomStore(
    (s) => s.setIsPatternEditorActive
  );
  const setIsPatternColorReplaceActive = useCustomStore(
    (s) => s.setIsPatternColorReplaceActive
  );
  const renderedPatternColorIndexes = useCustomStore(
    (s) => s.renderedPatternColorIndexes
  );
  const replaceRenderedPatternColors = useCustomStore(
    (s) => s.replaceRenderedPatternColors
  );
  const pinnedColorInfo = useStore(hoverStore, (s) => s.pinnedInfo);
  const setPinnedColorInfo = useStore(hoverStore, (s) => s.setPinnedInfo);

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [replaceSourceIndex, setReplaceSourceIndex] = useState<number | null>(
    null
  );
  const [colorContextMenu, setColorContextMenu] =
    useState<ColorContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuActionRef = useRef<HTMLButtonElement>(null);

  const colorEntries = useMemo(
    () => getColorEntries(selectedDesign, customPalette),
    [customPalette, selectedDesign]
  );
  const distinctColorCount = useMemo(
    () =>
      new Set(
        colorEntries.map(([, color]) => normalizePaletteHex(color.hex))
      ).size,
    [colorEntries]
  );

  const cancelReplaceMode = useCallback(() => {
    setIsReplaceMode(false);
    setReplaceSourceIndex(null);
    setPinnedColorInfo(null);
    setIsPatternEditorActive(false);
    setIsPatternColorReplaceActive(false);
    setPatternEditingMode({ tool: "none" });
  }, [
    setIsPatternEditorActive,
    setIsPatternColorReplaceActive,
    setPatternEditingMode,
    setPinnedColorInfo,
  ]);

  const openColorContextMenu = useCallback(
    (colorIndex: number, colorLabel: string, left: number, top: number) => {
      if (selectedDesign !== ItemDesigns.Custom) return;

      const maximumLeft = Math.max(
        CONTEXT_MENU_VIEWPORT_GAP_PX,
        window.innerWidth -
          CONTEXT_MENU_WIDTH_PX -
          CONTEXT_MENU_VIEWPORT_GAP_PX
      );
      const maximumTop = Math.max(
        CONTEXT_MENU_VIEWPORT_GAP_PX,
        window.innerHeight -
          CONTEXT_MENU_HEIGHT_PX -
          CONTEXT_MENU_VIEWPORT_GAP_PX
      );

      setColorContextMenu({
        colorIndex,
        colorLabel,
        left: Math.min(
          Math.max(left, CONTEXT_MENU_VIEWPORT_GAP_PX),
          maximumLeft
        ),
        top: Math.min(
          Math.max(top, CONTEXT_MENU_VIEWPORT_GAP_PX),
          maximumTop
        ),
      });
    },
    [selectedDesign]
  );

  useEffect(() => {
    if (!colorContextMenu) return;

    contextMenuActionRef.current?.focus();

    const closeContextMenu = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        contextMenuRef.current?.contains(event.target)
      ) {
        return;
      }
      setColorContextMenu(null);
    };
    const closeContextMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setColorContextMenu(null);
    };
    const closeContextMenuOnViewportChange = () => setColorContextMenu(null);

    window.addEventListener("pointerdown", closeContextMenu);
    window.addEventListener("keydown", closeContextMenuOnEscape);
    window.addEventListener("resize", closeContextMenuOnViewportChange);
    window.addEventListener("scroll", closeContextMenuOnViewportChange, true);

    return () => {
      window.removeEventListener("pointerdown", closeContextMenu);
      window.removeEventListener("keydown", closeContextMenuOnEscape);
      window.removeEventListener("resize", closeContextMenuOnViewportChange);
      window.removeEventListener(
        "scroll",
        closeContextMenuOnViewportChange,
        true
      );
    };
  }, [colorContextMenu]);

  const handleDeleteColor = useCallback(() => {
    if (!colorContextMenu) return;

    removeCustomColor(colorContextMenu.colorIndex);
    cancelReplaceMode();
    toast.success(`Deleted ${colorContextMenu.colorLabel}`);
    setColorContextMenu(null);
  }, [cancelReplaceMode, colorContextMenu, removeCustomColor]);

  useEffect(() => {
    if (isCollapsed && isPatternEditorActive) {
      setIsPatternEditorActive(false);
    }
  }, [
    isCollapsed,
    isPatternEditorActive,
    setIsPatternEditorActive,
  ]);

  useEffect(
    () => () => {
      setIsPatternColorReplaceActive(false);
      setPinnedColorInfo(null);
    },
    [setIsPatternColorReplaceActive, setPinnedColorInfo]
  );

  const handleCollapseToggle = useCallback(() => {
    const willCollapse = !isCollapsed;
    setIsCollapsed(willCollapse);
    if (willCollapse) {
      cancelReplaceMode();
    }
  }, [cancelReplaceMode, isCollapsed]);

  // Memoized event handlers
  const handleClearAll = useCallback(() => {
    clearPatternOverride();
  }, [clearPatternOverride]);

  const handleResetDirections = useCallback(() => {
    clearPatternDirectionOverride();
  }, [clearPatternDirectionOverride]);

  const handleReplaceToggle = useCallback(() => {
    if (isReplaceMode) {
      cancelReplaceMode();
      return;
    }

    setIsReplaceMode(true);
    setReplaceSourceIndex(null);
    setPinnedColorInfo(null);
    setIsPatternEditorActive(false);
    setIsPatternColorReplaceActive(true);
    setPatternEditingMode({ tool: "none" });
  }, [
    cancelReplaceMode,
    isReplaceMode,
    setIsPatternEditorActive,
    setIsPatternColorReplaceActive,
    setPatternEditingMode,
    setPinnedColorInfo,
  ]);

  const handleColorSelect = useCallback(
    (index: number) => {
      if (isReplaceMode) {
        const selectedColor = colorEntries[index]?.[1];
        if (!selectedColor) return;

        if (replaceSourceIndex === null) {
          setReplaceSourceIndex(index);
          return;
        }

        const sourceColor = colorEntries[replaceSourceIndex]?.[1];
        if (!sourceColor) {
          setReplaceSourceIndex(index);
          return;
        }

        const sourceHex = normalizePaletteHex(sourceColor.hex);
        const replacementHex = normalizePaletteHex(selectedColor.hex);
        if (sourceHex === replacementHex) {
          toast.error("Choose a different replacement color.");
          return;
        }

        const sourceIndexes = colorEntries.reduce<number[]>(
          (indexes, [, color], colorIndex) => {
            if (normalizePaletteHex(color.hex) === sourceHex) {
              indexes.push(colorIndex);
            }
            return indexes;
          },
          []
        );
        const sourceIndexSet = new Set(sourceIndexes);
        const matchingSquareCount = Object.values(
          renderedPatternColorIndexes
        ).filter((colorIndex) => sourceIndexSet.has(colorIndex)).length;
        const sourceLabel =
          sourceColor.name ||
          `Color ${replaceSourceIndex + HUMAN_INDEX_OFFSET}`;
        const replacementLabel =
          selectedColor.name || `Color ${index + HUMAN_INDEX_OFFSET}`;
        const historyLabel =
          `Replaced ${sourceLabel} with ${replacementLabel} ` +
          `(${formatSquareCount(matchingSquareCount)})`;
        const replacedSquareCount = replaceRenderedPatternColors(
          sourceIndexes,
          index,
          historyLabel
        );

        if (replacedSquareCount === EMPTY_SQUARE_COUNT) {
          toast.error(`No squares use ${sourceLabel}.`);
          setReplaceSourceIndex(null);
          return;
        }

        toast.success(
          `Replaced ${formatSquareCount(replacedSquareCount)} with ${replacementLabel}`
        );
        cancelReplaceMode();
        return;
      }

      setIsPatternEditorActive(true);
      setPatternEditingMode({
        tool: "color",
        selectedColorIndex: index,
      });
    },
    [
      colorEntries,
      cancelReplaceMode,
      isReplaceMode,
      renderedPatternColorIndexes,
      replaceRenderedPatternColors,
      replaceSourceIndex,
      setPatternEditingMode,
      setIsPatternEditorActive,
    ]
  );

  useEffect(() => {
    if (!isReplaceMode || !pinnedColorInfo?.color) return;

    const pickedPaletteIndex = colorEntries.findIndex(
      ([, color]) =>
        normalizePaletteHex(color.hex) ===
        normalizePaletteHex(pinnedColorInfo.color)
    );
    setPinnedColorInfo(null);

    if (pickedPaletteIndex === MISSING_PALETTE_INDEX) {
      toast.error("That artwork color is not available in this palette.");
      return;
    }

    handleColorSelect(pickedPaletteIndex);
  }, [
    colorEntries,
    handleColorSelect,
    isReplaceMode,
    pinnedColorInfo,
    setPinnedColorInfo,
  ]);

  const handleDirectionSelect = useCallback(
    (direction: SquareDirection) => {
      cancelReplaceMode();
      setIsPatternEditorActive(true);
      setPatternEditingMode({
        tool: "direction",
        selectedDirection: direction,
      });
    },
    [cancelReplaceMode, setPatternEditingMode, setIsPatternEditorActive]
  );

  const handleEraserToggle = useCallback(() => {
    cancelReplaceMode();
    setIsPatternEditorActive(true);
    setPatternEditingMode(
      patternEditingMode.tool === "eraser"
        ? { tool: "none" }
        : { tool: "eraser" }
    );
  }, [
    cancelReplaceMode,
    patternEditingMode,
    setPatternEditingMode,
    setIsPatternEditorActive,
  ]);

  const handleHideToggle = useCallback(() => {
    cancelReplaceMode();
    setIsPatternEditorActive(true);
    setPatternEditingMode(
      patternEditingMode.tool === "hide"
        ? { tool: "none" }
        : { tool: "hide" }
    );
  }, [
    cancelReplaceMode,
    patternEditingMode,
    setPatternEditingMode,
    setIsPatternEditorActive,
  ]);

  const modifiedSquareCount = new Set([
    ...Object.keys(patternOverride),
    ...Object.keys(patternDirectionOverride),
    ...Object.keys(patternHiddenOverride),
  ]).size;

  const activeInstruction =
    TOOL_INSTRUCTIONS[patternEditingMode.tool] ?? TOOL_INSTRUCTIONS.none;
  const sizedBrushShape =
    patternBrush.shape === "square" || patternBrush.shape === "circle"
      ? patternBrush.shape
      : null;
  const activeBrushSize = sizedBrushShape
    ? patternBrush.sizes[sizedBrushShape]
    : PATTERN_BRUSH_SIZE_CONFIG.default;
  const replaceSourceLabel =
    replaceSourceIndex === null
      ? null
      : colorEntries[replaceSourceIndex]?.[1].name ||
        `Color ${replaceSourceIndex + HUMAN_INDEX_OFFSET}`;

  return (
    <Card
      className={cn(
        "glass-surface rounded-[0.7rem] shadow-xl transition-all duration-200",
        className
      )}
    >
      <div>
        {/* Header */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCollapseToggle}
          aria-expanded={!isCollapsed}
          aria-controls={PATTERN_EDITOR_CONTENT_ID}
          className="h-auto w-full justify-between rounded-[0.7rem] p-4 text-gray-200 hover:bg-gray-900/40 hover:text-white"
        >
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span className="text-sm font-medium">Pattern Editor</span>
            {isPatternEditorActive && (
              <div
                className="w-2 h-2 bg-green-500 rounded-full"
                title="Editor Active"
              />
            )}
          </div>
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <div
            id={PATTERN_EDITOR_CONTENT_ID}
            className="space-y-4 px-4 pb-4 pt-2"
          >
            <AiPatternPrompt />

            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">
                Editor Status
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClearAll}
                  disabled={!modifiedSquareCount}
                  className="h-6 px-2 text-xs text-gray-400 hover:text-gray-200"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset All
                </Button>
                <Button
                  size="sm"
                  variant={isPatternEditorActive ? "default" : "outline"}
                  onClick={() => {
                    cancelReplaceMode();
                    if (isPatternEditorActive) {
                      setIsPatternEditorActive(false);
                      setPatternEditingMode({ tool: "none" });
                    } else {
                      setIsPatternEditorActive(true);
                    }
                  }}
                  className={cn(
                    "h-6 px-2 text-xs",
                    isPatternEditorActive
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "text-gray-400 hover:text-gray-200"
                  )}
                >
                  {isPatternEditorActive ? "Active" : "Inactive"}
                </Button>
              </div>
            </div>

            {/* Area Brush */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">Area</span>
                {sizedBrushShape && (
                  <span className="text-[0.7rem] text-gray-500">
                    {sizedBrushShape === "square"
                      ? `${activeBrushSize} × ${activeBrushSize}`
                      : `${activeBrushSize} squares`}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {BRUSH_OPTIONS.map(({ shape, label, Icon }) => {
                  const isSelected = patternBrush.shape === shape;
                  return (
                    <button
                      type="button"
                      key={shape}
                      className={cn(
                        "w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all duration-200 hover:scale-105",
                        isSelected
                          ? "border-indigo-400 bg-indigo-500/20 ring-2 ring-indigo-400/30 shadow-md"
                          : "border-white/15 bg-gray-800 hover:border-white/30"
                      )}
                      onClick={() => setPatternBrushShape(shape)}
                      title={label}
                      aria-label={label}
                      aria-pressed={isSelected}
                    >
                      <Icon className="w-4 h-4 text-gray-200" />
                    </button>
                  );
                })}
              </div>
              {sizedBrushShape && (
                <Slider
                  min={PATTERN_BRUSH_SIZE_CONFIG.min}
                  max={PATTERN_BRUSH_SIZE_CONFIG.max}
                  step={PATTERN_BRUSH_SIZE_CONFIG.step}
                  value={[activeBrushSize]}
                  onValueChange={([size]) =>
                    setPatternBrushSize(sizedBrushShape, size)
                  }
                  aria-label={
                    sizedBrushShape === "square"
                      ? "Square area size"
                      : "Circle area diameter"
                  }
                />
              )}
            </div>

            {/* Color Palette */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-400">Colors</span>
                <Button
                  type="button"
                  variant={isReplaceMode ? "ghost" : "outline"}
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-xs",
                    isReplaceMode
                      ? "text-red-300 hover:bg-red-900/20 hover:text-red-200"
                      : "border-white/15 bg-gray-900/40 text-gray-300 hover:text-white"
                  )}
                  disabled={
                    distinctColorCount < MINIMUM_REPLACE_COLOR_COUNT
                  }
                  onClick={handleReplaceToggle}
                >
                  <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />
                  {isReplaceMode ? "Cancel" : "Replace"}
                </Button>
              </div>
              {colorEntries.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {colorEntries.map(([key, colorInfo], index) => {
                    const isSelected =
                      !isReplaceMode &&
                      patternEditingMode.tool === "color" &&
                      patternEditingMode.selectedColorIndex === index;
                    const isReplaceSource =
                      isReplaceMode && replaceSourceIndex === index;
                    const colorLabel =
                      colorInfo.name ||
                      `Color ${index + HUMAN_INDEX_OFFSET}`;
                    const canDeleteColor =
                      selectedDesign === ItemDesigns.Custom;
                    const isContextMenuOpen =
                      colorContextMenu?.colorIndex === index;

                    return (
                      <button
                        type="button"
                        key={key}
                        className={cn(
                          "relative w-7 h-7 rounded-lg border-2 transition-all duration-200 hover:scale-105 hover:shadow-md",
                          isReplaceSource
                            ? "border-amber-300 ring-2 ring-amber-300/40 shadow-md"
                            : isSelected
                            ? "border-indigo-400 ring-2 ring-indigo-400/30 shadow-md"
                            : "border-white/15 hover:border-white/30"
                        )}
                        style={{ backgroundColor: colorInfo.hex }}
                        onClick={() => handleColorSelect(index)}
                        onContextMenu={(event) => {
                          if (!canDeleteColor) return;
                          event.preventDefault();
                          openColorContextMenu(
                            index,
                            colorLabel,
                            event.clientX,
                            event.clientY
                          );
                        }}
                        onKeyDown={(event) => {
                          const opensContextMenu =
                            event.key === "ContextMenu" ||
                            (event.shiftKey && event.key === "F10");
                          if (!canDeleteColor || !opensContextMenu) return;

                          event.preventDefault();
                          const bounds =
                            event.currentTarget.getBoundingClientRect();
                          openColorContextMenu(
                            index,
                            colorLabel,
                            bounds.left +
                              bounds.width / CONTEXT_MENU_ANCHOR_DIVISOR,
                            bounds.bottom
                          );
                        }}
                        title={colorLabel}
                        aria-haspopup={canDeleteColor ? "menu" : undefined}
                        aria-controls={
                          isContextMenuOpen ? COLOR_CONTEXT_MENU_ID : undefined
                        }
                        aria-expanded={
                          canDeleteColor ? isContextMenuOpen : undefined
                        }
                        aria-label={
                          isReplaceMode
                            ? replaceSourceIndex === null
                              ? `Select ${colorLabel} as the color to replace`
                              : `Replace with ${colorLabel}`
                            : colorLabel
                        }
                        aria-pressed={isSelected || isReplaceSource}
                      >
                        {isReplaceSource && (
                          <span className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                            1
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No paint colors available</p>
              )}
              {colorContextMenu && (
                <div
                  ref={contextMenuRef}
                  id={COLOR_CONTEXT_MENU_ID}
                  role="menu"
                  aria-label={`Actions for ${colorContextMenu.colorLabel}`}
                  className="fixed z-50 min-w-40 rounded-md border border-white/15 bg-slate-950 p-1 text-slate-100 shadow-xl"
                  style={{
                    left: colorContextMenu.left,
                    top: colorContextMenu.top,
                  }}
                >
                  <button
                    ref={contextMenuActionRef}
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-red-300 outline-none hover:bg-red-900/30 focus:bg-red-900/30 focus:text-red-200"
                    onClick={handleDeleteColor}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete color
                  </button>
                </div>
              )}
              {isReplaceMode && (
                <div
                  role="status"
                  className="rounded-md border border-amber-300/20 bg-amber-300/10 px-2 py-1.5 text-[0.7rem] text-amber-100"
                >
                  {replaceSourceLabel
                    ? `2. Select the replacement for ${replaceSourceLabel} on the artwork or palette`
                    : "1. Select the color to replace on the artwork or palette"}
                </div>
              )}
            </div>

            {/* Square Direction */}
            <div className="space-y-2">
              <div className={DIRECTION_HEADER_CLASS}>
                <span className="text-xs font-medium text-gray-400">
                  Direction (raised edge)
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    COMPACT_ACTION_BUTTON_CLASS,
                    "text-gray-400 hover:text-gray-200"
                  )}
                  disabled={!Object.keys(patternDirectionOverride).length}
                  onClick={handleResetDirections}
                  title="Reset every square's direction without changing colors"
                >
                  <RotateCcw className={COMPACT_ACTION_ICON_CLASS} />
                  Reset directions
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DIRECTION_OPTIONS.map(({ direction, label, Icon }) => {
                  const isSelected =
                    patternEditingMode.tool === "direction" &&
                    patternEditingMode.selectedDirection === direction;

                  return (
                    <button
                      type="button"
                      key={direction}
                      className={cn(
                        "w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all duration-200 hover:scale-105",
                        isSelected
                          ? "border-indigo-400 bg-indigo-500/20 ring-2 ring-indigo-400/30 shadow-md"
                          : "border-white/15 bg-gray-800 hover:border-white/30"
                      )}
                      onClick={() => handleDirectionSelect(direction)}
                      title={`Raised edge ${label.toLowerCase()}`}
                      aria-label={`Set raised edge ${label.toLowerCase()}`}
                      aria-pressed={isSelected}
                    >
                      <Icon className="w-4 h-4 text-gray-200" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Square Visibility */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-gray-400">
                  Hide squares
                </p>
                <p className="text-[0.7rem] text-gray-500">
                  Remove squares while keeping their spots editable
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    COMPACT_ACTION_BUTTON_CLASS,
                    "text-gray-400 hover:text-gray-200"
                  )}
                  disabled={!Object.keys(patternHiddenOverride).length}
                  onClick={clearPatternHiddenOverride}
                  title="Show every hidden square"
                >
                  <RotateCcw className={COMPACT_ACTION_ICON_CLASS} />
                  Show all
                </Button>
                <button
                  type="button"
                  className={cn(
                    "w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all duration-200 hover:scale-105",
                    patternEditingMode.tool === "hide"
                      ? "border-indigo-400 bg-indigo-500/20 ring-2 ring-indigo-400/30 shadow-md"
                      : "border-white/15 bg-gray-800 hover:border-white/30"
                  )}
                  onClick={handleHideToggle}
                  title="Hide selected squares"
                  aria-label="Hide selected area"
                  aria-pressed={patternEditingMode.tool === "hide"}
                >
                  <EyeOff className="w-4 h-4 text-gray-300" />
                </button>
              </div>
            </div>

            {/* Reset Tool */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400">Reset area</p>
                <p className="text-[0.7rem] text-gray-500">
                  Restore its generated color, direction, and visibility
                </p>
              </div>
              <button
                type="button"
                className={cn(
                  "w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all duration-200 hover:scale-105",
                  patternEditingMode.tool === "eraser"
                    ? "border-red-400 bg-red-900/20 ring-2 ring-red-400/30 shadow-md"
                    : "border-white/15 bg-gray-800 hover:border-white/30"
                )}
                onClick={handleEraserToggle}
                title="Reset squares to the generated pattern"
                aria-label="Reset selected area"
                aria-pressed={patternEditingMode.tool === "eraser"}
              >
                <Eraser className="w-4 h-4 text-gray-300" />
              </button>
            </div>

            <PatternHistoryControls />

            {/* Instructions */}
            {!isReplaceMode && (
              <div className="text-xs text-gray-400 space-y-0.5 bg-gray-900/40 border border-white/10 rounded-lg p-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <MousePointer className="w-3 h-3" />
                  <span className="font-medium">
                    {isPatternEditorActive
                      ? activeInstruction
                      : "Select a tool to enable editing"}
                  </span>
                </div>
                {isPatternEditorActive ? (
                  <>
                    <p>• Choose an area and tool, then click or drag</p>
                    <p>• Hidden spots stay selectable so Reset can restore them</p>
                    <p>• Press 'h' to hide/show UI controls</p>
                  </>
                ) : (
                  <>
                    <p>• Click "Active" above to enable the pattern editor</p>
                    <p>• Selecting any tool also enables it automatically</p>
                  </>
                )}
              </div>
            )}

            {/* Stats */}
            {Boolean(modifiedSquareCount) && (
              <div className="text-xs text-gray-400 bg-indigo-500/10 border border-indigo-400/20 rounded-lg p-2">
                <p className="font-medium text-indigo-300">
                  {modifiedSquareCount} square
                  {modifiedSquareCount !== SINGULAR_SQUARE_COUNT ? "s" : ""}{" "}
                  modified
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
