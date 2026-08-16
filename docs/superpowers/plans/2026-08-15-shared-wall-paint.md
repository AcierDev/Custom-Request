# Shared Wall Paint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the shared named-paint picker to `/viewer` and preserve wall color across every share-link path.

**Architecture:** Reuse the existing picker UI. Extend the share-state boundary with an optional wall color, compact it in short URLs, and restore it without changing the shared viewer's local-only environment behavior.

**Tech Stack:** Next.js 16, React 19, Zustand, Node test runner

## Global Constraints

- Viewer artwork behavior must remain identical on `/viewer` and `/shared/[id]`.
- Existing shares without a wall color must continue using `DEFAULT_WALL_COLOR`.
- Do not commit or push.

---

### Task 1: Share-state wall color

**Files:**
- Modify: `src/store/customStore.panelRemainder.test.mjs`
- Modify: `src/store/customStore.ts`

**Interfaces:**
- Produces: `ShareableState.wallColor?: string`
- Produces: snapshots and share-data objects containing the selected wall color

- [x] **Step 1: Write failing tests** asserting the selected wall color appears in `getShareableStateSnapshot()` and is restored by `loadFromShareableData()`.
- [x] **Step 2: Run** `node --no-warnings --test src/store/customStore.panelRemainder.test.mjs` and confirm the wall-color assertions fail because the field is absent.
- [x] **Step 3: Add** the optional `wallColor` field, snapshot serialization, lightweight share serialization, and share-load restoration using `DEFAULT_WALL_COLOR` as fallback.
- [x] **Step 4: Re-run** the targeted store test and confirm it passes.

### Task 2: Compact URL wall color

**Files:**
- Modify: `src/lib/urlUtils.test.mjs`
- Modify: `src/lib/urlUtils.ts`

**Interfaces:**
- Produces: compact key `wc` mapped to `wallColor`

- [x] **Step 1: Write a failing round-trip test** using a literal selected paint hex.
- [x] **Step 2: Run** `node --no-warnings --test src/lib/urlUtils.test.mjs` and confirm the decoded wall color is missing.
- [x] **Step 3: Encode and decode** wall color using the named compact-key constant.
- [x] **Step 4: Re-run** the URL test and confirm it passes.

### Task 3: Viewer UI and shared-page restoration

**Files:**
- Modify: `src/app/viewer/page.tsx`
- Modify: `src/app/shared/[id]/page.tsx`

**Interfaces:**
- Consumes: `PaintColorPicker`, `ShareableState.wallColor`
- Produces: identical preset and named-paint selection controls in both viewer routes

- [x] **Step 1: Import and render** `PaintColorPicker` below the main viewer's preset swatches using the existing `onChange` callback.
- [x] **Step 2: Initialize** the shared page's local wall state from fetched or inline share data, falling back to `DEFAULT_WALL_COLOR`.
- [x] **Step 3: Run** the targeted store and URL tests.
- [x] **Step 4: Run** `npm run build`.
- [x] **Step 5: Verify** both viewer routes through production build, type-checking, route responses, and server logs. Visual automation was unavailable because no controllable browser was connected.
