"use client";

import { ItemSizes } from "@/typings/types";

const SIZE_TONE_BASE =
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.10)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_48%)] text-white";

const SIZE_BG_BY_HEIGHT: Record<number, string> = {
  6: "bg-cyan-600/85",
  7: "bg-cyan-600/85",
  10: "bg-emerald-600/85",
  12: "bg-amber-600/85",
  16: "bg-rose-600/85",
};

const SIZE_BG_DEFAULT = "bg-sky-600/80";
const SIZE_BG_INCH = "bg-[#4a2e1b]";

const KNOWN_HEIGHTS = [6, 7, 10, 12, 16] as const;
const KNOWN_SIZES = new Set<string>(Object.values(ItemSizes));

export function parseSizeWh(
  size: string | undefined | null,
): { w: number; h: number } | null {
  const m = size?.trim().match(/^(\d+)\s*[x×X]\s*(\d+)$/);
  if (!m) return null;
  const w = parseInt(m[1] ?? "", 10);
  const h = parseInt(m[2] ?? "", 10);
  if (!w || !h) return null;
  return { w, h };
}

function nearestKnownHeight(h: number): number {
  let best: number = KNOWN_HEIGHTS[0];
  let bestDist = Infinity;
  for (const known of KNOWN_HEIGHTS) {
    const d = Math.abs(h - known);
    if (d < bestDist) {
      bestDist = d;
      best = known;
    }
  }
  return best;
}

export function sizeToneClass(size: string | undefined | null): string {
  if (size?.includes('"')) return `${SIZE_TONE_BASE} ${SIZE_BG_INCH}`;
  const parsed = parseSizeWh(size);
  if (parsed) {
    const h = KNOWN_SIZES.has(size!) ? parsed.h : nearestKnownHeight(parsed.h);
    const bg = SIZE_BG_BY_HEIGHT[h];
    if (bg) return `${SIZE_TONE_BASE} ${bg}`;
  }
  return `${SIZE_TONE_BASE} ${SIZE_BG_DEFAULT}`;
}

// Mini grid of 2px white dots whose columns ≈ width/6 and rows ≈ height/6
// so the dot grid keeps the panel's aspect ratio.
const DOT_INCHES_PER = 6;
const DOT_MIN_COLS = 2;
const DOT_MIN_ROWS = 1;

export function SizeTilePrefix({
  size,
}: {
  size: string | undefined | null;
}) {
  const parsed = parseSizeWh(size);
  if (!parsed) return null;
  const cols = Math.max(DOT_MIN_COLS, Math.round(parsed.w / DOT_INCHES_PER));
  const rows = Math.max(DOT_MIN_ROWS, Math.round(parsed.h / DOT_INCHES_PER));
  const total = rows * cols;
  return (
    <span className="inline-flex items-center self-stretch flex-shrink-0">
      <span
        className="inline-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, 2px)`,
          gridAutoRows: "2px",
          gap: "1px",
        }}
        aria-hidden
      >
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className="block bg-white/95 rounded-full"
            style={{ width: "2px", height: "2px" }}
          />
        ))}
      </span>
    </span>
  );
}

export const PILL_GEOM_FULL =
  "inline-flex items-center justify-center gap-1.5 px-[0.675rem] h-6 min-h-0 text-xs font-medium text-white rounded-[10px] border-transparent";

export const PILL_INTERACTIVE =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 transition-[transform,opacity,box-shadow] hover:opacity-95 hover:-translate-y-px active:translate-y-0";

export const PILL_SELECTED_RING =
  "ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900";

export function sizePillFullClass(size: string | undefined | null): string {
  return `${PILL_GEOM_FULL} ${sizeToneClass(size)}`;
}
