"use client";

import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import {
  ARTWORK_EXTENSION_CONFIG,
  useCustomStore,
  type ArtworkExtensionEdge,
} from "@/store/customStore";
import { cn } from "@/lib/utils";
import { ViewerControlTile } from "./ViewerControlSurface";

const EXTENSION_SURFACE_CLASS =
  "rounded-2xl border border-white/[0.07] bg-black/15 p-3 shadow-inner shadow-black/15";
const EXTENSION_LABEL_CLASS =
  "text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-400";

export function ArtworkExtensionControls({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [extensionCount, setExtensionCount] = useState<number>(
    ARTWORK_EXTENSION_CONFIG.default,
  );
  const canExtendArtwork = useCustomStore((state) =>
    Boolean(
      (state.drawnPatternGrid && state.drawnPatternGridSize) ||
        Object.keys(state.renderedPatternColorIndexes).length,
    ),
  );
  const extendArtworkWithWhite = useCustomStore(
    (state) => state.extendArtworkWithWhite,
  );
  const updateExtensionCount = (value: number) => {
    const finiteValue = Number.isFinite(value)
      ? value
      : ARTWORK_EXTENSION_CONFIG.default;
    setExtensionCount(
      Math.min(
        ARTWORK_EXTENSION_CONFIG.max,
        Math.max(ARTWORK_EXTENSION_CONFIG.min, Math.round(finiteValue)),
      ),
    );
  };
  const extendArtwork = (edge: ArtworkExtensionEdge) => {
    extendArtworkWithWhite(edge, extensionCount);
  };

  return (
    <section
      aria-label="Extend artwork"
      className={cn("space-y-3", !embedded && EXTENSION_SURFACE_CLASS)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={EXTENSION_LABEL_CLASS}>Extend artwork</p>
          <p className="mt-0.5 text-[0.65rem] leading-4 text-slate-500">
            Keeps the current design unchanged and adds white space
          </p>
        </div>
        <label className="w-16 shrink-0 text-right text-[0.61rem] text-slate-500">
          Amount
          <input
            type="number"
            aria-label="Rows or columns to add"
            min={ARTWORK_EXTENSION_CONFIG.min}
            max={ARTWORK_EXTENSION_CONFIG.max}
            step={ARTWORK_EXTENSION_CONFIG.step}
            value={extensionCount}
            onChange={(event) =>
              updateExtensionCount(event.currentTarget.valueAsNumber)
            }
            className="mt-1 h-8 w-full rounded-lg border border-white/[0.1] bg-black/25 px-2 text-center text-xs tabular-nums text-white outline-none focus-visible:ring-2 focus-visible:ring-amber-100/60"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ViewerControlTile
          disabled={!canExtendArtwork}
          onClick={() => extendArtwork("top")}
          aria-label="Add white rows to top"
          className="min-h-10 justify-start px-2.5 text-xs"
        >
          <ArrowUp className="h-3.5 w-3.5" />
          Top rows
        </ViewerControlTile>
        <ViewerControlTile
          disabled={!canExtendArtwork}
          onClick={() => extendArtwork("right")}
          aria-label="Add white columns to right"
          className="min-h-10 justify-start px-2.5 text-xs"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          Right columns
        </ViewerControlTile>
        <ViewerControlTile
          disabled={!canExtendArtwork}
          onClick={() => extendArtwork("bottom")}
          aria-label="Add white rows to bottom"
          className="min-h-10 justify-start px-2.5 text-xs"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          Bottom rows
        </ViewerControlTile>
        <ViewerControlTile
          disabled={!canExtendArtwork}
          onClick={() => extendArtwork("left")}
          aria-label="Add white columns to left"
          className="min-h-10 justify-start px-2.5 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Left columns
        </ViewerControlTile>
      </div>
      {!canExtendArtwork && (
        <p className="text-[0.62rem] leading-4 text-slate-600">
          The controls enable as soon as the artwork is visible.
        </p>
      )}
    </section>
  );
}
