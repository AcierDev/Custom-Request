"use client";

import { useMemo, type RefObject } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { filterAndSortPalettesByRecentOpen } from "@/lib/paletteRecency";
import type { SavedPalette } from "@/store/customStore";

const SEARCH_INPUT_ID = "connect-palette-search";
const LEGACY_PALETTE_VERSION_COUNT = 1;
const SINGLE_VERSION_COUNT = 1;
const PICKER_LIST_CLASS =
  "max-h-56 space-y-1 overflow-y-auto rounded-md border border-slate-700 bg-slate-950/70 p-1";
const PICKER_OPTION_CLASS =
  "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors";
const PICKER_ICON_CLASS = "h-4 w-4 shrink-0";

interface ExistingPalettePickerProps {
  palettes: readonly SavedPalette[];
  query: string;
  selectedId: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (query: string) => void;
  onSelect: (paletteId: string) => void;
}

export function ExistingPalettePicker({
  palettes,
  query,
  selectedId,
  searchInputRef,
  onQueryChange,
  onSelect,
}: ExistingPalettePickerProps) {
  const visiblePalettes = useMemo(
    () => filterAndSortPalettesByRecentOpen(palettes, query),
    [palettes, query],
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={SEARCH_INPUT_ID}>Connect to palette</Label>
      <Input
        ref={searchInputRef}
        id={SEARCH_INPUT_ID}
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search palette names…"
        autoComplete="off"
      />
      <div
        role="listbox"
        aria-label="Saved palettes"
        className={PICKER_LIST_CLASS}
      >
        {visiblePalettes.length > 0 ? (
          visiblePalettes.map((palette) => {
            const versionCount =
              palette.versions?.length ?? LEGACY_PALETTE_VERSION_COUNT;
            const isSelected = palette.id === selectedId;

            return (
              <button
                key={palette.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onSelect(palette.id)}
                className={cn(
                  PICKER_OPTION_CLASS,
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "text-slate-200 hover:bg-slate-800",
                )}
              >
                <span className="min-w-0 truncate font-medium">
                  {palette.name}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-slate-300">
                  {versionCount}{" "}
                  {versionCount === SINGLE_VERSION_COUNT
                    ? "version"
                    : "versions"}
                  {isSelected && (
                    <Check
                      className={PICKER_ICON_CLASS}
                      aria-hidden="true"
                    />
                  )}
                </span>
              </button>
            );
          })
        ) : (
          <p className="px-3 py-4 text-center text-sm text-slate-400">
            No palettes match &ldquo;{query.trim()}&rdquo;.
          </p>
        )}
      </div>
      <p className="text-xs text-slate-400">
        Most recently opened palettes appear first.
      </p>
    </div>
  );
}
