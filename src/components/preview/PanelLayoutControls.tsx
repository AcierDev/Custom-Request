"use client";

import { useMemo } from "react";
import { Columns3, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCustomStore } from "@/store/customStore";
import { cn } from "@/lib/utils";
import {
  PANEL_LAYOUT_CONFIG,
  buildPanelColumnLayout,
} from "@/lib/panelLayout";

const PANEL_COUNT_OPTIONS = Array.from(
  { length: PANEL_LAYOUT_CONFIG.maxCount },
  (_, index) => index + PANEL_LAYOUT_CONFIG.minCount
);

export function PanelLayoutControls() {
  const totalColumns = useCustomStore((state) => state.dimensions.width);
  const panelCount = useCustomStore(
    (state) => state.viewSettings.panelCount
  );
  const panelSpacingInches = useCustomStore(
    (state) => state.viewSettings.panelSpacingInches
  );
  const setPanelCount = useCustomStore((state) => state.setPanelCount);
  const setPanelSpacingInches = useCustomStore(
    (state) => state.setPanelSpacingInches
  );

  const panels = buildPanelColumnLayout(totalColumns, panelCount);
  const effectivePanelCount = panels.length;
  const isUneven =
    effectivePanelCount > PANEL_LAYOUT_CONFIG.singleCount &&
    totalColumns % effectivePanelCount !== 0;
  const allocation = panels.map((panel) => panel.columnCount).join(" / ");
  const spacingSliderValue = useMemo(
    () => [panelSpacingInches],
    [panelSpacingInches]
  );

  return (
    <Card className="glass-surface overflow-hidden rounded-2xl border-white/10 bg-slate-950/50 shadow-xl shadow-black/15">
      <div className="space-y-3.5 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/5">
              <Columns3 className="h-3.5 w-3.5 text-indigo-300" />
            </span>
            <Label className="text-sm font-medium text-slate-200">Panels</Label>
          </div>
          {isUneven && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Uneven panel split details"
                    className="grid h-6 w-6 place-items-center rounded-full text-amber-300 transition-colors hover:bg-amber-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-64">
                  <p>
                    {totalColumns} columns divide as {allocation}. The
                    center panel receives the extra columns.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div
          className="grid grid-cols-5 gap-1 rounded-full border border-white/10 bg-slate-950/60 p-1 shadow-inner shadow-black/25"
          aria-label="Panel count"
        >
          {PANEL_COUNT_OPTIONS.map((count) => {
            const isSelected = effectivePanelCount === count;
            return (
              <button
                key={count}
                type="button"
                aria-pressed={isSelected}
                aria-label={count === 1 ? "Single panel" : `${count} panels`}
                disabled={count > totalColumns}
                onClick={() => setPanelCount(count)}
                className={cn(
                  "rounded-full px-2 py-1.5 text-xs font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-30",
                  isSelected
                    ? "bg-indigo-500 text-white shadow-md shadow-indigo-950/40"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                )}
              >
                {count}
              </button>
            );
          })}
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.025] p-3 shadow-inner shadow-black/10">
          <div className="flex items-center justify-between gap-3">
            <Label
              htmlFor="panel-spacing-inches"
              className="text-xs font-medium text-slate-300"
            >
              Panel spacing
            </Label>
            <div className="flex items-center rounded-full border border-white/10 bg-slate-950/70 p-0.5 pl-1 shadow-inner shadow-black/20 focus-within:border-indigo-400/50 focus-within:ring-2 focus-within:ring-indigo-400/10">
              <Input
                id="panel-spacing-inches"
                type="number"
                min={PANEL_LAYOUT_CONFIG.minSpacingInches}
                max={PANEL_LAYOUT_CONFIG.maxSpacingInches}
                step={PANEL_LAYOUT_CONFIG.spacingStepInches}
                value={panelSpacingInches}
                disabled={
                  effectivePanelCount === PANEL_LAYOUT_CONFIG.singleCount
                }
                onChange={(event) => {
                  if (event.target.value === "") return;
                  setPanelSpacingInches(Number(event.target.value));
                }}
                className="h-6 w-14 rounded-full border-0 bg-transparent px-1.5 text-right text-xs font-medium text-slate-100 shadow-none focus-visible:ring-0"
              />
              <span className="pr-2 text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">
                in
              </span>
            </div>
          </div>
          <Slider
            min={PANEL_LAYOUT_CONFIG.minSpacingInches}
            max={PANEL_LAYOUT_CONFIG.maxSpacingInches}
            step={PANEL_LAYOUT_CONFIG.spacingStepInches}
            value={spacingSliderValue}
            disabled={
              effectivePanelCount === PANEL_LAYOUT_CONFIG.singleCount
            }
            onValueChange={([value]) => setPanelSpacingInches(value)}
            aria-label="Spacing between panels in inches"
            className="h-7 px-0.5"
            trackClassName="h-3 rounded-full border border-white/10 bg-slate-900 shadow-inner shadow-black/40"
            rangeClassName="rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-400 shadow-[0_0_12px_rgba(129,140,248,0.35)]"
            thumbClassName="h-6 w-6 rounded-full border-4 border-slate-950 bg-white shadow-lg shadow-black/40 ring-1 ring-white/40 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:bg-slate-500"
          />
        </div>
      </div>
    </Card>
  );
}
