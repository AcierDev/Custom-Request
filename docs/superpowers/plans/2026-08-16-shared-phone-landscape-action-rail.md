# Shared Phone Landscape Action Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place the shared viewer's mobile AR, Details, and Edit cluster in a left-side one-fifth-width rail on landscape phones.

**Architecture:** Add a small SSR-safe orientation hook backed by a pure viewport classifier and named limits. The shared page uses the result to select either the existing portrait CTA placement or the new 20vw landscape rail.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Node test runner

## Global Constraints

- Apply the rail only to the shared viewer's AR, Details, and Edit mobile action cluster.
- The phone-landscape rail is exactly `20vw` wide and hugs the left safe area.
- Details and Edit remain equal-width and side by side in portrait, then stack full-width in the landscape rail.
- Portrait mobile and desktop placements remain unchanged.
- Camera/hide controls and brand placement remain unchanged.
- Use named constants for viewport limits.
- Do not commit or push without a new explicit instruction.

---

### Task 1: Phone-landscape classification and CTA placement

**Files:**
- Create: `src/hooks/useIsPhoneLandscape.ts`
- Create: `src/hooks/useIsPhoneLandscape.test.mjs`
- Modify: `src/app/shared/[id]/page.tsx`
- Modify: `src/app/shared/[id]/SharedMobilePanelNavigation.tsx`
- Modify: `src/app/shared/SharedMobilePanelNavigation.test.mjs`

**Interfaces:**
- Produces: `PHONE_LANDSCAPE_MAX_HEIGHT_PX`.
- Produces: `isPhoneLandscapeViewport(width: number, height: number): boolean`.
- Produces: `useIsPhoneLandscape(): boolean`.

- [x] **Step 1: Write the failing classifier tests**

```js
test("recognizes a mobile-width landscape phone", () => {});
test("rejects portrait phones and taller landscape screens", () => {});
test("uses the configured height boundary", () => {});
test("landscape rail stacks Details and Edit at full width", () => {});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --no-warnings --test src/hooks/useIsPhoneLandscape.test.mjs
```

Expected: FAIL because `useIsPhoneLandscape.ts` does not exist.

- [x] **Step 3: Implement the classifier and hook**

Use the existing `MOBILE_BREAKPOINT_PX`, a named maximum phone-landscape height, and an SSR-safe resize listener.

- [x] **Step 4: Integrate the rail placement**

Read `isPhoneLandscape` in the shared page. For the mobile CTA wrapper, select:

```tsx
isPhoneLandscape
  ? "pointer-events-none fixed inset-y-0 left-[max(0.75rem,env(safe-area-inset-left))] flex w-[20vw] items-center"
  : "fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))]"
```

Keep the CTA content full-width and pointer-interactive inside the landscape wrapper. Pass the `"rail"` layout to `SharedMobilePanelActions` so Details and Edit stack full-width; retain the default two-column `"row"` layout in portrait.

- [x] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
node --no-warnings --test src/hooks/useIsPhoneLandscape.test.mjs src/app/shared/SharedMobilePanelNavigation.test.mjs
```

Expected: PASS with no warnings.

- [x] **Step 6: Verify the final tree**

Run:

```bash
node --no-warnings --test $(find src scripts -name '*.test.mjs' -not -name '* 2.mjs' -not -name '* 3.mjs' -print)
npx tsc --noEmit
npm run build
git diff --check
```

Expected: all commands pass; landscape-phone CTA uses the left 20vw rail while portrait and desktop class branches remain unchanged.
