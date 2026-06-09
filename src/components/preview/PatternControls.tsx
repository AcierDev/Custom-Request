"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Blend,
  UnfoldHorizontal,
  Dices,
  Grip,
  MoveHorizontal,
  MoveVertical,
  ArrowLeftRight,
  RotateCcw,
} from "lucide-react";
import { ColorPattern, useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ItemDesigns } from "@/typings/types";
import { cn } from "@/lib/utils";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎛️ PATTERN CONTROLS — pattern, orientation, reverse/rotate            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

/**
 * Store-bound pattern + orientation controls. Shared by the builder's 3D
 * preview and the read-only shared viewer; both drive the same store fields
 * that GeometricPattern reads, so the live render updates either way.
 */
export function PatternControls() {
  const colorPattern = useCustomStore((s) => s.colorPattern);
  const setColorPattern = useCustomStore((s) => s.setColorPattern);
  const orientation = useCustomStore((s) => s.orientation);
  const setOrientation = useCustomStore((s) => s.setOrientation);
  const isReversed = useCustomStore((s) => s.isReversed);
  const setIsReversed = useCustomStore((s) => s.setIsReversed);
  const isRotated = useCustomStore((s) => s.isRotated);
  const setIsRotated = useCustomStore((s) => s.setIsRotated);
  const selectedDesign = useCustomStore((s) => s.selectedDesign);
  const customPalette = useCustomStore((s) => s.customPalette);
  const drawnPatternGrid = useCustomStore((s) => s.drawnPatternGrid);
  const drawnPatternGridSize = useCustomStore((s) => s.drawnPatternGridSize);
  const scatterWidth = useCustomStore((s) => s.scatterWidth);
  const setScatterWidth = useCustomStore((s) => s.setScatterWidth);
  const scatterAmount = useCustomStore((s) => s.scatterAmount);
  const setScatterAmount = useCustomStore((s) => s.setScatterAmount);

  // Only hide controls when a custom design has genuinely nothing to
  // preview (no palette colors and no drawn pattern). If a palette has
  // colors, show the same controls as an official design.
  const showControls = !(
    selectedDesign === ItemDesigns.Custom &&
    customPalette.length === 0 &&
    (!drawnPatternGrid || !drawnPatternGridSize)
  );

  if (!showControls) return null;

  const patterns: {
    value: ColorPattern;
    label: string;
    icon: React.ReactNode;
    description: string;
  }[] = [
    {
      value: "fade",
      label: "Palette",
      icon: <Blend className="w-4 h-4" />,
      description: "Smooth gradient from one color to another",
    },
    {
      value: "center-fade",
      label: "Center Fade",
      icon: <UnfoldHorizontal className="w-4 h-4" />,
      description: "Gradient that fades from center outward",
    },
    {
      value: "random",
      label: "Random",
      icon: <Dices className="w-4 h-4" />,
      description: "Random arrangement of colors",
    },
    {
      value: "scatter",
      label: "Scatter",
      icon: <Grip className="w-4 h-4" />,
      description: "Probabilistic dithering transitions",
    },
  ];

  const selectedPatternIndex = Math.max(
    0,
    patterns.findIndex(({ value }) => value === colorPattern)
  );

  return (
    <div className="space-y-3">
      <Card className="glass-surface rounded-[0.7rem] shadow-lg">
        <div className="p-3 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-gray-300">Pattern</Label>
          <div className="relative">
            <motion.div
              aria-hidden
              className="absolute inset-x-0 top-0 h-9 rounded-md border border-indigo-400/70 ring-1 ring-indigo-400/30 bg-indigo-500/10 pointer-events-none"
              animate={{ y: selectedPatternIndex * 36 }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.35 }}
            />
            {patterns.map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setColorPattern(value)}
                className={cn(
                  "relative z-10 flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm transition-colors",
                  colorPattern === value
                    ? "text-white"
                    : "text-gray-400 hover:text-gray-200"
                )}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {colorPattern === "scatter" && (
          <div className="space-y-4 pt-1 border-t border-white/10 mt-2">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-gray-400">
                  Scatter Width (squares)
                </Label>
                <span className="text-xs font-mono text-gray-300">
                  {scatterWidth ?? 10}
                </span>
              </div>
              <Slider
                value={[scatterWidth ?? 10]}
                min={0}
                max={10}
                step={1}
                onValueChange={(value) => setScatterWidth(value[0])}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-gray-400">
                  Scatter Amount
                </Label>
                <span className="text-xs font-mono text-gray-300">
                  {scatterAmount ?? 50}%
                </span>
              </div>
              <Slider
                value={[scatterAmount ?? 50]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => setScatterAmount(value[0])}
              />
            </div>
          </div>
        )}
        </div>
      </Card>

      <Card className="glass-surface rounded-[0.7rem] shadow-lg">
        <div className="p-3 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm text-gray-300">Orientation</Label>
          <button
            type="button"
            role="switch"
            aria-checked={orientation === "vertical"}
            onClick={() =>
              setOrientation(
                orientation === "horizontal" ? "vertical" : "horizontal"
              )
            }
            className="relative grid w-full grid-cols-2 items-center rounded-md border border-white/10 bg-gray-900/40 p-1 text-xs font-medium overflow-hidden cursor-pointer hover:bg-gray-900/60 transition-colors"
          >
            <motion.span
              aria-hidden
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded border border-indigo-400/70 ring-1 ring-indigo-400/30 bg-indigo-500/10"
              animate={{ x: orientation === "horizontal" ? 0 : "100%" }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.35 }}
            />
            <span
              className={cn(
                "relative z-10 flex items-center justify-center gap-1 py-1 transition-colors",
                orientation === "horizontal"
                  ? "text-white"
                  : "text-gray-400"
              )}
            >
              <MoveHorizontal className="w-4 h-4" />
              Horizontal
            </span>
            <span
              className={cn(
                "relative z-10 flex items-center justify-center gap-1 py-1 transition-colors",
                orientation === "vertical" ? "text-white" : "text-gray-400"
              )}
            >
              <MoveVertical className="w-4 h-4" />
              Vertical
            </span>
          </button>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-gray-300">Options</Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className={cn(
                "border",
                isReversed
                  ? "bg-indigo-600 hover:bg-indigo-500 border-indigo-400/40 text-white"
                  : "border-white/15 bg-gray-900/40 text-gray-300 hover:bg-gray-900/60"
              )}
              onClick={() => setIsReversed(!isReversed)}
            >
              <ArrowLeftRight className="w-4 h-4 mr-1" />
              <span className="text-xs">Reverse Colors</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={cn(
                "border",
                isRotated
                  ? "bg-indigo-600 hover:bg-indigo-500 border-indigo-400/40 text-white"
                  : "border-white/15 bg-gray-900/40 text-gray-300 hover:bg-gray-900/60"
              )}
              onClick={() => setIsRotated(!isRotated)}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              <span className="text-xs">Rotate Colors</span>
            </Button>
          </div>
        </div>
        </div>
      </Card>
    </div>
  );
}
