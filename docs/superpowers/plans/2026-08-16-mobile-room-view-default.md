# Mobile Room View Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start Room View off when either viewer initially loads on a mobile-width viewport while preserving desktop and later user-selected behavior.

**Architecture:** A shared client hook applies the default once using the existing mobile breakpoint. Main-viewer persistence hydration resolves its saved value through the same rule and a transient marker protects later user choices; the shared viewer connects the hook to isolated local state.

**Tech Stack:** React 19, TypeScript, Zustand, Node test runner, Next.js 16

## Global Constraints

- Apply the artwork-viewing behavior to `/viewer` and `/shared/[id]`.
- Use the named `MOBILE_BREAKPOINT_PX` constant.
- Do not commit or push without a new explicit instruction.

---

### Task 1: Test the initial viewport decision

**Files:**
- Create: `src/hooks/useInitialRoomViewDefault.test.mjs`
- Create: `src/hooks/useInitialRoomViewDefault.ts`
- Create: `src/lib/mobileViewport.ts`
- Create: `src/lib/roomViewDefault.ts`

**Interfaces:**
- Produces: `applyInitialRoomViewDefault(width: number, setShowRoom: (showRoom: boolean) => void): void`
- Produces: `useInitialRoomViewDefault(setShowRoom: (showRoom: boolean) => void): void`
- Produces: `resolveHydratedRoomView(input: HydratedRoomViewInput): boolean`

- [x] **Step 1: Write the failing test**

Test that a width below `MOBILE_BREAKPOINT_PX` invokes the setter once with `false`, while the exact breakpoint and a desktop width do not invoke it. Test that late saved-state hydration still resolves Room View to `false` only for the mobile `/viewer` route and preserves a later explicit user choice.

- [x] **Step 2: Run test to verify it fails**

Run: `node --no-warnings --test src/hooks/useInitialRoomViewDefault.test.mjs`
Expected: FAIL because the implementation module does not exist.

- [x] **Step 3: Write minimal implementation**

Use `applyInitialRoomViewDefault` inside a mount-only React effect. Read `window.innerWidth` once; do not subscribe to resize events.

- [x] **Step 4: Run test to verify it passes**

Run: `node --no-warnings --test src/hooks/useInitialRoomViewDefault.test.mjs`
Expected: PASS.

### Task 2: Connect both viewers

**Files:**
- Modify: `src/app/viewer/page.tsx`
- Modify: `src/app/shared/[id]/page.tsx`
- Modify: `src/store/customStore.ts`

**Interfaces:**
- Consumes: `useInitialRoomViewDefault(setShowRoom)`

- [x] **Step 1: Main viewer integration**

Select the existing `setShowRoom` store action and pass it to the hook.

- [x] **Step 1a: Protect the default during persistence hydration**

Resolve guest and authenticated `showRoom` hydration through `resolveHydratedRoomView` so a saved `true` value cannot overwrite the mobile `/viewer` default. Record explicit `setShowRoom` calls in transient state and preserve the current selection during later rehydration or viewer remounts.

- [x] **Step 2: Shared viewer integration**

Add local `showRoom` state initialized to `true`, pass its setter to the hook, and replace the hardcoded `showRoom` scene prop with the state value.

- [x] **Step 3: Verify all behavior**

Run the focused test, the complete `*.test.mjs` suite, `npx tsc --noEmit`, `npm run build`, and `git diff --check`.
