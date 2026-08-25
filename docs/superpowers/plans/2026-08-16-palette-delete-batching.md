# Palette Delete Batching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Batch direct palette swatch deletions after a 1.5-second idle window so swatches do not rearrange between rapid delete clicks.

**Architecture:** A small controller owns stable-ID queuing and timer restart behavior. PaletteManager integrates it with the latest Zustand state, while ColorSwatch only renders the pending state.

**Tech Stack:** TypeScript, React 19, Next.js 16, Node test runner

## Global Constraints

- Use a named constant for the 1.5-second idle duration.
- Commit all queued IDs in one palette update and history entry.
- Do not commit or push without explicit user instruction.

---

### Task 1: Deferred deletion controller

**Files:**
- Create: `src/app/palette/components/PaletteManager/deferredColorDeletion.ts`
- Create: `src/app/palette/components/PaletteManager/deferredColorDeletion.test.mjs`

**Interfaces:**
- Produces: `createDeferredColorDeletionQueue(options)` with `queue(id)` and `dispose()`

- [ ] Write tests proving no early commit, timer restart, ID de-duplication, one batch commit, and disposal cancellation.
- [ ] Run the test and confirm it fails because the controller is missing.
- [ ] Implement the controller with injected schedule and cancel functions.
- [ ] Run the focused test and confirm it passes.

### Task 2: Palette editor integration

**Files:**
- Modify: `src/app/palette/components/PaletteManager/index.tsx`
- Modify: `src/app/palette/components/PaletteManager/types.ts`
- Modify: `src/app/palette/components/PaletteManager/ColorSwatch.tsx`
- Modify: `src/app/palette/components/PaletteManager/SortableColorSwatch.tsx`

**Interfaces:**
- Consumes: deferred deletion controller and stable color IDs
- Produces: fixed swatch layout during the idle window and one delayed palette update

- [ ] Queue direct trash clicks by color ID.
- [ ] Commit queued IDs against the latest store state after the idle window.
- [ ] Render and disable pending swatches without removing their slots.
- [ ] Cancel the controller on unmount.

### Task 3: Verification

**Files:**
- Verify: all files above

**Interfaces:**
- Consumes: completed implementation
- Produces: test, type, build, and route evidence

- [ ] Run all tests.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Verify the palette route loads without runtime errors.
