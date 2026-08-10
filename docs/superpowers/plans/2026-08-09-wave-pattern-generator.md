# Wave Pattern Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an undoable Wave generator to Viewer Pattern Editor > Extra Options that turns the palette into horizontal bands and sweeps them upward with increasing speed from left to right.

**Architecture:** A pure library function converts authoritative current grid dimensions and a palette color count into deterministic per-square color overrides. A focused store-bound control derives those dimensions through the renderer's existing mini/drawn-pattern layout helpers and applies the generated overrides through the existing history-aware store action. The main and shared renderers need no changes because both already consume persisted `patternOverride` data.

**Tech Stack:** TypeScript, React, Zustand, Next.js App Router, Node test runner, SWC test hooks.

## Global Constraints

- Keep the Wave control specifically inside the Viewer Pattern Editor's left-side **Extra Options** section.
- Do not add Wave to the general Pattern menu.
- Keep tiles discrete and vary only their palette color assignments.
- Do not generate a sinusoidal or back-and-forth wave.
- Move every band boundary upward monotonically, slowly on the left and faster near the right edge.
- Preserve square direction, visibility, dimensions, orientation, and backboard settings.
- Use named configuration constants instead of hardcoded numeric values.
- Preserve unrelated uncommitted work.
- Do not commit or push without a new explicit instruction.

---

### Task 1: Deterministic Wave Generator

**Files:**
- Create: `src/lib/wavePattern.ts`
- Create: `src/lib/wavePattern.test.mjs`

**Interfaces:**
- Produces: `WAVE_PATTERN_CONFIG` with named minimum input, maximum-rise, and acceleration values.
- Produces: `WavePatternGridSize` with `width` and `height`.
- Produces: `canGenerateWavePattern(gridSize: WavePatternGridSize, colorCount: number): boolean`.
- Produces: `generateWavePatternOverrides(gridSize: WavePatternGridSize, colorCount: number): Record<string, number>`.

- [x] **Step 1: Write failing generator tests**

Create the existing SWC `registerHooks` harness, import `generateWavePatternOverrides`, and test a named rectangular grid fixture. Assert that output is deterministic, covers every authoritative coordinate, contains only indexes from zero through `colorCount - 1`, puts the first palette color at the top and the last at the bottom, never moves a boundary downward, and moves it farther between late columns than early columns. Add invalid-input assertions for fewer than two colors, a grid too small to show the sweep, and unsafe dimensions that exceed the named generation caps.

- [x] **Step 2: Verify RED**

Run:

```bash
node --no-warnings --test src/lib/wavePattern.test.mjs
```

Expected: FAIL because `src/lib/wavePattern.ts` does not exist.

- [x] **Step 3: Implement the minimal pure generator**

Validate that width, height, area, and color count stay within named safe limits and reject grids below the named minimum width/height. For every authoritative coordinate, calculate horizontal progress, raise it to the configured acceleration exponent, and use that eased value to increase the vertical palette progress toward the configured maximum rise. Multiply the clamped vertical progress by the normalized color count, floor it, and clamp it to the last palette index. Return a complete rectangular override record.

- [x] **Step 4: Verify GREEN**

Run the Task 1 test command and expect all Wave generator tests to pass.

---

### Task 2: Extra Options Wave Control

**Files:**
- Create: `src/app/viewer/components/WavePatternOption.tsx`
- Create: `src/app/viewer/components/WavePatternOption.test.mjs`
- Modify: `src/app/viewer/components/PatternEditor.tsx`

**Interfaces:**
- Consumes: `canGenerateWavePattern` and `generateWavePatternOverrides` from Task 1.
- Consumes: `customPalette`, `selectedDesign`, `dimensions`, mini/drawn-pattern state, and `setPatternOverride` from `useCustomStore`.
- Consumes: `calculateSquareLayout` and `isExactMiniSize` from the shared renderer utilities.
- Produces: `WavePatternOption(): JSX.Element`.

- [x] **Step 1: Write failing control tests**

Create the existing JSX-capable SWC `registerHooks` harness. Render the presentational Wave row disabled and assert the markup contains `Wave pattern`, the reference-matching description, and a disabled `Apply wave` button. Render it enabled and assert the button is enabled. Verify separately that current artwork dimensions are used for palette mode and drawn-pattern dimensions are used for pattern mode, without consulting saved edit keys.

- [x] **Step 2: Verify RED**

Run:

```bash
node --no-warnings --test src/app/viewer/components/WavePatternOption.test.mjs
```

Expected: FAIL because `WavePatternOption.tsx` does not exist.

- [x] **Step 3: Implement the control**

Render a compact `Wave pattern` row with a `Waves` icon, the description `Sweep palette bands upward from left to right`, and an `Apply wave` button. Derive authoritative grid dimensions using the same standard, mini, and drawn-pattern sizing logic as `GeometricPattern`, excluding persisted override keys. Disable the action until the helper validates the grid and color count. On click, generate the complete overrides and call the existing `setPatternOverride`; this creates one undo history entry and does not touch direction or visibility records.

- [x] **Step 4: Insert it in Extra Options**

Import `WavePatternOption` into `PatternEditor.tsx`. Render it at the top of the expanded Extra Options content, followed by the existing divider, backboard color, and square-gap controls. Do not render it in `PatternControls.tsx` or the separate legacy design editor.

- [x] **Step 5: Verify GREEN**

Run the Task 2 test command and expect all control tests to pass. Re-run Task 1 to ensure the generator remains green.

---

### Task 3: Integration Verification

**Files:**
- Verify: `src/store/customStore.ts`
- Verify: `src/components/preview/GeometricPattern.tsx`
- Verify: `src/app/shared/[id]/page.tsx`

**Interfaces:**
- Consumes: the existing history, saved-palette, viewer-version, and shared-design handling for `patternOverride`.
- Produces: no new schema; both viewers render the same generated overrides.

- [x] **Step 1: Run focused regression tests**

Run:

```bash
node --no-warnings --test src/lib/wavePattern.test.mjs src/app/viewer/components/WavePatternOption.test.mjs src/store/customStore.paletteViewerReset.test.mjs src/components/ShareDesignButton.test.mjs
```

Expected: all tests pass.

- [x] **Step 2: Run the complete automated suite**

Run `rg --files -g '*.test.mjs' src scripts | sort | xargs node --no-warnings --test`, then `npx tsc --noEmit`, then `npm run build`. Expect each command to exit successfully without new warnings or errors.

- [ ] **Step 3: Verify the browser flow**

Start the existing development server if needed. Open `/viewer`, expand Pattern Editor > Extra Options, confirm the Wave row appears in that section, apply it to a multi-color palette, and verify horizontal palette bands whose boundaries rise slowly on the left and faster near the right without turning downward. Confirm Undo restores the previous colors and that directions/hidden squares are unchanged. Open a shared design containing the overrides and confirm it renders the same tile colors.

Blocked in this session because neither the local browser CLI nor an in-app browser backend was available. The live `/viewer` route returned HTTP 200, while automated generator, placement, persistence, and build checks passed.

- [x] **Step 4: Inspect the final diff**

Run `git diff --check` and `git status --short`. Confirm the implementation only adds the Wave files and focused Pattern Editor insertion, alongside the user's pre-existing size-option edits and unrelated untracked files.

---

### Task 4: Separate Flip and Mirror Actions

**Files:**
- Modify: `src/lib/wavePattern.ts`
- Modify: `src/lib/wavePattern.test.mjs`
- Modify: `src/app/viewer/components/WavePatternOption.tsx`
- Modify: `src/app/viewer/components/WavePatternOption.test.mjs`

**Interfaces:**
- Produces: `WavePatternTransform` as `"standard" | "flip" | "mirror"`.
- Extends: `generateWavePatternOverrides(gridSize, colorCount, transform?)`, defaulting to `"standard"`.
- Adds: `Flip` and `Mirror` beside `Apply wave`; they generate top-bottom and left-right transforms through the existing `setPatternOverride` action.

- [x] **Step 1: Write failing behavior tests**

Add hand-checked generator fixtures for a top-bottom Flip and left-right Mirror. Extend the presentational control test to require enabled/disabled `Flip` and `Mirror` buttons beside `Apply wave`.

- [x] **Step 2: Verify RED**

Run:

```bash
node --no-warnings --test src/lib/wavePattern.test.mjs src/app/viewer/components/WavePatternOption.test.mjs
```

Expected: FAIL because Flip still performs the left-right transformation and the control has no Mirror action.

- [x] **Step 3: Implement the two minimal transformations**

Add named standard/flip/mirror transform values. Flip reads `lastRowIndex - y` while Mirror reads `lastColumnIndex - x`; all other band math remains unchanged. Add separate Flip and Mirror handlers that apply generated overrides through `setPatternOverride`.

- [x] **Step 4: Verify GREEN and regressions**

Run the focused tests, complete Node test suite, `npx tsc --noEmit`, `npm run build`, `git diff --check`, and the live `/viewer` HTTP check. Expect every command to succeed.

---

### Task 5: Compose Transformations From the Current Grid

**Files:**
- Modify: `src/lib/wavePattern.ts`
- Modify: `src/lib/wavePattern.test.mjs`
- Modify: `src/app/viewer/components/WavePatternOption.tsx`

**Interfaces:**
- Produces: `transformCurrentWavePatternOverrides(gridSize, colorCount, currentOverrides, transform)`.
- Consumes: the store's current `patternOverride` as the transformation source.
- Preserves: the standard generated wave as fallback only for authoritative cells absent from the current overrides.
- Removes: the subtitle below `Wave pattern`, keeping the control row compact.

- [x] **Step 1: Write the failing composition test**

Generate Mirror from an empty override record, pass that output into Flip, and assert a hand-checked grid containing both the left-right and top-bottom transformations. Keep the standalone Flip and Mirror fixtures. Change the control test to reject the removed subtitle.

- [x] **Step 2: Verify RED**

Run:

```bash
node --no-warnings --test src/lib/wavePattern.test.mjs src/app/viewer/components/WavePatternOption.test.mjs
```

Expected: FAIL because `transformCurrentWavePatternOverrides` does not exist and the component still regenerates each action from the reference orientation.

- [x] **Step 3: Implement current-grid transformation**

Generate a standard fallback map, overlay the current authoritative overrides, then remap source rows for Flip or source columns for Mirror. Subscribe the Wave control to `patternOverride` and call this helper for both transformation buttons; keep Apply wave connected directly to the standard generator. Remove the subtitle element below `Wave pattern`.

- [x] **Step 4: Verify GREEN and regressions**

Run the focused tests, complete Node suite, `npx tsc --noEmit` after the production build finishes, `npm run build`, `git diff --check`, and the live `/viewer` HTTP check. Expect every command to succeed.

---

### Task 6: Corner Color Amount

**Files:**
- Modify: `src/lib/wavePattern.ts`
- Modify: `src/lib/wavePattern.test.mjs`
- Modify: `src/app/viewer/components/WavePatternOption.tsx`
- Modify: `src/app/viewer/components/WavePatternOption.test.mjs`

**Interfaces:**
- Extends: `WAVE_PATTERN_CONFIG` with named 25%, 400%, 25%, and 100% minimum, maximum, step, and default amount values.
- Extends: `generateWavePatternOverrides` with an optional Corner color amount percentage.
- Extends: `transformCurrentWavePatternOverrides` with the same fallback-generation percentage.
- Adds: a controlled `Corner color amount` slider below the Wave action row that regenerates live while retaining the current orientation.

- [x] **Step 1: Write failing amount tests**

Use a hand-checked 3 × 20 grid with three colors and count the terminal color in the left column. Assert 25%, 100%, and 400% produce 2, 7, and 13 terminal-color cells. Add hand-checked low/high fixtures for a wave that is both flipped and mirrored, proving live regeneration keeps both transformations. Extend the component markup test to require the `Corner color amount` label, `100%` value, and slider.

- [x] **Step 2: Verify RED**

Run:

```bash
node --no-warnings --test src/lib/wavePattern.test.mjs src/app/viewer/components/WavePatternOption.test.mjs
```

Expected: FAIL because generation ignores the amount and the slider is absent.

- [x] **Step 3: Implement terminal-color weighting and control**

Normalize the percentage to a 1.0-based weight, leave each preceding color at weight 1.0, and map vertical progress across the combined weight. Track local `isFlipped` and `isMirrored` flags, toggling them with the transformation buttons and resetting them on Apply or palette change. On every slider value change, regenerate at the new amount and reapply both active transformations before writing the complete overrides.

- [x] **Step 4: Verify GREEN and regressions**

Run the focused tests, full Node suite, production build, sequential TypeScript check, `git diff --check`, and `/viewer` HTTP check. Expect every command to succeed.

---

### Task 7: Reapply Active Wave on Size Changes

**Files:**
- Modify: `src/lib/wavePattern.ts`
- Modify: `src/lib/wavePattern.test.mjs`
- Modify: `src/app/viewer/components/WavePatternOption.tsx`

**Interfaces:**
- Produces: `regenerateActiveWavePatternForGridSizeChange(previousGridSize, nextGridSize, isWaveActive, colorCount, cornerColorAmountPercent, orientation)` returning complete oriented overrides only when an active Wave's authoritative grid size changes.
- Consumes: the Wave control's current Corner color amount, Flip/Mirror orientation, activation state, and authoritative rendered grid size.
- Preserves: unrelated patterns when Wave has not been activated and clears activation on palette or design change.

- [x] **Step 1: Write failing resize-regeneration tests**

Add a hand-checked active resize fixture that requests the mirrored-and-flipped orientation at the new grid size and assert the full output matches that orientation. Add inactive and unchanged-size cases that assert no regeneration occurs.

- [x] **Step 2: Verify RED**

Run:

```bash
node --no-warnings --test src/lib/wavePattern.test.mjs src/app/viewer/components/WavePatternOption.test.mjs
```

Expected: FAIL because `regenerateActiveWavePatternForGridSizeChange` does not exist.

- [x] **Step 3: Implement active resize regeneration**

Compare the previous and next authoritative grid dimensions in the pure helper. Return `null` when Wave is inactive or dimensions are unchanged; otherwise generate complete overrides at the new size with `generateOrientedWavePatternOverrides`. In the control, track Wave activation and the prior grid size with refs. Mark Wave active after Apply, Flip, Mirror, or a successful live amount regeneration. When dimensions change, call the helper and apply its output while retaining the current amount and orientation. Clear activation synchronously when the palette or design changes.

- [x] **Step 4: Verify GREEN and regressions**

Run the focused tests, full Node suite, production build, sequential TypeScript check, `git diff --check`, and `/viewer` HTTP check. Expect every command to succeed.
