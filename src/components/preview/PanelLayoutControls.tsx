"use client";

import { Columns3, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCustomStore } from "@/store/customStore";
import {
  PANEL_LAYOUT_CONFIG,
  PANEL_REMAINDER_MODES,
  buildPanelColumnLayout,
} from "@/lib/panelLayout";

const PANEL_COUNT_OPTIONS = Array.from(
  { length: PANEL_LAYOUT_CONFIG.maxCount },
  (_, index) => index + PANEL_LAYOUT_CONFIG.minCount
);

const PANEL_SPACING_OPTIONS = Array.from(
  {
    length:
      (PANEL_LAYOUT_CONFIG.maxSpacingInches -
        PANEL_LAYOUT_CONFIG.minSpacingInches) /
        PANEL_LAYOUT_CONFIG.spacingStepInches +
      1,
  },
  (_, index) =>
    PANEL_LAYOUT_CONFIG.minSpacingInches +
    index * PANEL_LAYOUT_CONFIG.spacingStepInches
);

const panelCountLabel = (count: number): string =>
  count === PANEL_LAYOUT_CONFIG.singleCount
    ? "1 panel"
    : `${count} panels`;

const panelSpacingLabel = (spacingInches: number): string =>
  `${spacingInches} in`;

const PANEL_REMAINDER_MODE_OPTIONS = [
  {
    value: PANEL_REMAINDER_MODES.triptych,
    label: "Center",
  },
  {
    value: PANEL_REMAINDER_MODES.rightToLeft,
    label: "Right to left",
  },
] as const;

export function PanelLayoutControls() {
  const totalColumns = useCustomStore((state) => state.dimensions.width);
  const panelCount = useCustomStore(
    (state) => state.viewSettings.panelCount
  );
  const panelSpacingInches = useCustomStore(
    (state) => state.viewSettings.panelSpacingInches
  );
  const panelRemainderMode = useCustomStore(
    (state) => state.viewSettings.panelRemainderMode
  );
  const setPanelCount = useCustomStore((state) => state.setPanelCount);
  const setPanelSpacingInches = useCustomStore(
    (state) => state.setPanelSpacingInches
  );
  const setPanelRemainderMode = useCustomStore(
    (state) => state.setPanelRemainderMode
  );

  const panels = buildPanelColumnLayout(
    totalColumns,
    panelCount,
    panelRemainderMode,
  );
  const effectivePanelCount = panels.length;
  const isUneven =
    effectivePanelCount > PANEL_LAYOUT_CONFIG.singleCount &&
    totalColumns % effectivePanelCount !== 0;
  const allocation = panels.map((panel) => panel.columnCount).join(" / ");

  return (
    <Card className="glass-surface overflow-hidden rounded-2xl border-white/10 bg-slate-950/50 shadow-xl shadow-black/15">
      <div className="grid grid-cols-3 gap-2 p-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex h-5 items-center gap-1.5">
            <Columns3 className="h-3.5 w-3.5 text-indigo-300" />
            <Label className="text-xs font-medium text-slate-300">
              Panels
            </Label>
            {isUneven && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Uneven panel split details"
                      className="grid h-5 w-5 place-items-center rounded-full text-amber-300 transition-colors hover:bg-amber-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64">
                    <p>
                      {totalColumns} columns divide as {allocation}. {" "}
                      {panelRemainderMode ===
                      PANEL_REMAINDER_MODES.rightToLeft
                        ? "Extra columns are assigned from right to left."
                        : "The center panel receives the extra columns."}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <Select
            value={String(effectivePanelCount)}
            onValueChange={(value) => setPanelCount(Number(value))}
          >
            <SelectTrigger
              aria-label="Panel count"
              className="h-8 rounded-full border-white/10 bg-slate-950/70 px-2.5 text-xs text-slate-100 shadow-inner shadow-black/20 focus:ring-indigo-400/50"
            >
              <SelectValue>{panelCountLabel(effectivePanelCount)}</SelectValue>
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-gray-950 text-slate-100">
              {PANEL_COUNT_OPTIONS.map((count) => (
                <SelectItem
                  key={count}
                  value={String(count)}
                  disabled={count > totalColumns}
                  className="cursor-pointer"
                >
                  {panelCountLabel(count)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 space-y-1.5">
          <div className="flex h-5 items-center">
            <Label className="text-xs font-medium text-slate-300">
              Spacing
            </Label>
          </div>
          <Select
            value={String(panelSpacingInches)}
            disabled={
              effectivePanelCount === PANEL_LAYOUT_CONFIG.singleCount
            }
            onValueChange={(value) => setPanelSpacingInches(Number(value))}
          >
            <SelectTrigger
              aria-label="Spacing between panels in inches"
              className="h-8 rounded-full border-white/10 bg-slate-950/70 px-2.5 text-xs text-slate-100 shadow-inner shadow-black/20 focus:ring-indigo-400/50"
            >
              <SelectValue>
                {panelSpacingLabel(panelSpacingInches)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-gray-950 text-slate-100">
              {PANEL_SPACING_OPTIONS.map((spacingInches) => (
                <SelectItem
                  key={spacingInches}
                  value={String(spacingInches)}
                  className="cursor-pointer"
                >
                  {panelSpacingLabel(spacingInches)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 space-y-1.5">
          <div className="flex h-5 items-center">
            <Label className="text-xs font-medium text-slate-300">
              Extras
            </Label>
          </div>
          <Select
            value={panelRemainderMode}
            disabled={
              effectivePanelCount === PANEL_LAYOUT_CONFIG.singleCount
            }
            onValueChange={setPanelRemainderMode}
          >
            <SelectTrigger
              aria-label="Extra column placement"
              className="h-8 rounded-full border-white/10 bg-slate-950/70 px-2.5 text-xs text-slate-100 shadow-inner shadow-black/20 focus:ring-indigo-400/50"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-gray-950 text-slate-100">
              {PANEL_REMAINDER_MODE_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="cursor-pointer"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
