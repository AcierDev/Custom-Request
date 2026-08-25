# Viewer Edit Panel Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the main viewer, shared desktop viewer, and shared mobile viewer one sleek, modern edit-panel language while preserving every existing interaction.

**Architecture:** Introduce store-agnostic panel primitives, then compose the shared viewer's existing controls into one reusable edit surface. Refactor existing pattern, lighting, view, wall, and Pattern Editor markup to use the same primitives and selected-state helpers without altering state flow.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Radix UI, Framer Motion, Lucide icons, Node test runner with Next SWC hooks.

## Global Constraints

- Apply artwork-viewing and interaction changes to both `/viewer` and `/shared/[id]`.
- Keep all existing store selectors, setters, callbacks, gestures, and artwork-rendering behavior unchanged.
- Use named constants or configuration for repeated numeric values.
- Preserve visible focus states and existing accessible names and states.
- Do not commit or push without a new explicit user instruction.

---

### Task 1: Shared Studio-Control Primitives

**Files:**
- Create: `src/components/preview/ViewerControlSurface.tsx`
- Create: `src/components/preview/ViewerControlSurface.test.mjs`

**Interfaces:**
- Produces: `ViewerControlSurface`, `ViewerControlHeader`, `ViewerControlDisclosure`, `ViewerControlSection`, `ViewerValueBadge`, `ViewerControlTile`, and `viewerControlOptionClass(selected, tone?)`.
- Consumes: React children, Lucide `Icon` components, and `cn()`.

- [ ] **Step 1: Write the failing structural test**

```js
test("studio control primitives expose one labeled surface and selected tiles", () => {
  const markup = renderToStaticMarkup(
    React.createElement(
      ViewerControlSurface,
      { ariaLabel: "Edit view" },
      React.createElement(ViewerControlHeader, {
        title: "Edit view",
        description: "Shape the artwork and room",
      }),
      React.createElement(ViewerControlSection, { title: "Pattern" }, "Body"),
    ),
  );

  assert.match(markup, /aria-label="Edit view"/);
  assert.match(markup, />Edit view</);
  assert.match(markup, />Pattern</);
  assert.match(viewerControlOptionClass(true), /bg-white/);
  assert.match(VIEWER_CONTROL_TOUCH_TARGET_CLASS, /min-h-11/);
});
```

- [ ] **Step 2: Run the test and confirm it fails because the new module does not exist**

Run: `node --no-warnings --test src/components/preview/ViewerControlSurface.test.mjs`

- [ ] **Step 3: Implement the store-free primitives**

```tsx
export function ViewerControlSurface({ children, className, ariaLabel }: Props) {
  return (
    <section aria-label={ariaLabel} className={cn(VIEWER_CONTROL_SURFACE_CLASS, className)}>
      <span aria-hidden className={VIEWER_CONTROL_HIGHLIGHT_CLASS} />
      <div className="relative">{children}</div>
    </section>
  );
}

export function viewerControlOptionClass(
  selected: boolean,
  tone: "default" | "danger" = "default",
): string {
  return cn(VIEWER_CONTROL_OPTION_BASE_CLASS, selected ? SELECTED_CLASS[tone] : IDLE_CLASS);
}
```

Use named class constants for the shell, highlight, header, section, touch target, and option states.

- [ ] **Step 4: Re-run the focused test**

Run: `node --no-warnings --test src/components/preview/ViewerControlSurface.test.mjs`

Expected: PASS.

---

### Task 2: Unified Shared-Viewer Edit Surface

**Files:**
- Create: `src/app/shared/[id]/SharedViewerEditPanel.tsx`
- Create: `src/app/shared/SharedViewerEditPanel.test.mjs`
- Modify: `src/app/shared/[id]/page.tsx`
- Modify: `src/app/shared/[id]/SharedMobilePanelNavigation.tsx`
- Modify: `src/app/shared/SharedMobilePanelNavigation.test.mjs`

**Interfaces:**
- Consumes: `ViewerControlSurface`, `ViewerControlHeader`, `ViewerControlSection`, `SizeCard`, `PatternControls`, `LightingControls`, `WallColorPicker`, `PaintColorPicker`.
- Produces: `SharedViewerEditPanel({ timeOfDay, onTimeOfDayChange, wallColor, onWallColorChange, compactHeader? })`.

- [ ] **Step 1: Write failing composition tests**

```js
test("shared edit panel presents the four editing groups", () => {
  const markup = renderToStaticMarkup(React.createElement(SharedViewerEditPanel, props));
  for (const label of ["Size", "Pattern", "Lighting", "Wall color"]) {
    assert.match(markup, new RegExp(`>${label}<`));
  }
  assert.match(markup, /aria-label="Edit view"/);
});

test("compact mobile edit panel omits the duplicate desktop heading", () => {
  const markup = renderToStaticMarkup(
    React.createElement(SharedViewerEditPanel, { ...props, compactHeader: true }),
  );
  assert.doesNotMatch(markup, />Edit view</);
  assert.match(markup, />Size</);
});
```

Extend the navigation test to assert the Edit header has its icon, supporting copy, and a decorative sheet handle while keeping exactly one close button.

- [ ] **Step 2: Run the focused shared-viewer tests and confirm failure**

Run: `node --no-warnings --test src/app/shared/SharedViewerEditPanel.test.mjs src/app/shared/SharedMobilePanelNavigation.test.mjs`

- [ ] **Step 3: Extract the route-local `ViewingControls` into `SharedViewerEditPanel`**

```tsx
<ViewerControlSurface ariaLabel="Edit view" compact={compactHeader}>
  {!compactHeader && (
    <ViewerControlHeader title="Edit view" description="Shape the artwork and room" icon={SlidersHorizontal} />
  )}
  <ViewerControlSection title="Size" icon={ScanLine}><SizeCard compact bare labelMode="physical" /></ViewerControlSection>
  <ViewerControlSection title="Pattern" icon={Blend}><PatternControls embedded /></ViewerControlSection>
  <ViewerControlSection title="Lighting" icon={SunMedium}><LightingControls embedded value={timeOfDay} onChange={onTimeOfDayChange} /></ViewerControlSection>
  <ViewerControlSection title="Wall color" icon={PaintBucket}>{wallControls}</ViewerControlSection>
</ViewerControlSurface>
```

- [ ] **Step 4: Use the extracted component for desktop and mobile in `page.tsx`**

Increase the desktop width to the named `SHARED_EDIT_PANEL_WIDTH_CLASS`, preserve viewport scrolling, and pass `compactHeader` only inside the mobile sheet.

- [ ] **Step 5: Modernize the mobile Edit sheet chrome**

Add a decorative grab handle, an icon-backed title, short description, sticky high-contrast header, safe-area bottom padding, and the same close semantics. Keep Details unchanged and keep the landscape rail width at `20vw`.

- [ ] **Step 6: Re-run both focused test files**

Expected: PASS.

---

### Task 3: Modernize Shared Pattern, Lighting, Wall, and View Controls

**Files:**
- Modify: `src/components/preview/PatternControls.tsx`
- Modify: `src/components/preview/PatternControls.test.mjs`
- Modify: `src/components/preview/LightingControls.tsx`
- Modify: `src/components/preview/WallColorPicker.tsx`
- Modify: `src/components/preview/PaintColorPicker.tsx`
- Modify: `src/components/preview/ViewControls.tsx`

**Interfaces:**
- Consumes: the Task 1 primitives and current Zustand store API.
- Produces: `embedded?: boolean` on `PatternControls` and `LightingControls`; all pre-existing no-prop usages remain valid.

- [ ] **Step 1: Add failing markup assertions for embedded controls**

```js
test("embedded pattern controls use modern tiles without a nested card", () => {
  const markup = renderToStaticMarkup(React.createElement(PatternControls, { embedded: true }));
  assert.match(markup, /role="group"/);
  assert.doesNotMatch(markup, /role="radio"/);
  assert.doesNotMatch(markup, /data-viewer-control-surface/);
  assert.match(markup, /tabular-nums/);
});
```

Add a lighting assertion that its two choices expose `aria-pressed` and render as a two-column segmented group.

- [ ] **Step 2: Run the focused controls tests and confirm failure**

Run: `node --no-warnings --test src/components/preview/PatternControls.test.mjs`

- [ ] **Step 3: Refactor `PatternControls`**

Render four compact pressed-state pattern tiles in a labeled two-column group, put orientation in a two-way pressed-button control, move slider values into `ViewerValueBadge`, and retain every existing setter and visible label. When `embedded` is false, wrap the content in a collapsed-by-default `ViewerControlDisclosure`; otherwise return content only.

- [ ] **Step 4: Refactor `LightingControls`**

Use two equal-width icon tiles with `aria-pressed`, concise descriptions, and the shared active-state helper. Preserve the existing `TimeOfDay` values and callbacks.

- [ ] **Step 5: Refine wall and named-paint inputs**

Increase swatch targets, replace heavy indigo rings with the shared surface/outline treatment, modernize the paint disclosure/search/result rows, and retain the current lazy-loading and filtering behavior.

- [ ] **Step 6: Refine `ViewControls`**

Use the shared surface and consistent switch rows with icon tiles, calmer copy, and preserved Zustand setters and expanded/collapsed state.

- [ ] **Step 7: Run focused and existing interaction tests**

Run: `node --no-warnings --test src/components/preview/PatternControls.test.mjs src/components/preview/patternUtils.paletteBlend.test.mjs`

Expected: PASS.

---

### Task 4: Modernize the Main Pattern Editor

**Files:**
- Modify: `src/app/viewer/components/PatternEditor.tsx`
- Create: `src/app/viewer/components/PatternEditorSurface.tsx`
- Create: `src/app/viewer/components/PatternEditorSurface.test.mjs`

**Interfaces:**
- Consumes: `ViewerControlSurface`, `ViewerValueBadge`, `ViewerControlTile`, and the existing Pattern Editor store/actions.
- Produces: the same `PatternEditor({ className? })` API.

- [ ] **Step 1: Write a failing source/markup regression test**

```js
test("pattern editor frame exposes status, collapse state, and content", () => {
  const markup = renderToStaticMarkup(
    React.createElement(PatternEditorSurface, frameProps, "Tools"),
  );
  assert.match(markup, /data-viewer-control-surface="true"/);
  assert.match(markup, /aria-live="polite" aria-label="Ready"/);
  assert.match(markup, /aria-expanded="true"/);
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --no-warnings --test src/app/viewer/components/PatternEditorSurface.test.mjs`

- [ ] **Step 3: Replace the legacy Card shell and header**

Create and use `PatternEditorSurface`; show “Pattern editor,” a short subtitle, the collapse action, and a status chip with `aria-live="polite"`. Preserve the current collapse and cancel behavior.

- [ ] **Step 4: Group the tools into shared sections**

Group status/history, area, colors, direction, visibility/reset, and extra options. Use the shared option class for brush/direction/visibility/reset buttons and keep all current labels, context-menu behavior, keyboard access, and replace flow.

- [ ] **Step 5: Replace the verbose instruction box with a contextual footer**

Keep the active instruction, one-line interaction hint, modified-square count, and keyboard hint; reduce redundant explanatory text without removing actionable information.

- [ ] **Step 6: Run the Pattern Editor test and related viewer tests**

Run: `node --no-warnings --test src/app/viewer/components/PatternEditorSurface.test.mjs src/app/viewer/components/WavePatternOption.test.mjs`

Expected: PASS.

---

### Task 5: Align Main Viewer Options and Verify the Full Experience

**Files:**
- Modify: `src/app/viewer/page.tsx`
- Modify: `src/components/preview/PanelLayoutControls.tsx`
- Modify: `src/app/viewer/components/PaletteVersionSwitcher.tsx`
- Review: every file changed in Tasks 1-4

**Interfaces:**
- Consumes: the shared control primitives and existing viewer stack.
- Produces: unchanged routes and viewer behavior with consistent control surfaces.

- [ ] **Step 1: Align the main viewer's mobile sheet and desktop stack**

Use the same sheet backdrop, handle, sticky header, safe-area padding, panel widths, and spacing as the shared viewer. Retain the existing mobile Options trigger and all child controls.

- [ ] **Step 2: Restyle panel layout and palette-version surfaces**

Adopt the shared surface classes, section labels, value treatments, and focus rings without changing panel allocation or palette-version logic. Start Pattern, Wall color, and Panel layout collapsed, and label the square-size choices `3" (standard)` and `2.65" (mini)`.

- [ ] **Step 3: Run React quality review**

Check hook dependencies, component boundaries, repeated inline arrays/classes, semantic controls, touch targets, focus rings, and TypeScript props. Move repeated visual constants to module scope.

- [ ] **Step 4: Run all canonical tests**

Run:

```bash
find src scripts -type f -name '*.test.mjs' ! -name '* 2.mjs' ! -name '* 3.mjs' -print0 | xargs -0 node --no-warnings --test
```

Expected: all tests pass.

- [ ] **Step 5: Run type and production checks**

Run:

```bash
npx tsc --noEmit --pretty false
npm run build
```

Expected: both commands exit zero.

- [ ] **Step 6: Run the app and inspect all three variants**

Start `npm run dev`, confirm one listener, and inspect:

- `/viewer` at desktop width;
- `/shared/[id]` at desktop width;
- `/shared/[id]` at phone portrait and phone landscape widths;
- focus, hover, selected, collapsed, long-scroll, and reduced-motion states;
- browser console for errors.

- [ ] **Step 7: Review the final diff**

Run `git diff --check` and `git status --short`. Preserve unrelated untracked duplicate files and leave the completed changes uncommitted unless the user explicitly asks to commit or push.
