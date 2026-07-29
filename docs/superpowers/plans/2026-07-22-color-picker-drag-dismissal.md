# Color Picker Drag Dismissal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the palette page's Edit Color and Add Color popups open when a color-control drag ends outside the panel.

**Architecture:** Replace release-time backdrop clicks with one shared pointer-down guard. The helper dismisses only when the interaction originates directly on the backdrop, while the two custom popup components retain their existing UI and explicit close controls.

**Tech Stack:** TypeScript 5.9, React 19 pointer events, Framer Motion, `react-colorful`, Node.js built-in test runner.

## Global Constraints

- Change only Edit Color and Add Color popup dismissal.
- Support mouse, touch, and pen through pointer events.
- Preserve direct backdrop dismissal and all explicit close buttons.
- Leave Color Harmony Generator unchanged.
- Do not change layout, animation, or color calculations.
- Do not commit unless the user explicitly requests it.

---

### Task 1: Add and wire a direct-backdrop pointer guard

**Files:**
- Create: `src/app/palette/components/PaletteManager/backdropDismiss.ts`
- Create: `src/app/palette/components/PaletteManager/backdropDismiss.test.mjs`
- Modify: `src/app/palette/components/PaletteManager/index.tsx`
- Modify: `src/app/palette/components/PaletteManager/AddColorButton.tsx`
- Modify: `package.json`

**Interfaces:**
- Produces: `dismissOnDirectBackdropPointerDown(event: BackdropPointerEvent, dismiss: () => void): void`.
- Consumed by: Edit Color and Add Color backdrop `onPointerDown` handlers.

- [ ] **Step 1: Write the failing guard tests**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  dismissOnDirectBackdropPointerDown,
} from "./backdropDismiss.ts";

const EXPECTED_EXPLICIT_CLOSE_HANDLER_COUNT = 1;
const FIRST_SPLIT_RESULT_INDEX = 1;

const count = (source, value) =>
  source.split(value).slice(FIRST_SPLIT_RESULT_INDEX).length;

test("dismisses a pointer-down originating directly on the backdrop", () => {
  const backdrop = new EventTarget();
  let dismissed = false;

  dismissOnDirectBackdropPointerDown(
    { target: backdrop, currentTarget: backdrop },
    () => {
      dismissed = true;
    },
  );

  assert.equal(dismissed, true);
});

test("ignores a pointer-down originating inside the popup", () => {
  const backdrop = new EventTarget();
  const child = new EventTarget();
  let dismissed = false;

  dismissOnDirectBackdropPointerDown(
    { target: child, currentTarget: backdrop },
    () => {
      dismissed = true;
    },
  );

  assert.equal(dismissed, false);
});

test("Edit Color and Add Color use the shared pointer-down guard", async () => {
  const manager = await readFile(
    new URL("./index.tsx", import.meta.url),
    "utf8",
  );
  const addColor = await readFile(
    new URL("./AddColorButton.tsx", import.meta.url),
    "utf8",
  );

  assert.match(manager, /onPointerDown=\{\(event\) =>/);
  assert.match(manager, /dismissOnDirectBackdropPointerDown\(event,/);
  assert.equal(
    count(manager, "onClick={() => setEditingColor(null)}"),
    EXPECTED_EXPLICIT_CLOSE_HANDLER_COUNT,
  );

  assert.match(addColor, /onPointerDown=\{\(event\) =>/);
  assert.match(addColor, /dismissOnDirectBackdropPointerDown\(event,/);
  assert.equal(
    count(addColor, "onClick={() => setIsOpen(false)}"),
    EXPECTED_EXPLICIT_CLOSE_HANDLER_COUNT,
  );
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --no-warnings --experimental-strip-types --test src/app/palette/components/PaletteManager/backdropDismiss.test.mjs
```

Expected: FAIL because `backdropDismiss.ts` does not exist.

- [ ] **Step 3: Implement the minimal guard**

Create `src/app/palette/components/PaletteManager/backdropDismiss.ts`:

```ts
export interface BackdropPointerEvent {
  target: EventTarget | null;
  currentTarget: EventTarget | null;
}

export function dismissOnDirectBackdropPointerDown(
  event: BackdropPointerEvent,
  dismiss: () => void,
): void {
  if (event.target === event.currentTarget) dismiss();
}
```

- [ ] **Step 4: Run the tests and confirm the wiring test remains RED**

Run:

```bash
node --no-warnings --experimental-strip-types --test src/app/palette/components/PaletteManager/backdropDismiss.test.mjs
```

Expected: two helper tests pass and the component-wiring test fails.

- [ ] **Step 5: Wire Edit Color and Add Color**

Import the helper in both components:

```ts
import { dismissOnDirectBackdropPointerDown } from "./backdropDismiss";
```

Replace the Edit Color backdrop `onClick` with:

```tsx
onPointerDown={(event) =>
  dismissOnDirectBackdropPointerDown(event, () =>
    setEditingColor(null),
  )
}
```

Replace the Add Color backdrop `onClick` with:

```tsx
onPointerDown={(event) =>
  dismissOnDirectBackdropPointerDown(event, () => setIsOpen(false))
}
```

Leave explicit button `onClick` handlers unchanged.

- [ ] **Step 6: Add the focused test script**

Add to `package.json`:

```json
"test:palette-popups": "node --no-warnings --experimental-strip-types --test src/app/palette/components/PaletteManager/backdropDismiss.test.mjs"
```

- [ ] **Step 7: Verify the focused behavior**

Run:

```bash
npm run test:palette-popups
```

Expected: three passing tests.

- [ ] **Step 8: Confirm Harmony Generator remains unchanged**

Run:

```bash
git diff -- src/app/palette/components/PaletteManager/ColorHarmonyGenerator.tsx
```

Expected: no output.

- [ ] **Step 9: Review the diff without committing**

Run:

```bash
git diff -- src/app/palette/components/PaletteManager/backdropDismiss.ts src/app/palette/components/PaletteManager/backdropDismiss.test.mjs src/app/palette/components/PaletteManager/index.tsx src/app/palette/components/PaletteManager/AddColorButton.tsx package.json
```

Expected: only the shared guard, tests, two backdrop handlers, and test script changed.
