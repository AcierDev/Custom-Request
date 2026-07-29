# Viewer Action Dock Release Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release the user-authored viewer dock change so Save Image and Share Design remain visible and usable above the options rail on desktop and mobile.

**Architecture:** Preserve every unrelated working-tree edit. Stage only the action-dock hunks already present in `src/app/viewer/page.tsx`, validate the resulting commit from a clean worktree, then push that commit to `main` and test production.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS, shadcn Button/Tooltip, Vercel.

## Global Constraints

- Do not stage the square-gap, AI palette, AR, pattern, store, or lockfile edits.
- Keep the existing Save Image and Share Design handlers unchanged.
- Desktop actions must not sit underneath the right-side options rail.
- Mobile actions must fit within a 320px viewport.

---

### Task 1: Isolate the viewer action dock

**Files:**
- Modify: `.gitignore`
- Modify: `src/app/viewer/page.tsx:1003-1085`
- Create: `docs/superpowers/plans/2026-07-22-viewer-action-dock-release.md`

**Interfaces:**
- Consumes: existing `handleSaveImage`, `setIsShareDialogOpen`, `showUIControls`, and `isImageCaptureReady` state.
- Produces: an always-visible fixed dock with accessible Save Image and Share Design controls.

- [ ] **Step 1: Confirm the production regression**

Open `/viewer` at desktop width and verify the current bottom-right action group is obscured by the options rail.

- [ ] **Step 2: Stage only the existing action-dock hunks**

Keep the user-authored implementation that uses these layout classes:

```tsx
"fixed left-1/2 z-[60] flex -translate-x-1/2 items-center justify-center rounded-full"
```

Use icon-only mobile buttons with `aria-label="Save image"` and `aria-label="Share design"`; retain text labels on desktop.

- [ ] **Step 3: Verify staged scope**

Run:

```bash
git diff --cached -- src/app/viewer/page.tsx
git diff --cached --name-only
```

Expected: only the action-dock section of `src/app/viewer/page.tsx`, this plan file, and the worktree ignore rule.

### Task 2: Validate and release

**Files:**
- Test: `src/app/viewer/page.tsx`

**Interfaces:**
- Consumes: the isolated staged patch from Task 1.
- Produces: a verified production commit on `origin/main`.

- [ ] **Step 1: Build the exact commit in a clean worktree**

Run `npm ci` and `npm run build`; expect exit code 0 and a generated `/viewer` route.

- [ ] **Step 2: Browser-check desktop and mobile**

At desktop width, verify Save Image and Share Design are visible and Share Design opens its dialog. At 320px, verify both icon buttons are reachable and there is no horizontal overflow.

- [ ] **Step 3: Commit and push**

```bash
git commit -m "fix(viewer): keep share and image actions accessible"
git push origin HEAD:main
```

- [ ] **Step 4: Verify production**

Confirm Vercel reports success for the new SHA, then repeat the desktop visibility and Share Design dialog checks on `https://custom.everwood.shop/viewer`.
