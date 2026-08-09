# Palette Viewer Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reset viewer state to its initial defaults whenever the user starts or opens a different palette.

**Architecture:** Keep the behavior in the Zustand store, where every palette boundary already converges. A fresh-state factory supplies the same defaults to store initialization and palette actions; palette-specific colors and metadata are applied after the defaults. Explicit saved viewer versions continue to restore their own state.

**Tech Stack:** TypeScript, Zustand, Node test runner, Next.js SWC test transform.

## Global Constraints

- Use named constants for every numeric value.
- Preserve unrelated worktree changes.
- Do not commit or push without explicit user instruction.
- Keep `/viewer` and `/shared/[id]` behavior synchronized through shared store state.

---

### Task 1: Palette-Boundary Viewer Reset

**Files:**
- Create: `src/store/customStore.paletteViewerReset.test.mjs`
- Modify: `src/store/customStore.ts`

**Interfaces:**
- Produces: `createDefaultViewerState(): PaletteViewerState`, a fresh reset patch internal to `customStore.ts`.
- Consumes: existing store defaults, `resetPaletteEditor`, `applyPalette`, `applyPaletteVersion`, `loadPaletteForEditing`, `loadOfficialPalette`, and `setSelectedDesign`.

- [x] **Step 1: Write the failing store regression tests**

Use the existing SWC `registerHooks` harness. Define named fixtures for dirty viewer state, default viewer state, a saved palette, and a saved viewer version. Assert that each palette-boundary action, including direct built-in design selection, resets dimensions, pattern/orientation/rotation, scatter/blend, room/material/panel values, drawn-pattern state, and transient pattern-editor state while loading the requested colors. Assert separately that reselecting the active design keeps its settings and `applyViewerVersion` restores its saved non-default values.

```js
for (const { name, act, expectedColors } of PALETTE_BOUNDARY_CASES) {
  test(`${name} resets viewer settings`, () => {
    useCustomStore.setState(createDirtyState());
    act(useCustomStore.getState());
    assert.deepEqual(selectViewerState(), DEFAULT_VIEWER_STATE);
    assert.deepEqual(selectColors(), expectedColors);
  });
}
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --no-warnings --test src/store/customStore.paletteViewerReset.test.mjs`

Expected: assertions fail because palette actions retain the dirty viewer values.

- [x] **Step 3: Add a typed fresh-default factory**

Define the viewer-state key union and factory beside the store state types. Reuse named defaults already present in the file and introduce named constants for initial dimensions, pattern, orientation, style, and view settings.

```ts
type PaletteViewerState = Pick<
  CustomState,
  | "dimensions"
  | "colorPattern"
  | "orientation"
  | "isReversed"
  | "isRotated"
  | "style"
  | "useMini"
  | "viewSettings"
  | "scatterEase"
  | "scatterWidth"
  | "scatterAmount"
  | "paletteBlend"
  | "drawnPatternGrid"
  | "drawnPatternGridSize"
  | "activeCustomMode"
  | "patternOverride"
  | "patternDirectionOverride"
  | "patternHiddenOverride"
  | "patternEditingMode"
  | "patternBrush"
  | "isPatternEditorActive"
  | "isPatternColorReplaceActive"
  | "renderedPatternColorIndexes"
  | "patternUndoStack"
  | "patternRedoStack"
>;

const createDefaultViewerState = (): PaletteViewerState => ({
  dimensions: { ...DEFAULT_DIMENSIONS },
  colorPattern: DEFAULT_COLOR_PATTERN,
  orientation: DEFAULT_ORIENTATION,
  isReversed: false,
  isRotated: false,
  style: DEFAULT_STYLE,
  useMini: DEFAULT_USE_MINI,
  viewSettings: createDefaultViewSettings(),
  scatterEase: DEFAULT_SCATTER_EASE,
  scatterWidth: DEFAULT_SCATTER_WIDTH,
  scatterAmount: DEFAULT_SCATTER_AMOUNT,
  paletteBlend: PALETTE_BLEND_CONFIG.defaultPercent,
  drawnPatternGrid: null,
  drawnPatternGridSize: null,
  activeCustomMode: "palette",
  patternOverride: {},
  patternDirectionOverride: {},
  patternHiddenOverride: {},
  patternEditingMode: { tool: "none" },
  patternBrush: {
    shape: "single",
    sizes: {
      square: PATTERN_BRUSH_SIZE_CONFIG.default,
      circle: PATTERN_BRUSH_SIZE_CONFIG.default,
    },
  },
  isPatternEditorActive: false,
  isPatternColorReplaceActive: false,
  renderedPatternColorIndexes: {},
  patternUndoStack: [],
  patternRedoStack: [],
});
```

- [x] **Step 4: Use the factory at every palette boundary**

Spread `createDefaultViewerState()` into initial store state and into `resetPaletteEditor`, `applyPalette`, `applyPaletteVersion`, `loadPaletteForEditing`, and `loadOfficialPalette`. Apply it conditionally in `setSelectedDesign` only when the design changes. Spread palette-specific fields afterward so requested colors, saved piece size, recency, and saved square overrides remain intact. Do not add it to `applyViewerVersion`.

- [x] **Step 5: Run the focused test and verify GREEN**

Run: `node --no-warnings --test src/store/customStore.paletteViewerReset.test.mjs`

Expected: all palette-boundary and explicit-viewer-version cases pass.

### Task 2: Full Verification

**Files:**
- Verify: `src/store/customStore.ts`
- Verify: `src/store/customStore.paletteViewerReset.test.mjs`

**Interfaces:**
- Consumes: completed reset behavior from Task 1.
- Produces: verification evidence only.

- [x] **Step 1: Run the full test suite**

Run: `node --no-warnings --test $(rg --files -g '*.test.mjs' src scripts | sort)`

Expected: every test passes.

- [x] **Step 2: Run static and production checks**

Run: `npx tsc --noEmit`

Run: `npm run build`

Run: `git diff --check`

Expected: every command exits successfully.

- [x] **Step 3: Review the final diff**

Run: `git diff -- src/store/customStore.ts src/store/customStore.paletteViewerReset.test.mjs docs/superpowers/specs/2026-08-07-palette-viewer-reset-design.md docs/superpowers/plans/2026-08-07-palette-viewer-reset.md`

Expected: only the centralized reset, regression coverage, and supporting documentation are present.
