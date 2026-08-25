"use client";

import { RotateCcw } from "lucide-react";
import {
  getColorRotationDegrees,
  type ColorRotationState,
} from "@/lib/colorRotation";

const ROTATION_MOTION_CLASS =
  "grid place-items-center will-change-transform transition-transform duration-300 ease-out motion-reduce:transition-none";

export function ColorRotationIndicator({
  isRotated,
  isReversed,
}: ColorRotationState) {
  const degrees = getColorRotationDegrees({ isRotated, isReversed });

  return (
    <span className="ml-auto inline-flex shrink-0 items-center gap-1.5">
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-full border border-current/15 bg-black/10"
      >
        <span
          className={ROTATION_MOTION_CLASS}
          style={{ transform: `rotate(${degrees}deg)` }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </span>
      </span>
      <output
        aria-label="Color rotation"
        aria-live="polite"
        className="min-w-8 font-mono text-[0.65rem] tabular-nums text-current/75"
      >
        {degrees}°
      </output>
    </span>
  );
}
