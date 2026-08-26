import assert from "node:assert/strict";
import test from "node:test";

test("viewer chrome stays translucent enough to read as liquid glass", async () => {
  const {
    VIEWER_GLASS_ACTION_CLASS,
    VIEWER_GLASS_HEADER_CLASS,
    VIEWER_GLASS_SHEET_CLASS,
    VIEWER_GLASS_SURFACE_CLASS,
  } = await import("./viewerGlass.ts");

  assert.match(VIEWER_GLASS_SURFACE_CLASS, /rgba\(40,48,64,0\.58\)/);
  assert.match(VIEWER_GLASS_SURFACE_CLASS, /backdrop-blur-\[28px\]/);
  assert.match(VIEWER_GLASS_SHEET_CLASS, /rgba\(35,43,58,0\.68\)/);
  assert.match(VIEWER_GLASS_HEADER_CLASS, /rgba\(255,255,255,0\.13\)/);
  assert.match(VIEWER_GLASS_ACTION_CLASS, /bg-white\/\[0\.10\]/);
  assert.doesNotMatch(
    [
      VIEWER_GLASS_SURFACE_CLASS,
      VIEWER_GLASS_SHEET_CLASS,
      VIEWER_GLASS_HEADER_CLASS,
      VIEWER_GLASS_ACTION_CLASS,
    ].join(" "),
    /rgba\([^)]*,0\.9[0-9]\)/,
  );
});
