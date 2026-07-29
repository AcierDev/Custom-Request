"use client";

import React, { useState } from "react";
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
  SlidersHorizontal,
} from "lucide-react";
import { ColorPattern, useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { ItemDesigns } from "@/typings/types";
import { cn } from "@/lib/utils";
import { PALETTE_BLEND_CONFIG } from "@/lib/paletteBlend";

const CONTEXT_MENU_KEY = "ContextMenu";
const CONTEXT_MENU_FALLBACK_KEY = "F10";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎛️ PATTERN CONTROLS — pattern, orientation, reverse/rotate            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

/**
 * Store-bound pattern + orientation controls. Shared by the builder's 3D
 * preview and the read-only shared viewer; both drive the same store fields
 * that GeometricPattern reads, so the live render updates either way.
 */
export function PatternControls() {
  const [isPaletteBlendOpen, setIsPaletteBlendOpen] = useState(false);
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
  const paletteBlend = useCustomStore((s) => s.paletteBlend);
  const setPaletteBlend = useCustomStore((s) => s.setPaletteBlend);

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
    patterns.findIndex(({ value }) => value === colorPattern),
  );

  return (
    <div className="space-y-3">
      <Card className="glass-surface rounded-[0.7rem] shadow-lg">
        <div className="p-3 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-gray-300">Pattern</Label>
            <Popover
              open={isPaletteBlendOpen}
              onOpenChange={setIsPaletteBlendOpen}
            >
              <div className="relative">
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-9 rounded-md border border-indigo-400/70 bg-indigo-500/10 ring-1 ring-indigo-400/30"
                  animate={{ y: selectedPatternIndex * 36 }}
                  transition={{
                    type: "tween",
                    ease: "easeInOut",
                    duration: 0.35,
                  }}
                />
                {patterns.map(({ value, label, icon }) => {
                  const isPalettePattern = value === "fade";
                  const patternButton = (
                    <button
                      type="button"
                      onClick={() => setColorPattern(value)}
                      onContextMenu={
                        isPalettePattern
                          ? (event) => {
                              event.preventDefault();
                              setColorPattern(value);
                              setIsPaletteBlendOpen(true);
                            }
                          : undefined
                      }
                      onKeyDown={
                        isPalettePattern
                          ? (event) => {
                              const opensContextMenu =
                                event.key === CONTEXT_MENU_KEY ||
                                (event.shiftKey &&
                                  event.key === CONTEXT_MENU_FALLBACK_KEY);
                              if (!opensContextMenu) return;
                              event.preventDefault();
                              setColorPattern(value);
                              setIsPaletteBlendOpen(true);
                            }
                          : undefined
                      }
                      aria-haspopup={isPalettePattern ? "dialog" : undefined}
                      aria-expanded={
                        isPalettePattern ? isPaletteBlendOpen : undefined
                      }
                      title={
                        isPalettePattern
                          ? "Right-click to adjust the color blend"
                          : undefined
                      }
                      className={cn(
                        "relative z-10 flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm transition-colors",
                        colorPattern === value
                          ? "text-white"
                          : "text-gray-400 hover:text-gray-200",
                      )}
                    >
                      {icon}
                      <span>{label}</span>
                      {isPalettePattern && (
                        <span className="ml-auto text-[0.62rem] text-gray-500">
                          {paletteBlend}%
                        </span>
                      )}
                    </button>
                  );

                  return isPalettePattern ? (
                    <PopoverAnchor key={value} asChild>
                      {patternButton}
                    </PopoverAnchor>
                  ) : (
                    <React.Fragment key={value}>{patternButton}</React.Fragment>
                  );
                })}
              </div>
              <PopoverContent
                side="left"
                align="start"
                className="w-60 border-white/15 bg-slate-950/95 p-3 text-gray-200 shadow-xl backdrop-blur-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-300" />
                      Palette blend
                    </div>
                    <span className="font-mono text-xs text-indigo-300">
                      {paletteBlend}%
                    </span>
                  </div>
                  <Slider
                    aria-label="Palette blend amount"
                    value={[paletteBlend]}
                    min={PALETTE_BLEND_CONFIG.minPercent}
                    max={PALETTE_BLEND_CONFIG.maxPercent}
                    step={PALETTE_BLEND_CONFIG.stepPercent}
                    onValueChange={(value) => setPaletteBlend(value[0])}
                  />
                  <div className="flex justify-between text-[0.62rem] text-gray-500">
                    <span>Straight lines</span>
                    <span>More blended</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
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
                  orientation === "horizontal" ? "vertical" : "horizontal",
                )
              }
              className="relative grid w-full grid-cols-2 items-center rounded-md border border-white/10 bg-gray-900/40 p-1 text-xs font-medium overflow-hidden cursor-pointer hover:bg-gray-900/60 transition-colors"
            >
              <motion.span
                aria-hidden
                className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded border border-indigo-400/70 ring-1 ring-indigo-400/30 bg-indigo-500/10"
                animate={{ x: orientation === "horizontal" ? 0 : "100%" }}
                transition={{
                  type: "tween",
                  ease: "easeInOut",
                  duration: 0.35,
                }}
              />
              <span
                className={cn(
                  "relative z-10 flex items-center justify-center gap-1 py-1 transition-colors",
                  orientation === "horizontal" ? "text-white" : "text-gray-400",
                )}
              >
                <MoveHorizontal className="w-4 h-4" />
                Horizontal
              </span>
              <span
                className={cn(
                  "relative z-10 flex items-center justify-center gap-1 py-1 transition-colors",
                  orientation === "vertical" ? "text-white" : "text-gray-400",
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
                    : "border-white/15 bg-gray-900/40 text-gray-300 hover:bg-gray-900/60",
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
                    : "border-white/15 bg-gray-900/40 text-gray-300 hover:bg-gray-900/60",
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
