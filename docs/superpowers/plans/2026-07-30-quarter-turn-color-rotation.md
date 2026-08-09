# Quarter-Turn Color Rotation Implementation Plan

> Execute with the `superpowers:executing-plans` workflow.

## Task 1: Protect the four-state transition

**Files**

- Create: `src/lib/colorRotation.test.mjs`
- Create: `src/lib/colorRotation.ts`

1. Add a test with literal expectations for 0° → 90° → 180° → 270° → 0°.
2. Run it and confirm it fails because the helper does not exist.
3. Implement the minimal pure next-state helper.
4. Run it and confirm it passes.

## Task 2: Add one atomic store action

**Files**

- Create: `src/store/customStore.colorRotation.test.mjs`
- Modify: `src/store/customStore.ts`

1. Add a test that invokes the real store action four times and asserts every
   literal state.
2. Run it and confirm it fails because the action does not exist.
3. Add the typed action and update both flags in one Zustand `set`.
4. Run the focused tests.

## Task 3: Wire the viewer control

**Files**

- Modify: `src/components/preview/PatternControls.tsx`

1. Replace the boolean toggle with the atomic quarter-turn action.
2. Treat either rotation flag as an active rotation for button styling.
3. Run the component and rotation tests.

## Task 4: Verify

1. Run `node --no-warnings --test`.
2. Run `npx tsc --noEmit`.
3. Run `git diff --check`.
4. Run `npm run build`.
