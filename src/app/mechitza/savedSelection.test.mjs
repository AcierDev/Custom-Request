import assert from "node:assert/strict";
import test from "node:test";
import { encodeSolidJpeg } from "../../lib/mechitza/solidJpeg.ts";

import {
  MAX_SAVED_MECHITZA_BYTES,
  mechitzaSelectionFilename,
  parseMechitzaSelection,
  serializeMechitzaSelection,
} from "./savedSelection.ts";

const selection = {
  arrangement: "one",
  finish: "natural",
  film: "linen-marquetry",
  art: "navy",
  people: false,
};

function savedFile(fields = {}) {
  return JSON.stringify({ version: 1, ...selection, ...fields });
}

test("round-trips a standard selection with a descriptive filename", () => {
  const text = serializeMechitzaSelection(selection);
  assert.equal(JSON.parse(text).version, 1);
  assert.deepEqual(parseMechitzaSelection(text), selection);
  assert.equal(
    mechitzaSelectionFilename(selection),
    "Mechitza V10 - One unit - Warm Natural - Linen Marquetry - Midnight Navy.json",
  );
});

test("preserves an uploaded glass image and custom art without using the image path in the filename", () => {
  const custom = {
    ...selection,
    arrangement: "three",
    art: "custom-78a1ff",
    people: true,
    customFilm: { name: "../glass.jpg", data: encodeSolidJpeg("#78a1ff").toString("base64") },
  };
  assert.deepEqual(parseMechitzaSelection(serializeMechitzaSelection(custom)), custom);
  assert.equal(mechitzaSelectionFilename(custom), "Mechitza V10 - Three units - Warm Natural - Custom glass - #78a1ff.json");
});

test("rejects malformed, unsupported, and oversized files before applying the selection", () => {
  assert.throws(() => parseMechitzaSelection("plain text"), /valid Mechitza/);
  assert.throws(() => parseMechitzaSelection("[]"), /valid Mechitza/);
  assert.throws(() => parseMechitzaSelection(savedFile({ version: 2 })), /unsupported version/);
  assert.throws(() => parseMechitzaSelection(" ".repeat(MAX_SAVED_MECHITZA_BYTES + 1)), /too large/);
  for (const fields of [
    { arrangement: "two" }, { finish: "blue" }, { film: "plain" },
    { art: "custom-zzzzzz" }, { people: "false" },
  ]) {
    assert.throws(() => parseMechitzaSelection(savedFile(fields)), /unavailable option/);
  }
});

test("rejects invalid, non-canonical, truncated, and oversized custom glass data", () => {
  const jpeg = encodeSolidJpeg("#78a1ff");
  const validData = jpeg.toString("base64");
  for (const data of [
    "", "data:image/jpeg;base64," + validData, " " + validData, "not base64!!!",
    Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64"),
    jpeg.subarray(0, -2).toString("base64"),
    Buffer.alloc(140_001).toString("base64"),
  ]) {
    assert.throws(() => parseMechitzaSelection(savedFile({ customFilm: { name: "glass.jpg", data } })), /custom glass image/);
  }
  assert.throws(() => parseMechitzaSelection(savedFile({ customFilm: null })), /custom glass image/);
  for (const name of ["", "bad\nname.jpg", "a".repeat(256)]) {
    assert.throws(() => parseMechitzaSelection(savedFile({ customFilm: { name, data: validData } })), /custom glass image/);
  }
});
