# Night Lamp Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users click the floor lamp to switch its visible glow and lamp-driven lighting on or off during night mode in both viewer surfaces.

**Architecture:** Each viewer host owns one local `lampOn` switch. A pure helper enforces night-only behavior, while `Room` handles lamp pointer interaction and `RotatableLighting` uses the same switch for the art-facing lamp light.

**Tech Stack:** Next.js 16, React 19, React Three Fiber, Three.js, Node test runner

## Global Constraints

- The lamp switch starts on.
- Morning and afternoon force the effective lamp off and ignore lamp clicks.
- The local switch survives time-of-day changes during the page session.
- The switch is not persisted or encoded into shared data.
- Do not commit or push unless the user explicitly asks.

---

### Task 1: Define the lamp switch rules

**Files:**
- Create: `src/components/preview/lampInteraction.test.mjs`
- Create: `src/components/preview/lampInteraction.ts`

**Interfaces:**
- Produces: `DEFAULT_LAMP_ON`, `isLampEffectivelyOn(timeOfDay, lampOn)`, and `toggleLampAtTimeOfDay(timeOfDay, lampOn)`

- [x] **Step 1: Write the failing test**

Test literal outcomes for morning, afternoon, and night. Confirm night toggles in both directions while daytime returns the previous switch unchanged.

- [x] **Step 2: Run the test and verify red**

```bash
node --no-warnings --test src/components/preview/lampInteraction.test.mjs
```

Expected: failure because `lampInteraction.ts` does not exist.

- [x] **Step 3: Implement the minimal pure rules**

```ts
export const DEFAULT_LAMP_ON = true;

export function isLampEffectivelyOn(
  timeOfDay: TimeOfDay,
  lampOn: boolean,
): boolean {
  return timeOfDay === "night" && lampOn;
}

export function toggleLampAtTimeOfDay(
  timeOfDay: TimeOfDay,
  lampOn: boolean,
): boolean {
  return timeOfDay === "night" ? !lampOn : lampOn;
}
```

- [x] **Step 4: Run the focused test and verify green**

Run the Task 1 command and expect every assertion to pass.

### Task 2: Synchronize the visible lamp and lamp-driven art light

**Files:**
- Modify: `src/components/preview/Room.tsx`
- Modify: `src/components/preview/RotatableLighting.tsx`

**Interfaces:**
- `Room` consumes optional `lampOn: boolean` and `onLampToggle: () => void`.
- `RotatableLighting` consumes optional `lampOn: boolean`.

- [x] **Step 1: Add the Room interaction**

Calculate the effective lamp state with `isLampEffectivelyOn`. Add an invisible, named-dimension hit box around the lamp group. Use React Three Fiber pointer handlers and `useCursor` so only night mode presents the lamp as interactive. Stop event propagation before invoking `onLampToggle`.

- [x] **Step 2: Drive Room lighting from the switch**

Keep the existing night-entry delay. Feed the delayed night readiness and `lampOn` into the eased glow target, force the glow to zero when the effective lamp is off, and leave daytime behavior unchanged.

- [x] **Step 3: Drive RotatableLighting from the same switch**

Default `lampOn` to `DEFAULT_LAMP_ON`, then multiply the existing night lamp amount by the switch. Keep daylight, downlights, and the night fill rig unchanged.

- [x] **Step 4: Type-check the component contracts**

```bash
npx tsc --noEmit
```

Expected: no diagnostics.

### Task 3: Wire both viewer hosts

**Files:**
- Modify: `src/app/viewer/page.tsx`
- Modify: `src/components/preview/GalleryArtScene.tsx`
- Modify: `src/app/shared/[id]/page.tsx`

**Interfaces:**
- Main viewer owns `lampOn` and passes it directly to `Room` and `RotatableLighting`.
- Shared viewer owns `lampOn`; `GalleryArtScene` forwards it to both scene components.

- [x] **Step 1: Wire the main viewer**

Initialize local state from `DEFAULT_LAMP_ON`. Use `toggleLampAtTimeOfDay` in a functional state update. Pass the value to `Room` and `RotatableLighting`, and pass the toggle callback to `Room`.

- [x] **Step 2: Extend GalleryArtScene**

Add optional `lampOn` and `onLampToggle` props with the default switch value. Forward both through the existing room and lighting branches.

- [x] **Step 3: Wire the shared viewer**

Add local switch state beside `timeOfDay` and `wallColor`. Build the night-only functional toggle callback and pass the switch and callback to `GalleryArtScene`.

- [x] **Step 4: Re-run focused and type checks**

```bash
node --no-warnings --test src/components/preview/lampInteraction.test.mjs
npx tsc --noEmit
git diff --check
```

Expected: all commands exit zero.

### Task 4: Verify the complete interaction

**Files:**
- Modify: `docs/superpowers/plans/2026-07-29-night-lamp-toggle.md`

- [x] **Step 1: Run the full test suite**

```bash
node --no-warnings --test $(rg --files -g '*.test.mjs' | sort)
```

Expected: zero failures.

- [x] **Step 2: Start and browser-check the dev server**

Open the main viewer, select Night, click the lamp off and on, and confirm both the shade/room glow and the lamp-driven art light change. Switch to Afternoon and confirm clicking the lamp has no effect.

- [x] **Step 3: Browser-check a shared viewer**

Open a valid shared design, repeat the night toggle in both directions, and confirm daytime clicks do nothing.

- [x] **Step 4: Recheck repository scope**

Confirm the lamp files and documentation are the only new task changes. Preserve every pre-existing workspace modification and do not commit or push.
