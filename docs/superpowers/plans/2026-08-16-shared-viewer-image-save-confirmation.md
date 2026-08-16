# Shared Viewer Image Save Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every shared-viewer image-save button a camera icon and require a clear confirmation before mobile saves.

**Architecture:** Move the shared action UI into one focused component that branches by the existing `isMobile` value. Desktop wires the save callback directly; mobile exposes it only on the alert-dialog confirmation action.

**Tech Stack:** Next.js, React, TypeScript, Lucide React, Radix Alert Dialog, Node test runner

## Global Constraints

- Change only the shared viewer; do not alter the main viewer's image action.
- Keep the existing four-angle capture hook and export filename.
- Reuse named CSS-class constants instead of scattering numeric styling values.
- Do not commit or push without a new explicit instruction.

---

### Task 1: Shared image-save action

**Files:**
- Create: `src/app/shared/[id]/SharedImageSaveAction.tsx`
- Create: `src/app/shared/SharedImageSaveAction.test.mjs`
- Modify: `src/app/shared/[id]/page.tsx`

**Interfaces:**
- Consumes: `isMobile`, `isSaving`, `isReady`, and the existing `onSave` callback.
- Produces: `SharedImageSaveAction`, which renders either a direct desktop action or a guarded mobile action.

- [x] **Step 1: Write the failing component tests**

Cover these observable contracts:

```js
test("shared image action uses a camera icon in both layouts", () => {});
test("desktop image action saves immediately", () => {});
test("mobile image action saves only from the confirmation", () => {});
test("mobile confirmation explains the four-angle device save", () => {});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --no-warnings --test src/app/shared/SharedImageSaveAction.test.mjs
```

Expected: FAIL because `SharedImageSaveAction.tsx` does not exist.

- [x] **Step 3: Implement the focused component**

Use `Camera`, the existing `Button`, and existing alert-dialog primitives. The mobile trigger must not receive `onSave`; the dialog's **Save image** action must receive it. The desktop button calls it directly.

- [x] **Step 4: Integrate it into the shared page**

Replace the inline save button with:

```tsx
<SharedImageSaveAction
  isMobile={isMobile}
  isSaving={isSavingImage}
  isReady={isImageCaptureReady}
  onSave={handleSaveImage}
/>
```

Remove the page's obsolete `Download` import and action-button styling constants now owned by the component.

- [x] **Step 5: Run the focused test and verify GREEN**

Run the focused command from Step 2. Expected: PASS with no warnings.

- [x] **Step 6: Verify the complete change**

Run:

```bash
node --no-warnings --test $(find src scripts -name '*.test.mjs' -not -name '* 2.mjs' -not -name '* 3.mjs' -print)
npx tsc --noEmit
npm run build
git diff --check
```

Then inspect the shared viewer at mobile and desktop widths. Expected: camera icon at both widths, desktop saves directly, mobile opens the confirmation, **Not now** does not save, and **Save image** saves.
