"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Check, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BRAND_OPTIONS,
  LOWES_MATCHES,
  isLowesMatchColor,
  brandDisplayName,
  type PaintColor,
} from "@/lib/paint";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪣 PAINT COLOR PICKER — pick a real, orderable wall paint             ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Lets a recipient set the room wall to a SPECIFIC named paint (Sherwin,
// Valspar, Benjamin Moore, Behr, PPG) — the same swatch lists the palette
// editor grounds against. The datasets (public/paints/<brand>/colors.json)
// total ~15k colors, so they're lazy-loaded only when the picker is first
// opened — this is a conversion page; don't pay the cost unless asked.

// Code-bearing brands first (those map to a real counter color number),
// matching the palette editor's grounding order.
const PAINT_SOURCES = [
  "/paints/sherwin/colors.json",
  "/paints/valspar/colors.json",
  "/paints/benjamin_moore/colors.json",
  "/paints/behr/colors.json",
  "/paints/ppg/colors.json",
  // HGTV Home by Sherwin-Williams — the second Lowe's line, so the
  // "Lowe's matches" filter here draws from the whole Lowe's wall.
  "/paints/hgtv_home/colors.json",
];

// Cap the rendered rows so typing stays smooth against the full ~15k array.
const MAX_RESULTS = 48;
const NAMED_PAINT_SEARCH_ID = "named-paint-search";

// The datasets are static, so fetch them at most once per session and share
// the result across every mount. Caching the PROMISE (not just the data) also
// dedupes concurrent opens. Lives at module scope on purpose.
let paintsPromise: Promise<PaintColor[]> | null = null;
function loadAllPaints(): Promise<PaintColor[]> {
  if (!paintsPromise) {
    paintsPromise = Promise.all(
      PAINT_SOURCES.map((u) =>
        fetch(u).then((r) => {
          if (!r.ok) throw new Error(`paint fetch ${r.status}`);
          return r.json() as Promise<PaintColor[]>;
        })
      )
    )
      // Drop discontinued / fan-deck-only colors: this picker frames every
      // result as "a real, orderable wall paint" to the recipient, so an
      // available:false color here is a cook-risk (mirrors the palette
      // grounding filter). 220 SW + 1 Valspar are available:false.
      .then((sets) => sets.flat().filter((c) => c.available !== false))
      .catch((err) => {
        // Don't cache a failed load — let the next open retry.
        paintsPromise = null;
        throw err;
      });
  }
  return paintsPromise;
}

export function PaintColorPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [colors, setColors] = useState<PaintColor[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState<string>("Any");
  const inputRef = useRef<HTMLInputElement>(null);

  // Lazy-load the datasets the first time the picker is opened. NOTE: `loading`
  // is deliberately NOT a dependency — setting it here would re-run the effect,
  // and the re-run's cleanup would cancel the in-flight fetch, leaving the
  // panel stuck on "Loading…" forever.
  useEffect(() => {
    if (!open || colors) return;
    let active = true;
    setLoading(true);
    loadAllPaints()
      .then((all) => {
        if (active) setColors(all);
      })
      .catch(() => {
        if (active) setColors([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, colors]);

  // Focus the search as soon as the panel opens, so it's type-to-find.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    if (!colors) return [];
    const q = query.trim().toLowerCase();
    // Nothing to narrow by yet — keep the list empty rather than dumping
    // the first 48 of one brand, which reads as noise.
    if (!q && brand === "Any") return [];
    let list = colors;
    if (brand === LOWES_MATCHES) list = list.filter(isLowesMatchColor);
    else if (brand !== "Any") list = list.filter((c) => c.brand === brand);
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code?.toLowerCase().includes(q)
      );
    }
    return list.slice(0, MAX_RESULTS);
  }, [colors, query, brand]);

  // The paint currently on the wall, if this picker set it.
  const activePaint = useMemo(() => {
    if (!colors) return null;
    const v = value.toLowerCase();
    return colors.find((c) => c.hex.toLowerCase() === v) ?? null;
  }, [colors, value]);

  return (
    <div className={className}>
      {/* Disclosure header — keeps the section calm until it's wanted. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={NAMED_PAINT_SEARCH_ID}
        className="flex min-h-11 w-full items-center justify-between rounded-xl border border-white/[0.09] bg-white/[0.035] px-3 py-2 text-left shadow-inner shadow-black/15 outline-none backdrop-blur-md transition-colors hover:border-white/[0.18] hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-amber-100/60"
      >
        <span className="flex items-center gap-2 text-[12px] text-slate-100">
          {activePaint ? (
            <>
              <span
                className="h-3.5 w-3.5 rounded-full ring-1 ring-black/30"
                style={{ backgroundColor: activePaint.hex }}
              />
              <span className="text-slate-200">{activePaint.name}</span>
            </>
          ) : (
            "Match a specific paint color"
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        // Solid dark panel — the surrounding card is translucent glass, so a
        // light wall color would otherwise bleed through and wash the text
        // out. This keeps the suggestions readable over any wall.
        <div
          id={NAMED_PAINT_SEARCH_ID}
          className="mt-2 space-y-2 rounded-2xl border border-white/[0.09] bg-black/35 p-2.5 shadow-inner shadow-black/20 backdrop-blur-md"
        >
          {/* Search + brand filter. */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Name or code, e.g. "Sea Salt"'
                className="h-10 w-full rounded-xl border border-white/[0.09] bg-black/30 pl-8 pr-2 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none transition-colors focus:border-amber-100/50 focus:ring-2 focus:ring-amber-100/10"
              />
            </div>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              aria-label="Paint brand"
              className="h-10 rounded-xl border border-white/[0.09] bg-black/30 px-2 text-[11px] text-slate-300 outline-none transition-colors focus:border-amber-100/50 focus:ring-2 focus:ring-amber-100/10"
            >
              {BRAND_OPTIONS.map((b) => (
                <option key={b} value={b} className="bg-stone-900 text-slate-200">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Results. */}
          {loading ? (
            <div className="flex items-center gap-2 px-1 py-3 text-[12px] text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading paint colors…
            </div>
          ) : !query.trim() && brand === "Any" ? (
            <p className="px-1 py-2 text-[11px] text-slate-400">
              Search 15,000+ paints by name or code, or pick a brand to browse.
            </p>
          ) : results.length === 0 ? (
            <p className="px-1 py-2 text-[11px] text-slate-400">
              No paints match that.
            </p>
          ) : (
            <ul className="max-h-52 space-y-0.5 overflow-y-auto pr-0.5 no-scrollbar">
              {results.map((c) => {
                const selected = value.toLowerCase() === c.hex.toLowerCase();
                return (
                  <li key={`${c.brand}-${c.code ?? c.name}-${c.hex}`}>
                    <button
                      type="button"
                      onClick={() => onChange(c.hex)}
                      title={`${brandDisplayName(c.brand)}${c.code ? ` · ${c.code}` : ""} · ${c.hex.toUpperCase()}`}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-100/50",
                        selected
                          ? "border-white/60 bg-white/[0.1]"
                          : "border-transparent hover:border-white/20 hover:bg-white/5"
                      )}
                    >
                      <span
                        className="h-5 w-5 shrink-0 rounded-md ring-1 ring-black/30"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-[12px] text-slate-100">
                          {c.name}
                        </span>
                        <span className="block truncate text-[10px] text-slate-400">
                          {brandDisplayName(c.brand)}
                          {c.code ? ` · ${c.code}` : ""}
                        </span>
                      </span>
                      {selected && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-amber-100" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
