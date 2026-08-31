import assert from "node:assert/strict";
import test from "node:test";

let copyPaletteHex;
let createPaletteCopyHandlers;
let moduleLoadError;

try {
  ({ copyPaletteHex, createPaletteCopyHandlers } = await import(
    "./paletteClipboard.ts"
  ));
} catch (error) {
  moduleLoadError = error;
}

class MemoryClipboard {
  text = null;

  async writeText(text) {
    this.text = text;
  }
}

test("palette hex copy writes the normalized uppercase hex", async () => {
  assert.ifError(moduleLoadError);
  const clipboard = new MemoryClipboard();

  const copied = await copyPaletteHex("#1a2b3c", clipboard);

  assert.equal(copied, true);
  assert.equal(clipboard.text, "#1A2B3C");
});

test("palette hex copy reports unavailable or rejected clipboard writes", async () => {
  assert.ifError(moduleLoadError);
  const rejectedClipboard = {
    async writeText() {
      throw new Error("Clipboard permission denied");
    },
  };

  assert.equal(await copyPaletteHex("#ABCDEF", undefined), false);
  assert.equal(await copyPaletteHex("#ABCDEF", rejectedClipboard), false);
});

test("palette copy handlers copy on hover and click", () => {
  assert.ifError(moduleLoadError);
  const copiedHexes = [];
  const handlers = createPaletteCopyHandlers("#123456", (hex) => {
    copiedHexes.push(hex);
  });

  handlers.onMouseEnter();
  handlers.onClick();

  assert.deepEqual(copiedHexes, ["#123456", "#123456"]);
});
