# Solid Backboard Color Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every selected backboard color opaque while preserving plywood grain only for Natural.

**Architecture:** Centralize the texture-visibility rule in `backboardColor.ts`, then consume it in both Three.js backboard renderers. Preserve the existing `string | null` state contract, where `null` means Natural.

**Tech Stack:** TypeScript, React 19, React Three Fiber, Three.js, Node test runner

## Global Constraints

- A selected hex backboard color never displays plywood grain.
- Natural restores plywood grain when the existing grain setting is enabled.
- Do not change picker, persistence, export, or artwork material behavior.
- Do not commit or push unless explicitly requested.

---

### Task 1: Centralize and apply backboard texture visibility

**Files:**
- Create: `src/lib/backboardColor.test.mjs`
- Modify: `src/lib/backboardColor.ts`
- Modify: `src/components/preview/PlywoodBase.tsx`
- Modify: `src/components/preview/MultiPanelPlywoodBase.tsx`

**Interfaces:**
- Consumes: `backboardColor: string | null | undefined`, `showWoodGrain: boolean`
- Produces: `shouldUseBackboardTexture(backboardColor, showWoodGrain): boolean`

- [ ] **Step 1: Write the failing policy test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import * as backboardColorPolicy from "./backboardColor.ts";

const NATURAL_BACKBOARD_COLOR = null;
const SELECTED_BACKBOARD_COLOR = "#123456";

const TEXTURE_CASES = [
  {
    name: "Natural with grain enabled",
    backboardColor: NATURAL_BACKBOARD_COLOR,
    showWoodGrain: true,
    expected: true,
  },
  {
    name: "selected color with grain enabled",
    backboardColor: SELECTED_BACKBOARD_COLOR,
    showWoodGrain: true,
    expected: false,
  },
  {
    name: "Natural with grain disabled",
    backboardColor: NATURAL_BACKBOARD_COLOR,
    showWoodGrain: false,
    expected: false,
  },
];

test("uses plywood texture only for Natural with grain enabled", () => {
  assert.equal(
    typeof backboardColorPolicy.shouldUseBackboardTexture,
    "function",
  );

  for (const textureCase of TEXTURE_CASES) {
    assert.equal(
      backboardColorPolicy.shouldUseBackboardTexture(
        textureCase.backboardColor,
        textureCase.showWoodGrain,
      ),
      textureCase.expected,
      textureCase.name,
    );
  }
});
```

- [ ] **Step 2: Run the policy test and verify RED**

Run: `node --no-warnings --test src/lib/backboardColor.test.mjs`

Expected: FAIL because `shouldUseBackboardTexture` is not exported.

- [ ] **Step 3: Add the minimal texture policy**

Add to `src/lib/backboardColor.ts`:

```ts
export const shouldUseBackboardTexture = (
  backboardColor: string | null | undefined,
  showWoodGrain: boolean,
): boolean => backboardColor == null && showWoodGrain;
```

- [ ] **Step 4: Wire the policy into both backboard renderers**

Import `shouldUseBackboardTexture` in both renderers.

In `PlywoodBase`, compute:

```ts
const showBackboardTexture = shouldUseBackboardTexture(
  backboardColor,
  showWoodGrain,
);
```

Pass `showBackboardTexture` to the three main plywood panels instead of the unfiltered `showWoodGrain` value. Leave already-solid edge materials unchanged.

In `MultiPanelPlywoodBase`, compute the same boolean and change its material map to:

```tsx
map={showBackboardTexture ? texture : null}
```

- [ ] **Step 5: Run focused and project verification**

Run:

```bash
node --no-warnings --test src/lib/backboardColor.test.mjs
npx tsc --noEmit
npm run build
```

Expected: all commands pass with no new errors.

- [ ] **Step 6: Verify the viewer behavior**

Start the existing development server or a new one if none exists. Confirm in the Viewer that selecting a backboard color removes plywood grain for single- and multi-panel layouts, then confirm Natural restores plywood grain. Stop only a server started for this verification.
