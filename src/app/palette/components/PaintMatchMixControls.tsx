"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type MixSource = "palette" | "black-white" | "purchase";

export const DEFAULT_MIX_SOURCE: MixSource = "palette";

const PALETTE_MIX_SOURCE: MixSource = "palette";
const CONTROL_CLASS =
  "flex h-9 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-[10px] border border-white/10 bg-gray-900/80 px-3 text-sm text-slate-300";
const MIX_SOURCE_TRIGGER_CLASS =
  "h-9 w-64 shrink-0 rounded-[10px] border-white/10 bg-gray-900/80 text-slate-200 focus:ring-violet-500";
const ACTIVE_MIX_CLASS = "bg-violet-500/10 ring-1 ring-violet-400/25";
const INACTIVE_MIX_CLASS = "ring-1 ring-transparent";
const DISABLED_CONTROL_CLASS = "cursor-not-allowed opacity-50";

type PaintMatchMixControlsProps = {
  mixToMatch: boolean;
  mixSource: MixSource;
  useMixedColors: boolean;
  disabled: boolean;
  onMixToMatchChange: (checked: boolean) => void;
  onMixSourceChange: (source: MixSource) => void;
  onUseMixedColorsChange: (checked: boolean) => void;
};

export function PaintMatchMixControls({
  mixToMatch,
  mixSource,
  useMixedColors,
  disabled,
  onMixToMatchChange,
  onMixSourceChange,
  onUseMixedColorsChange,
}: PaintMatchMixControlsProps) {
  const mixSettingsDisabled = disabled || !mixToMatch;
  const mixedColorsDisabled =
    mixSettingsDisabled || mixSource !== PALETTE_MIX_SOURCE;

  return (
    <div className="contents" data-paint-mix-controls="true">
      <label
        className={`${CONTROL_CLASS} ${
          mixToMatch ? ACTIVE_MIX_CLASS : INACTIVE_MIX_CLASS
        }`}
        title="Compute a digital mix estimate. Test a small batch because catalog hex values do not capture real pigment tint strength."
      >
        <input
          type="checkbox"
          checked={mixToMatch}
          onChange={(event) => onMixToMatchChange(event.target.checked)}
          disabled={disabled}
          className="accent-violet-500"
        />
        Mix to get closer
      </label>

      <Select
        value={mixSource}
        disabled={mixSettingsDisabled}
        onValueChange={(value) => onMixSourceChange(value as MixSource)}
      >
        <SelectTrigger
          aria-label="Which paints the mix may use"
          className={MIX_SOURCE_TRIGGER_CLASS}
          title="Which paints a mix recipe may draw from"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-white/10 bg-gray-950 text-slate-100">
          <SelectItem
            value="palette"
            textValue="Palette + Tricorn/untinted white"
            className="focus:bg-violet-500/15 focus:text-white"
          >
            Palette + Tricorn/untinted white
          </SelectItem>
          <SelectItem
            value="black-white"
            textValue="Adding Tricorn/untinted white"
            className="focus:bg-violet-500/15 focus:text-white"
          >
            Adding Tricorn/untinted white
          </SelectItem>
          <SelectItem
            value="purchase"
            textValue="Buying any paint"
            className="focus:bg-violet-500/15 focus:text-white"
          >
            Buying any paint
          </SelectItem>
        </SelectContent>
      </Select>

      <label
        className={`${CONTROL_CLASS} ${
          mixedColorsDisabled ? DISABLED_CONTROL_CLASS : ""
        }`}
        title="Let digitally-mixed swatches contribute their nearest can as a mix ingredient. Off = only directly-picked colors' cans are used."
      >
        <input
          type="checkbox"
          checked={useMixedColors}
          onChange={(event) => onUseMixedColorsChange(event.target.checked)}
          disabled={mixedColorsDisabled}
          className="accent-violet-500"
        />
        Use mixed colors
      </label>
    </div>
  );
}
