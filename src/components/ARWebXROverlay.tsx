"use client";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🤖 WEBXR AR OVERLAY — in-AR controls (Android)                       ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// The DOM rendered over a WebXR immersive-ar session (the `dom-overlay` feature).
// Lets the user, WHILE standing in the live AR render, exit, re-place the piece,
// and change its size / design. Changing size/design mutates the store; the
// still-mounted GeometricPattern republishes the art snapshot and the WebXR
// session rebuilds the mesh in place.
//
// IMPORTANT: everything here renders INLINE. Radix popovers/portals mount onto
// document.body, OUTSIDE the dom-overlay root, so they would not composite in AR.
// The session sets the overlay root to pointer-events:none; each interactive
// cluster below opts back in with `pointer-events-auto` so taps on empty space
// still fall through to AR placement.

import { useState } from "react";
import { X, RotateCcw, Columns3, Palette, Hand } from "lucide-react";
import { ItemSizes, ItemDesigns } from "@/typings/types";
import { sizeToDimensions } from "@/lib/utils";
import { useCustomStore } from "@/store/customStore";
import { cn } from "@/lib/utils";
import {
  PILL_INTERACTIVE,
  PILL_SELECTED_RING,
  SizeTilePrefix,
  sizePillFullClass,
} from "@/lib/size-pills";
import {
  createDesignBackground,
  DESIGN_PILL_FULL,
  DESIGN_PILL_INTERACTIVE,
  DESIGN_PILL_SELECTED_RING,
} from "@/lib/design-pills";

// 14x7 is a mini-square panel by definition, so picking it switches to mini
// squares — mirrors SizeCard so AR matches the on-screen editor.
const MINI_DEFAULT_SIZE = ItemSizes.Fourteen_By_Seven;

type Panel = "none" | "size" | "design";

interface ARWebXROverlayProps {
  /** Whether the piece is currently placed (controls differ before/after). */
  placed: boolean;
  /** Un-place the piece so it can be re-positioned (fresh surface detection). */
  onReset: () => void;
  /** Exit the AR session. */
  onExit: () => void;
}

export function ARWebXROverlay({ placed, onReset, onExit }: ARWebXROverlayProps) {
  const dimensions = useCustomStore((s) => s.dimensions);
  const selectedDesign = useCustomStore((s) => s.selectedDesign);
  const setDimensions = useCustomStore((s) => s.setDimensions);
  const setUseMini = useCustomStore((s) => s.setUseMini);
  const setSelectedDesign = useCustomStore((s) => s.setSelectedDesign);
  const [panel, setPanel] = useState<Panel>("none");

  const currentSize = (Object.values(ItemSizes) as ItemSizes[]).find((size) => {
    const d = sizeToDimensions(size);
    return d.width === dimensions.width && d.height === dimensions.height;
  });

  return (
    // Full-screen, transparent, click-through. Children opt into pointer events.
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-[max(0.75rem,env(safe-area-inset-top))_0.75rem_max(0.75rem,env(safe-area-inset-bottom))] select-none">
      {/* Top bar — Exit only, kept minimal so it barely covers the view. */}
      <div className="flex items-start justify-end">
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit AR"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-900/80 text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-gray-900"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Pre-placement hint, centered. */}
      {!placed && (
        <div className="pointer-events-none flex justify-center">
          <div className="flex items-center gap-2.5 rounded-2xl bg-gray-900/85 px-4 py-3 text-sm font-medium text-white shadow-xl ring-1 ring-white/15 backdrop-blur">
            <Hand className="h-5 w-5 shrink-0 text-indigo-300" />
            <span>Point at your wall, then tap to place the art.</span>
          </div>
        </div>
      )}

      {/* Bottom controls — only after the piece is placed. */}
      {placed ? (
        <div className="flex flex-col items-stretch gap-2">
          {/* Expandable picker row (size or design). Horizontally scrollable so
              it never grows tall enough to block the view. */}
          {panel !== "none" && (
            <div className="pointer-events-auto flex gap-1.5 overflow-x-auto rounded-2xl bg-gray-900/85 p-2 no-scrollbar ring-1 ring-white/15 backdrop-blur">
              {panel === "size"
                ? (Object.values(ItemSizes) as ItemSizes[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setDimensions(sizeToDimensions(size));
                        if (size === MINI_DEFAULT_SIZE) setUseMini(true);
                      }}
                      className={cn(
                        sizePillFullClass(size),
                        PILL_INTERACTIVE,
                        "shrink-0",
                        currentSize === size && PILL_SELECTED_RING
                      )}
                    >
                      <SizeTilePrefix size={size} />
                      <span className="truncate leading-none">{size}</span>
                    </button>
                  ))
                : (Object.values(ItemDesigns) as ItemDesigns[]).map((design) => (
                    <button
                      key={design}
                      type="button"
                      onClick={() => setSelectedDesign(design)}
                      className={cn(
                        DESIGN_PILL_FULL,
                        DESIGN_PILL_INTERACTIVE,
                        "shrink-0",
                        selectedDesign === design && DESIGN_PILL_SELECTED_RING
                      )}
                      style={{ background: createDesignBackground(design) }}
                    >
                      <span className="truncate leading-none">{design}</span>
                    </button>
                  ))}
            </div>
          )}

          {/* Action bar: Reset · Size · Design. */}
          <div className="pointer-events-auto flex items-center justify-center gap-2">
            <OverlayButton onClick={onReset} icon={<RotateCcw className="h-4 w-4" />} label="Re-place" />
            <OverlayButton
              onClick={() => setPanel((p) => (p === "size" ? "none" : "size"))}
              icon={<Columns3 className="h-4 w-4" />}
              label="Size"
              active={panel === "size"}
            />
            <OverlayButton
              onClick={() => setPanel((p) => (p === "design" ? "none" : "design"))}
              icon={<Palette className="h-4 w-4" />}
              label="Design"
              active={panel === "design"}
            />
          </div>
        </div>
      ) : (
        <span />
      )}
    </div>
  );
}

function OverlayButton({
  onClick,
  icon,
  label,
  active = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium ring-1 backdrop-blur transition-colors",
        active
          ? "bg-indigo-600 text-white ring-indigo-400/50"
          : "bg-gray-900/85 text-white ring-white/20 hover:bg-gray-900"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
