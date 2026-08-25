"use client";

import type { LucideIcon } from "lucide-react";
import {
  Blend,
  Dices,
  Grip,
  MoveHorizontal,
  MoveVertical,
  SlidersHorizontal,
  UnfoldHorizontal,
} from "lucide-react";
import { PALETTE_BLEND_CONFIG } from "@/lib/paletteBlend";
import { ColorPattern, useCustomStore } from "@/store/customStore";
import { ItemDesigns } from "@/typings/types";
import { Slider } from "@/components/ui/slider";
import { ColorRotationIndicator } from "./ColorRotationIndicator";
import {
  ViewerControlDisclosure,
  ViewerControlSurface,
  ViewerControlTile,
  ViewerValueBadge,
} from "./ViewerControlSurface";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎛️ PATTERN CONTROLS — pattern, orientation, rotate                    ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

interface PatternControlsProps {
  embedded?: boolean;
}

interface PatternOption {
  value: ColorPattern;
  label: string;
  description: string;
  Icon: LucideIcon;
}

const PATTERN_OPTIONS: readonly PatternOption[] = [
  {
    value: "fade",
    label: "Palette",
    description: "Flow across color bands",
    Icon: Blend,
  },
  {
    value: "center-fade",
    label: "Center fade",
    description: "Move outward from center",
    Icon: UnfoldHorizontal,
  },
  {
    value: "random",
    label: "Random",
    description: "Shuffle every square",
    Icon: Dices,
  },
  {
    value: "scatter",
    label: "Scatter",
    description: "Dither between colors",
    Icon: Grip,
  },
];
const DEFAULT_SCATTER_WIDTH = 10;
const MINIMUM_SCATTER_WIDTH = 0;
const MAXIMUM_SCATTER_WIDTH = 10;
const DEFAULT_SCATTER_AMOUNT = 50;
const MINIMUM_SCATTER_AMOUNT = 0;
const MAXIMUM_SCATTER_AMOUNT = 100;
const SCATTER_CONTROL_STEP = 1;
const CONTROL_CONTENT_CLASS = "space-y-4";
const CONTROL_INSET_CLASS =
  "rounded-2xl border border-white/[0.07] bg-black/15 p-3 shadow-inner shadow-black/15";
const CONTROL_LABEL_CLASS =
  "text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-400";

/**
 * Store-bound pattern + orientation controls. Shared by the builder's 3D
 * preview and shared viewer. `embedded` removes only the outer surface so a
 * parent edit panel can provide one continuous visual hierarchy.
 */
export function PatternControls({ embedded = false }: PatternControlsProps) {
  const colorPattern = useCustomStore((state) => state.colorPattern);
  const setColorPattern = useCustomStore((state) => state.setColorPattern);
  const orientation = useCustomStore((state) => state.orientation);
  const setOrientation = useCustomStore((state) => state.setOrientation);
  const isRotated = useCustomStore((state) => state.isRotated);
  const isReversed = useCustomStore((state) => state.isReversed);
  const rotateColorsQuarterTurn = useCustomStore(
    (state) => state.rotateColorsQuarterTurn,
  );
  const selectedDesign = useCustomStore((state) => state.selectedDesign);
  const customPalette = useCustomStore((state) => state.customPalette);
  const drawnPatternGrid = useCustomStore((state) => state.drawnPatternGrid);
  const drawnPatternGridSize = useCustomStore(
    (state) => state.drawnPatternGridSize,
  );
  const scatterWidth = useCustomStore((state) => state.scatterWidth);
  const setScatterWidth = useCustomStore((state) => state.setScatterWidth);
  const scatterAmount = useCustomStore((state) => state.scatterAmount);
  const setScatterAmount = useCustomStore((state) => state.setScatterAmount);
  const paletteBlend = useCustomStore((state) => state.paletteBlend);
  const setPaletteBlend = useCustomStore((state) => state.setPaletteBlend);

  const showControls = !(
    selectedDesign === ItemDesigns.Custom &&
    customPalette.length === 0 &&
    (!drawnPatternGrid || !drawnPatternGridSize)
  );

  if (!showControls) return null;

  const hasColorRotation = isRotated || isReversed;
  const resolvedScatterWidth = scatterWidth ?? DEFAULT_SCATTER_WIDTH;
  const resolvedScatterAmount = scatterAmount ?? DEFAULT_SCATTER_AMOUNT;

  const content = (
    <div className={CONTROL_CONTENT_CLASS}>
      <div
        role="group"
        aria-label="Pattern style"
        className="grid grid-cols-2 gap-2"
      >
        {PATTERN_OPTIONS.map(({ value, label, description, Icon }) => {
          const selected = colorPattern === value;
          return (
            <ViewerControlTile
              key={value}
              selected={selected}
              onClick={() => setColorPattern(value)}
              className="min-w-0 justify-start px-2.5 text-left"
              title={description}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate text-xs">{label}</span>
            </ViewerControlTile>
          );
        })}
      </div>

      {colorPattern === "fade" && (
        <div className={CONTROL_INSET_CLASS}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className={CONTROL_LABEL_CLASS}>Palette Blend</p>
              <p className="mt-0.5 text-[0.65rem] text-slate-500">
                Soften the edge between bands
              </p>
            </div>
            <ViewerValueBadge label="Palette blend" value={`${paletteBlend}%`} />
          </div>
          <Slider
            aria-label="Palette blend amount"
            value={[paletteBlend]}
            min={PALETTE_BLEND_CONFIG.minPercent}
            max={PALETTE_BLEND_CONFIG.maxPercent}
            step={PALETTE_BLEND_CONFIG.stepPercent}
            onValueChange={(value) => setPaletteBlend(value[0])}
            trackClassName="h-1 bg-white/[0.08]"
            rangeClassName="bg-gradient-to-r from-amber-100/60 to-white"
            thumbClassName="h-4 w-4 border-white/70 bg-slate-950 shadow-[0_0_0_3px_rgba(255,255,255,0.08)]"
          />
          <div className="mt-2 flex justify-between text-[0.61rem] text-slate-600">
            <span>Straight lines</span>
            <span>More blended</span>
          </div>
        </div>
      )}

      {colorPattern === "scatter" && (
        <div className={`${CONTROL_INSET_CLASS} space-y-4`}>
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className={CONTROL_LABEL_CLASS}>Scatter Width (squares)</p>
              <ViewerValueBadge
                label="Scatter width"
                value={resolvedScatterWidth}
              />
            </div>
            <Slider
              aria-label="Scatter width"
              value={[resolvedScatterWidth]}
              min={MINIMUM_SCATTER_WIDTH}
              max={MAXIMUM_SCATTER_WIDTH}
              step={SCATTER_CONTROL_STEP}
              onValueChange={(value) => setScatterWidth(value[0])}
              trackClassName="h-1 bg-white/[0.08]"
              rangeClassName="bg-white/80"
              thumbClassName="border-white/70 bg-slate-950"
            />
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className={CONTROL_LABEL_CLASS}>Scatter Amount</p>
              <ViewerValueBadge
                label="Scatter amount"
                value={`${resolvedScatterAmount}%`}
              />
            </div>
            <Slider
              aria-label="Scatter amount"
              value={[resolvedScatterAmount]}
              min={MINIMUM_SCATTER_AMOUNT}
              max={MAXIMUM_SCATTER_AMOUNT}
              step={SCATTER_CONTROL_STEP}
              onValueChange={(value) => setScatterAmount(value[0])}
              trackClassName="h-1 bg-white/[0.08]"
              rangeClassName="bg-white/80"
              thumbClassName="border-white/70 bg-slate-950"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className={CONTROL_LABEL_CLASS}>Orientation</p>
        <div
          role="group"
          aria-label="Pattern orientation"
          className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.07] bg-black/15 p-1.5"
        >
          <ViewerControlTile
            selected={orientation === "horizontal"}
            onClick={() => setOrientation("horizontal")}
            className="px-2"
          >
            <MoveHorizontal className="h-4 w-4" />
            <span className="text-xs">Horizontal</span>
          </ViewerControlTile>
          <ViewerControlTile
            selected={orientation === "vertical"}
            onClick={() => setOrientation("vertical")}
            className="px-2"
          >
            <MoveVertical className="h-4 w-4" />
            <span className="text-xs">Vertical</span>
          </ViewerControlTile>
        </div>
      </div>

      <ViewerControlTile
        selected={hasColorRotation}
        onClick={rotateColorsQuarterTurn}
        className="w-full justify-between"
      >
        <span className="text-xs">Rotate Colors</span>
        <ColorRotationIndicator
          isRotated={isRotated}
          isReversed={isReversed}
        />
      </ViewerControlTile>
    </div>
  );

  if (embedded) return content;

  return (
    <ViewerControlSurface ariaLabel="Pattern and orientation">
      <ViewerControlDisclosure
        title="Pattern"
        description="Tune color flow and orientation"
        icon={SlidersHorizontal}
        contentClassName="p-4"
        defaultOpen
      >
        {content}
      </ViewerControlDisclosure>
    </ViewerControlSurface>
  );
}
