# Customer Share Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all editor exits from customer shared-art pages and show shared-view sizes as width-only feet labels.

**Architecture:** Extend the existing pure size-label module with a feet-wide formatter, then expose it through an explicit compact-size label mode. Keep `/shared/<id>` in its existing route-aware standalone shell and remove page-local anchors to the editor.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node test runner

## Global Constraints

- Do not commit, push, or deploy.
- Keep numeric conversion values in named constants.
- Do not change editor size labels.
- Preserve the current standalone `/shared` layout.

---

### Task 1: Feet-wide size labels

**Files:**
- Create: `src/lib/sizeLabels.ts`
- Modify: `src/lib/size-pills.tsx`
- Modify: `src/lib/utils.ts`
- Create: `src/lib/sizeLabels.test.mjs`

**Interfaces:**
- Consumes: a shared `PHYSICAL_SIZE_CONFIG`
- Produces: `parseSizeWh(size)`, `sizeToInchLabel(size)`, and `sizeToFeetWideLabel(size)` from a JSX-free module

- [ ] **Step 1: Write the failing test**

Test that `16 x 10` formats as `4 ft wide`, fractional widths are preserved, the `14 x 7` mini panel uses its physical `3 ft wide` override, and invalid input is returned unchanged.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --no-warnings --test src/lib/sizeLabels.test.mjs`

Expected: FAIL because `sizeToFeetWideLabel` is not exported.

- [ ] **Step 3: Write minimal implementation**

Define named inches-per-square, inches-per-foot, and decimal precision config. Parse the square width, convert it to feet, and strip trailing decimal zeroes. Re-export the established helpers from `size-pills.tsx`, and make `utils.ts` consume the same config.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --no-warnings --test src/lib/sizeLabels.test.mjs`

Expected: four passing assertions.

### Task 2: Shared selector label mode

**Files:**
- Modify: `src/components/cards/SizeCard.tsx`
- Modify: `src/app/shared/[id]/page.tsx`

**Interfaces:**
- Consumes: `sizeToFeetWideLabel(size)`
- Produces: `SizeCard` prop `labelMode?: "squares" | "inches" | "feet-wide"`

- [ ] **Step 1: Replace the compact boolean formatting branch**

Add `SizeLabelMode`, default it to `"squares"`, and choose the visible formatter from the mode. Keep custom input conversion in inches only when mode is `"inches"`.

- [ ] **Step 2: Keep height groups for similarly wide options**

For `"feet-wide"`, keep the inch-tall group heading so repeated physical widths remain distinguishable. Keep the existing grouping and tile geometry.

- [ ] **Step 3: Update the shared page**

Render `<SizeCard compact bare labelMode="feet-wide" />` and use `sizeToFeetWideLabel` for the placard.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`

Expected: exit 0.

### Task 3: Remove editor exits

**Files:**
- Modify: `src/app/shared/[id]/page.tsx`

**Interfaces:**
- Consumes: existing shared-page actions
- Produces: a customer page with no editor link

- [ ] **Step 1: Make branding static**

Replace `BrandPill`'s anchor with a non-interactive container.

- [ ] **Step 2: Remove editor calls to action**

Remove `BUILDER_URL`, the mobile `Design your own` action, and the error-state editor link. Keep mobile Details and AR available.

- [ ] **Step 3: Check the source**

Run: `rg -n "BUILDER_URL|Design your own|href=" 'src/app/shared/[id]/page.tsx'`

Expected: no matches.

### Task 4: Regression verification

**Files:**
- Verify all changed files

**Interfaces:**
- Consumes: completed implementation
- Produces: evidence the behavior works without regressing palette work

- [ ] **Step 1: Run the full Node suite**

Run: `node --no-warnings --test $(rg --files -g '*.test.mjs' | sort)`

Expected: all tests pass.

- [ ] **Step 2: Run static checks**

Run: `npx tsc --noEmit && git diff --check`

Expected: exit 0.

- [ ] **Step 3: Browser-check a shared preview**

Open an inline `/shared/preview?d=...` URL. Confirm no link targets the editor; open the size picker and confirm its trigger/options end in `ft wide`.

- [ ] **Step 4: Recheck scope**

Confirm only intended share, size-label, palette-recency, and documentation files remain uncommitted; do not push.
