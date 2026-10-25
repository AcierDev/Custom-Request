import assert from "node:assert/strict";
import test from "node:test";
import {
  fillSmallHoles,
  floodSelect,
  isolateTappedRegion,
  kMeansLab,
  rgbaToLab,
} from "./floodSelect.ts";

const W = 40;
const H = 30;
const TOLERANCE = 20;

// Light wall with a dark-teal "sofa" block (x 10..29, y 15..29) whose top
// half is shaded a little darker, plus an unconnected teal patch top-left.
function scene() {
  const px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      let c = [214, 210, 200];
      if (x >= 10 && x < 30 && y >= 15)
        c = y < 22 ? [28, 58, 66] : [36, 70, 78];
      if (x < 4 && y < 4) c = [36, 70, 78];
      px.set([...c, 255], i);
    }
  }
  return px;
}

test("selects the whole shaded sofa and nothing else", () => {
  const lab = rgbaToLab(scene());
  const mask = floodSelect(lab, W, H, 20, 25, TOLERANCE);
  let inside = 0;
  let outside = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sofa = x >= 10 && x < 30 && y >= 15;
      if (mask[y * W + x]) sofa ? inside++ : outside++;
    }
  }
  assert.equal(inside, 20 * 15);
  assert.equal(outside, 0, "the unconnected patch stays unselected");
});

test("an out-of-bounds tap selects nothing", () => {
  const mask = floodSelect(rgbaToLab(scene()), W, H, -5, 3, TOLERANCE);
  assert.equal(
    mask.reduce((s, v) => s + v, 0),
    0,
  );
});

test("thin bridges to the surroundings are cut", () => {
  const w = 60;
  const h = 30;
  const sel = new Uint8Array(w * h);
  const fill = (x0, y0, x1, y1) => {
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) sel[y * w + x] = 1;
  };
  fill(5, 5, 25, 25); // sofa
  fill(25, 14, 35, 16); // 2px pole
  fill(35, 5, 55, 25); // shelf niche
  const out = isolateTappedRegion(sel, w, h, 15, 15, 2);
  assert.equal(out[15 * w + 15], 1);
  assert.equal(out[15 * w + 45], 0, "niche dropped");
  assert.equal(out[15 * w + 30], 0, "pole dropped");
  assert.equal(out[5 * w + 5], 1, "sofa corner kept");
});

test("known wall colours stop a low-contrast sofa from flooding the wall", () => {
  // Warm-grey wall and a barely-teal sofa: ~6 ΔE apart, like a real photo.
  const w = 40;
  const h = 30;
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sofa = x >= 10 && x < 30 && y >= 15;
      px.set(
        sofa ? [146, 158, 150, 255] : [152, 150, 142, 255],
        (y * w + x) * 4,
      );
    }
  }
  const lab = rgbaToLab(px);
  const wall = kMeansLab(lab.slice(0, 3 * w * 5), 2);
  const loose = floodSelect(lab, w, h, 20, 25, 24);
  const guided = floodSelect(lab, w, h, 20, 25, 24, wall);
  const count = (m) => m.reduce((s, v) => s + v, 0);
  assert.equal(count(loose), w * h, "without the wall model it floods");
  assert.equal(count(guided), 20 * 15, "with it, only the sofa");
  assert.equal(
    count(floodSelect(lab, w, h, 5, 5, 24, wall)),
    0,
    "tapping the wall selects nothing",
  );
});

test("small enclosed holes are filled, the open background is not", () => {
  const w = 20;
  const h = 20;
  const sel = new Uint8Array(w * h);
  for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) sel[y * w + x] = 1;
  sel[10 * w + 10] = 0;
  sel[10 * w + 11] = 0;
  const out = fillSmallHoles(sel, w, h, 4);
  assert.equal(out[10 * w + 10], 1);
  assert.equal(out[0], 0);
});

test("k-means drops minor colours", () => {
  const s = [];
  for (let i = 0; i < 90; i++) s.push(60, 0, 6);
  for (let i = 0; i < 10; i++) s.push(40, -30, 30);
  const c = kMeansLab(new Float32Array(s), 2, 0.15);
  assert.equal(c.length, 3);
  assert.ok(Math.abs(c[0] - 60) < 0.01);
});
