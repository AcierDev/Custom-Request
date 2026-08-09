# Grain Micro-Relief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the default grained wood squares a subtle recessed earlywood response using the existing atlas and current lighting.

**Architecture:** Reuse the front grain atlas as the default material's bump map with a named, low negative scale. The existing shader patch remaps Three.js's built-in bump UV to each instance's selected atlas cell and collapses non-front faces to a constant UV so only the square face receives micro-relief.

**Tech Stack:** TypeScript, Three.js, React Three Fiber, Node test runner, Next.js

## Global Constraints

- Keep the effect subtle and driven by the current lights.
- Apply it only to default nonmetallic geometric squares while wood grain is visible.
- Do not change grain color, opacity, scale, geometry, silhouette, placement, draw count, room, camera, shadows, time-of-day behavior, backing board, exports, or metallic rendering.
- Add no texture asset, geometry subdivision, post-processing pass, or light.
- Define the relief magnitude as a named configuration value.
- Preserve unrelated uncommitted work.
- Do not commit or push without explicit user instruction.

---

### Task 1: Default wood grain micro-relief

**Files:**
- Modify: `src/components/preview/artMaterial.test.mjs`
- Modify: `src/components/preview/artMaterial.ts`
- Modify: `src/components/preview/woodStyles.ts`

**Interfaces:**
- Consumes: the existing front atlas texture, `showWoodGrain`, `metallic`, `aGrainIndex`, and `aGrainMask`.
- Produces: `GRAIN_RELIEF.bumpScale` and front-face `vBumpMapUv` remapping inside `applyArtGrainShader`.

- [x] **Step 1: Write failing material-policy tests**

Add a literal expected negative bump scale and verify the three supported
material states:

```js
const EXPECTED_GRAIN_BUMP_SCALE = -0.04;

test("default grained wood uses the atlas as subtle inverted relief", () => {
  const texture = new THREE.Texture();
  const material = createArtMaterial({
    ...BASE_OPTIONS,
    texture,
    showWoodGrain: true,
    metallic: false,
  });

  assert.equal(material.bumpMap, texture);
  assert.equal(material.bumpScale, EXPECTED_GRAIN_BUMP_SCALE);
  material.dispose();
  texture.dispose();
});

test("grain relief stays off when grain is hidden or metallic", () => {
  const texture = new THREE.Texture();
  const hidden = createArtMaterial({
    ...BASE_OPTIONS,
    texture,
    showWoodGrain: false,
    metallic: false,
  });
  const metallic = createArtMaterial({
    ...BASE_OPTIONS,
    texture,
    showWoodGrain: true,
    metallic: true,
  });

  assert.equal(hidden.bumpMap, null);
  assert.equal(metallic.bumpMap, null);
  hidden.dispose();
  metallic.dispose();
  texture.dispose();
});
```

- [x] **Step 2: Write a failing atlas-UV relief test**

Extend the existing nonmetallic shader test to assert that the built-in bump
varying samples the selected cell on the face and the cell center elsewhere.
Also assert that metallic shader source contains no bump remapping.

```js
assert.match(shader.vertexShader, /#ifdef USE_BUMPMAP/);
assert.match(shader.vertexShader, /vec2 grainCellCenter/);
assert.match(
  shader.vertexShader,
  /vBumpMapUv\s*=\s*mix\(\s*grainCellCenter,\s*vGrainUv,\s*vGrainMask\s*\)/,
);

const metallicShader = createShaderFixture();
const metallicSideTexture = new THREE.Texture();
applyArtGrainShader(metallicShader, {
  metallic: true,
  sideTexture: metallicSideTexture,
});
assert.doesNotMatch(metallicShader.vertexShader, /vBumpMapUv/);
metallicSideTexture.dispose();
```

- [x] **Step 3: Run the focused test and verify RED**

Run: `node --no-warnings --test src/components/preview/artMaterial.test.mjs`

Expected: FAIL because default wood has no bump map and the shader has no
front-face bump UV remapping.

- [x] **Step 4: Add named relief configuration**

Add the configuration beside `GRAIN_ATLAS` in `woodStyles.ts`:

```ts
export const GRAIN_RELIEF = {
  /** Negative inverts the pale atlas bands into shallow recesses. */
  bumpScale: -0.04,
} as const;
```

- [x] **Step 5: Bind the atlas as the default material's bump source**

Import `GRAIN_RELIEF` in `artMaterial.ts`. Add the existing visible grain map
to only the default nonmetallic material:

```ts
: new THREE.MeshStandardMaterial({
    map,
    bumpMap: map,
    bumpScale: GRAIN_RELIEF.bumpScale,
    color: ART_BASE_COLOR,
    metalness: WOOD_STYLE.metalness,
    roughness: WOOD_STYLE.roughness,
  });
```

When grain is hidden, `map` is `null`, so no `USE_BUMPMAP` shader define is
enabled. Do not add these properties to the metallic branch.

- [x] **Step 6: Remap the built-in bump UV to the front atlas cell**

Inside `applyArtGrainShader`, add this vertex assignment only for the
nonmetallic branch, after `vGrainUv` and `vGrainMask` are assigned:

```glsl
#ifdef USE_BUMPMAP
  vec2 grainCellCenter = (vec2(col, row) + 0.5) / uGrid;
  vBumpMapUv = mix(grainCellCenter, vGrainUv, vGrainMask);
#endif
```

Front vertices have `vGrainMask == 1`, so they use the selected atlas image.
Side and back vertices have `vGrainMask == 0`, so their constant UV produces
no bump gradient.

- [x] **Step 7: Run the focused test and verify GREEN**

Run: `node --no-warnings --test src/components/preview/artMaterial.test.mjs`

Expected: all material tests pass with zero failures.

---

### Task 2: Regression verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes: completed grain micro-relief implementation.
- Produces: a verified viewer build with no unrelated behavior changes.

- [x] **Step 1: Run every Node test**

Run: `rg --files -0 -g '*.test.mjs' | xargs -0 node --no-warnings --test`

Expected: all discovered tests pass with zero failures.

- [x] **Step 2: Run TypeScript**

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [x] **Step 3: Build the production app**

Run: `npm run build`

Expected: exit code 0.

- [x] **Step 4: Check scope and whitespace**

Run: `git diff --check`

Run: `git diff -- src/components/preview/artMaterial.test.mjs src/components/preview/artMaterial.ts src/components/preview/woodStyles.ts`

Expected: only the named bump configuration, default material binding, atlas
UV remapping, and their tests are added on top of the existing square-surface
work.

- [x] **Step 5: Verify the local shared route and visual result when tooling permits**

Confirm `/shared/U7jrGP6hhByn` returns HTTP 200. If a controllable browser is
available, inspect a close raking angle and confirm the pale bands recess
slightly without changing grain color, silhouettes, or metallic rendering.

Environment note: the shared route returned HTTP 200 with one dev-server
listener. No controllable browser backend was connected, so an automated
rendered screenshot comparison was unavailable.
