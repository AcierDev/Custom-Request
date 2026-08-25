# Default Satin Art Finish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every default art square a realistic, restrained satin-painted finish while preserving its color, geometry, grain, and rendering performance.

**Architecture:** `artMaterial.ts` owns the finish parameters, material factory, and reusable grain shader patch. `InstancedSquares.tsx` continues to own the shared PMREM environment and one-material instanced render path, but delegates shader customization to the material module.

**Tech Stack:** TypeScript, Three.js, React Three Fiber, Node test runner

## Global Constraints

- Keep tone mapping disabled on artwork for palette and dark-color fidelity.
- Keep the experimental metallic finish behavior unchanged.
- Add no texture assets, dependencies, materials, or draw calls.
- Define every tunable finish value as a named configuration parameter.
- Do not commit; repository policy requires an explicit user instruction.

---

### Task 1: Satin material factory

**Files:**
- Modify: `src/components/preview/artMaterial.test.mjs`
- Modify: `src/components/preview/artMaterial.ts`

**Interfaces:**
- Consumes: `CreateArtMaterialOptions` with `metallic`, `texture`, `showWoodGrain`, and `environmentMap`.
- Produces: `ART_MATERIAL_CONFIG` and `createArtMaterial(options): THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial`.

- [x] **Step 1: Write the failing default-finish assertions**

Import `ART_MATERIAL_CONFIG`, create a real `THREE.Texture` environment, and assert that the nonmetallic factory result is a `THREE.MeshPhysicalMaterial` whose `metalness`, `roughness`, `specularIntensity`, `envMapIntensity`, `envMap`, and `toneMapped` fields match the named configuration.

- [x] **Step 2: Run the material test and verify it fails**

Run: `node --no-warnings --test src/components/preview/artMaterial.test.mjs`

Expected: FAIL because the default factory result is still `MeshPhongMaterial` and has no satin PBR configuration.

- [x] **Step 3: Implement the minimal satin factory**

Expand `ART_MATERIAL_CONFIG` with a `satin` object containing named `metalness`, `roughness`, `specularIntensity`, and `envMapIntensity` values. Construct a `THREE.MeshPhysicalMaterial` from those values when `metallic` is false. Preserve the current `MeshStandardMaterial` metallic branch and apply `toneMapped: false` to both.

- [x] **Step 4: Run the material test and verify it passes**

Run: `node --no-warnings --test src/components/preview/artMaterial.test.mjs`

Expected: all tests PASS.

---

### Task 2: Grain-linked surface variation and environment reflections

**Files:**
- Modify: `src/components/preview/artMaterial.test.mjs`
- Modify: `src/components/preview/artMaterial.ts`
- Modify: `src/components/preview/InstancedSquares.tsx`

**Interfaces:**
- Consumes: Three shader objects with `uniforms`, `vertexShader`, and `fragmentShader`.
- Produces: `applyArtGrainShader(shader, metallic): void`, which injects the existing atlas UV/diffuse behavior plus default-only roughness variation.

- [x] **Step 1: Write the failing shader-patch test**

Create a minimal shader fixture containing `#include <uv_vertex>`, `#include <roughnessmap_fragment>`, and `#include <map_fragment>`. Assert that `applyArtGrainShader(shader, false)` adds named roughness uniforms and replaces the roughness chunk with a clamped, front-face-masked variation. Assert that `applyArtGrainShader(shader, true)` sets the variation strength to the named disabled value so metallic behavior remains unchanged.

- [x] **Step 2: Run the material test and verify it fails**

Run: `node --no-warnings --test src/components/preview/artMaterial.test.mjs`

Expected: FAIL because `applyArtGrainShader` does not exist.

- [x] **Step 3: Extract and extend the shader patch**

Move the current grain uniform and shader-string customization from `InstancedSquares.tsx` into `applyArtGrainShader`. Preserve atlas sampling and diffuse brightness exactly. Add default-only roughness modulation from grain luminance, bounded by named floor and ceiling parameters. In `InstancedSquares.tsx`, call the helper from `onBeforeCompile` and keep saving the compiled shader in `material.userData.shader`.

- [x] **Step 4: Make the PMREM environment available to the default finish**

Rename the environment blur constant for general artwork use and remove the `metallic` early return from the PMREM memo. Keep the existing neutral `RoomEnvironment`, cleanup, and single shared material behavior.

- [x] **Step 5: Run focused tests and the compiler**

Run: `node --no-warnings --test src/components/preview/artMaterial.test.mjs`

Run: `npx tsc --noEmit`

Expected: both commands PASS.

---

### Task 3: Regression verification

**Files:**
- Verify only; no planned source changes.

**Interfaces:**
- Consumes: completed satin material and instanced shader path.
- Produces: evidence that the change is buildable and isolated.

- [x] **Step 1: Run the production build**

Run: `npm run build`

Expected: Next.js production build completes successfully.

- [x] **Step 2: Inspect the final diff**

Run: `git diff --check`

Run: `git diff -- src/components/preview/artMaterial.ts src/components/preview/artMaterial.test.mjs src/components/preview/InstancedSquares.tsx docs/superpowers/specs/2026-08-01-default-satin-art-finish-design.md docs/superpowers/plans/2026-08-01-default-satin-art-finish.md`

Expected: only the satin material, shader integration, tests, and documentation changed; no whitespace errors.
