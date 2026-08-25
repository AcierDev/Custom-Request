# Palette Blend Line-First Rebuild Implementation Plan

**Goal:** Replace global palette swaps with transition-line blending that retains solid bands.

**Architecture:** Keep exact serpentine quota assignment as the 0% map. Derive each adjacent boundary from cumulative quotas, rearrange only an existing mixed transition line, and use a two-line exchange only for an exactly aligned boundary.

**Tech Stack:** TypeScript, Next.js, Node test runner

## Global Constraints

- Both viewers use `generatePalettePatternMap` through `generateColorMap`.
- Every numeric algorithm parameter is a named constant.
- Preserve exact quotas, orthogonal attachment, one-line spread, reversal, and both orientations.
- Do not commit or push without explicit user instruction.

---

### Task 1: Solid-line regression

**Files:**
- Modify: `src/components/preview/patternUtils.paletteBlend.test.mjs`

- [x] Add the 32×12, 15-color fixture from the reported design.
- [x] Assert 0% has 19 solid progression columns and 100% retains at least 17.
- [x] Run the focused suite and observe the current full blend returning only 2 solid columns.
- [x] Remove the obsolete assertion that every changed square must be orthogonally separated.

### Task 2: Line-first generator

**Files:**
- Replace: `src/components/preview/palettePattern.ts`

- [x] Keep exact serpentine quota assignment for the hard map.
- [x] Derive boundary line, remainder, and adjacent color pair from cumulative quotas.
- [x] Build an evenly interleaved target for partial transition lines.
- [x] Build distributed two-line exchanges for aligned boundaries.
- [x] Apply a blend-proportional number of deterministic exchange pairs.
- [x] Reject exchanges that violate attachment or one-line locality.
- [x] Run the focused suite until all palette invariants pass.

### Task 3: End-to-end verification

**Files:**
- Verify: `src/components/preview/palettePattern.ts`
- Verify: `src/components/preview/patternUtils.ts`
- Verify: `src/components/preview/patternUtils.paletteBlend.test.mjs`

- [x] Inspect generated 0%, 25%, 50%, 75%, and 100% maps for the reported dimensions.
- [x] Run all project tests.
- [x] Run `npx tsc --noEmit` and `git diff --check`.
- [x] Verify `/viewer` and `/shared/[id]` return successfully.

### Task 4: Separate solid lines at the blend threshold

**Files:**
- Modify: `src/lib/paletteBlend.ts`
- Modify: `src/components/preview/palettePattern.ts`
- Modify: `src/components/preview/patternUtils.paletteBlend.test.mjs`

- [x] Add a named 15% topology threshold.
- [x] Reproduce adjacent solid columns in the representative layout.
- [x] Separate neighboring solid lines through quota-preserving, attached swaps with adjacent transition lines.
- [x] Verify horizontal, vertical, forward, and reversed layouts from 15% through 100%.
