"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCustomStore } from "@/store/customStore";
import { getColorEntries } from "@/components/preview/patternUtils";
import {
  ChevronRight,
  ChevronDown,
  Eraser,
  RotateCcw,
  Palette,
  MousePointer,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PatternEditorProps {
  className?: string;
}

export function PatternEditor({ className }: PatternEditorProps) {
  const {
    selectedDesign,
    customPalette,
    setPatternOverride,
    patternOverride,
    clearPatternOverride,
    patternEditingMode,
    setPatternEditingMode,
    viewSettings,
    isPatternEditorActive,
    setIsPatternEditorActive,
  } = useCustomStore();

  const [isCollapsed, setIsCollapsed] = useState(true);

  const colorEntries = getColorEntries(selectedDesign, customPalette);

  // Memoized event handlers
  const handleClearAll = useCallback(() => {
    clearPatternOverride();
  }, [clearPatternOverride]);

  const handleColorSelect = useCallback(
    (index: number) => {
      // Enable pattern editor when a color is selected
      setIsPatternEditorActive(true);
      setPatternEditingMode({
        selectedColorIndex: index,
        isErasing: false,
      });
    },
    [setPatternEditingMode, setIsPatternEditorActive]
  );

  const handleEraserToggle = useCallback(() => {
    // Enable pattern editor when eraser is toggled
    setIsPatternEditorActive(true);
    setPatternEditingMode({
      selectedColorIndex: patternEditingMode.selectedColorIndex,
      isErasing: !patternEditingMode.isErasing,
    });
  }, [patternEditingMode, setPatternEditingMode, setIsPatternEditorActive]);

  if (colorEntries.length === 0) {
    return (
      <Card
        className={cn(
          "glass-surface rounded-[0.7rem] shadow-xl",
          className
        )}
      >
        <div className="p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full justify-between text-gray-400 hover:text-gray-200"
          >
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span className="text-sm font-medium">Pattern Editor</span>
            </div>
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
          {!isCollapsed && (
            <div className="mt-4 text-center text-gray-400">
              <p className="text-sm">Not available</p>
              <p className="text-xs mt-1">Select a design with colors</p>
            </div>
          )}
        </div>
      </Card>
    );
  }

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
          onClick={() => setIsCollapsed(!isCollapsed)}
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
              <Button
                size="sm"
                variant={isPatternEditorActive ? "default" : "outline"}
                onClick={() => {
                  if (isPatternEditorActive) {
                    // Disable editor and reset editing mode
                    setIsPatternEditorActive(false);
                    setPatternEditingMode({
                      selectedColorIndex: -1,
                      isErasing: false,
                    });
                  } else {
                    // Enable editor
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

            {/* Color Palette */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">
                  Colors
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClearAll}
                  className="h-6 px-2 text-xs text-gray-400 hover:text-gray-200"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {colorEntries.map(([key, colorInfo], index) => (
                  <button
                    key={key}
                    className={cn(
                      "w-7 h-7 rounded-lg border-2 transition-all duration-200 hover:scale-105 hover:shadow-md",
                      patternEditingMode.selectedColorIndex === index &&
                        !patternEditingMode.isErasing
                        ? "border-indigo-400 ring-2 ring-indigo-400/30 shadow-md"
                        : "border-white/15 hover:border-white/30"
                    )}
                    style={{ backgroundColor: colorInfo.hex }}
                    onClick={() => handleColorSelect(index)}
                    title={colorInfo.name || `Color ${index + 1}`}
                  />
                ))}
                <button
                  className={cn(
                    "w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200 hover:scale-105",
                    patternEditingMode.isErasing
                      ? "border-red-400 bg-red-900/20 ring-2 ring-red-400/30 shadow-md"
                      : "border-white/15 bg-gray-800 hover:border-white/30"
                  )}
                  onClick={handleEraserToggle}
                  title="Eraser - Reset squares to original pattern"
                >
                  <Eraser className="w-3.5 h-3.5 text-gray-300" />
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-xs text-gray-400 space-y-0.5 bg-gray-900/40 border border-white/10 rounded-lg p-2">
              <div className="flex items-center gap-1.5 mb-2">
                <MousePointer className="w-3 h-3" />
                <span className="font-medium">
                  {isPatternEditorActive
                    ? "Click squares in 3D view to paint them"
                    : "Enable editor to start painting"}
                </span>
              </div>
              {isPatternEditorActive ? (
                <>
                  <p>
                    • Select a color above, then click squares in the 3D pattern
                  </p>
                  <p>• Use eraser to reset squares to original pattern</p>
                  <p>• Outline shows modified squares</p>
                  <p>• Press 'h' to hide/show UI controls</p>
                </>
              ) : (
                <>
                  <p>• Click "Active" above to enable the pattern editor</p>
                  <p>• Or select a color to automatically enable editing</p>
                  <p>• Editor must be active to paint squares</p>
                </>
              )}
            </div>

            {/* Stats */}
            {Object.keys(patternOverride).length > 0 && (
              <div className="text-xs text-gray-400 bg-indigo-500/10 border border-indigo-400/20 rounded-lg p-2">
                <p className="font-medium text-indigo-300">
                  {Object.keys(patternOverride).length} square
                  {Object.keys(patternOverride).length !== 1 ? "s" : ""}{" "}
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
