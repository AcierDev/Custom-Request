"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCustomStore } from "@/store/customStore";
import { getColorEntries } from "../../order/components/preview/patternUtils";
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
          "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-0 shadow-xl",
          className
        )}
      >
        <div className="p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full justify-between text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
            <div className="mt-4 text-center text-gray-500 dark:text-gray-400">
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
        "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-0 shadow-xl transition-all duration-200",
        className
      )}
    >
      <div className="p-4">
        {/* Header */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full justify-between text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
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
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
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
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                )}
              >
                {isPatternEditorActive ? "Active" : "Inactive"}
              </Button>
            </div>

            {/* Color Palette */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Colors
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClearAll}
                  className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                        ? "border-blue-500 ring-2 ring-blue-200/50 dark:ring-blue-400/30 shadow-md"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
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
                      ? "border-red-400 bg-red-50 dark:bg-red-900/20 ring-2 ring-red-200/50 dark:ring-red-400/30 shadow-md"
                      : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                  )}
                  onClick={handleEraserToggle}
                  title="Eraser - Reset blocks to original pattern"
                >
                  <Eraser className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg p-2">
              <div className="flex items-center gap-1.5 mb-2">
                <MousePointer className="w-3 h-3" />
                <span className="font-medium">
                  {isPatternEditorActive
                    ? "Click blocks in 3D view to paint them"
                    : "Enable editor to start painting"}
                </span>
              </div>
              {isPatternEditorActive ? (
                <>
                  <p>
                    • Select a color above, then click blocks in the 3D pattern
                  </p>
                  <p>• Use eraser to reset blocks to original pattern</p>
                  <p>• Purple outline shows modified blocks</p>
                  <p>• Press 'h' to hide/show UI controls</p>
                </>
              ) : (
                <>
                  <p>• Click "Active" above to enable the pattern editor</p>
                  <p>• Or select a color to automatically enable editing</p>
                  <p>• Editor must be active to paint blocks</p>
                </>
              )}
            </div>

            {/* Stats */}
            {Object.keys(patternOverride).length > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg p-2">
                <p className="font-medium text-blue-600 dark:text-blue-400">
                  {Object.keys(patternOverride).length} block
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
