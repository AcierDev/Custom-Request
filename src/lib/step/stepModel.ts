import type { ArtSnapshot } from "../ar/artSnapshot.ts";
import {
  DEFAULT_AR_BACKBOARD_COLOR,
  normalizeBackboardColor,
} from "../backboardColor.ts";
import { getNormalizedWedgeCorners } from "../wedgeGeometry.ts";
import { STEP_EXPORT_CONFIG } from "./stepConfig.ts";
import type {
  StepBackboardBodyPlan,
  StepBounds,
  StepModelPlan,
  StepSquarePlan,
  StepTransform,
} from "./stepTypes.ts";

export { STEP_EXPORT_CONFIG } from "./stepConfig.ts";
export type {
  StepBackboardBodyPlan,
  StepBounds,
  StepModelPlan,
  StepSquarePlan,
  StepTransform,
} from "./stepTypes.ts";

type Point3 = readonly [number, number, number];

const RGB_HEX_PATTERN = /^#[\dA-F]{6}$/;
const RGB_HEX_LENGTH = 7;
const HALF_SIZE_DIVISOR = 2;
const BOX_CORNER_DIRECTIONS = [-1, 1] as const;

export function sceneUnitsToMillimeters(sceneUnits: number): number {
  return (
    sceneUnits *
    STEP_EXPORT_CONFIG.inchesPerSceneUnit *
    STEP_EXPORT_CONFIG.millimetersPerInch
  );
}

const rotatePoint = (
  x: number,
  y: number,
  radians: number,
): readonly [number, number] => {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [x * cosine - y * sine, x * sine + y * cosine];
};

const makeTransform = (
  positionSceneUnits: Point3,
  rotationZRadians: number,
  orientationRotationZ: number,
): StepTransform => {
  const [x, y] = rotatePoint(
    positionSceneUnits[0],
    positionSceneUnits[1],
    orientationRotationZ,
  );

  return {
    translationMm: [
      sceneUnitsToMillimeters(x),
      sceneUnitsToMillimeters(y),
      sceneUnitsToMillimeters(positionSceneUnits[2]),
    ],
    rotationZRadians: rotationZRadians + orientationRotationZ,
  };
};

const normalizeSquareColor = (value: string): string => {
  const normalized = value.trim().toUpperCase();
  return normalized.length === RGB_HEX_LENGTH &&
    RGB_HEX_PATTERN.test(normalized)
    ? normalized
    : STEP_EXPORT_CONFIG.defaultSquareColor;
};

const makeSquareName = (index: number): string => {
  const number = String(index + STEP_EXPORT_CONFIG.firstComponentNumber).padStart(
    STEP_EXPORT_CONFIG.componentNumberWidth,
    "0",
  );
  return `${STEP_EXPORT_CONFIG.squareNamePrefix} ${number}`;
};

const makeSquareId = (index: number): string => {
  const number = String(index + STEP_EXPORT_CONFIG.firstComponentNumber).padStart(
    STEP_EXPORT_CONFIG.componentNumberWidth,
    "0",
  );
  return `${STEP_EXPORT_CONFIG.squareIdPrefix}-${number}`;
};

const transformPoint = (
  point: Point3,
  transform: StepTransform,
): Point3 => {
  const [x, y] = rotatePoint(
    point[0],
    point[1],
    transform.rotationZRadians,
  );
  return [
    x + transform.translationMm[0],
    y + transform.translationMm[1],
    point[2] + transform.translationMm[2],
  ];
};

const getSquareWorldCorners = (square: StepSquarePlan): Point3[] =>
  getNormalizedWedgeCorners().map(({ x, y, z }) =>
    transformPoint(
      [
        x * square.physicalScaleMm,
        y * square.physicalScaleMm,
        z * square.physicalScaleMm,
      ],
      square.transform,
    ),
  );

const getBackboardWorldCorners = (
  body: StepBackboardBodyPlan,
): Point3[] => {
  const halfSize: Point3 = [
    body.sizeMm[0] / HALF_SIZE_DIVISOR,
    body.sizeMm[1] / HALF_SIZE_DIVISOR,
    body.sizeMm[2] / HALF_SIZE_DIVISOR,
  ];
  const corners: Point3[] = [];

  for (const xDirection of BOX_CORNER_DIRECTIONS) {
    for (const yDirection of BOX_CORNER_DIRECTIONS) {
      for (const zDirection of BOX_CORNER_DIRECTIONS) {
        corners.push(
          transformPoint(
            [
              halfSize[0] * xDirection,
              halfSize[1] * yDirection,
              halfSize[2] * zDirection,
            ],
            body.transform,
          ),
        );
      }
    }
  }

  return corners;
};

const buildBounds = (points: readonly Point3[]): StepBounds => {
  if (points.length === STEP_EXPORT_CONFIG.emptyBoundValue) {
    const origin: Point3 = [
      STEP_EXPORT_CONFIG.emptyBoundValue,
      STEP_EXPORT_CONFIG.emptyBoundValue,
      STEP_EXPORT_CONFIG.emptyBoundValue,
    ];
    return { min: origin, max: origin };
  }

  const minimum = [Infinity, Infinity, Infinity];
  const maximum = [-Infinity, -Infinity, -Infinity];

  for (const point of points) {
    for (let axis = 0; axis < point.length; axis += 1) {
      minimum[axis] = Math.min(minimum[axis], point[axis]);
      maximum[axis] = Math.max(maximum[axis], point[axis]);
    }
  }

  return {
    min: [minimum[0], minimum[1], minimum[2]],
    max: [maximum[0], maximum[1], maximum[2]],
  };
};

const getBoundsCenter = (bounds: StepBounds): Point3 => [
  (bounds.min[0] + bounds.max[0]) / HALF_SIZE_DIVISOR,
  (bounds.min[1] + bounds.max[1]) / HALF_SIZE_DIVISOR,
  (bounds.min[2] + bounds.max[2]) / HALF_SIZE_DIVISOR,
];

const recenterTransform = (
  transform: StepTransform,
  center: Point3,
): StepTransform => ({
  ...transform,
  translationMm: [
    transform.translationMm[0] - center[0],
    transform.translationMm[1] - center[1],
    transform.translationMm[2] - center[2],
  ],
});

const recenterBounds = (bounds: StepBounds, center: Point3): StepBounds => ({
  min: [
    bounds.min[0] - center[0],
    bounds.min[1] - center[1],
    bounds.min[2] - center[2],
  ],
  max: [
    bounds.max[0] - center[0],
    bounds.max[1] - center[1],
    bounds.max[2] - center[2],
  ],
});

export function buildStepModelPlan(snapshot: ArtSnapshot): StepModelPlan {
  const squares: StepSquarePlan[] = snapshot.instances
    .filter((instance) => !instance.hidden)
    .map((instance, index) => ({
      id: makeSquareId(index),
      name: makeSquareName(index),
      colorHex: normalizeSquareColor(instance.color),
      physicalScaleMm: sceneUnitsToMillimeters(instance.physicalScale),
      transform: makeTransform(
        [instance.px, instance.py, instance.pz],
        instance.rotationZ,
        snapshot.orientationRotationZ,
      ),
    }));
  const backboardBodies: StepBackboardBodyPlan[] =
    snapshot.backboardBodies.map((body) => ({
      id: body.id,
      sizeMm: [
        sceneUnitsToMillimeters(body.size[0]),
        sceneUnitsToMillimeters(body.size[1]),
        sceneUnitsToMillimeters(body.size[2]),
      ],
      transform: makeTransform(
        body.center,
        STEP_EXPORT_CONFIG.emptyBoundValue,
        snapshot.orientationRotationZ,
      ),
    }));
  const points = [
    ...squares.flatMap(getSquareWorldCorners),
    ...backboardBodies.flatMap(getBackboardWorldCorners),
  ];
  const bounds = buildBounds(points);
  const center = getBoundsCenter(bounds);

  return {
    rootName: STEP_EXPORT_CONFIG.rootName,
    backboard: {
      name: STEP_EXPORT_CONFIG.backboardName,
      colorHex:
        normalizeBackboardColor(snapshot.backboardColor) ??
        DEFAULT_AR_BACKBOARD_COLOR,
      bodies: backboardBodies.map((body) => ({
        ...body,
        transform: recenterTransform(body.transform, center),
      })),
    },
    squares: {
      name: STEP_EXPORT_CONFIG.squaresName,
      children: squares.map((square) => ({
        ...square,
        transform: recenterTransform(square.transform, center),
      })),
    },
    boundsMm: recenterBounds(bounds, center),
  };
}
