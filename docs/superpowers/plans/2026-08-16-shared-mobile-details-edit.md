# Shared Mobile Details and Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shared mobile viewer's single Details action and in-sheet tab chooser with direct Details and Edit actions.

**Architecture:** Add one focused mobile panel navigation module shared by the bottom CTA and sheet header. Keep the existing AR action composed at page level, and keep the page responsible for sheet state and content while the navigation module owns panel labels and About/View action mapping.

**Tech Stack:** Next.js, React, TypeScript, Lucide React, Node test runner

## Global Constraints

- Change only the mobile shared viewer.
- Details maps to the existing About content; Edit maps to the existing View controls.
- The two bottom actions must be equal-width and side by side.
- Remove the About/View switcher from inside the sheet.
- Leave desktop behavior unchanged.
- Do not commit or push without a new explicit instruction.

---

### Task 1: Mobile panel navigation

**Files:**
- Create: `src/app/shared/[id]/SharedMobilePanelNavigation.tsx`
- Create: `src/app/shared/SharedMobilePanelNavigation.test.mjs`
- Modify: `src/app/shared/[id]/page.tsx`

**Interfaces:**
- Produces: `SharedMobilePanel = "about" | "view"`.
- Produces: `SharedMobilePanelActions({ onOpen })`, where Details emits `"about"` and Edit emits `"view"`.
- Produces: `SharedMobilePanelHeader({ panel, onClose })`, which labels the active content without offering another tab switcher.

- [x] **Step 1: Write the failing component tests**

```js
test("mobile shared actions show Details and Edit side by side", () => {});
test("Details opens About and Edit opens View", () => {});
test("mobile sheet header labels the selected panel without tab actions", () => {});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --no-warnings --test src/app/shared/SharedMobilePanelNavigation.test.mjs
```

Expected: FAIL because `SharedMobilePanelNavigation.tsx` does not exist.

- [x] **Step 3: Implement the focused navigation module**

Render a two-column Details/Edit button group and a sheet header with the selected label and one close button. Keep the unrelated AR action at page level so the navigation component stays lightweight and independently testable.

- [x] **Step 4: Integrate navigation with the page state**

Pass one panel-opening callback through `CtaBar`:

```tsx
onPanel={(panel) => {
  setSheetTab(panel);
  setSheetOpen(true);
}}
```

Use `SharedMobilePanelHeader` in place of the existing About/View tab map.

- [x] **Step 5: Run the focused test and verify GREEN**

Run the focused command from Step 2. Expected: PASS with no warnings.

- [x] **Step 6: Verify the final tree**

Run:

```bash
node --no-warnings --test $(find src scripts -name '*.test.mjs' -not -name '* 2.mjs' -not -name '* 3.mjs' -print)
npx tsc --noEmit
npm run build
git diff --check
```

Expected: all commands pass; desktop CTA remains copy-link only, and mobile has direct Details/Edit actions.
