"use client";

import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  PATTERN_BRUSH_SIZE_CONFIG,
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
  Rows3,
  Columns3,
  Square,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
const SINGULAR_SQUARE_COUNT = 1;
const TOOL_INSTRUCTIONS: Record<PatternEditingMode["tool"], string> = {
  none: "Select a color or direction to start editing",
  color: "Click or drag across squares to paint them",
  direction: "Click or drag across squares to turn them",
  eraser: "Click or drag across squares to reset them",
};

export function PatternEditor({ className }: PatternEditorProps) {
  const selectedDesign = useCustomStore((s) => s.selectedDesign);
  const customPalette = useCustomStore((s) => s.customPalette);
  const patternOverride = useCustomStore((s) => s.patternOverride);
  const patternDirectionOverride = useCustomStore(
    (s) => s.patternDirectionOverride
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

  const [isCollapsed, setIsCollapsed] = useState(true);

  const colorEntries = getColorEntries(selectedDesign, customPalette);

  useEffect(() => {
    if (isCollapsed && isPatternEditorActive) {
      setIsPatternEditorActive(false);
    }
  }, [isCollapsed, isPatternEditorActive, setIsPatternEditorActive]);

  const handleCollapseToggle = useCallback(() => {
    const willCollapse = !isCollapsed;
    setIsCollapsed(willCollapse);
    if (willCollapse) setIsPatternEditorActive(false);
  }, [isCollapsed, setIsPatternEditorActive]);

  // Memoized event handlers
  const handleClearAll = useCallback(() => {
    clearPatternOverride();
  }, [clearPatternOverride]);

  const handleColorSelect = useCallback(
    (index: number) => {
      setIsPatternEditorActive(true);
      setPatternEditingMode({
        tool: "color",
        selectedColorIndex: index,
      });
    },
    [setPatternEditingMode, setIsPatternEditorActive]
  );

  const handleDirectionSelect = useCallback(
    (direction: SquareDirection) => {
      setIsPatternEditorActive(true);
      setPatternEditingMode({
        tool: "direction",
        selectedDirection: direction,
      });
    },
    [setPatternEditingMode, setIsPatternEditorActive]
  );

  const handleEraserToggle = useCallback(() => {
    setIsPatternEditorActive(true);
    setPatternEditingMode(
      patternEditingMode.tool === "eraser"
        ? { tool: "none" }
        : { tool: "eraser" }
    );
  }, [patternEditingMode, setPatternEditingMode, setIsPatternEditorActive]);

  const modifiedSquareCount = new Set([
    ...Object.keys(patternOverride),
    ...Object.keys(patternDirectionOverride),
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

  return (
    <Card
      className={cn(
        "glass-surface rounded-[0.7rem] shadow-xl transition-all duration-200",
        className
      )}
    >
      <div className="p-4">
        {/* Header */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCollapseToggle}
          className="w-full justify-between text-gray-200 hover:text-white hover:bg-gray-900/40"
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
          <div className="mt-4 space-y-4">
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
              <span className="text-xs font-medium text-gray-400">Colors</span>
              {colorEntries.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {colorEntries.map(([key, colorInfo], index) => {
                    const isSelected =
                      patternEditingMode.tool === "color" &&
                      patternEditingMode.selectedColorIndex === index;

                    return (
                      <button
                        type="button"
                        key={key}
                        className={cn(
                          "w-7 h-7 rounded-lg border-2 transition-all duration-200 hover:scale-105 hover:shadow-md",
                          isSelected
                            ? "border-indigo-400 ring-2 ring-indigo-400/30 shadow-md"
                            : "border-white/15 hover:border-white/30"
                        )}
                        style={{ backgroundColor: colorInfo.hex }}
                        onClick={() => handleColorSelect(index)}
                        title={
                          colorInfo.name || `Color ${index + HUMAN_INDEX_OFFSET}`
                        }
                        aria-label={
                          colorInfo.name || `Color ${index + HUMAN_INDEX_OFFSET}`
                        }
                        aria-pressed={isSelected}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No paint colors available</p>
              )}
            </div>

            {/* Square Direction */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-gray-400">
                Direction (raised edge)
              </span>
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

            {/* Reset Tool */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400">Reset area</p>
                <p className="text-[0.7rem] text-gray-500">
                  Restore its generated color and direction
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

            {/* Instructions */}
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
                  <p>• Reset restores color and direction in that area</p>
                  <p>• Press 'h' to hide/show UI controls</p>
                </>
              ) : (
                <>
                  <p>• Click "Active" above to enable the pattern editor</p>
                  <p>• Selecting any tool also enables it automatically</p>
                </>
              )}
            </div>

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
