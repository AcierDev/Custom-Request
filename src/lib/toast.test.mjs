import assert from "node:assert/strict";
import test from "node:test";

import { toast as sonnerToast } from "sonner";
import { toast } from "./toast.ts";

const PALETTE_PATH = "/palette";
const VIEWER_PATH = "/viewer";
const PALETTE_SUCCESS_MESSAGE = "palette success must stay hidden";
const PALETTE_ERROR_MESSAGE = "palette error must stay visible";
const VIEWER_SUCCESS_MESSAGE = "viewer success must stay visible";
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "window",
);

const setPathname = (pathname) => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { pathname },
    },
  });
};

const hasToast = (message) =>
  sonnerToast
    .getHistory()
    .some(
      (candidate) =>
        "title" in candidate && candidate.title === message,
    );

test.after(() => {
  if (originalWindowDescriptor) {
    Object.defineProperty(
      globalThis,
      "window",
      originalWindowDescriptor,
    );
  } else {
    delete globalThis.window;
  }
});

test("does not enqueue success notifications on the palette page", () => {
  setPathname(PALETTE_PATH);

  toast.success(PALETTE_SUCCESS_MESSAGE);

  assert.equal(hasToast(PALETTE_SUCCESS_MESSAGE), false);
});

test("keeps error notifications on the palette page", () => {
  setPathname(PALETTE_PATH);

  toast.error(PALETTE_ERROR_MESSAGE);

  assert.equal(hasToast(PALETTE_ERROR_MESSAGE), true);
});

test("keeps success notifications outside the palette page", () => {
  setPathname(VIEWER_PATH);

  toast.success(VIEWER_SUCCESS_MESSAGE);

  assert.equal(hasToast(VIEWER_SUCCESS_MESSAGE), true);
});
