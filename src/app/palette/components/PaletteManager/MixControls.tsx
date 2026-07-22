"use client";

import { motion } from "framer-motion";
import { Blend, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  handMixMatchPercent,
  type HandMixSimulation,
} from "@/lib/paintMixSimulator";
import { cn } from "@/lib/utils";
import {
  PALETTE_WIDE_BLEND_CONFIG,
  getPaletteWideBlendColorCount,
} from "./paletteWideBlend";

export type MixScope = "pair" | "all";

interface MixControlsProps {
  scope: MixScope;
  colorsBetween: number;
  paletteColorCount: number;
  selectedColorCount: number;
  handMixPreview: HandMixSimulation[];
  onScopeChange: (scope: MixScope) => void;
  onColorsBetweenChange: (count: number) => void;
  onCreate: () => void;
}

const MIX_SCOPE_OPTIONS: {
  value: MixScope;
  label: string;
  icon: typeof Blend;
}[] = [
  { value: "pair", label: "Two colors", icon: Blend },
  { value: "all", label: "All colors", icon: Layers3 },
];

const SELECTED_PAIR_COLOR_COUNT = 2;
const MIX_CONTROLS_MOTION = {
  initialYOffset: -8,
  restingYOffset: 0,
  hiddenOpacity: 0,
  visibleOpacity: 1,
  durationSeconds: 0.2,
  hoverScale: 1.03,
  tapScale: 0.97,
  tooltipDelayMs: 225,
} as const;
const MIX_SECTION_INITIAL = {
  opacity: MIX_CONTROLS_MOTION.hiddenOpacity,
  y: MIX_CONTROLS_MOTION.initialYOffset,
} as const;
const MIX_SECTION_ANIMATE = {
  opacity: MIX_CONTROLS_MOTION.visibleOpacity,
  y: MIX_CONTROLS_MOTION.restingYOffset,
} as const;
const MIX_SECTION_TRANSITION = {
  duration: MIX_CONTROLS_MOTION.durationSeconds,
} as const;
const MIX_CREATE_HOVER = { scale: MIX_CONTROLS_MOTION.hoverScale } as const;
const MIX_CREATE_TAP = { scale: MIX_CONTROLS_MOTION.tapScale } as const;

const HAND_MIX_PREVIEW_THEME = {
  mix: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100",
  test: "border-amber-400/40 bg-amber-500/15 text-amber-100",
  buy: "border-rose-400/40 bg-rose-500/15 text-rose-100",
} as const;

export function MixControls({
  scope,
  colorsBetween,
  paletteColorCount,
  selectedColorCount,
  handMixPreview,
  onScopeChange,
  onColorsBetweenChange,
  onCreate,
}: MixControlsProps) {
  const isPairScope = scope === "pair";
  const canCreate = isPairScope
    ? selectedColorCount === SELECTED_PAIR_COLOR_COUNT
    : paletteColorCount >= PALETTE_WIDE_BLEND_CONFIG.minimumBlendableColorCount;
  const transitionCount = Math.max(
    PALETTE_WIDE_BLEND_CONFIG.firstArrayIndex,
    paletteColorCount - PALETTE_WIDE_BLEND_CONFIG.nextColorOffset,
  );
  const resultColorCount = getPaletteWideBlendColorCount(
    paletteColorCount,
    colorsBetween,
  );

  return (
    <motion.section
      initial={MIX_SECTION_INITIAL}
      animate={MIX_SECTION_ANIMATE}
      transition={MIX_SECTION_TRANSITION}
      aria-label="Palette mix controls"
      className="rounded-xl border border-blue-400/25 bg-blue-500/[0.07] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-blue-600 text-white shadow-sm">
            <Blend className="h-4 w-4" />
          </span>
          Mix palette
        </div>

        <div
          role="group"
          className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/20 p-1"
          aria-label="Mix scope"
        >
          {MIX_SCOPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = scope === option.value;
            return (
              <Button
                key={option.value}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={isActive}
                onClick={() => onScopeChange(option.value)}
                className={cn(
                  "h-8 rounded-lg px-3 text-xs",
                  isActive
                    ? "bg-blue-600 text-white hover:bg-blue-500 hover:text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-300">
              {isPairScope
                ? canCreate
                  ? "Choose how many colors to place between the selected pair."
                  : "Select two colors in the palette to create one transition."
                : "Blend every adjacent pair while keeping all original colors."}
            </p>
            {!isPairScope && (
              <p className="shrink-0 text-xs font-medium tabular-nums text-blue-200">
                {transitionCount} transition
                {transitionCount === PALETTE_WIDE_BLEND_CONFIG.nextColorOffset
                  ? ""
                  : "s"}
                {" · "}
                {resultColorCount} total colors
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap text-xs font-medium text-slate-300">
              Colors between each
            </span>
            <Slider
              value={[colorsBetween]}
              min={PALETTE_WIDE_BLEND_CONFIG.minColorsBetween}
              max={PALETTE_WIDE_BLEND_CONFIG.maxColorsBetween}
              step={PALETTE_WIDE_BLEND_CONFIG.firstBlendStep}
              onValueChange={(value) => {
                const [nextCount] = value;
                if (nextCount !== undefined) {
                  onColorsBetweenChange(nextCount);
                }
              }}
              aria-label="Colors between each pair"
              className="min-w-24 flex-1"
              trackClassName="h-2 bg-blue-400/20"
              rangeClassName="bg-gradient-to-r from-blue-500 to-indigo-500"
              thumbClassName="h-5 w-9 rounded-[10px] border-transparent bg-blue-600 shadow-md focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            />
            <span className="inline-flex h-7 min-w-8 items-center justify-center rounded-lg bg-blue-600 px-2 text-xs font-semibold tabular-nums text-white shadow-sm">
              {colorsBetween}
            </span>
          </div>
        </div>

        <motion.div
          whileHover={canCreate ? MIX_CREATE_HOVER : undefined}
          whileTap={canCreate ? MIX_CREATE_TAP : undefined}
        >
          <Button
            type="button"
            disabled={!canCreate}
            onClick={onCreate}
            className="w-full rounded-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm ring-1 ring-blue-400/40 hover:from-blue-500 hover:to-indigo-500 lg:w-auto"
          >
            {isPairScope ? (
              <Blend className="mr-2 h-4 w-4" />
            ) : (
              <Layers3 className="mr-2 h-4 w-4" />
            )}
            {isPairScope ? "Create Blend" : "Blend All Colors"}
          </Button>
        </motion.div>
      </div>

      {isPairScope && handMixPreview.length > 0 && (
        <TooltipProvider delayDuration={MIX_CONTROLS_MOTION.tooltipDelayMs}>
          <div className="mt-3 flex flex-wrap gap-2">
            {handMixPreview.map((mix) => (
              <Tooltip
                key={`${mix.recipe}-${mix.targetHex}-${mix.predictedHex}`}
              >
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex min-w-0 items-center gap-1.5 rounded-[10px] border px-2 py-1 text-xs font-medium",
                      HAND_MIX_PREVIEW_THEME[mix.decision],
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
                    <span className="shrink-0 tabular-nums opacity-80">
                      · {handMixMatchPercent(mix.deltaE)}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-64">
                  <div className="space-y-1 text-xs">
                    <div className="font-medium">{mix.recipe}</div>
                    <div>Target {mix.targetHex}</div>
                    <div>Hand mix {mix.predictedHex}</div>
                    <div>
                      {handMixMatchPercent(mix.deltaE)}% match · ΔE {mix.deltaE}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      )}
    </motion.section>
  );
}
