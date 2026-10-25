//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📐 WALL POSE — camera + wall plane from 4 marked corners              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// The customer drags 4 dots onto the corners of any rectangle on their wall
// (the wall itself, a door, a window, a frame) and gives ONE real dimension.
// From the rectangle's image quad we recover:
//   • the camera focal length (two sides of a rectangle are perpendicular —
//     the classic single-view calibration, principal point = image centre),
//   • the rectangle's true aspect ratio (so the other side's length follows),
//   • the full camera pose relative to the wall plane.
// Everything is in image PIXELS and wall INCHES. Wall coordinates: origin at
// the rectangle's top-left corner, X to the right, Y DOWN, Z into the wall.

export type Vec2 = { x: number; y: number };
export type Vec3 = [number, number, number];
type Mat3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export const WALL_POSE_CONFIG = {
  // Fallback focal length as a fraction of the image's long side: a phone's
  // main camera (~26 mm full-frame equivalent → 26/36 of the long side).
  defaultFocalLongSide: 0.72,
  // Accept a solved focal only inside this plausible range (× long side):
  // ~10 mm ultra-wide to ~110 mm tele. Near-frontal photos make the solve
  // ill-conditioned and fall back to the default.
  minFocalLongSide: 0.3,
  maxFocalLongSide: 3,
  // A quad this close to a parallelogram carries no focal information.
  minPerspectiveTerm: 1e-9,
  // Log-spaced focal candidates tried when both real sides are known.
  focalSearchSteps: 400,
  // Accept that searched focal only if it reproduces the real aspect this well.
  focalAspectTolerance: 0.03,
} as const;

export interface WallPose {
  /** Focal length in pixels (square pixels, principal point at centre). */
  focal: number;
  /** Whether the focal came from the quad (true) or the default (false). */
  focalSolved: boolean;
  imageWidth: number;
  imageHeight: number;
  /** Real size of the marked rectangle, inches. */
  rectWidthIn: number;
  rectHeightIn: number;
  /** Camera-frame (OpenCV: x right, y down, z forward) wall axes + origin. */
  r1: Vec3;
  r2: Vec3;
  r3: Vec3;
  t: Vec3;
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3) => Math.sqrt(dot(a, a));
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/**
 * Orders 4 points as top-left, top-right, bottom-right, bottom-left (image
 * y is down, so ascending angle around the centroid is visually clockwise).
 */
export function orderQuad(points: readonly Vec2[]): Vec2[] {
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  const sorted = [...points].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
  );
  let first = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].x + sorted[i].y < sorted[first].x + sorted[first].y)
      first = i;
  }
  return [0, 1, 2, 3].map((i) => sorted[(first + i) % sorted.length]);
}

/** Homography mapping the unit square (0,0)(1,0)(1,1)(0,1) onto the quad. */
export function squareToQuad(q: readonly Vec2[]): Mat3 {
  const [p0, p1, p2, p3] = q;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;
  let g = 0;
  let h = 0;
  if (Math.abs(dx3) > 0 || Math.abs(dy3) > 0) {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
  }
  return [
    p1.x - p0.x + g * p1.x,
    p3.x - p0.x + h * p3.x,
    p0.x,
    p1.y - p0.y + g * p1.y,
    p3.y - p0.y + h * p3.y,
    p0.y,
    g,
    h,
    1,
  ];
}

export function defaultFocal(width: number, height: number): number {
  return WALL_POSE_CONFIG.defaultFocalLongSide * Math.max(width, height);
}

/**
 * Solves the camera + wall pose. `known` is the one real dimension the
 * customer gave: the rectangle's height or width, in inches.
 */
export function solveWallPose(
  quad: readonly Vec2[],
  imageWidth: number,
  imageHeight: number,
  known: { heightIn?: number; widthIn?: number },
): WallPose {
  const cx = imageWidth / 2;
  const cy = imageHeight / 2;
  const q = orderQuad(quad).map((p) => ({ x: p.x - cx, y: p.y - cy }));
  const H = squareToQuad(q);
  const h1: Vec3 = [H[0], H[3], H[6]];
  const h2: Vec3 = [H[1], H[4], H[7]];
  const h3: Vec3 = [H[2], H[5], H[8]];

  // r1 ⟂ r2  ⇒  (h1x·h2x + h1y·h2y)/f² + h1z·h2z = 0
  const longSide = Math.max(imageWidth, imageHeight);
  let focal = defaultFocal(imageWidth, imageHeight);
  let focalSolved = false;
  const zz = h1[2] * h2[2];
  if (Math.abs(zz) > WALL_POSE_CONFIG.minPerspectiveTerm) {
    const f2 = -(h1[0] * h2[0] + h1[1] * h2[1]) / zz;
    const f = f2 > 0 ? Math.sqrt(f2) : NaN;
    if (
      f >= WALL_POSE_CONFIG.minFocalLongSide * longSide &&
      f <= WALL_POSE_CONFIG.maxFocalLongSide * longSide
    ) {
      focal = f;
      focalSolved = true;
    }
  }

  const aspectAt = (f: number) =>
    Math.hypot(h1[0] / f, h1[1] / f, h1[2]) /
    Math.hypot(h2[0] / f, h2[1] / f, h2[2]);

  // Both sides known but no focal from the quad (e.g. a straight-on or
  // two-point-perspective photo, where the walls' verticals stay parallel):
  // the focal is the one whose recovered aspect matches the real one.
  if (!focalSolved && known.heightIn && known.widthIn) {
    const target = known.widthIn / known.heightIn;
    const lo = Math.log(WALL_POSE_CONFIG.minFocalLongSide * longSide);
    const hi = Math.log(WALL_POSE_CONFIG.maxFocalLongSide * longSide);
    let bestF = focal;
    let bestErr = Math.abs(aspectAt(focal) - target);
    for (let i = 0; i <= WALL_POSE_CONFIG.focalSearchSteps; i++) {
      const f = Math.exp(
        lo + ((hi - lo) * i) / WALL_POSE_CONFIG.focalSearchSteps,
      );
      const err = Math.abs(aspectAt(f) - target);
      if (err < bestErr) {
        bestErr = err;
        bestF = f;
      }
    }
    if (bestErr / target < WALL_POSE_CONFIG.focalAspectTolerance) {
      focal = bestF;
      focalSolved = true;
    }
  }

  const k = (v: Vec3): Vec3 => [v[0] / focal, v[1] / focal, v[2]];
  const k1 = k(h1);
  const k2 = k(h2);
  const k3 = k(h3);
  const aspect = norm(k1) / norm(k2); // rect width / height
  const rectHeightIn =
    known.heightIn ?? (known.widthIn ? known.widthIn / aspect : 1);
  // Height wins as the scale when both are given; width then only fixes f.
  const rectWidthIn = known.heightIn
    ? rectHeightIn * aspect
    : (known.widthIn ?? aspect);

  // h1 = λ K r1 W, h3 = λ K t  (λ > 0 keeps the wall in front of the camera)
  const lambda = norm(k1) / rectWidthIn;
  const r1 = scale(k1, 1 / norm(k1));
  let r2 = scale(k2, 1 / norm(k2));
  r2 = sub(r2, scale(r1, dot(r1, r2)));
  r2 = scale(r2, 1 / norm(r2));
  const r3 = cross(r1, r2);
  const t = scale(k3, 1 / lambda);

  return {
    focal,
    focalSolved,
    imageWidth,
    imageHeight,
    rectWidthIn,
    rectHeightIn,
    r1,
    r2,
    r3,
    t,
  };
}

/** Wall point (inches; Z toward/into the wall) → image pixel. */
export function wallToPixel(pose: WallPose, X: number, Y: number, Z = 0): Vec2 {
  const p: Vec3 = [
    pose.r1[0] * X + pose.r2[0] * Y + pose.r3[0] * Z + pose.t[0],
    pose.r1[1] * X + pose.r2[1] * Y + pose.r3[1] * Z + pose.t[1],
    pose.r1[2] * X + pose.r2[2] * Y + pose.r3[2] * Z + pose.t[2],
  ];
  return {
    x: (pose.focal * p[0]) / p[2] + pose.imageWidth / 2,
    y: (pose.focal * p[1]) / p[2] + pose.imageHeight / 2,
  };
}

/** Image pixel → wall point (inches) by intersecting its ray with the wall. */
export function pixelToWall(
  pose: WallPose,
  px: number,
  py: number,
): Vec2 | null {
  const d: Vec3 = [
    (px - pose.imageWidth / 2) / pose.focal,
    (py - pose.imageHeight / 2) / pose.focal,
    1,
  ];
  const den = dot(pose.r3, d);
  if (Math.abs(den) < WALL_POSE_CONFIG.minPerspectiveTerm) return null;
  const s = dot(pose.r3, pose.t) / den;
  if (s <= 0) return null;
  const rel = sub(scale(d, s), pose.t);
  return { x: dot(pose.r1, rel), y: dot(pose.r2, rel) };
}

/** Vertical field of view (degrees) of the photo's camera. */
export function verticalFovDeg(pose: WallPose): number {
  return (2 * Math.atan(pose.imageHeight / 2 / pose.focal) * 180) / Math.PI;
}

/**
 * Camera world transform for an ART-CENTRIC scene: the art sits at the
 * origin exactly as in /viewer (x right, y up, z out of the wall, 1 unit =
 * `inchesPerUnit` inches) with the wall surface at z = `wallZ`, and its
 * centre is at wall point (centerX, centerY) inches. Returns the camera's
 * world position and its rotation basis columns (three.js camera looks
 * down −z with y up).
 */
export function artCentricCamera(
  pose: WallPose,
  centerX: number,
  centerY: number,
  wallZ: number,
  inchesPerUnit: number,
): { position: Vec3; basis: [Vec3, Vec3, Vec3] } {
  // art (x,y,z) → wall (X,Y,Z) = C + u·(x, −y, −z),  C = (cx, cy, u·wallZ)
  // OpenCV cam = R·wall + t;  three cam = F·cv,  F = diag(1,−1,−1)
  // ⇒ three cam (units) = F R D a + F (R C + t)/u,  D = diag(1,−1,−1)
  const { r1, r2, r3, t } = pose;
  const C: Vec3 = [centerX, centerY, inchesPerUnit * wallZ];
  const RC: Vec3 = [
    r1[0] * C[0] + r2[0] * C[1] + r3[0] * C[2] + t[0],
    r1[1] * C[0] + r2[1] * C[1] + r3[1] * C[2] + t[1],
    r1[2] * C[0] + r2[2] * C[1] + r3[2] * C[2] + t[2],
  ];
  const tv: Vec3 = [
    RC[0] / inchesPerUnit,
    -RC[1] / inchesPerUnit,
    -RC[2] / inchesPerUnit,
  ];
  // Columns of Rv = F R D: F·r1, −F·r2, −F·r3
  const F = (v: Vec3): Vec3 => [v[0], -v[1], -v[2]];
  const c1 = F(r1);
  const c2 = scale(F(r2), -1);
  const c3 = scale(F(r3), -1);
  // Camera world rotation = Rvᵀ → its columns are the ROWS of Rv.
  const row = (i: number): Vec3 => [c1[i], c2[i], c3[i]];
  const basis: [Vec3, Vec3, Vec3] = [row(0), row(1), row(2)];
  // position = −Rvᵀ tv
  const position: Vec3 = [
    -(c1[0] * tv[0] + c1[1] * tv[1] + c1[2] * tv[2]),
    -(c2[0] * tv[0] + c2[1] * tv[1] + c2[2] * tv[2]),
    -(c3[0] * tv[0] + c3[1] * tv[1] + c3[2] * tv[2]),
  ];
  return { position, basis };
}
