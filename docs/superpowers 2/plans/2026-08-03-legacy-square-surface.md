# Legacy Square Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the original viewer's natural square material and grain while retaining the current room, camera, lighting, shadows, interactions, and instanced-rendering performance.

**Architecture:** Keep the one-material `InstancedMesh`. `woodStyles.ts` owns named legacy parameters, `artMaterial.ts` owns material construction and shader customization, and `InstancedSquares.tsx` supplies the front atlas, side texture, and metallic-only environment map.

**Tech Stack:** TypeScript, React Three Fiber, Three.js, Node test runner, Next.js

## Global Constraints

- Do not modify lighting, room, camera, geometry placement, animation, or interaction behavior.
- Keep one instanced square mesh and one material; add no draw calls.
- Keep the metallic finish behavior unchanged.
- Keep AR, USDZ, STEP, and Fusion export material pipelines unchanged.
- Define every numeric tuning value as a named configuration parameter.
- Preserve unrelated and overlapping uncommitted work.
- Do not commit without an explicit commit instruction.

---

### Task 1: Restore the legacy default material

**Files:**
- Modify: `src/components/preview/artMaterial.test.mjs`
- Modify: `src/components/preview/artMaterial.ts`
- Modify: `src/components/preview/woodStyles.ts`

**Interfaces:**
- Consumes: `WOOD_STYLE`, `GRAIN_ATLAS`, and `METALLIC_PAINT`.
- Produces: `ART_MATERIAL_CONFIG`, `createArtMaterial(options)`, and `applyArtGrainShader(shader, options)`.

- [x] **Step 1: Replace the satin-material assertions with failing legacy assertions**

Assert that the nonmetallic result is `THREE.MeshStandardMaterial`, uses
`WOOD_STYLE.roughness` and `WOOD_STYLE.metalness`, has no environment map,
and has `toneMapped === true`. Retain the current metallic assertions and
assert `toneMapped === false` for that branch.

```js
const material = createArtMaterial({
  ...BASE_OPTIONS,
  metallic: false,
  environmentMap: new THREE.Texture(),
});

assert.ok(material instanceof THREE.MeshStandardMaterial);
assert.equal(material.roughness, WOOD_STYLE.roughness);
assert.equal(material.metalness, WOOD_STYLE.metalness);
assert.equal(material.envMap, null);
assert.equal(material.toneMapped, true);
```

- [x] **Step 2: Run the focused test and verify the legacy assertions fail**

Run: `node --no-warnings --test src/components/preview/artMaterial.test.mjs`

Expected: FAIL because the current default branch is a physical satin
material with an environment map and disabled tone mapping.

- [x] **Step 3: Implement the legacy material policy with named values**

Use `WOOD_STYLE` for the default material and branch the tone-mapping policy:

```ts
const material = metallic
  ? new THREE.MeshStandardMaterial({
      map,
      color: ART_BASE_COLOR,
      roughness: METALLIC_PAINT.roughness,
      metalness: METALLIC_PAINT.metalness,
      envMap: environmentMap,
      envMapIntensity: METALLIC_PAINT.envMapIntensity,
    })
  : new THREE.MeshStandardMaterial({
      map,
      color: ART_BASE_COLOR,
      roughness: WOOD_STYLE.roughness,
      metalness: WOOD_STYLE.metalness,
    });

material.toneMapped = metallic
  ? ART_MATERIAL_CONFIG.metallicToneMapped
  : ART_MATERIAL_CONFIG.legacyToneMapped;
```

Remove the default satin parameters and grain-linked roughness configuration.
Keep the metallic environment blur as a named value.

- [x] **Step 4: Restore full-size front-grain sampling**

Set named atlas parameters to the legacy behavior: opacity `0.4`, zoom `1`,
and cell inset `0.94`. Remove the post-grain brightness parameter entirely.
The inset prevents neighboring-cell mip bleed; removing the additional `1.1`
zoom restores the legacy image scale.

- [x] **Step 5: Run the focused tests**

Run: `node --no-warnings --test src/components/preview/artMaterial.test.mjs`

Expected: PASS.

---

### Task 2: Restore the legacy front and side grain shader

**Files:**
- Create: `public/textures/wood-side-grain.jpg`
- Modify: `src/components/preview/artMaterial.test.mjs`
- Modify: `src/components/preview/artMaterial.ts`
- Modify: `src/components/preview/InstancedSquares.tsx`
- Modify: `src/components/preview/woodStyles.ts`

**Interfaces:**
- Consumes: `GRAIN_ATLAS`, `SIDE_GRAIN`, the `aGrainIndex` instance attribute, and the existing `aGrainMask` face attribute.
- Produces: `applyArtGrainShader(shader, { metallic, sideTexture })`.

- [x] **Step 1: Add failing shader assertions**

For the nonmetallic branch, assert that the shader defines a side-grain
sampler, blends the front atlas and side texture using the face mask, retains
the original grain opacity, and contains no brightness multiplier or
roughness modification. For the metallic branch, assert that the existing
front-only treatment remains.

```js
applyArtGrainShader(shader, {
  metallic: false,
  sideTexture: new THREE.Texture(),
});

assert.match(shader.fragmentShader, /uniform sampler2D uSideGrainMap/);
assert.match(shader.fragmentShader, /mix\( sideGrainTexel, frontGrainTexel, vGrainMask \)/);
assert.doesNotMatch(shader.fragmentShader, /uBrightness/);
assert.doesNotMatch(shader.fragmentShader, /roughnessFactor\s*=\s*clamp/);
```

- [x] **Step 2: Run the focused test and verify the shader assertions fail**

Run: `node --no-warnings --test src/components/preview/artMaterial.test.mjs`

Expected: FAIL because the current shader has no side sampler and still
contains brightness and roughness adjustments.

- [x] **Step 3: Add the verified original side-grain asset**

Use the production asset from
`https://viewer.everwoodus.com/textures/wood-side-grain.jpg` and verify its
SHA-256 is
`23001486b6c9407f4fff56072a5fa9d19572e3c8a1b56606d9249d8ebbb79c44`.

- [x] **Step 4: Add named side-grain configuration**

Define the side texture path, repeat values of `0.2` on both axes, and texture
anisotropy of `8` as named configuration in `woodStyles.ts`. Configure both
axes with `THREE.RepeatWrapping` at the texture-loading boundary.

- [x] **Step 5: Implement the legacy shader blend**

Keep the existing atlas-cell vertex calculation. In the nonmetallic fragment
path, sample the atlas for the front face and the side texture for other
faces, select between them with `vGrainMask`, and multiply the chosen grain
into the instance color at the configured opacity. Do not modify roughness or
apply a post-grain brightness multiplier. Preserve the current metallic
front-face-only behavior.

- [x] **Step 6: Supply the side texture and make the PMREM metallic-only**

Load the atlas and side texture once in `InstancedSquares.tsx`, configure
their color space, wrapping, repeat, and anisotropy, and pass the side texture
to `applyArtGrainShader`. Create and dispose the neutral environment target
only while `metallic` is enabled.

- [x] **Step 7: Run focused tests and the compiler**

Run: `node --no-warnings --test src/components/preview/artMaterial.test.mjs`

Run: `npx tsc --noEmit`

Expected: both PASS.

---

### Task 3: Full regression and visual verification

**Files:**
- Verify only; make only narrowly scoped corrections if a verification step exposes a defect.

**Interfaces:**
- Consumes: completed legacy material and shader path.
- Produces: verified production-ready square rendering.

- [x] **Step 1: Run related square-material tests**

Run: `node --no-warnings --test src/components/preview/artMaterial.test.mjs src/components/preview/PatternControls.test.mjs`

Expected: PASS.

- [x] **Step 2: Run the production build**

Run: `npm run build`

Expected: PASS.

- [x] **Step 3: Inspect scope and whitespace**

Run: `git diff --check`

Run: `git diff -- src/components/preview/artMaterial.ts src/components/preview/artMaterial.test.mjs src/components/preview/InstancedSquares.tsx src/components/preview/woodStyles.ts`

Expected: only the approved square-surface behavior changes; lighting and
scene files remain untouched.

- [ ] **Step 4: Verify the live visual flow locally**

Start the existing development server, open the same shared design in the
current shared page, and compare it with the original viewer from equivalent
camera angles. Confirm stronger readable grain, saturated paint, natural
relief shading, textured visible sides, unchanged light direction, and no
browser-console errors.

Environment note: the local shared page and legacy texture both return HTTP
200, but no controllable browser is connected, so the rendered screenshot and
console comparison could not be performed in this session.
