"use client";

import { useMemo } from "react";
import { Check, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ANY_PAINT_BRAND,
  BRAND_OPTIONS,
  LOWES_MATCHES,
  LOWES_WITH_FALLBACK,
  brandDisplayName,
  isLowesMatchColor,
  type PaintColor,
} from "@/lib/paint";
import { cn } from "@/lib/utils";

const MAX_PAINT_SEARCH_RESULTS = 48;
const PAINT_SEARCH_BRANDS = BRAND_OPTIONS.filter(
  (brand) => brand !== LOWES_WITH_FALLBACK,
);

type PaintColorSearchProps = {
  colors: PaintColor[];
  loading: boolean;
  query: string;
  brand: string;
  selectedHex?: string;
  onQueryChange: (query: string) => void;
  onBrandChange: (brand: string) => void;
  onSelect: (color: PaintColor) => void;
};

export function PaintColorSearch({
  colors,
  loading,
  query,
  brand,
  selectedHex,
  onQueryChange,
  onBrandChange,
  onSelect,
}: PaintColorSearchProps) {
  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery && brand === ANY_PAINT_BRAND) return [];

    let filtered = colors;
    if (brand === LOWES_MATCHES) {
      filtered = filtered.filter(isLowesMatchColor);
    } else if (brand !== ANY_PAINT_BRAND) {
      filtered = filtered.filter((color) => color.brand === brand);
    }

    if (normalizedQuery) {
      filtered = filtered.filter(
        (color) =>
          color.name.toLowerCase().includes(normalizedQuery) ||
          color.code?.toLowerCase().includes(normalizedQuery),
      );
    }

    return filtered.slice(0, MAX_PAINT_SEARCH_RESULTS);
  }, [brand, colors, query]);

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder='Name or code, e.g. "Indigo Streamer"'
            aria-label="Search paint colors"
            autoFocus
            className="h-10 border-white/10 bg-gray-800/60 pl-9 text-white placeholder:text-slate-500"
          />
        </div>
        <Select value={brand} onValueChange={onBrandChange}>
          <SelectTrigger
            aria-label="Paint brand"
            className="h-10 w-full border-white/10 bg-gray-800/60 text-slate-200 sm:w-36"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-gray-950 text-slate-100">
            {PAINT_SEARCH_BRANDS.map((brandOption) => (
              <SelectItem key={brandOption} value={brandOption}>
                {brandOption === ANY_PAINT_BRAND ? "Any brand" : brandOption}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-1 py-4 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading paint colors…
        </div>
      ) : !query.trim() && brand === ANY_PAINT_BRAND ? (
        <p className="px-1 py-3 text-xs text-slate-400">
          Search paints by name or code, or choose a brand to browse.
        </p>
      ) : results.length === 0 ? (
        <p className="px-1 py-3 text-xs text-slate-400">
          No paints match that search.
        </p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {results.map((paint) => {
            const selected =
              selectedHex?.toLowerCase() === paint.hex.toLowerCase();
            return (
              <li key={`${paint.brand}-${paint.code ?? paint.name}-${paint.hex}`}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(paint)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-400/60",
                    selected
                      ? "border-blue-300/60 bg-blue-500/15"
                      : "border-transparent hover:border-white/15 hover:bg-white/5",
                  )}
                >
                  <span
                    className="h-7 w-7 shrink-0 rounded-md ring-1 ring-black/30"
                    style={{ backgroundColor: paint.hex }}
                  />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-sm text-slate-100">
                      {paint.name}
                    </span>
                    <span className="block truncate text-xs text-slate-400">
                      {brandDisplayName(paint.brand)}
                      {paint.code ? ` · ${paint.code}` : ""}
                    </span>
                  </span>
                  <span className="hidden shrink-0 font-mono text-[11px] text-slate-500 sm:inline">
                    {paint.hex.toUpperCase()}
                  </span>
                  {selected && (
                    <Check className="h-4 w-4 shrink-0 text-blue-300" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
