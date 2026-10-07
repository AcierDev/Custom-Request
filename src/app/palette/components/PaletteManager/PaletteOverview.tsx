import type { CustomColor } from "@/store/customStore";

const OVERVIEW_CONFIG = { firstColorNumber: 1 } as const;

/** Every swatch shares the available width, including large paint palettes.
 * This stays separate from the detailed cards so scrolling never hides the
 * overall color sequence. */
export function PaletteOverview({ colors }: { colors: readonly CustomColor[] }) {
  if (!colors.length) return null;

  return (
    <aside
      aria-label="Entire palette preview"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-gray-950/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg backdrop-blur-xl sm:px-6 lg:left-[var(--desktop-nav-rail-width)]"
    >
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-300">
        <span className="font-medium">Entire palette</span>
        <span>{colors.length} colors</span>
      </div>
      <div role="list" aria-label="Palette colors in order" className="flex h-10 w-full overflow-hidden rounded-lg ring-1 ring-white/15">
        {colors.map((color, index) => {
          const label = `${index + OVERVIEW_CONFIG.firstColorNumber}. ${color.name || color.hex} (${color.hex})`;
          return (
            <div
              key={color.id}
              role="listitem"
              aria-label={label}
              title={label}
              className="h-full min-w-0 flex-1"
              style={{ backgroundColor: color.hex }}
            />
          );
        })}
      </div>
    </aside>
  );
}
