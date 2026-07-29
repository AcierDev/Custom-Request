# Viewer Square Spacing Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development while implementing, then superpowers:verification-before-completion before committing. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish, audit, test, and deliver the viewer's configurable square-spacing feature as the very next commit.

**Architecture:** Keep `src/lib/squareGap.ts` as the single source of truth for allowed physical gaps and scene-unit conversion. The store owns the selected value; the pattern, backboards, installed dimensions, persistence, and short URLs consume that normalized value. Most implementation already exists as uncommitted work, so this plan adds focused tests, closes any gaps found by the audit, and stages only spacing-related hunks.

**Tech Stack:** TypeScript 5.9, React 19, Zustand 5, Three.js/React Three Fiber, Next.js 16, Node.js built-in test runner.

## Global Constraints

- Preserve every unrelated user change in the dirty worktree.
- Do not stage unrelated backboard-color, palette-blend, viewer-version, AI, architecture, or editor work.
- Define dimensions and test expectations as named constants; do not add numeric magic values.
- Keep physical units in inches at the UI/store boundary and convert through `SQUARE_GAP_CONFIG.inchesPerSceneUnit`.
- A zero-inch gap must preserve the current tightly fitted appearance.
- This must be the next commit, with subject `feat(viewer): add configurable square spacing`.
- The user explicitly authorized this commit and the later push.

---

### Task 1: Establish focused square-gap behavior with tests

**Files:**

- Create: `src/lib/squareGap.test.mjs`
- Modify: `package.json`

**Interfaces:**

- Exercises: `normalizeSquareGapInches(value: unknown): SquareGapInches`
- Exercises: `getSquareGapSceneUnits(value: unknown): number`
- Exercises: `getSquareGapExpansionSceneUnits(itemCount: number, gapInches: unknown): number`
- Exercises: `getSquareGridSpanSceneUnits(itemCount: number, squareWidthSceneUnits: number, gapInches: unknown): number`
- Adds script: `test:square-gap`

- [ ] **Step 1: Write failing unit coverage for the approved options**

Create `src/lib/squareGap.test.mjs` with named constants and these cases:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  SQUARE_GAP_CONFIG,
  SQUARE_GAP_OPTIONS,
  getSquareGapExpansionSceneUnits,
  getSquareGapSceneUnits,
  getSquareGridSpanSceneUnits,
  normalizeSquareGapInches,
} from "./squareGap.ts";

const HALF_INCH_GAP = 0.5;
const VALUE_NEAREST_HALF_INCH = 0.46;
const HALF_INCH_SCENE_UNITS =
  HALF_INCH_GAP / SQUARE_GAP_CONFIG.inchesPerSceneUnit;
const EMPTY_ITEM_COUNT = 0;
const SINGLE_ITEM_COUNT = 1;
const THREE_ITEMS = 3;
const GAP_COUNT_FOR_THREE_ITEMS = 2;
const HALF_SCENE_UNIT_SQUARE = 0.5;
const EXPECTED_THREE_ITEM_SPAN =
  THREE_ITEMS * HALF_SCENE_UNIT_SQUARE +
  GAP_COUNT_FOR_THREE_ITEMS * HALF_INCH_SCENE_UNITS;

test("publishes every approved physical gap option", () => {
  assert.deepEqual(
    SQUARE_GAP_OPTIONS.map(({ value }) => value),
    [...SQUARE_GAP_CONFIG.options],
  );
});

test("normalizes invalid and in-between values to an approved option", () => {
  assert.equal(
    normalizeSquareGapInches(Number.NaN),
    SQUARE_GAP_CONFIG.defaultInches,
  );
  assert.equal(
    normalizeSquareGapInches(VALUE_NEAREST_HALF_INCH),
    HALF_INCH_GAP,
  );
});

test("converts inches and expands only the spaces between squares", () => {
  assert.equal(
    getSquareGapSceneUnits(HALF_INCH_GAP),
    HALF_INCH_SCENE_UNITS,
  );
  assert.equal(
    getSquareGapExpansionSceneUnits(THREE_ITEMS, HALF_INCH_GAP),
    GAP_COUNT_FOR_THREE_ITEMS * HALF_INCH_SCENE_UNITS,
  );
  assert.equal(
    getSquareGridSpanSceneUnits(
      THREE_ITEMS,
      HALF_SCENE_UNIT_SQUARE,
      HALF_INCH_GAP,
    ),
    EXPECTED_THREE_ITEM_SPAN,
  );
});

test("never adds expansion for zero or one item", () => {
  assert.equal(
    getSquareGapExpansionSceneUnits(EMPTY_ITEM_COUNT, HALF_INCH_GAP),
    SQUARE_GAP_CONFIG.defaultInches,
  );
  assert.equal(
    getSquareGapExpansionSceneUnits(SINGLE_ITEM_COUNT, HALF_INCH_GAP),
    SQUARE_GAP_CONFIG.defaultInches,
  );
});
```

- [ ] **Step 2: Register and run the focused test in RED**

Add:

```json
"test:square-gap": "node --no-warnings --test src/lib/squareGap.test.mjs"
```

Run:

```bash
npm run test:square-gap
```

Expected: RED if any existing helper or option diverges from the approved behavior. If it is already green because the uncommitted implementation satisfies the contract, record that as characterization coverage and continue without forcing an artificial production failure.

- [ ] **Step 3: Make only the minimal helper correction, if needed**

Keep all conversion and option data in `SQUARE_GAP_CONFIG` and `SQUARE_GAP_OPTIONS`. Do not duplicate the six-inches-per-scene-unit relationship in consumers.

- [ ] **Step 4: Re-run focused tests in GREEN**

Run:

```bash
npm run test:square-gap
```

Expected: all square-gap tests pass.

---

### Task 2: Test short-URL persistence

**Files:**

- Create: `src/lib/urlUtils.test.mjs`
- Modify: `package.json`
- Modify only if the test exposes a defect: `src/lib/urlUtils.ts`

**Interfaces:**

- Exercises: `generateShortShareableUrl(stateData: object): string`
- Exercises: `extractStateFromShortUrl<T>(compressedData: string): T`
- Verifies compact key: `sqg`

- [ ] **Step 1: Write the round-trip test**

Create a test that:

1. Defines `const SELECTED_SQUARE_GAP_INCHES = 0.5`.
2. Calls `generateShortShareableUrl({ squareGapInches: SELECTED_SQUARE_GAP_INCHES })`.
3. Extracts the `s` query value using `new URL(generatedUrl, TEST_ORIGIN)`.
4. Calls `extractStateFromShortUrl`.
5. Asserts the decoded `squareGapInches` equals the selected value.
6. Decompresses the payload and asserts it contains `"sqg"` but not `"squareGapInches"`.

- [ ] **Step 2: Run the URL test in RED or characterization GREEN**

Run:

```bash
node --no-warnings --test src/lib/urlUtils.test.mjs
```

Expected: pass if the existing uncommitted short-key wiring is complete; otherwise fail at the missing encode/decode assertion.

- [ ] **Step 3: Fix only the missing compact encode/decode path**

The production mapping must remain:

```ts
const SHORT_SQUARE_GAP_KEY = "sqg";
```

Encode numeric `stateData.squareGapInches` and restore it to
`fullState.squareGapInches`.

- [ ] **Step 4: Add the URL test to the focused script and verify GREEN**

Set:

```json
"test:square-gap": "node --no-warnings --test src/lib/squareGap.test.mjs src/lib/urlUtils.test.mjs"
```

Run:

```bash
npm run test:square-gap
```

Expected: all helper and short-URL tests pass.

---

### Task 3: Audit every viewer integration point

**Files:**

- Audit/modify: `src/app/viewer/components/PatternEditor.tsx`
- Audit/modify: `src/components/preview/GeometricPattern.tsx`
- Audit/modify: `src/components/preview/patternUtils.ts`
- Audit/modify: `src/components/preview/PlywoodBase.tsx`
- Audit/modify: `src/components/preview/MultiPanelPlywoodBase.tsx`
- Audit/modify: `src/components/preview/GalleryArtScene.tsx`
- Audit/modify: `src/app/viewer/page.tsx`
- Audit/modify: `src/store/customStore.ts`
- Audit/modify: `src/lib/urlUtils.ts`

**Data flow:**

```text
PatternEditor
  -> setSquareGapInches()
  -> viewSettings.squareGapInches
  -> GeometricPattern square stride
  -> PlywoodBase / MultiPanelPlywoodBase extents
  -> viewer and gallery installed dimensions
  -> saved/shared snapshots and compact URL key sqg
```

- [ ] **Step 1: Verify the control contract**

Confirm `PatternEditor`:

- shows **Square gaps** under Extra Options;
- renders all `SQUARE_GAP_OPTIONS`;
- uses `aria-pressed` and the option's accessible label;
- calls `setSquareGapInches(option.value)`;
- reflects the current normalized store value.

- [ ] **Step 2: Verify pattern geometry**

Confirm `GeometricPattern` and `calculateSquareLayout`:

- add `getSquareGapSceneUnits(squareGapInches)` once to each row/column stride;
- use `getSquareGridSpanSceneUnits` for total width and height;
- preserve zero-gap visual overlap only when the selected gap equals the configured default;
- never add an outer perimeter gap.

- [ ] **Step 3: Verify both backboard paths**

Confirm single- and multi-panel backboards use the same grid span and stride as the squares. The backboard inset remains physical and does not absorb the configured inter-square gap.

- [ ] **Step 4: Verify installed measurements**

Confirm both `src/app/viewer/page.tsx` and
`src/components/preview/GalleryArtScene.tsx` add:

```ts
getSquareGapExpansionSceneUnits(itemCount, squareGapInches)
```

to the installed width and height before converting to display units.

- [ ] **Step 5: Verify store, saved state, shared state, and reset behavior**

Confirm `customStore.ts`:

- declares `viewSettings.squareGapInches`;
- initializes it from `SQUARE_GAP_CONFIG.defaultInches`;
- normalizes setter input;
- includes it in persisted store state;
- includes it in `getShareableStateSnapshot()` and `getShareableDesignData()`;
- restores missing legacy values to the configured default;
- loads shared values through `normalizeSquareGapInches`.

- [ ] **Step 6: Run static integration searches**

Run:

```bash
rg -n "squareGapInches|SQUARE_GAP_OPTIONS|getSquareGap" \
  src/app/viewer \
  src/components/preview \
  src/lib \
  src/store/customStore.ts
```

Expected: every data-flow layer above has an intentional match.

- [ ] **Step 7: Run type checking**

Run:

```bash
npx tsc --noEmit
```

Expected: exit code 0.

---

### Task 4: Verify the feature in the running viewer

**Files:**

- No planned source changes

**Required sub-skills:**

- Use `vercel:agent-browser-verify` when the dev server starts.
- Use `vercel:agent-browser` for the interaction flow.

- [ ] **Step 1: Check for an existing server and port conflict**

Inspect listening Node/Next processes and the package scripts. Reuse the correct project server if healthy. Stop only a duplicate process started during this task.

- [ ] **Step 2: Start the development server**

Run:

```bash
npm run dev
```

Keep it running in a PTY. Confirm the ready URL, no compile errors, and a successful HTTP response.

- [ ] **Step 3: Exercise square spacing**

In the viewer:

1. Open Extra Options.
2. Select **1/2″**.
3. Confirm distinct physical gaps appear between all neighboring squares.
4. Confirm the backboard remains centered and expands to contain the grid.
5. Confirm displayed installed dimensions increase by the expected accumulated gaps.
6. Set **None** and confirm the original tight appearance returns.

- [ ] **Step 4: Exercise persistence**

Select **1/2″**, reload, and verify it remains selected. Generate/open a shared short URL and verify the receiving view uses the same spacing.

- [ ] **Step 5: Inspect runtime health**

Expected:

- no console errors;
- no failed asset/API requests caused by spacing;
- no duplicate dev server or port conflict;
- viewer remains interactive at zero and nonzero gap settings.

---

### Task 5: Make square spacing the next commit

**Files:**

- Stage only spacing-specific files and hunks from Tasks 1–4

- [ ] **Step 1: Review the dirty worktree before staging**

Run:

```bash
git status --short
git diff -- src/lib/squareGap.ts src/lib/squareGap.test.mjs src/lib/urlUtils.test.mjs package.json
git diff -- src/app/viewer/components/PatternEditor.tsx src/app/viewer/page.tsx
git diff -- src/components/preview/GeometricPattern.tsx src/components/preview/patternUtils.ts
git diff -- src/components/preview/PlywoodBase.tsx src/components/preview/MultiPanelPlywoodBase.tsx
git diff -- src/components/preview/GalleryArtScene.tsx src/store/customStore.ts src/lib/urlUtils.ts
```

- [ ] **Step 2: Stage new focused files directly**

Stage the new gap helper/test files and the package-script hunk. Use selective staging for `package.json` if it contains other changes.

- [ ] **Step 3: Selectively stage existing-file hunks**

Use `git add -p` or an explicit temporary index patch to stage only hunks that introduce or propagate:

- `squareGapInches`;
- `SQUARE_GAP_CONFIG` / `SQUARE_GAP_OPTIONS`;
- square-gap geometry helpers;
- `sqg` compact URL persistence;
- the focused test script.

Do not stage adjacent unrelated changes merely because they share a file.

- [ ] **Step 4: Audit the staged diff**

Run:

```bash
git diff --cached --check
git diff --cached --stat
git diff --cached
```

Expected: a coherent square-spacing feature, tests, and no unrelated work.

- [ ] **Step 5: Re-run verification against the staged worktree**

Run:

```bash
npm run test:square-gap
npx tsc --noEmit
```

Expected: all commands pass.

- [ ] **Step 6: Commit**

Run:

```bash
git commit -m "feat(viewer): add configurable square spacing"
```

- [ ] **Step 7: Confirm ordering and preservation**

Run:

```bash
git log -1 --oneline
git status --short
```

Expected: the new square-spacing commit is HEAD, while unrelated unstaged user changes remain untouched. Do not push yet; push follows the integrated verification in the STEP-export plan.
