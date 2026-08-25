"use client";

import type { LucideIcon } from "lucide-react";
import { Moon, SunMedium, Sunset } from "lucide-react";
import {
  ViewerControlHeader,
  ViewerControlSurface,
  ViewerControlTile,
} from "./ViewerControlSurface";

type TimeOfDay = "morning" | "afternoon" | "night";

interface LightingControlsProps {
  value: TimeOfDay;
  onChange: (value: TimeOfDay) => void;
  embedded?: boolean;
}

interface LightingOption {
  value: TimeOfDay;
  label: string;
  description: string;
  Icon: LucideIcon;
}

const LIGHTING_OPTIONS: readonly LightingOption[] = [
  {
    value: "afternoon",
    label: "Afternoon",
    Icon: Sunset,
    description: "Warm, directional daylight",
  },
  {
    value: "night",
    label: "Night",
    Icon: Moon,
    description: "Soft, diffused evening light",
  },
];

export function LightingControls({
  value,
  onChange,
  embedded = false,
}: LightingControlsProps) {
  const choices = (
    <div role="group" aria-label="Lighting" className="grid grid-cols-2 gap-2">
      {LIGHTING_OPTIONS.map(({ value: optionValue, label, description, Icon }) => {
        const selected = value === optionValue;
        return (
          <ViewerControlTile
            key={optionValue}
            selected={selected}
            onClick={() => onChange(optionValue)}
            className="min-w-0 justify-start px-2.5 text-left"
            title={description}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate text-xs">{label}</span>
          </ViewerControlTile>
        );
      })}
    </div>
  );

  if (embedded) return choices;

  return (
    <ViewerControlSurface ariaLabel="Lighting">
      <ViewerControlHeader
        title="Lighting"
        description="Preview the finish in a different mood"
        icon={SunMedium}
      />
      <div className="p-4">{choices}</div>
    </ViewerControlSurface>
  );
}
