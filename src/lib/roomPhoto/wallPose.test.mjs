import assert from "node:assert/strict";
import test from "node:test";
import {
  artCentricCamera,
  orderQuad,
  pixelToWall,
  solveWallPose,
  wallToPixel,
} from "./wallPose.ts";

const IMAGE_W = 3000;
const IMAGE_H = 2000;
const TRUE_FOCAL = 1500;
const RECT_W = 120;
const RECT_H = 96;
const YAW = (30 * Math.PI) / 180;
const PITCH = (8 * Math.PI) / 180;
const INCHES_PER_UNIT = 6;
const WALL_Z = -0.1117;

function truePose() {
  // Wall axes in an OpenCV camera that looks at the wall yawed and pitched.
  const cy = Math.cos(YAW);
  const sy = Math.sin(YAW);
  const cp = Math.cos(PITCH);
  const sp = Math.sin(PITCH);
  const r1 = [cy, 0, sy];
  const r2 = [-sy * sp, cp, cy * sp];
  const r3 = [
    r1[1] * r2[2] - r1[2] * r2[1],
    r1[2] * r2[0] - r1[0] * r2[2],
    r1[0] * r2[1] - r1[1] * r2[0],
  ];
  return {
    focal: TRUE_FOCAL,
    imageWidth: IMAGE_W,
    imageHeight: IMAGE_H,
    r1,
    r2,
    r3,
    t: [-70, -40, 220],
  };
}

const corners = (pose) => [
  wallToPixel(pose, 0, 0),
  wallToPixel(pose, RECT_W, 0),
  wallToPixel(pose, RECT_W, RECT_H),
  wallToPixel(pose, 0, RECT_H),
];

test("recovers focal, aspect and pose from a perspective rectangle", () => {
  const gt = truePose();
  const quad = corners(gt);
  const shuffled = [quad[2], quad[0], quad[3], quad[1]];
  const pose = solveWallPose(shuffled, IMAGE_W, IMAGE_H, { heightIn: RECT_H });
  assert.equal(pose.focalSolved, true);
  assert.ok(Math.abs(pose.focal - TRUE_FOCAL) < 1, `focal ${pose.focal}`);
  assert.ok(Math.abs(pose.rectWidthIn - RECT_W) < 0.05, `w ${pose.rectWidthIn}`);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(pose.t[i] - gt.t[i]) < 0.05);
  const mid = wallToPixel(gt, 37, 51);
  const back = pixelToWall(pose, mid.x, mid.y);
  assert.ok(Math.abs(back.x - 37) < 0.05 && Math.abs(back.y - 51) < 0.05);
});

test("orders an arbitrary point set top-left first, clockwise", () => {
  const q = orderQuad([
    { x: 10, y: 90 },
    { x: 90, y: 10 },
    { x: 10, y: 10 },
    { x: 90, y: 90 },
  ]);
  assert.deepEqual(q, [
    { x: 10, y: 10 },
    { x: 90, y: 10 },
    { x: 90, y: 90 },
    { x: 10, y: 90 },
  ]);
});

test("art-centric camera projects art points onto the same pixels", () => {
  const gt = truePose();
  const pose = solveWallPose(corners(gt), IMAGE_W, IMAGE_H, { heightIn: RECT_H });
  const centerX = 60;
  const centerY = 40;
  const { position, basis } = artCentricCamera(
    pose,
    centerX,
    centerY,
    WALL_Z,
    INCHES_PER_UNIT
  );
  // Art point 2 units right, 1 unit up, on the wall surface.
  const a = [2, 1, WALL_Z];
  const rel = [a[0] - position[0], a[1] - position[1], a[2] - position[2]];
  const cam = basis.map((col) => col[0] * rel[0] + col[1] * rel[1] + col[2] * rel[2]);
  assert.ok(cam[2] < 0, "point in front of a three.js camera");
  const px = (pose.focal * cam[0]) / -cam[2] + IMAGE_W / 2;
  const py = (-pose.focal * cam[1]) / -cam[2] + IMAGE_H / 2;
  const expected = wallToPixel(
    gt,
    centerX + a[0] * INCHES_PER_UNIT,
    centerY - a[1] * INCHES_PER_UNIT
  );
  assert.ok(Math.abs(px - expected.x) < 0.5, `${px} vs ${expected.x}`);
  assert.ok(Math.abs(py - expected.y) < 0.5, `${py} vs ${expected.y}`);
});

test("both real sides solve the focal for a two-point-perspective photo", () => {
  // Pure yaw: the wall's verticals stay parallel in the image.
  const gt = truePose();
  const cy = Math.cos(YAW);
  const sy = Math.sin(YAW);
  const flat = { ...gt, r1: [cy, 0, sy], r2: [0, 1, 0], r3: [-sy, 0, cy] };
  const quad = corners(flat);
  const one = solveWallPose(quad, IMAGE_W, IMAGE_H, { heightIn: RECT_H });
  assert.equal(one.focalSolved, false);
  const both = solveWallPose(quad, IMAGE_W, IMAGE_H, { heightIn: RECT_H, widthIn: RECT_W });
  assert.equal(both.focalSolved, true);
  assert.ok(Math.abs(both.focal - TRUE_FOCAL) / TRUE_FOCAL < 0.02, `focal ${both.focal}`);
  assert.ok(Math.abs(both.rectWidthIn - RECT_W) < 1.5);
});
