import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { strFromU8, unzipSync } from "fflate";
import {
  buildFusionPackage,
  createFusionManifest,
} from "./fusionPackage.ts";

const EXPORTED_AT_ISO = "2026-07-28T16:07:06.000Z";
const FILENAME_STAMP = "2026-07-28-0907";
const STEP_FILENAME = `everwood-art-${FILENAME_STAMP}.step`;
const PACKAGE_FILENAME =
  `everwood-art-fusion-${FILENAME_STAMP}.zip`;
const STEP_DESCRIPTION =
  "Editable Everwood Art model exported from the Viewer";
const STEP_CONTENT = "ISO-10303-21;END-ISO-10303-21;";
const RED_COLOR = "#AA0000";
const BLUE_COLOR = "#0000AA";
const BACKBOARD_COLOR = "#8A6A4A";
const RED_TEXTURE = "textures/grain-red-01.png";
const PLYWOOD_TEXTURE = "textures/plywood.png";
const UTF8_ENCODING = "utf8";
const PYTHON_EXECUTABLE = "python3";

const makeSquare = ({
  color,
  hidden = false,
  x = 0,
  grainIndex = 0,
}) => ({
  x,
  y: 0,
  color,
  hidden,
  px: x,
  py: 0,
  pz: 0.25,
  baseX: x,
  driftDir: 0,
  rotationZ: 0,
  scaleXY: 0.5,
  scaleZ: 0.5,
  physicalScale: 0.5,
  grainIndex,
});

const snapshot = {
  instances: [
    makeSquare({ color: RED_COLOR, grainIndex: 1 }),
    makeSquare({ color: BLUE_COLOR, x: 0.5, grainIndex: 2 }),
    makeSquare({
      color: "#00AA00",
      hidden: true,
      x: 1,
      grainIndex: 3,
    }),
  ],
  backboardBodies: [
    {
      id: "backboard",
      columnCount: 2,
      baseCenter: [0.25, 0, -0.035],
      center: [0.25, 0, -0.035],
      size: [1, 0.5, 0.07],
      panelOffsetMultiplier: 0,
    },
  ],
  squareGapInches: 0,
  panelCount: 1,
  panelSpacingInches: 0,
  orientationRotationZ: 0,
  totalWidth: 1,
  totalHeight: 0.5,
  squareSize: 0.5,
  useMini: false,
  showWoodGrain: true,
  backboardColor: BACKBOARD_COLOR,
  updatedAt: 1,
};

const stepFile = {
  filename: STEP_FILENAME,
  filenameStamp: FILENAME_STAMP,
  description: STEP_DESCRIPTION,
  exportedAtIso: EXPORTED_AT_ISO,
  buffer: new TextEncoder().encode(STEP_CONTENT).buffer,
};

const textureBuild = {
  assets: [
    {
      filename: RED_TEXTURE,
      bytes: new Uint8Array([1, 2, 3]),
    },
    {
      filename: PLYWOOD_TEXTURE,
      bytes: new Uint8Array([4, 5, 6]),
    },
  ],
  backboardTextureFilename: PLYWOOD_TEXTURE,
  squareTextureFilenames: [RED_TEXTURE, RED_TEXTURE],
};

test("maps only visible STEP components to their Fusion appearances", () => {
  const manifest = createFusionManifest(
    snapshot,
    stepFile,
    textureBuild,
  );

  assert.equal(manifest.description, STEP_DESCRIPTION);
  assert.equal(manifest.exportedAtIso, EXPORTED_AT_ISO);
  assert.equal(manifest.stepFilename, STEP_FILENAME);
  assert.deepEqual(manifest.backboard, {
    componentName: "Backboard",
    colorHex: BACKBOARD_COLOR,
    textureFilename: PLYWOOD_TEXTURE,
  });
  assert.deepEqual(manifest.squares, [
    {
      componentName: "Square 001",
      colorHex: RED_COLOR,
      textureFilename: RED_TEXTURE,
    },
    {
      componentName: "Square 002",
      colorHex: BLUE_COLOR,
      textureFilename: RED_TEXTURE,
    },
  ]);
});

test("builds one complete dated Fusion ZIP without duplicate assets", () => {
  const packageResult = buildFusionPackage({
    snapshot,
    stepFile,
    textures: textureBuild,
  });
  const entries = unzipSync(packageResult.bytes);

  assert.equal(packageResult.filename, PACKAGE_FILENAME);
  assert.deepEqual(Object.keys(entries).sort(), [
    "EverwoodAppearance/EverwoodAppearance.manifest",
    "EverwoodAppearance/EverwoodAppearance.py",
    "EverwoodAppearance/design-manifest.json",
    "EverwoodAppearance/textures/grain-red-01.png",
    "EverwoodAppearance/textures/plywood.png",
    "README.txt",
    STEP_FILENAME,
  ]);
  assert.equal(
    strFromU8(entries[STEP_FILENAME]),
    STEP_CONTENT,
  );

  const manifest = JSON.parse(
    strFromU8(
      entries["EverwoodAppearance/design-manifest.json"],
    ),
  );
  assert.equal(manifest.squares.length, 2);
  assert.equal(manifest.squares[0].componentName, "Square 001");
  assert.equal(
    strFromU8(entries["README.txt"]).includes("Scripts and Add-Ins"),
    true,
  );
});

test("ships a Fusion Python script that parses successfully", async () => {
  const packageResult = buildFusionPackage({
    snapshot,
    stepFile,
    textures: textureBuild,
  });
  const entries = unzipSync(packageResult.bytes);
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "everwood-fusion-script-"),
  );
  const scriptPath = join(temporaryDirectory, "EverwoodAppearance.py");

  try {
    await writeFile(
      scriptPath,
      strFromU8(entries["EverwoodAppearance/EverwoodAppearance.py"]),
      UTF8_ENCODING,
    );
    execFileSync(PYTHON_EXECUTABLE, [
      "-m",
      "py_compile",
      scriptPath,
    ]);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("rejects texture mappings that do not match visible squares", () => {
  assert.throws(
    () =>
      createFusionManifest(snapshot, stepFile, {
        ...textureBuild,
        squareTextureFilenames: [RED_TEXTURE],
      }),
    /visible square count/i,
  );
});
