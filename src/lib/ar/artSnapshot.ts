//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📸 ART SNAPSHOT                                                       ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// The live 3D preview (GeometricPattern) already computes the exact per-square
// instance set the viewer renders — colors, positions, rotations, grain cell
// indices. That computation is seeded with Math.random (tile rotations, fade
// dithering), so re-deriving it would NOT match what the user sees. Instead the
// component PUBLISHES its computed instances here, and the AR/USDZ exporter
// reads this snapshot — so the model placed on the wall is pixel-faithful to
// the on-screen art on BOTH the viewer and the shared page (both mount
// GeometricPattern).

import type { SquareInstance } from "@/components/preview/InstancedSquares";

export interface ArtSnapshot {
  /** The exact per-square instances the viewer rendered. */
  instances: SquareInstance[];
  /** Group-level Z rotation applied to the whole art (PI/2 when vertical). */
  orientationRotationZ: number;
  /** Backing-board / grid extent in SCENE UNITS (1 unit = 6 inches). */
  totalWidth: number;
  totalHeight: number;
  /** Wedge tile base size in scene units (0.5 full). */
  squareSize: number;
  useMini: boolean;
  /** Whether the live view is showing wood grain — drives the grain bake. */
  showWoodGrain: boolean;
  /** Changes whenever the art changes; used to cache the prepared USDZ. */
  updatedAt: number;
}

let latest: ArtSnapshot | null = null;
const subscribers = new Set<(snapshot: ArtSnapshot) => void>();

/** Called by GeometricPattern each time it recomputes the art. */
export function publishArtSnapshot(snapshot: ArtSnapshot): void {
  latest = snapshot;
  for (const fn of subscribers) fn(snapshot);
}

/** Read the most recent on-screen art (or null if no preview is mounted). */
export function getArtSnapshot(): ArtSnapshot | null {
  return latest;
}

/**
 * Subscribe to art changes. Lets the AR button bake the USDZ AHEAD of the tap
 * (so "View in your room" launches in a single tap). Returns an unsubscribe fn.
 */
export function subscribeArtSnapshot(
  fn: (snapshot: ArtSnapshot) => void
): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
