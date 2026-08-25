export interface StepTransform {
  translationMm: readonly [number, number, number];
  rotationZRadians: number;
}

export interface StepSquarePlan {
  id: string;
  name: string;
  colorHex: string;
  physicalScaleMm: number;
  transform: StepTransform;
}

export interface StepBackboardBodyPlan {
  id: string;
  sizeMm: readonly [number, number, number];
  transform: StepTransform;
}

export interface StepBounds {
  min: readonly [number, number, number];
  max: readonly [number, number, number];
}

export interface StepModelPlan {
  rootName: string;
  backboard: {
    name: string;
    colorHex: string;
    bodies: StepBackboardBodyPlan[];
  };
  squares: {
    name: string;
    children: StepSquarePlan[];
  };
  boundsMm: StepBounds;
}

export interface StepExportResult {
  bytes: Uint8Array;
  filename: string;
}
