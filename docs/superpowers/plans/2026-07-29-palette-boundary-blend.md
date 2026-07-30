# Palette Boundary Blend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict Palette Blend to the lines immediately touching each color boundary and show its slider inline whenever Palette is selected.

**Architecture:** `generateColorMap` will retain its solid-band allocation, then use boundary-only paired swaps whose density is driven by the percentage. `PatternControls` will replace its context-menu popover with a conditional inline control matching Scatter's presentation.

**Tech Stack:** Next.js 16, React 19, Zustand, Radix Slider, Node test runner

## Global Constraints

- A Palette color may cross its boundary by no more than one column or row.
- Palette Blend preserves exact per-color square counts.
- The percentage changes boundary mixing density, never transition depth.
- Scatter behavior remains unchanged.
- Existing unrelated workspace changes must be preserved.
- Do not commit or push unless the user explicitly asks.

---

### Task 1: Lock the boundary-only blend behavior

**Files:**
- Create: `src/components/preview/patternUtils.paletteBlend.test.mjs`
- Modify: `src/components/preview/patternUtils.ts`
- Modify: `src/lib/paletteBlend.ts`

**Interfaces:**
- Consumes: `generateColorMap(..., paletteBlend)` and `PALETTE_BLEND_CONFIG`
- Produces: Palette maps whose swapped colors occur only in the two lines immediately touching each original boundary

- [x] **Step 1: Write the failing regression tests**

Create literal two-color fixtures and call `generateColorMap` for horizontal, vertical, and reversed Palette maps. Assert:

```js
assert.deepEqual(hardHorizontal.map((column) => [...new Set(column)]), [
  [0],
  [0],
  [0],
  [1],
  [1],
  [1],
]);

assert.equal(countColor(blendedHorizontal, 0), countColor(hardHorizontal, 0));
assert.equal(countColor(blendedHorizontal, 1), countColor(hardHorizontal, 1));
assert.deepEqual([...new Set(blendedHorizontal[0])], [0]);
assert.deepEqual([...new Set(blendedHorizontal[1])], [0]);
assert.deepEqual([...new Set(blendedHorizontal[4])], [1]);
assert.deepEqual([...new Set(blendedHorizontal[5])], [1]);
assert.ok(new Set(blendedHorizontal[2]).size > 1);
assert.ok(new Set(blendedHorizontal[3]).size > 1);
```

For vertical output, transpose the same expectation so only rows adjacent to the boundary may be mixed. For reversed output, assert the solid outer lines contain the reversed colors and only the two central lines mix.

- [x] **Step 2: Run the focused test and verify red**

```bash
node --no-warnings --test src/components/preview/patternUtils.paletteBlend.test.mjs
```

Expected: failures show the current score-noise algorithm places colors outside the boundary-adjacent lines.

- [x] **Step 3: Implement the minimal boundary-only algorithm**

Replace the global noisy-position redistribution call in the Palette branch with `blendSolidSeams`. Keep `targetDepth` fixed to the named single-line depth and map the normalized percentage only to `swapFraction`. Remove transition-width constants and helpers that become unused.

- [x] **Step 4: Re-run the focused test and verify green**

Run the Task 1 command. Expected: every assertion passes with zero warnings or failures.

### Task 2: Expose Palette Blend inline

**Files:**
- Modify: `src/components/preview/PatternControls.test.mjs`
- Modify: `src/components/preview/PatternControls.tsx`

**Interfaces:**
- Consumes: `colorPattern`, `paletteBlend`, `setPaletteBlend`, and `PALETTE_BLEND_CONFIG`
- Produces: an inline Palette-only slider with accessible name `Palette blend amount`

- [x] **Step 1: Write the failing component tests**

Set the Zustand store to `colorPattern: "fade"`, render `PatternControls`, and assert the markup contains `Palette blend`, `Palette blend amount`, `Straight lines`, and `More blended`, but not `Right-click to adjust the color blend`.

Then set `colorPattern: "scatter"`, render again, and assert Scatter Width and Scatter Amount remain present while Palette blend amount is absent. Restore the original store fields after the test.

- [x] **Step 2: Run the component test and verify red**

```bash
node --no-warnings --test src/components/preview/PatternControls.test.mjs
```

Expected: the inline Palette assertions fail because the control is still rendered through a closed popover.

- [x] **Step 3: Implement the inline control**

Remove local popover state, context-menu constants, context-menu handlers, popover imports, and `SlidersHorizontal`. Keep the percentage beside the Palette pattern label. Below the pattern list, conditionally render:

```tsx
{colorPattern === "fade" && (
  <div className="space-y-3 border-t border-white/10 pt-3">
    <div className="flex items-center justify-between">
      <Label className="text-xs text-gray-400">Palette Blend</Label>
      <span className="font-mono text-xs text-gray-300">{paletteBlend}%</span>
    </div>
    <Slider
      aria-label="Palette blend amount"
      value={[paletteBlend]}
      min={PALETTE_BLEND_CONFIG.minPercent}
      max={PALETTE_BLEND_CONFIG.maxPercent}
      step={PALETTE_BLEND_CONFIG.stepPercent}
      onValueChange={(value) => setPaletteBlend(value[0])}
    />
    <div className="flex justify-between text-[0.62rem] text-gray-500">
      <span>Straight lines</span>
      <span>More blended</span>
    </div>
  </div>
)}
```

- [x] **Step 4: Re-run the component test and verify green**

Run the Task 2 command. Expected: every assertion passes.

### Task 3: Verify the complete change

**Files:**
- Modify: `docs/superpowers/plans/2026-07-29-palette-boundary-blend.md`

- [x] **Step 1: Run focused tests together**

```bash
node --no-warnings --test \
  src/components/preview/patternUtils.paletteBlend.test.mjs \
  src/components/preview/PatternControls.test.mjs
```

Expected: zero failures.

- [x] **Step 2: Run the full test suite**

```bash
node --no-warnings --test $(rg --files -g '*.test.mjs' | sort)
```

Expected: zero failures.

- [x] **Step 3: Type-check and inspect whitespace**

```bash
npx tsc --noEmit
git diff --check
```

Expected: both commands exit zero.

- [x] **Step 4: Build the production app**

```bash
npm run build
```

Expected: the Next.js production build exits zero.

- [x] **Step 5: Review repository scope**

Inspect `git status --short` and the focused diff. Confirm only the Palette Blend implementation, its tests, and its documentation were added to the pre-existing dirty worktree. Do not commit or push.
