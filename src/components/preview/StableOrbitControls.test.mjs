import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { dirname, extname, resolve as resolvePath } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PerspectiveCamera, TOUCH } from "three";

const require = createRequire(import.meta.url);
const { transformSync } = require("next/dist/build/swc");
const TEST_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolvePath(TEST_DIRECTORY, "..", "..", "..");
const PROJECT_FILE_EXTENSIONS = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  "/index.ts",
  "/index.tsx",
  "/index.js",
];
const TYPESCRIPT_EXTENSIONS = new Set([".ts", ".tsx"]);

const CANVAS_SIZE_PX = 800;
const INITIAL_CAMERA_DISTANCE = 10;
const FIRST_POINTER_START_X_PX = 100;
const FIRST_POINTER_DRAG_X_PX = 300;
const SECOND_POINTER_START_X_PX = 150;
const SECOND_POINTER_MOVE_X_PX = 151;
const RESUMED_ROTATION_X_PX = 340;
const POINTER_Y_PX = 100;
const MAX_PINCH_DISTANCE_CHANGE_RATIO = 0.05;
const MIN_RESUMED_ROTATION_RADIANS = 0.01;
const TOUCH_ZOOM_SPEED = 1.875;

const resolveProjectFile = (basePath) =>
  PROJECT_FILE_EXTENSIONS.map((suffix) => `${basePath}${suffix}`).find(
    (candidate) => existsSync(candidate),
  );

registerHooks({
  resolve(specifier, context, nextResolve) {
    let basePath;
    if (specifier.startsWith("@/")) {
      basePath = resolvePath(PROJECT_ROOT, "src", specifier.slice(2));
    } else if (
      specifier.startsWith(".") &&
      context.parentURL?.startsWith("file:")
    ) {
      basePath = resolvePath(
        dirname(fileURLToPath(context.parentURL)),
        specifier,
      );
    }

    const projectFile = basePath ? resolveProjectFile(basePath) : undefined;
    return projectFile
      ? {
          url: pathToFileURL(projectFile).href,
          shortCircuit: true,
        }
      : nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    const filename = url.startsWith("file:") ? fileURLToPath(url) : "";
    if (!TYPESCRIPT_EXTENSIONS.has(extname(filename))) {
      return nextLoad(url, context);
    }

    const result = transformSync(readFileSync(filename, "utf8"), {
      filename,
      jsc: {
        parser: {
          syntax: "typescript",
          tsx: filename.endsWith(".tsx"),
        },
        transform: { react: { runtime: "automatic" } },
        target: "es2022",
      },
      module: { type: "es6" },
      sourceMaps: false,
    });
    return {
      format: "module",
      source: result.code,
      shortCircuit: true,
    };
  },
});

class PointerTarget {
  clientHeight = CANVAS_SIZE_PX;
  clientWidth = CANVAS_SIZE_PX;
  style = {};
  listeners = new Map();

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type, event) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ type, pointerType: "touch", ...event });
    }
  }

  getRootNode() {
    return this;
  }

  releasePointerCapture() {}

  setPointerCapture() {}
}

let createStableOrbitControls;
let moduleLoadError;
try {
  ({ createStableOrbitControls } = await import(
    "./StableOrbitControls.tsx"
  ));
} catch (error) {
  moduleLoadError = error;
}

const pointer = (pointerId, pageX) => ({
  pointerId,
  pageX,
  pageY: POINTER_Y_PX,
});

test("touch transitions do not jump the camera or lock rotation", () => {
  assert.ifError(moduleLoadError);
  assert.equal(typeof createStableOrbitControls, "function");

  const camera = new PerspectiveCamera();
  camera.position.set(0, 0, INITIAL_CAMERA_DISTANCE);
  const target = new PointerTarget();
  const controls = createStableOrbitControls(camera, target);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.zoomSpeed = TOUCH_ZOOM_SPEED;
  controls.touches = {
    ONE: TOUCH.ROTATE,
    TWO: TOUCH.DOLLY_PAN,
  };
  target.dispatch(
    "pointerdown",
    pointer(1, FIRST_POINTER_START_X_PX),
  );
  target.dispatch("pointermove", pointer(1, FIRST_POINTER_DRAG_X_PX));

  const distanceBeforePinch = camera.position.distanceTo(controls.target);
  target.dispatch(
    "pointerdown",
    pointer(2, SECOND_POINTER_START_X_PX),
  );
  target.dispatch("pointermove", pointer(2, SECOND_POINTER_MOVE_X_PX));
  const distanceAfterPinch = camera.position.distanceTo(controls.target);
  const pinchDistanceChangeRatio =
    Math.abs(distanceAfterPinch - distanceBeforePinch) /
    distanceBeforePinch;

  assert.ok(
    pinchDistanceChangeRatio < MAX_PINCH_DISTANCE_CHANGE_RATIO,
    `one-pixel pinch changed distance by ${pinchDistanceChangeRatio}`,
  );

  target.dispatch("pointerup", pointer(2, SECOND_POINTER_MOVE_X_PX));
  const azimuthBeforeResume = controls.getAzimuthalAngle();
  target.dispatch("pointermove", pointer(1, RESUMED_ROTATION_X_PX));
  const resumedRotation = Math.abs(
    controls.getAzimuthalAngle() - azimuthBeforeResume,
  );

  assert.ok(
    resumedRotation > MIN_RESUMED_ROTATION_RADIANS,
    `remaining pointer rotated only ${resumedRotation} radians`,
  );

  controls.dispose();
});

test("both artwork viewers use the shared stable controls", () => {
  const viewerSource = readFileSync(
    resolvePath(PROJECT_ROOT, "src/app/viewer/page.tsx"),
    "utf8",
  );
  const sharedSource = readFileSync(
    resolvePath(
      PROJECT_ROOT,
      "src/components/preview/GalleryArtScene.tsx",
    ),
    "utf8",
  );

  for (const source of [viewerSource, sharedSource]) {
    assert.match(source, /StableOrbitControls/);
    assert.doesNotMatch(
      source,
      /import\s*\{\s*OrbitControls\s*\}\s*from\s*["']@react-three\/drei["']/,
    );
  }
});
