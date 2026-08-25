# Palette Mix-All and Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an all-colors blend scope to the palette editor, simplify its visual hierarchy, verify the complete workflow, and deploy the verified commit to production.

**Architecture:** A dependency-free generic helper expands adjacent palette pairs and owns count normalization. `PaletteManager` supplies the existing OKLab and hand-mix color factory, then commits the finished palette through the existing `setCustomPalette` history action. A focused `MixControls` component owns the pair/all scope UI, while the palette manager and blending guide receive targeted layout cleanup.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Zustand, Tailwind CSS, Radix/shadcn UI, Framer Motion, Node's built-in test runner.

## Global Constraints

- Preserve all current palette-editor capabilities.
- Blend adjacent colors in current order and keep every original color.
- Do not blend the last color back to the first.
- Support 1–10 colors between each pair, defaulting to 3.
- Keep the existing OKLab blend and hand-mix simulation.
- Record one palette-history entry for the complete all-colors operation.
- Keep **Two colors** as the default and preserve its behavior.
- Keep the existing dark glass-and-gradient visual language.
- Add no runtime or development dependency.
- Do not stage or commit pre-existing unrelated workspace changes.
- Push only after tests, a production build, desktop/mobile browser checks, and clean-commit verification pass.

---

## File Structure

- Create `src/app/palette/components/PaletteManager/paletteWideBlend.ts`: dependency-free count normalization, result-count calculation, and adjacent-pair expansion.
- Create `src/app/palette/components/PaletteManager/paletteWideBlend.test.mjs`: Node tests for ordering, spacing, normalization, and edge cases.
- Create `src/app/palette/components/PaletteManager/MixControls.tsx`: pair/all selector, count slider, result summary, create action, and pair hand-mix preview.
- Modify `src/app/palette/components/PaletteManager/index.tsx`: connect Mix scope behavior, create all-colors blends, and clean the editor hierarchy.
- Modify `src/app/palette/components/PaletteManager/BlendingGuide.tsx`: replace the oversized demo with concise guidance for both scopes.
- Modify `package.json`: add the focused palette-blend test command.
- Keep `src/store/customStore.ts` untouched; use its existing `setCustomPalette`, `addBlendedColors`, and `clearSelectedColors` actions.

---

### Task 1: Palette-Wide Blend Core

**Files:**

- Create: `src/app/palette/components/PaletteManager/paletteWideBlend.test.mjs`
- Create: `src/app/palette/components/PaletteManager/paletteWideBlend.ts`
- Modify: `package.json`

**Interfaces:**

- Produces: `PALETTE_WIDE_BLEND_CONFIG`
- Produces: `normalizeColorsBetween(value: number): number`
- Produces: `getPaletteWideBlendColorCount(paletteColorCount: number, requestedColorsBetween: number): number`
- Produces: `insertBlendsBetweenAll<T>(colors: readonly T[], requestedColorsBetween: number, createBlend: (from: T, to: T, t: number) => T): T[]`

- [ ] **Step 1: Write the failing helper tests**

Create `paletteWideBlend.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  PALETTE_WIDE_BLEND_CONFIG,
  getPaletteWideBlendColorCount,
  insertBlendsBetweenAll,
  normalizeColorsBetween,
} from "./paletteWideBlend.ts";

test("inserts evenly spaced blends between every adjacent pair", () => {
  const colors = [
    { id: "a", hex: "#FF0000" },
    { id: "b", hex: "#00FF00" },
    { id: "c", hex: "#0000FF" },
  ];

  const result = insertBlendsBetweenAll(colors, 2, (from, to, t) => ({
    id: `${from.id}-${to.id}-${t}`,
    hex: "#000000",
    mix: { fromId: from.id, toId: to.id, t },
  }));

  assert.equal(result.length, 7);
  assert.deepEqual(
    result.map((color) => color.id),
    [
      "a",
      "a-b-0.3333333333333333",
      "a-b-0.6666666666666666",
      "b",
      "b-c-0.3333333333333333",
      "b-c-0.6666666666666666",
      "c",
    ],
  );
  assert.deepEqual(result[1].mix, {
    fromId: "a",
    toId: "b",
    t: 1 / 3,
  });
  assert.deepEqual(result[5].mix, {
    fromId: "b",
    toId: "c",
    t: 2 / 3,
  });
});

test("normalizes invalid, fractional, and out-of-range counts", () => {
  assert.equal(
    normalizeColorsBetween(Number.NaN),
    PALETTE_WIDE_BLEND_CONFIG.defaultColorsBetween,
  );
  assert.equal(
    normalizeColorsBetween(0),
    PALETTE_WIDE_BLEND_CONFIG.minColorsBetween,
  );
  assert.equal(normalizeColorsBetween(4.6), 5);
  assert.equal(
    normalizeColorsBetween(99),
    PALETTE_WIDE_BLEND_CONFIG.maxColorsBetween,
  );
});

test("calculates the final palette size", () => {
  assert.equal(getPaletteWideBlendColorCount(3, 2), 7);
  assert.equal(getPaletteWideBlendColorCount(1, 2), 1);
  assert.equal(getPaletteWideBlendColorCount(0, 2), 0);
});

test("returns a copy and does not call the factory when fewer than two colors exist", () => {
  const colors = [{ id: "a" }];
  let factoryCalls = 0;
  const result = insertBlendsBetweenAll(colors, 2, () => {
    factoryCalls += 1;
    return { id: "unexpected" };
  });

  assert.deepEqual(result, colors);
  assert.notEqual(result, colors);
  assert.equal(factoryCalls, 0);
});
```

- [ ] **Step 2: Run the tests and verify the expected failure**

Run:

```bash
node --test src/app/palette/components/PaletteManager/paletteWideBlend.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `paletteWideBlend.ts`.

- [ ] **Step 3: Implement the generic helper**

Create `paletteWideBlend.ts`:

```ts
export const PALETTE_WIDE_BLEND_CONFIG = {
  minColorsBetween: 1,
  maxColorsBetween: 10,
  defaultColorsBetween: 3,
  minimumBlendableColorCount: 2,
  firstArrayIndex: 0,
  nextColorOffset: 1,
  firstBlendStep: 1,
} as const;

export function normalizeColorsBetween(value: number): number {
  const finiteValue = Number.isFinite(value)
    ? value
    : PALETTE_WIDE_BLEND_CONFIG.defaultColorsBetween;
  const roundedValue = Math.round(finiteValue);

  return Math.min(
    PALETTE_WIDE_BLEND_CONFIG.maxColorsBetween,
    Math.max(PALETTE_WIDE_BLEND_CONFIG.minColorsBetween, roundedValue),
  );
}

export function getPaletteWideBlendColorCount(
  paletteColorCount: number,
  requestedColorsBetween: number,
): number {
  if (
    paletteColorCount < PALETTE_WIDE_BLEND_CONFIG.minimumBlendableColorCount
  ) {
    return Math.max(
      PALETTE_WIDE_BLEND_CONFIG.firstArrayIndex,
      paletteColorCount,
    );
  }

  const colorsBetween = normalizeColorsBetween(requestedColorsBetween);
  const adjacentPairCount =
    paletteColorCount - PALETTE_WIDE_BLEND_CONFIG.nextColorOffset;
  return paletteColorCount + adjacentPairCount * colorsBetween;
}

export function insertBlendsBetweenAll<T>(
  colors: readonly T[],
  requestedColorsBetween: number,
  createBlend: (from: T, to: T, t: number) => T,
): T[] {
  if (colors.length < PALETTE_WIDE_BLEND_CONFIG.minimumBlendableColorCount) {
    return [...colors];
  }

  const colorsBetween = normalizeColorsBetween(requestedColorsBetween);
  const result: T[] = [];
  const finalColorIndex =
    colors.length - PALETTE_WIDE_BLEND_CONFIG.nextColorOffset;
  const interpolationDenominator =
    colorsBetween + PALETTE_WIDE_BLEND_CONFIG.firstBlendStep;

  for (
    let colorIndex = PALETTE_WIDE_BLEND_CONFIG.firstArrayIndex;
    colorIndex < finalColorIndex;
    colorIndex += PALETTE_WIDE_BLEND_CONFIG.nextColorOffset
  ) {
    const from = colors[colorIndex];
    const to = colors[colorIndex + PALETTE_WIDE_BLEND_CONFIG.nextColorOffset];
    result.push(from);

    for (
      let blendStep = PALETTE_WIDE_BLEND_CONFIG.firstBlendStep;
      blendStep <= colorsBetween;
      blendStep += PALETTE_WIDE_BLEND_CONFIG.firstBlendStep
    ) {
      result.push(createBlend(from, to, blendStep / interpolationDenominator));
    }
  }

  result.push(colors[finalColorIndex]);
  return result;
}
```

- [ ] **Step 4: Add and run the focused test command**

Add this script to `package.json`:

```json
"test:palette-blend": "node --test src/app/palette/components/PaletteManager/paletteWideBlend.test.mjs"
```

Run `npm run test:palette-blend`.

Expected: four tests pass with zero failures.

- [ ] **Step 5: Commit the core helper without unrelated files**

```bash
git add package.json \
  src/app/palette/components/PaletteManager/paletteWideBlend.ts \
  src/app/palette/components/PaletteManager/paletteWideBlend.test.mjs \
  docs/superpowers/specs/2026-07-21-mix-all-palette-colors-design.md \
  docs/superpowers/plans/2026-07-22-palette-mix-all-cleanup.md
git diff --cached --check
git commit -m "feat(palette): add palette-wide blend core"
```

Expected: only the listed files are committed; all pre-existing workspace modifications remain unstaged.

---

### Task 2: Mix Scope UI and Palette Integration

**Files:**

- Create: `src/app/palette/components/PaletteManager/MixControls.tsx`
- Modify: `src/app/palette/components/PaletteManager/index.tsx`

**Interfaces:**

- Consumes: `PALETTE_WIDE_BLEND_CONFIG`, `getPaletteWideBlendColorCount`, and `insertBlendsBetweenAll` from Task 1.
- Produces: `export type MixScope = "pair" | "all"`.
- Produces: `MixControls` props for scope, palette/selection counts, colors-between state, preview data, and callbacks.

- [ ] **Step 1: Add the scope control component**

Create `MixControls.tsx` with this public contract:

```tsx
export type MixScope = "pair" | "all";

interface MixControlsProps {
  scope: MixScope;
  colorsBetween: number;
  paletteColorCount: number;
  selectedColorCount: number;
  handMixPreview: HandMixSimulation[];
  onScopeChange: (scope: MixScope) => void;
  onColorsBetweenChange: (count: number) => void;
  onCreate: () => void;
}
```

The component must:

- render a segmented **Two colors / All colors** control with `aria-pressed`;
- show `Select two colors in the palette` until pair scope has two selections;
- show `{paletteColorCount - 1} transitions · {resultCount} total colors` in all scope;
- label the slider **Colors between each**;
- use `PALETTE_WIDE_BLEND_CONFIG` for minimum, maximum, and default values;
- disable **Create Blend** unless pair scope has two selections or all scope has at least two palette colors;
- render the existing hand-mix preview only for pair scope;
- retain the current blue/indigo styling, focus rings, and responsive stacking.

- [ ] **Step 2: Connect scope state in `PaletteManager`**

Add:

```tsx
const DEFAULT_MIX_SCOPE: MixScope = "pair";
const [mixScope, setMixScope] = useState<MixScope>(DEFAULT_MIX_SCOPE);
const [blendCount, setBlendCount] = useState(
  PALETTE_WIDE_BLEND_CONFIG.defaultColorsBetween,
);
```

Use this handler so switching scopes cannot leave stale pair selections:

```tsx
const handleMixScopeChange = (scope: MixScope) => {
  clearSelectedColors();
  setMixScope(scope);
};
```

Reset `mixScope` to `DEFAULT_MIX_SCOPE` when Mix is cancelled, completed, or displaced by delete mode.

- [ ] **Step 3: Implement the all-colors create path**

Add:

```tsx
const handleCreateBlend = () => {
  setHasSeenBlendingGuide(true);

  if (mixScope === "pair") {
    addBlendedColors(blendCount);
  } else {
    const blendedPalette = insertBlendsBetweenAll(
      customPalette,
      blendCount,
      (fromColor, toColor, t) => {
        const hex = blendHexColors(fromColor.hex, toColor.hex, t);
        return {
          id: nanoid(),
          hex,
          mix: { fromId: fromColor.id, toId: toColor.id, t },
          handMix: simulatePaintLikeMix(fromColor.hex, toColor.hex, t, hex),
        };
      },
    );
    setCustomPalette(blendedPalette);
    clearSelectedColors();
    toast.success(
      `Created ${getPaletteWideBlendColorCount(customPalette.length, blendCount)}-color blend`,
    );
  }

  setMixMode(false);
  setMixScope(DEFAULT_MIX_SCOPE);
};
```

The all-colors path must call `setCustomPalette` exactly once so the complete expansion is one undo step.

- [ ] **Step 4: Replace the inline blend panel and scope swatch interaction**

Render `MixControls` whenever `mixMode` is active. Remove the old selection-hint block and inline blend-control block.

When `mixScope === "all"`:

- swatch clicks during Mix mode do not edit or select colors;
- selection rings and ordering badges remain hidden;
- the controls are ready immediately.

When `mixScope === "pair"`, retain current selection, ordering badges, hinting, and hand-mix preview.

- [ ] **Step 5: Verify focused behavior**

Run:

```bash
npm run test:palette-blend
npx tsc --noEmit
```

Expected: palette tests pass and TypeScript reports no errors attributable to the new helper or Mix UI.

---

### Task 3: Palette Editor Visual Cleanup

**Files:**

- Modify: `src/app/palette/components/PaletteManager/index.tsx`
- Modify: `src/app/palette/components/PaletteManager/BlendingGuide.tsx`

**Interfaces:**

- Consumes: `MixControls` from Task 2.
- Produces: the same `PaletteManager` and `BlendingGuide` component exports, with no caller changes.

- [ ] **Step 1: Clarify the editor header hierarchy**

Wrap the existing title/count/editing badge and existing action group, unchanged in behavior, in an outer `rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4` surface. Change their shared layout row to `flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`. Use `gap-2`, consistent 32px action heights, and wrapping at narrow widths. Keep destructive red emphasis for active deletion and confirmed reset only; make inactive utility actions visually secondary.

- [ ] **Step 2: Collapse the paint estimator into a secondary disclosure**

Replace the always-expanded amber row with a native `<details>` using `group rounded-xl border border-amber-400/25 bg-amber-500/[0.07]`. Its `<summary>` uses `flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm text-slate-200`, the existing `PaintBucket` icon, the label **Paint estimate**, and a right-aligned summary of `≈ {paintAmount.label} per color` or **Optional**. Move every existing mode, square, grams, and result control unchanged into a `border-t border-amber-400/15 p-3` body so saved values, calculations, label associations, and explanatory output remain intact.

- [ ] **Step 3: Simplify the blending guide**

Replace the large animated mock palette with a compact alert containing:

```text
Mix colors faster
Choose Two colors for a single transition or All colors to blend every adjacent pair. Then choose how many colors go between each.
```

Retain the dismiss button, local-storage behavior, blue styling, and accessible dismiss label.

- [ ] **Step 4: Tighten vertical rhythm and responsive behavior**

- change the manager root from `space-y-8` to `space-y-5`;
- use `space-y-3` inside the palette display section;
- keep color bars full-width on mobile and horizontal on desktop;
- ensure the Add and Mix tiles remain equal-width mobile touch targets;
- keep all controls visible at 320px without horizontal page overflow;
- retain tooltips for icon-only actions.

- [ ] **Step 5: Commit the UI feature without unrelated changes**

```bash
git add \
  src/app/palette/components/PaletteManager/index.tsx \
  src/app/palette/components/PaletteManager/MixControls.tsx \
  src/app/palette/components/PaletteManager/BlendingGuide.tsx
git diff --cached --check
git commit -m "feat(palette): add mix-all controls and clean editor"
```

Expected: only the three listed palette-manager files are committed.

---

### Task 4: End-to-End Verification and Production Push

**Files:**

- Verify only; modify feature files only if a check exposes a defect.

**Interfaces:**

- Consumes: completed palette blend and cleanup commits.
- Produces: a verified commit on `origin/main` and a working `https://custom.everwood.shop/palette` deployment.

- [ ] **Step 1: Run local automated verification**

```bash
npm run test:palette-blend
npx tsc --noEmit
npm run build
git diff --check
```

Expected: palette tests, TypeScript, and production build pass; no whitespace errors are introduced.

- [ ] **Step 2: Run desktop and mobile browser checks**

Start the dev server and verify `/palette` at desktop and 320px mobile widths:

- page loads without console errors;
- header actions wrap cleanly;
- paint estimate opens and closes;
- pair mixing still requires and blends two selected colors;
- all-colors mixing shows the result count and inserts the selected number between every adjacent pair;
- Undo restores the pre-blend palette in one action;
- Add, edit, drag, delete, reset, harmony, tips, and paint inputs remain reachable;
- no horizontal overflow appears.

- [ ] **Step 3: Verify the exact committed tree in isolation**

```bash
verify_worktree=$(mktemp -d /tmp/custom-request-verify.XXXXXX)
git worktree add --detach "$verify_worktree" HEAD
npm --prefix "$verify_worktree" ci
npm --prefix "$verify_worktree" run test:palette-blend
npm --prefix "$verify_worktree" run build
git worktree remove "$verify_worktree"
```

Expected: installation, tests, and production build pass from committed files alone. The temporary worktree is removed afterward.

- [ ] **Step 4: Confirm commit scope and remote ancestry**

```bash
git fetch origin main
git merge-base --is-ancestor origin/main HEAD
git status --short
git log --oneline origin/main..HEAD
```

Expected: `origin/main` is an ancestor of `HEAD`; only the intended new commits are ahead; pre-existing unrelated files remain modified but uncommitted.

- [ ] **Step 5: Push to production main**

```bash
git push origin HEAD:main
```

Expected: push succeeds without force and triggers the production deployment.

- [ ] **Step 6: Verify the live site**

Poll `https://custom.everwood.shop/palette` until the new Mix scope appears, then repeat the critical desktop workflow and check the browser console.

Expected: the production page serves the new UI, Mix All produces the correct palette, and no console or layout regressions are visible.
