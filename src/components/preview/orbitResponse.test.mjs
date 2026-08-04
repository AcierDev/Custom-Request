import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";

let RESPONSIVE_ORBIT_SETTINGS;

try {
  ({ RESPONSIVE_ORBIT_SETTINGS } = await import("./orbitResponse.ts"));
} catch (error) {
  const missingTargetModule =
    error?.code === "ERR_MODULE_NOT_FOUND" &&
    error?.url?.endsWith("/orbitResponse.ts");
  if (!missingTargetModule) throw error;
}

const CAMERA_DISTANCE = 10;
const VIEWPORT_HEIGHT_PX = 1000;
const HORIZONTAL_DRAG_PX = 100;
const EXPECTED_DEFAULT_AZIMUTH = -Math.PI / 5;
const EXPECTED_FIRST_DAMPED_AZIMUTH = -Math.PI / 50;
const SETTLING_UPDATE_COUNT = 100;
const ANGLE_EPSILON = 1e-9;
const SETTLED_ANGLE_EPSILON = 0.0001;

class TestEventTarget {
  constructor() {
    this.listeners = new Map();
    this.ownerDocument = this;
    this.style = {};
    this.clientHeight = VIEWPORT_HEIGHT_PX;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type, event) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  releasePointerCapture() {}
}

function createConfiguredControls() {
  assert.equal(
    typeof RESPONSIVE_ORBIT_SETTINGS,
    "object",
    "the viewer must provide its OrbitControls response policy",
  );

  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 0, CAMERA_DISTANCE);
  const controls = new OrbitControls(camera);
  Object.assign(controls, RESPONSIVE_ORBIT_SETTINGS);
  const element = new TestEventTarget();
  controls.connect(element);
  controls.update();
  return { controls, element };
}

function dragHorizontally(element) {
  const pointer = {
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    clientX: 0,
    clientY: 0,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
  };
  element.dispatch("pointerdown", pointer);
  element.dispatch("pointermove", {
    ...pointer,
    clientX: HORIZONTAL_DRAG_PX,
  });
  element.dispatch("pointerup", pointer);
}

test("horizontal drag retains default sensitivity after damping settles", () => {
  const { controls, element } = createConfiguredControls();

  dragHorizontally(element);
  for (let update = 0; update < SETTLING_UPDATE_COUNT; update += 1) {
    controls.update();
  }

  assert.ok(
    Math.abs(controls.getAzimuthalAngle() - EXPECTED_DEFAULT_AZIMUTH) <
      SETTLED_ANGLE_EPSILON,
  );
  controls.dispose();
});

test("orbit applies 10% of pending rotation per update", () => {
  const { controls, element } = createConfiguredControls();

  dragHorizontally(element);

  assert.ok(
    Math.abs(
      controls.getAzimuthalAngle() - EXPECTED_FIRST_DAMPED_AZIMUTH,
    ) < ANGLE_EPSILON,
    "the first update should apply exactly 10% of the drag rotation",
  );
  controls.dispose();
});
