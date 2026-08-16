import assert from "node:assert/strict";
import test from "node:test";

const MOBILE_VIEWPORT_WIDTH_PX = 390;
const MOBILE_BREAKPOINT_PX = 1024;
const DESKTOP_VIEWPORT_WIDTH_PX = 1440;

let applyInitialRoomViewDefault;
let resolveHydratedRoomView;
let moduleLoadError;
try {
  ({ applyInitialRoomViewDefault } = await import(
    "./useInitialRoomViewDefault.ts"
  ));
  ({ resolveHydratedRoomView } = await import(
    "../lib/roomViewDefault.ts"
  ));
} catch (error) {
  moduleLoadError = error;
}

const assertHelperLoaded = () => {
  assert.ifError(moduleLoadError);
  assert.equal(typeof applyInitialRoomViewDefault, "function");
  assert.equal(typeof resolveHydratedRoomView, "function");
};

test("starts Room View off for an initial mobile viewport", () => {
  assertHelperLoaded();
  const values = [];

  applyInitialRoomViewDefault(MOBILE_VIEWPORT_WIDTH_PX, (value) => {
    values.push(value);
  });

  assert.deepEqual(values, [false]);
});

test("preserves Room View at and above the desktop breakpoint", () => {
  assertHelperLoaded();
  const values = [];
  const recordValue = (value) => values.push(value);

  applyInitialRoomViewDefault(MOBILE_BREAKPOINT_PX, recordValue);
  applyInitialRoomViewDefault(DESKTOP_VIEWPORT_WIDTH_PX, recordValue);

  assert.deepEqual(values, []);
});

test("keeps Room View off when saved viewer state hydrates on mobile", () => {
  assertHelperLoaded();

  assert.equal(
    resolveHydratedRoomView({
      persistedShowRoom: true,
      currentShowRoom: true,
      hasUserSelectedRoomView: false,
      viewportWidth: MOBILE_VIEWPORT_WIDTH_PX,
      pathname: "/viewer",
    }),
    false,
  );
  assert.equal(
    resolveHydratedRoomView({
      persistedShowRoom: true,
      currentShowRoom: true,
      hasUserSelectedRoomView: false,
      viewportWidth: MOBILE_BREAKPOINT_PX,
      pathname: "/viewer",
    }),
    true,
  );
  assert.equal(
    resolveHydratedRoomView({
      persistedShowRoom: true,
      currentShowRoom: true,
      hasUserSelectedRoomView: false,
      viewportWidth: MOBILE_VIEWPORT_WIDTH_PX,
      pathname: "/palette",
    }),
    true,
  );
});

test("preserves a later user Room View choice during rehydration", () => {
  assertHelperLoaded();

  assert.equal(
    resolveHydratedRoomView({
      persistedShowRoom: false,
      currentShowRoom: true,
      hasUserSelectedRoomView: true,
      viewportWidth: MOBILE_VIEWPORT_WIDTH_PX,
      pathname: "/viewer",
    }),
    true,
  );
  assert.equal(
    resolveHydratedRoomView({
      persistedShowRoom: true,
      currentShowRoom: false,
      hasUserSelectedRoomView: true,
      viewportWidth: MOBILE_VIEWPORT_WIDTH_PX,
      pathname: "/viewer",
    }),
    false,
  );
});
