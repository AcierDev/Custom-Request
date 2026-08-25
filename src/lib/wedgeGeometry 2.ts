export const WEDGE_GEOMETRY_CONFIG = {
  inchesPerSceneUnit: 6,
  fullSquareSizeSceneUnits: 0.5,
  miniScale: 0.9,
  angleDegrees: 21.5,
  degreesPerHalfTurn: 180,
  backboardLipInches: 3 / 16,
  normalizedEdge: 1,
  normalizedHalfEdge: 0.5,
} as const;

export interface NormalizedPoint3 {
  x: number;
  y: number;
  z: number;
}

export const WEDGE_FACE_CORNER_INDEXES = [
  [0, 3, 2, 1],
  [4, 5, 6, 7],
  [0, 4, 7, 3],
  [1, 2, 6, 5],
  [0, 1, 5, 4],
  [3, 7, 6, 2],
] as const;

/**
 * Eight unique corners for the exact centered wedge rendered in the viewer.
 * Corners 0–3 are the recessed back; 4–7 are the sloped front.
 */
export function getNormalizedWedgeCorners(): readonly NormalizedPoint3[] {
  const halfEdge = WEDGE_GEOMETRY_CONFIG.normalizedHalfEdge;
  const rise = Math.tan(
    (WEDGE_GEOMETRY_CONFIG.angleDegrees * Math.PI) /
      WEDGE_GEOMETRY_CONFIG.degreesPerHalfTurn,
  );
  const halfRise = rise / 2;
  const fullSquareInches =
    WEDGE_GEOMETRY_CONFIG.fullSquareSizeSceneUnits *
    WEDGE_GEOMETRY_CONFIG.inchesPerSceneUnit;
  const normalizedLip =
    WEDGE_GEOMETRY_CONFIG.backboardLipInches / fullSquareInches;
  const backZ = -halfRise - normalizedLip;

  return [
    { x: -halfEdge, y: -halfEdge, z: backZ },
    { x: halfEdge, y: -halfEdge, z: backZ },
    { x: halfEdge, y: halfEdge, z: backZ },
    { x: -halfEdge, y: halfEdge, z: backZ },
    { x: -halfEdge, y: -halfEdge, z: halfRise },
    { x: halfEdge, y: -halfEdge, z: halfRise },
    { x: halfEdge, y: halfEdge, z: -halfRise },
    { x: -halfEdge, y: halfEdge, z: -halfRise },
  ];
}
