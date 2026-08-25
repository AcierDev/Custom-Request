"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WALL_COLOR_FAMILIES, findWallColorFamily } from "./wallColors";

const WALL_COLOR_TOUCH_TARGET_CLASS = "min-h-11";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪜 WALL COLOR PICKER — main colour → lightest…darkest ramp            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Shared by BOTH the main builder (/viewer) and the shared viewer so the
// available wall colours and the pick-a-hue-then-a-shade interaction stay
// in lockstep. The colour data lives in wallColors.ts; this is the UI.
// Callers supply their own surrounding card / label.

export function WallColorPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
}) {
  // The family the current wall colour belongs to (if any) — keeps the
  // matching ramp open and marks the active main colour.
  const activeFamilyName = useMemo(
    () => findWallColorFamily(value)?.name ?? null,
    [value]
  );
  const [expanded, setExpanded] = useState<string | null>(activeFamilyName);

  // When the colour changes (picking a shade, or an external reset), keep
  // that family's ramp open so the new selection stays visible.
  useEffect(() => {
    if (activeFamilyName) setExpanded(activeFamilyName);
  }, [activeFamilyName]);

  const activeFamily =
    WALL_COLOR_FAMILIES.find((f) => f.name === expanded) ?? null;

  return (
    <div className={className}>
      {/* Main colours — click to reveal that hue's shades. */}
      <div
        role="group"
        aria-label="Wall color families"
        className="grid grid-cols-5 gap-2"
      >
        {WALL_COLOR_FAMILIES.map((family) => {
          const isExpanded = expanded === family.name;
          const holdsCurrent = family.name === activeFamilyName;
          return (
            <button
              key={family.name}
              type="button"
              aria-label={family.name}
              title={family.name}
              aria-expanded={isExpanded}
              aria-pressed={holdsCurrent}
              onClick={() =>
                setExpanded((cur) => (cur === family.name ? null : family.name))
              }
              className={cn(
                WALL_COLOR_TOUCH_TARGET_CLASS,
                "relative overflow-hidden rounded-xl border shadow-inner shadow-black/15 outline-none transition-[border-color,box-shadow,transform] focus-visible:ring-2 focus-visible:ring-amber-100/60 active:scale-95",
                isExpanded
                  ? "border-white/80 ring-2 ring-white/20"
                  : holdsCurrent
                    ? "border-white/50 hover:border-white/70"
                    : "border-white/15 hover:border-white/40",
              )}
              style={{ backgroundColor: family.swatch }}
            >
              {holdsCurrent && (
                <span className="absolute inset-x-0 bottom-1.5 flex justify-center">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-black/55 text-white shadow-sm backdrop-blur-sm">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Shades of the chosen main colour, lightest → darkest. */}
      {activeFamily && (
        <div className="mt-2.5">
          <div className="mb-2 flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-300">{activeFamily.name}</span>
            <span className="text-slate-600">Light → Dark</span>
          </div>
          <div
            role="group"
            aria-label={`${activeFamily.name} shades`}
            className="grid grid-cols-5 gap-2"
          >
            {activeFamily.shades.map((shade) => {
              const selected =
                value.toLowerCase() === shade.hex.toLowerCase();
              return (
                <button
                  key={shade.hex}
                  type="button"
                  aria-label={shade.name}
                  title={`${shade.name} · ${shade.hex.toUpperCase()}`}
                  aria-pressed={selected}
                  onClick={() => onChange(shade.hex)}
                  className={cn(
                    WALL_COLOR_TOUCH_TARGET_CLASS,
                    "relative rounded-lg border shadow-inner shadow-black/10 outline-none transition-[border-color,box-shadow,transform] focus-visible:ring-2 focus-visible:ring-amber-100/60 active:scale-95",
                    selected
                      ? "border-white/80 ring-2 ring-white/20"
                      : "border-white/15 hover:border-white/40",
                  )}
                  style={{ backgroundColor: shade.hex }}
                >
                  {selected && (
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-black/55 text-white shadow-sm">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
