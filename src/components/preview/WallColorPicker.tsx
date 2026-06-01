"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { WALL_COLOR_FAMILIES, findWallColorFamily } from "./wallColors";

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
      <div className="grid grid-cols-5 gap-1.5">
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
              onClick={() =>
                setExpanded((cur) => (cur === family.name ? null : family.name))
              }
              className={cn(
                "h-7 rounded-md border transition-all",
                isExpanded
                  ? "border-indigo-300 ring-2 ring-indigo-400/60"
                  : holdsCurrent
                  ? "border-white/50 hover:border-white/70"
                  : "border-white/15 hover:border-white/40"
              )}
              style={{ backgroundColor: family.swatch }}
            />
          );
        })}
      </div>

      {/* Shades of the chosen main colour, lightest → darkest. */}
      {activeFamily && (
        <div className="mt-2.5">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-300">{activeFamily.name}</span>
            <span className="text-slate-500">Light → Dark</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {activeFamily.shades.map((shade) => {
              const selected =
                value.toLowerCase() === shade.hex.toLowerCase();
              return (
                <button
                  key={shade.hex}
                  type="button"
                  aria-label={shade.name}
                  title={`${shade.name} · ${shade.hex.toUpperCase()}`}
                  onClick={() => onChange(shade.hex)}
                  className={cn(
                    "h-[1.3125rem] rounded-md border transition-all",
                    selected
                      ? "border-indigo-300 ring-2 ring-indigo-400/60"
                      : "border-white/15 hover:border-white/40"
                  )}
                  style={{ backgroundColor: shade.hex }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
