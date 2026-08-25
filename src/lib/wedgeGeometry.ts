const STANDARD_SQUARE_EDGE_INCHES = 3;
const MINI_SQUARE_EDGE_INCHES = 2.65;
const INCHES_PER_SCENE_UNIT = 6;
const FULL_SQUARE_SIZE_SCENE_UNITS =
  STANDARD_SQUARE_EDGE_INCHES / INCHES_PER_SCENE_UNIT;
const MINI_SQUARE_SCALE =
  MINI_SQUARE_EDGE_INCHES / STANDARD_SQUARE_EDGE_INCHES;
const MINI_GRID_CORRECTION_SCENE_UNITS =
  (FULL_SQUARE_SIZE_SCENE_UNITS * (1 - MINI_SQUARE_SCALE)) / 2;

export const WEDGE_GEOMETRY_CONFIG = {
  inchesPerSceneUnit: INCHES_PER_SCENE_UNIT,
  standardSquareEdgeInches: STANDARD_SQUARE_EDGE_INCHES,
  miniSquareEdgeInches: MINI_SQUARE_EDGE_INCHES,
  fullSquareSizeSceneUnits: FULL_SQUARE_SIZE_SCENE_UNITS,
  miniScale: MINI_SQUARE_SCALE,
  miniGridCorrectionSceneUnits: MINI_GRID_CORRECTION_SCENE_UNITS,
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
