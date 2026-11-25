import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_FILM_CROP, panFilmCrop, resolveFilmCrop } from "./customFilm.ts";

test("the crop fills the wide glass frame with the largest centered selection", () => {
  const portrait = resolveFilmCrop(1536, 2000, DEFAULT_FILM_CROP);
  assert.deepEqual(portrait, { x: 0, y: 634.5, width: 1536, height: 731 });
  const landscape = resolveFilmCrop(3072, 731, DEFAULT_FILM_CROP);
  assert.deepEqual(landscape, { x: 768, y: 0, width: 1536, height: 731 });
});

test("zoom preserves the crop center, while dragging clamps the source to the image edges", () => {
  const zoomed = { x: 0.5, y: 0.5, zoom: 2 };
  assert.deepEqual(resolveFilmCrop(1536, 731, zoomed), {
    x: 384, y: 182.75, width: 768, height: 365.5,
  });
  const dragged = panFilmCrop(1536, 731, zoomed, 1, -1);
  assert.deepEqual(dragged, { x: 0.25, y: 0.75, zoom: 2 });
  assert.deepEqual(resolveFilmCrop(1536, 731, dragged), {
    x: 0, y: 365.5, width: 768, height: 365.5,
  });
});
