# Reverse Palette Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact, undoable palette-editor action that reverses every color in the current palette.

**Architecture:** A small pure helper returns a reversed copy of the palette. `PaletteManager` feeds that result to the existing `setCustomPalette` store action so history, current colors, and pattern color-index remapping continue through the established path.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand, Lucide React, Node test runner

## Global Constraints

- The action is available only when at least two colors exist.
- Preserve every color object and ID; never mutate the source palette.
- Use the existing save and undo workflows.
- Do not commit or push without an explicit user instruction.

---

### Task 1: Reverse-order helper and editor action

**Files:**
- Create: `src/app/palette/components/PaletteManager/paletteOrder.ts`
- Create: `src/app/palette/components/PaletteManager/paletteOrder.test.mjs`
- Modify: `src/app/palette/components/PaletteManager/index.tsx`

**Interfaces:**
- Consumes: `setCustomPalette(palette: CustomColor[]): void`
- Produces: `reversePaletteOrder<T>(palette: readonly T[]): T[]`

- [x] **Step 1: Write the failing helper test**

```js
test("reverses every palette color without mutating the source", () => {
  const first = { id: "first", hex: "#111111" };
  const second = { id: "second", hex: "#222222" };
  const third = { id: "third", hex: "#333333" };
  const palette = [first, second, third];

  const result = reversePaletteOrder(palette);

  assert.deepEqual(result.map(({ id }) => id), ["third", "second", "first"]);
  assert.deepEqual(palette.map(({ id }) => id), ["first", "second", "third"]);
  assert.equal(result[0], third);
  assert.notEqual(result, palette);
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --no-warnings --test src/app/palette/components/PaletteManager/paletteOrder.test.mjs
```

Expected: FAIL because `paletteOrder.ts` does not exist.

- [x] **Step 3: Add the minimal helper**

```ts
export const MINIMUM_REVERSIBLE_COLOR_COUNT = 2;

export function reversePaletteOrder<T>(palette: readonly T[]): T[] {
  return [...palette].reverse();
}
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run the focused command from Step 2. Expected: one passing test.

- [x] **Step 5: Wire the action into `PaletteManager`**

Import `ArrowLeftRight`, `MINIMUM_REVERSIBLE_COLOR_COUNT`, and
`reversePaletteOrder`. Add:

```ts
const handleReversePalette = () => {
  if (customPalette.length < MINIMUM_REVERSIBLE_COLOR_COUNT) return;
  setCustomPalette(reversePaletteOrder(customPalette));
};
```

Render a compact slate `Reverse` button in the header action row. Disable it
below the minimum, set `aria-label="Reverse palette order"`, and wrap it in a
tooltip reading `Reverse all palette colors`.

- [x] **Step 6: Verify integration**

Run:

```bash
npx tsc --noEmit
rg --files -g '*.test.mjs' | sort | xargs node --no-warnings --test
npm run build
git diff --check
```

Start one temporary dev server, open `/palette`, add at least three visibly
different colors, click `Reverse`, and verify the visible order flips. Click
the existing Undo button and verify the original order returns. Stop the
temporary server afterward.
