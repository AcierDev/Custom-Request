# Mobile Orbit Gesture Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep mobile orbit gestures stable across one-finger and two-finger transitions in both artwork viewers.

**Architecture:** Wrap the official Three.js OrbitControls in one React Three Fiber component and use it in both scenes. Verify the actual pointer sequence against the shared control factory and assert both consumers use the wrapper.

**Tech Stack:** Next.js 16, React 19, React Three Fiber 9, Three.js r173, Node test runner

## Global Constraints

- Apply artwork interaction changes to both `/viewer` and `/shared/[id]`.
- Preserve all existing camera limits and gesture configuration.
- Define numeric behavior thresholds as named test constants.

---

### Task 1: Add the touch transition regression

**Files:**
- Create: `src/components/preview/StableOrbitControls.test.mjs`

**Interfaces:**
- Consumes: `createStableOrbitControls(camera)` from the component added in Task 2
- Produces: A pointer-sequence regression and both-viewer integration assertions

- [ ] **Step 1: Write a test that simulates rotate, pinch entry, pinch exit, and resumed rotation**

- [ ] **Step 2: Run `node --no-warnings --test src/components/preview/StableOrbitControls.test.mjs` and confirm it fails because the shared control does not exist**

### Task 2: Implement and integrate the shared control

**Files:**
- Create: `src/components/preview/StableOrbitControls.tsx`
- Modify: `src/app/viewer/page.tsx`
- Modify: `src/components/preview/GalleryArtScene.tsx`

**Interfaces:**
- Produces: `StableOrbitControls` React component and `createStableOrbitControls(camera)` factory
- Consumes: Existing OrbitControls props at both viewer call sites

- [ ] **Step 1: Implement the minimal official-Three.js React Three Fiber wrapper**

- [ ] **Step 2: Replace Drei OrbitControls imports and JSX in both viewer scenes**

- [ ] **Step 3: Re-run the focused regression and confirm it passes**

### Task 3: Verify and release the complete accumulated viewer work

**Files:**
- Review: all requested viewer/shared-viewer files in the final staged diff

**Interfaces:**
- Consumes: Completed viewer changes and repository deployment configuration
- Produces: A verified commit on `main`, a pushed remote commit, and a confirmed production deployment

- [ ] **Step 1: Run all Node tests and fix any failures**

- [ ] **Step 2: Run TypeScript, lint, and production build checks**

- [ ] **Step 3: Start the app and inspect main/shared viewers at mobile portrait and phone landscape sizes**

- [ ] **Step 4: Review the exact staged diff and exclude unrelated duplicate/untracked files**

- [ ] **Step 5: Commit the requested changes, push `main`, and confirm the production website deployment**
