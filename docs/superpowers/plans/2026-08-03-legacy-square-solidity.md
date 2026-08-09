# Legacy Square Solidity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore strong square-to-square relief shadows using the current viewer's dominant light without changing its room or lighting direction.

**Architecture:** A small pure Three.js module owns the contact-shadow camera configuration. The current dominant geometric key uses that art-sized configuration without adding or changing a light; the existing instanced square mesh already casts and receives shadows.

**Tech Stack:** TypeScript, React Three Fiber, Three.js, Node test runner, Next.js

## Global Constraints

- Preserve all current light positions, directions, intensities, colors, and time-of-day rotation.
- Add no light and no material, geometry, room, camera, or interaction change.
- Keep the new pass scoped to the existing art-sized shadow frustum.
- Define numeric settings as named configuration values.
- Preserve unrelated uncommitted work.
- Do not commit or push without explicit user instruction.

---

### Task 1: Art contact-shadow boundary

**Files:**
- Create: `src/components/preview/artLighting.test.mjs`
- Create: `src/components/preview/artLighting.ts`

**Interfaces:**
- Consumes: `THREE.DirectionalLight` and an orthographic frustum half-extent.
- Produces: `configureArtContactShadow(light, frustumHalf)`.

- [x] **Step 1: Write the failing real-Three test**

Create a directional light with a non-default position, intensity, and color.
Assert that the helper makes it cast, configures the art-sized orthographic
shadow camera, and preserves all of those existing light properties.

```js
configureArtContactShadow(light, EXPECTED_FRUSTUM_HALF);

assert.equal(light.castShadow, true);
assert.deepEqual(light.position.toArray(), ORIGINAL_LIGHT_POSITION);
assert.equal(light.intensity, ORIGINAL_LIGHT_INTENSITY);
assert.equal(light.color.getHex(), ORIGINAL_LIGHT_COLOR);
```

- [x] **Step 2: Run the test and verify RED**

Run: `node --no-warnings --test src/components/preview/artLighting.test.mjs`

Expected: FAIL because `artLighting.ts` and its helpers do not exist.

- [x] **Step 3: Implement the minimal camera helper**

Define named shadow camera configuration. Configure the existing light's cast
flag, map size, orthographic bounds, near/far planes, and projection matrix
without modifying its position, intensity, or color.

```ts
export const ART_SHADOW_CAMERA_CONFIG = {
  mapSize: 2048,
  near: 0.5,
  far: 400,
} as const;

export function configureArtContactShadow(
  light: THREE.DirectionalLight,
  frustumHalf: number
): void {
  light.castShadow = true;
  light.shadow.mapSize.set(
    ART_SHADOW_CAMERA_CONFIG.mapSize,
    ART_SHADOW_CAMERA_CONFIG.mapSize
  );
  const camera = light.shadow.camera;
  camera.near = ART_SHADOW_CAMERA_CONFIG.near;
  camera.far = ART_SHADOW_CAMERA_CONFIG.far;
  camera.left = -frustumHalf;
  camera.right = frustumHalf;
  camera.top = frustumHalf;
  camera.bottom = -frustumHalf;
  camera.updateProjectionMatrix();
  light.shadow.needsUpdate = true;
}
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `node --no-warnings --test src/components/preview/artLighting.test.mjs`

Expected: PASS with one test and zero failures.

---

### Task 2: Attach the contact shadow to the existing art key

**Files:**
- Modify: `src/components/preview/LightingSetups.tsx`
- Test: `src/components/preview/artLighting.test.mjs`

**Interfaces:**
- Consumes: `configureArtContactShadow(light, frustumHalf)` from Task 1.
- Produces: one art-sized shadow map from the existing `ART_RIG_KEY_POS` light.

- [x] **Step 1: Configure the existing key without adding illumination**

Give the existing dominant geometric directional light a callback ref that
calls `configureArtContactShadow`. Reuse `useShadowFrustum()` and keep the
existing key position, color, intensity, parent rotation, and target.

- [x] **Step 2: Retain the existing square shadow behavior**

Confirm the visible instanced square mesh retains its existing `castShadow`
and `receiveShadow` flags. Do not change the picking proxy, hover highlight,
selection highlight, plywood, room, or furniture.

- [x] **Step 3: Run focused rendering tests and TypeScript**

Run: `node --no-warnings --test src/components/preview/artLighting.test.mjs src/components/preview/artMaterial.test.mjs src/components/preview/PatternControls.test.mjs`

Run: `npx tsc --noEmit`

Expected: all tests and TypeScript pass.

---

### Task 3: Regression verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes: completed contact-shadow implementation.
- Produces: verified viewer build with a narrowly scoped lighting diff.

- [x] **Step 1: Build the production app**

Run: `npm run build`

Expected: exit code 0.

- [x] **Step 2: Check scope and whitespace**

Run: `git diff --check`

Run: `git diff -- src/components/preview/artLighting.ts src/components/preview/artLighting.test.mjs src/components/preview/LightingSetups.tsx`

Expected: only the dominant key's art-sized shadow configuration is added;
existing light values remain unchanged.

- [x] **Step 3: Verify the local route and renderer when tooling permits**

Confirm `/shared/U7jrGP6hhByn` responds successfully. If a controllable browser
is available, compare the artwork while ensuring its grain and light direction
are unchanged and local wedge contacts are deeper.

Environment note: the local shared route returned HTTP 200 with one dev-server
listener. No controllable browser was connected, so an automated rendered
screenshot comparison was not available.
