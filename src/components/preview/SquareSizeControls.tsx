"use client";

import { useCustomStore } from "@/store/customStore";
import { WEDGE_GEOMETRY_CONFIG } from "@/lib/wedgeGeometry";
import {
  ViewerControlSurface,
  ViewerControlTile,
} from "./ViewerControlSurface";

const STANDARD_SQUARE_SIZE_LABEL = `${WEDGE_GEOMETRY_CONFIG.standardSquareEdgeInches}" (standard)`;
const MINI_SQUARE_SIZE_LABEL = `${WEDGE_GEOMETRY_CONFIG.miniSquareEdgeInches}" (mini)`;

export function SquareSizeControls({ compact = false }: { compact?: boolean }) {
  const useMini = useCustomStore((state) => state.useMini);
  const setUseMini = useCustomStore((state) => state.setUseMini);

  return (
    <ViewerControlSurface ariaLabel="Square size" compact={compact}>
      <div className="p-3">
        <div
          role="group"
          aria-label="Square size"
          className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/[0.07] bg-black/15 p-1.5"
        >
          <ViewerControlTile
            selected={!useMini}
            onClick={() => setUseMini(false)}
            className="px-2 text-xs"
          >
            {STANDARD_SQUARE_SIZE_LABEL}
          </ViewerControlTile>
          <ViewerControlTile
            selected={useMini}
            onClick={() => setUseMini(true)}
            className="px-2 text-xs"
          >
            {MINI_SQUARE_SIZE_LABEL}
          </ViewerControlTile>
        </div>
      </div>
    </ViewerControlSurface>
  );
}
