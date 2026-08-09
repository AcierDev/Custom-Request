# Palette Success Toast Suppression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop green success notifications on `/palette` while preserving all
other notification behavior.

**Architecture:** A small facade wraps Sonner's existing callable `toast` API.
It suppresses `success` only when `window.location.pathname` is `/palette` or a
nested palette route, and delegates every other method and route unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript, Sonner, Node test runner.

## Global Constraints

- Errors, warnings, and informational notifications remain visible.
- Success notifications outside `/palette` remain unchanged.
- Use named constants for route and suppressed toast identifiers.
- Preserve unrelated dirty-worktree changes.
- Do not commit or push without explicit user instruction.

---

### Task 1: Route-aware toast facade

**Files:**

- Create: `src/lib/toast.test.mjs`
- Create: `src/lib/toast.ts`
- Modify: every application file currently importing `toast` directly from
  `sonner`; keep `src/app/layout.tsx` importing `Toaster` from `sonner`.

**Interfaces:**

- Consumes: Sonner's callable `toast` object and `window.location.pathname`.
- Produces: `toast` with the same runtime and TypeScript API as Sonner.
- Produces: `shouldSuppressSuccessToast(pathname: string | null | undefined)`.

- [ ] **Step 1: Write the failing integration test**

Create tests using Sonner's real `getHistory()` state. Use unique literal
messages and a controlled `globalThis.window.location.pathname` to assert:

```js
toast.success(PALETTE_SUCCESS_MESSAGE);
assert.equal(hasToast(PALETTE_SUCCESS_MESSAGE), false);

toast.error(PALETTE_ERROR_MESSAGE);
assert.equal(hasToast(PALETTE_ERROR_MESSAGE), true);

toast.success(VIEWER_SUCCESS_MESSAGE);
assert.equal(hasToast(VIEWER_SUCCESS_MESSAGE), true);
```

- [ ] **Step 2: Verify the test fails for the missing facade**

Run: `node --no-warnings --test src/lib/toast.test.mjs`

Expected: FAIL because `src/lib/toast.ts` does not exist.

- [ ] **Step 3: Implement the facade**

Create `src/lib/toast.ts` with:

```ts
export const PALETTE_ROUTE = "/palette";
const SUPPRESSED_SUCCESS_TOAST_ID = "palette-success-toast-suppressed";

export const shouldSuppressSuccessToast = (pathname) =>
  pathname === PALETTE_ROUTE || pathname?.startsWith(`${PALETTE_ROUTE}/`);
```

Copy Sonner's callable properties with `Object.assign`, override only
`success`, and delegate to `sonnerToast.success` unless the route is suppressed.

- [ ] **Step 4: Route application toast imports through the facade**

Replace this exact import in `src`:

```ts
import { toast } from "sonner";
```

with:

```ts
import { toast } from "@/lib/toast";
```

Do not change `import { Toaster } from "sonner"` in `src/app/layout.tsx`.

- [ ] **Step 5: Run focused verification**

Run: `node --no-warnings --test src/lib/toast.test.mjs`

Expected: all facade behavior tests PASS.

- [ ] **Step 6: Run full verification**

Run:

```bash
node --no-warnings --test
npx tsc --noEmit
git diff --check
npm run build
```

Expected: all commands exit successfully.
