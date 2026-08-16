# Shared Viewer Text Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the yellow circular “E” from the shared viewer’s top-left brand pill while preserving its text and placement.

**Architecture:** Move the small brand pill into a focused shared-viewer component so its rendered output can be tested directly. The shared page will import that component; no main-viewer or global-navigation branding changes.

**Tech Stack:** Next.js 16, React 19, Node test runner

## Global Constraints

- Keep “Everwood” and “Shared with you” unchanged.
- Keep the existing top-left desktop and mobile positioning.
- Remove the amber icon and unused inter-item gap.
- Do not change `/viewer` or global navigation branding.
- Do not commit or push unless explicitly requested.

---

### Task 1: Text-only shared brand pill

**Files:**
- Create: `src/app/shared/[id]/SharedBrandPill.tsx`
- Create: `src/app/shared/SharedBrandPill.test.mjs`
- Modify: `src/app/shared/[id]/page.tsx`

**Interfaces:**
- Produces: `SharedBrandPill(): React.JSX.Element`
- Consumes: `SharedBrandPill` from the shared viewer page

- [x] **Step 1: Write the failing component test**

Render `SharedBrandPill` with `react-dom/server`. Assert the markup includes `Everwood` and `Shared with you`, and excludes both a standalone `E` icon and amber-gradient styling.

- [x] **Step 2: Run the test and verify red**

Run:

```bash
node --no-warnings --test src/app/shared/SharedBrandPill.test.mjs
```

Expected: FAIL because `SharedBrandPill.tsx` does not exist yet.

- [x] **Step 3: Implement the text-only pill**

Create `SharedBrandPill` with the existing glass pill, text, typography, padding, and shadow. Do not render the amber icon. Remove the inline `BrandPill` from `page.tsx` and replace its use with the imported component.

- [x] **Step 4: Verify the focused behavior**

Run:

```bash
node --no-warnings --test src/app/shared/SharedBrandPill.test.mjs src/app/shared/sharedPageIsolation.test.mjs
```

Expected: both tests pass.

- [x] **Step 5: Verify the application**

Run:

```bash
npx tsc --noEmit
npm run build
git diff --check
```

Expected: every command exits zero. Do not commit or push.
