# Palette Boundary Blending Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every color an equal total-square quota, then blend every adjacent palette boundary without allowing any color to spread more than one progression-axis square outside its original band or leaving an orthogonally isolated square.

**Architecture:** Update the shared deterministic seam swapper to reserve positions per line. Both viewers receive the behavior through their existing shared `generateColorMap` path.

**Tech Stack:** TypeScript, Next.js, Node test runner

## Global Constraints

- Apply artwork behavior identically to `/viewer` and `/shared/[id]` through shared code.
- Use named configuration constants instead of numeric literals.
- Do not commit or push without explicit user instruction.

---

### Task 1: Palette seam regression coverage

**Files:**
- Modify: `src/components/preview/patternUtils.paletteBlend.test.mjs`

**Interfaces:**
- Consumes: `generateColorMap(...)`
- Produces: regression coverage for all adjacent seams and maximum one-line spread

- [ ] Add a three-color, two-line-band test that requires both boundaries to contain both neighboring colors at 100% blend.
- [ ] Run the focused test and confirm it fails because the second seam remains solid.
- [ ] Add a three-color, one-line-band test requiring both seams to mix and each color to stay within its original line plus or minus one.
- [ ] Add a regression asserting every square has an edge-sharing same-color neighbor; diagonal contact does not count.
- [ ] Add a non-divisible 24×12 regression requiring every color count to differ by at most one square.

### Task 2: Conflict-safe seam blending

**Files:**
- Modify: `src/components/preview/patternUtils.ts`

**Interfaces:**
- Consumes: solid band boundaries and normalized palette blend percent
- Produces: deterministic, count-preserving adjacent-line swaps with per-line position reservations

- [ ] Extend `swapAcrossSeam` to select only unreserved positions and record used positions for both lines.
- [ ] Blend every adjacent solid band boundary, capped by available unreserved positions.
- [ ] Revert complete count-preserving swaps that produce an orthogonally isolated square.
- [ ] Calculate Palette-pattern quotas from total squares rather than whole progression-axis lines.
- [ ] Run the focused palette blend tests and confirm they pass.

### Task 3: Full verification

**Files:**
- Verify: `src/components/preview/patternUtils.ts`
- Verify: `src/components/preview/patternUtils.paletteBlend.test.mjs`

**Interfaces:**
- Consumes: completed implementation
- Produces: type, build, test, and route evidence

- [ ] Run all project tests.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Verify `/viewer` and `/shared/[id]` load without runtime errors.
