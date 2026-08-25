# Fusion Package Metadata and Wood Appearance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dated, descriptive STEP metadata and a Viewer-downloadable Fusion package that preserves editable solids while supplying color-tinted wood appearances.

**Architecture:** Keep OpenCascade STEP generation in the existing one-shot worker. Add pure metadata and Fusion-package builders around it, generate color-tinted texture assets lazily in the browser, and package the STEP plus a standard Fusion Python script with `fflate`. Keep the direct STEP action and add a separate `Fusion + Wood` action.

**Tech Stack:** TypeScript 5.9, React 19, Next.js 16/Turbopack, Web Workers, OpenCascade AP242/XCAF, Canvas 2D, `fflate` 0.8.2, Node test runner, Fusion 360 Python API.

## Global Constraints

- STEP remains the editable, correctly scaled, millimeter source of truth.
- Preserve `Everwood Art > Backboard + Squares > Square ###`.
- Preserve STEP colors, panel bodies, hidden-square omission, and physical scale.
- Description is `Editable Everwood Art model exported from the Viewer`.
- STEP filename is `everwood-art-YYYY-MM-DD-HHmm.step`.
- Fusion package filename is `everwood-art-fusion-YYYY-MM-DD-HHmm.zip`.
- Use one captured export instant for filenames, headers, and manifests.
- Use released Fusion appearance APIs only; do not use July 2026 preview APIs.
- Do not initialize OpenCascade, load texture images, or load ZIP code before a download action.
- Define numeric behavior through named configuration values.
- Commit locally but do not push or deploy.

---

### Task 1: STEP Description, Date, and Filename

**Files:**
- Create: `src/lib/step/stepMetadata.ts`
- Create: `src/lib/step/stepMetadata.test.mjs`
- Modify: `src/lib/step/stepConfig.ts`
- Modify: `src/lib/step/openCascadeExporter.ts`
- Modify: `src/lib/step/openCascadeExporter.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `createStepExportMetadata(exportedAt: Date): StepExportMetadata`
- Produces: `applyStepHeaderMetadata(bytes: Uint8Array, metadata: StepExportMetadata): Uint8Array`
- Produces: `StepExportMetadata` with `description`, `exportedAtIso`, `filename`, and `filenameStamp`
- Changes: `exportStepModel(openCascade, plan, metadata): StepExportResult`

- [ ] **Step 1: Write failing metadata tests**

Add tests that hand-check a local date and apostrophe escaping:

```js
const EXPORTED_AT = new Date(2026, 6, 28, 9, 7, 6);
const metadata = createStepExportMetadata(EXPORTED_AT);

assert.equal(metadata.filename, "everwood-art-2026-07-28-0907.step");
assert.equal(
  metadata.description,
  "Editable Everwood Art model exported from the Viewer",
);
assert.equal(metadata.exportedAtIso, EXPORTED_AT.toISOString());

const rewritten = new TextDecoder().decode(
  applyStepHeaderMetadata(
    new TextEncoder().encode(SAMPLE_STEP_HEADER),
    { ...metadata, description: "Everwood's editable model" },
  ),
);
assert.match(
  rewritten,
  /FILE_DESCRIPTION\(\('Everwood''s editable model'\),'2;1'\);/,
);
assert.match(
  rewritten,
  /FILE_NAME\('everwood-art-2026-07-28-0907\.step','2026-/,
);
```

The production change this catches is returning the old millisecond filename or
leaving OpenCascade’s generic header records intact.

- [ ] **Step 2: Run the tests and confirm RED**

Run:

```bash
node --no-warnings --test src/lib/step/stepMetadata.test.mjs
```

Expected: FAIL because `stepMetadata.ts` does not exist.

- [ ] **Step 3: Implement pure metadata helpers**

Add named values to `STEP_EXPORT_CONFIG`:

```ts
description: "Editable Everwood Art model exported from the Viewer",
filenameDateSeparator: "-",
stepHeaderImplementationLevel: "2;1",
stepHeaderAuthor: "Everwood",
stepHeaderOrganization: "Everwood",
stepHeaderPreprocessorVersion: "Everwood Palette Viewer",
stepHeaderOriginatingSystem: "Everwood Palette Viewer",
stepHeaderAuthorization: "",
dateComponentWidth: 2,
```

Implement local filename formatting without locale-dependent output, escape STEP
strings by doubling apostrophes, and replace only `FILE_DESCRIPTION` and
`FILE_NAME` records inside the `HEADER` section. Throw the configured export
error when either record is missing.

- [ ] **Step 4: Verify metadata GREEN**

Run the single test again and expect all assertions to pass.

- [ ] **Step 5: Wire metadata into OpenCascade export**

Change the exporter to receive injected metadata, rewrite the emitted bytes, and
return the metadata filename:

```ts
export function exportStepModel(
  openCascade: OpenCascadeInstance,
  plan: StepModelPlan,
  metadata: StepExportMetadata,
): StepExportResult {
  // Existing XCAF generation remains unchanged.
  const output = new Uint8Array(
    openCascade.FS.readFile(STEP_EXPORT_CONFIG.virtualOutputPath, {
      encoding: "binary",
    }),
  );
  return {
    bytes: applyStepHeaderMetadata(output, metadata),
    filename: metadata.filename,
  };
}
```

Update the OpenCascade integration test to inject `EXPORTED_AT`, assert the
exact description/date records, and retain the existing OpenCascade readback
bounds assertion.

- [ ] **Step 6: Run STEP integration tests**

Run:

```bash
npm run test:step
```

Expected: all STEP tests pass with unchanged bounds.

- [ ] **Step 7: Commit Task 1**

```bash
git add package.json src/lib/step/stepConfig.ts src/lib/step/stepMetadata.ts src/lib/step/stepMetadata.test.mjs src/lib/step/openCascadeExporter.ts src/lib/step/openCascadeExporter.test.mjs
git commit -m "feat(step): add export description and date"
```

---

### Task 2: One Timestamp Through the Worker and Download Client

**Files:**
- Modify: `src/lib/step/stepWorkerProtocol.ts`
- Modify: `src/lib/step/stepExport.worker.ts`
- Modify: `src/lib/step/exportStep.ts`
- Modify: `src/lib/step/exportStep.test.mjs`

**Interfaces:**
- Produces: `generateStepFile(snapshot, options): Promise<GeneratedStepFile>`
- Produces: `downloadGeneratedFile(file, options): void`
- Retains: `generateStepDownload(snapshot, options): Promise<void>`
- Adds: `now?: () => Date` to `StepDownloadOptions`

- [ ] **Step 1: Write failing client lifecycle tests**

Assert that one injected date is converted to ISO once, sent to the worker, and
returned as a reusable file without triggering a download:

```js
const EXPORTED_AT = new Date("2026-07-28T16:07:06.000Z");
const generation = generateStepFile(snapshot, {
  workerFactory: () => worker,
  requestIdFactory: () => REQUEST_ID,
  now: () => EXPORTED_AT,
});

assert.equal(
  worker.posted[0].exportedAtIso,
  "2026-07-28T16:07:06.000Z",
);
worker.emitMessage({
  kind: "success",
  requestId: REQUEST_ID,
  filename: "everwood-art-2026-07-28-0907.step",
  exportedAtIso: EXPORTED_AT.toISOString(),
  description: STEP_DESCRIPTION,
  buffer,
});
assert.deepEqual(await generation, {
  filename: "everwood-art-2026-07-28-0907.step",
  exportedAtIso: EXPORTED_AT.toISOString(),
  description: STEP_DESCRIPTION,
  buffer,
});
```

The production change this catches is generating different timestamps in the
main thread, worker, filename, and future ZIP manifest.

- [ ] **Step 2: Run and confirm RED**

Run:

```bash
node --no-warnings --test src/lib/step/exportStep.test.mjs
```

Expected: FAIL because `generateStepFile` and timestamp protocol fields do not
exist.

- [ ] **Step 3: Implement reusable file generation**

Capture `now()` before creating the worker, add `exportedAtIso` to the request,
construct `StepExportMetadata` in the worker, and return the same description
and timestamp in the success response. Refactor the existing download wrapper
to call `generateStepFile`, create one Blob, click one hidden anchor, revoke the
URL, and terminate the worker on every path.

- [ ] **Step 4: Verify GREEN and regression coverage**

Run:

```bash
node --no-warnings --test src/lib/step/exportStep.test.mjs
npm run test:step
```

Expected: all client cleanup, mismatch, and worker error tests still pass.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/lib/step/stepWorkerProtocol.ts src/lib/step/stepExport.worker.ts src/lib/step/exportStep.ts src/lib/step/exportStep.test.mjs
git commit -m "refactor(step): reuse generated files"
```

---

### Task 3: Fusion Manifest, Script, README, and ZIP

**Files:**
- Create: `src/lib/fusion/fusionPackageConfig.ts`
- Create: `src/lib/fusion/fusionPackageTypes.ts`
- Create: `src/lib/fusion/fusionAppearanceScript.ts`
- Create: `src/lib/fusion/fusionPackage.ts`
- Create: `src/lib/fusion/fusionPackage.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `yarn.lock`

**Interfaces:**
- Consumes: `GeneratedStepFile`, `ArtSnapshot`
- Produces: `createFusionManifest(snapshot, stepFile, textureMap): FusionDesignManifest`
- Produces: `buildFusionPackage(input): GeneratedFusionPackage`
- Produces: `FUSION_APPEARANCE_SCRIPT` and `FUSION_SCRIPT_MANIFEST`

- [ ] **Step 1: Add direct ZIP dependency**

Run:

```bash
npm install --save-exact fflate@0.8.2
```

Verify both lockfiles record the direct dependency and do not change unrelated
versions.

- [ ] **Step 2: Write failing package-content tests**

Use two visible squares, one hidden square, two shared texture keys, and literal
binary fixtures. Unzip the real result with `unzipSync` and assert:

```js
assert.deepEqual(Object.keys(entries).sort(), [
  "EverwoodAppearance/EverwoodAppearance.manifest",
  "EverwoodAppearance/EverwoodAppearance.py",
  "EverwoodAppearance/design-manifest.json",
  "EverwoodAppearance/textures/grain-red-01.png",
  "EverwoodAppearance/textures/plywood.png",
  "README.txt",
  "everwood-art-2026-07-28-0907.step",
]);
assert.equal(manifest.squares.length, 2);
assert.equal(manifest.squares[0].componentName, "Square 001");
assert.equal(manifest.squares[0].colorHex, "#AA0000");
assert.equal(
  packageResult.filename,
  "everwood-art-fusion-2026-07-28-0907.zip",
);
```

The production change this catches is omitting an asset, including hidden
squares, or mapping texture files to the wrong stable component names.

- [ ] **Step 3: Run and confirm RED**

Run:

```bash
node --no-warnings --test src/lib/fusion/fusionPackage.test.mjs
```

Expected: FAIL because the Fusion package modules do not exist.

- [ ] **Step 4: Implement package types and pure manifest builder**

Use explicit types:

```ts
export interface FusionTextureAsset {
  filename: string;
  bytes: Uint8Array;
}

export interface FusionAppearanceMapping {
  componentName: string;
  colorHex: string;
  textureFilename: string | null;
}

export interface FusionDesignManifest {
  description: string;
  exportedAtIso: string;
  stepFilename: string;
  backboard: FusionAppearanceMapping;
  squares: FusionAppearanceMapping[];
}
```

Derive `Square ###` names in the same visible-square order as
`buildStepModelPlan`; do not duplicate hidden components.

- [ ] **Step 5: Implement stable Fusion script assets**

Generate a standard Python script folder with a fixed manifest structure and a
unique configured script ID. The Python script must:

```py
def run(context):
    app = adsk.core.Application.get()
    ui = app.userInterface
    design = adsk.fusion.Design.cast(app.activeProduct)
    manifest = load_manifest(Path(__file__).parent / "design-manifest.json")
    components = collect_components(design.rootComponent)
    apply_mapping(design, components, manifest["backboard"])
    for mapping in manifest["squares"]:
        apply_mapping(design, components, mapping)
```

`apply_mapping` finds the named component, copies its current body appearance
with `design.appearances.addByCopy`, finds a writable
`adsk.core.ColorProperty`, enables `hasConnectedTexture`, calls
`connectedTexture.changeTextureImage`, and applies the copied appearance.
Errors are accumulated and shown once. Geometry and transforms are never
mutated.

- [ ] **Step 6: Implement README and ZIP assembly**

The README gives exact steps:

1. Unzip the package.
2. Open/import the `.step` file in Fusion.
3. Open **Utilities > Add-Ins > Scripts and Add-Ins**.
4. Use the green `+` to link the `EverwoodAppearance` folder.
5. Select `EverwoodAppearance` and click **Run**.

Build the archive with `zipSync` and UTF-8 encode all text entries.

- [ ] **Step 7: Verify package GREEN and Python syntax**

Run:

```bash
node --no-warnings --test src/lib/fusion/fusionPackage.test.mjs
python3 -m py_compile /tmp/EverwoodAppearance.py
```

The test writes the generated script to the exact temporary path before the
syntax command. Expected: package tests pass and Python exits 0.

- [ ] **Step 8: Commit Task 3**

```bash
git add package.json package-lock.json yarn.lock src/lib/fusion
git commit -m "feat(fusion): build appearance packages"
```

---

### Task 4: Lazy Wood Texture Generation and Viewer Action

**Files:**
- Create: `src/lib/fusion/fusionTextures.ts`
- Create: `src/lib/fusion/fusionTextures.test.mjs`
- Create: `src/lib/fusion/exportFusionPackage.ts`
- Create: `src/components/FusionPackageDownloadButton.tsx`
- Modify: `src/app/viewer/page.tsx`
- Modify: `src/lib/fusion/fusionPackageConfig.ts`

**Interfaces:**
- Produces: `tintWoodPixels(pixels, colorHex, mode): Uint8ClampedArray`
- Produces: `createFusionTextureAssets(snapshot): Promise<FusionTextureBuildResult>`
- Produces: `generateFusionPackageDownload(snapshot, options): Promise<void>`

- [ ] **Step 1: Write failing pixel and deduplication tests**

Use hand-derived pixel literals:

```js
assert.deepEqual(
  Array.from(tintWoodPixels(
    new Uint8ClampedArray([255, 255, 255, 255]),
    "#804020",
    "square",
  )),
  [122, 61, 30, 255],
);
assert.equal(
  getSquareTextureKey({ color: "#AA0000", grainIndex: 3 }),
  getSquareTextureKey({ color: "#aa0000", grainIndex: 3 }),
);
```

The production change this catches is applying grain without the square color,
mixing channels in sRGB instead of linear light, or generating duplicate assets
for normalized-identical inputs.

- [ ] **Step 2: Run and confirm RED**

Run:

```bash
node --no-warnings --test src/lib/fusion/fusionTextures.test.mjs
```

Expected: FAIL because `fusionTextures.ts` does not exist.

- [ ] **Step 3: Implement pure color processing**

Move or share the existing sRGB/linear conversion math and use the Viewer’s
`GRAIN_ATLAS.opacity`, `brightness`, `cellInset`, `zoom`, `grid`, and `count`.
Output an opaque, named-size PNG per unique normalized color/grain pair. Use the
existing plywood image for the backboard. Reject invalid colors and out-of-range
grain indexes with the configured package error.

- [ ] **Step 4: Verify pixel tests GREEN**

Run the texture test and expect all literal pixel and key assertions to pass.

- [ ] **Step 5: Implement lazy browser asset generation**

Only inside the Fusion button click:

- dynamically import `fflate` through `fusionPackage.ts`;
- load `/textures/grain-atlas.png` and `/textures/plywood.jpg`;
- draw the configured crop to an offscreen canvas;
- encode via `canvas.toBlob("image/png")`;
- deduplicate by normalized color and grain index;
- pass assets into `buildFusionPackage`;
- trigger one ZIP download and revoke its object URL.

Provide dependency injection for image loading, canvas encoding, object URLs,
and the current date so lifecycle tests remain deterministic.

- [ ] **Step 6: Add Viewer action**

Add `FusionPackageDownloadButton` next to `Download STEP`, using:

- desktop label `Fusion + Wood`;
- mobile `aria-label` and `title` `Download Fusion package with wood`;
- busy label `Building Fusion package…`;
- duplicate-click guard;
- success and actionable failure toasts.

Do not modify the direct STEP action.

- [ ] **Step 7: Run component-level checks**

Run:

```bash
npm run test:step
node --no-warnings --test src/lib/fusion/*.test.mjs
npx tsc --noEmit
```

Expected: all pass.

- [ ] **Step 8: Commit Task 4**

```bash
git add src/lib/fusion src/components/FusionPackageDownloadButton.tsx src/app/viewer/page.tsx
git commit -m "feat(viewer): download Fusion wood packages"
```

---

### Task 5: Browser, Build, and Branch Verification

**Files:**
- Modify only if verification exposes a defect.

**Interfaces:**
- Verifies the complete Viewer-to-download flow.

- [ ] **Step 1: Verify direct STEP in a fresh browser context**

Open `http://localhost:3000/viewer` with guest storage enabled. Assert:

- `Download STEP` is visible;
- no `/wasm/` request occurs before click;
- one `.step` download occurs after click;
- filename matches `everwood-art-YYYY-MM-DD-HHmm.step`;
- header contains the exact description and timestamp;
- no console/page errors occur.

- [ ] **Step 2: Verify Fusion package in a fresh browser context**

Click `Fusion + Wood` and assert:

- one `.zip` download occurs;
- OpenCascade and texture resources load only after click;
- ZIP filename matches `everwood-art-fusion-YYYY-MM-DD-HHmm.zip`;
- archive contains the STEP, README, script, manifest, and mapped PNGs;
- manifest visible-square count matches the current Viewer snapshot;
- generated STEP still passes OpenCascade readback;
- no console/page errors occur.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run test:square-gap
npm run test:paint
npm run test:palette-blend
npm run test:step
node --no-warnings --test src/lib/fusion/*.test.mjs
npx tsc --noEmit
npm run build
git diff --check
```

Expected: zero failures and a successful production build.

- [ ] **Step 4: Review final repository state**

Run:

```bash
git status --short --branch
git log -8 --oneline --decorate
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

Confirm the worktree contains only intended changes, exactly one dev server
listens on port 3000, and no push/deploy command was run.

- [ ] **Step 5: Commit final verification fixes**

If verification required changes:

```bash
git add -- src/lib/step src/lib/fusion src/components/StepDownloadButton.tsx src/components/FusionPackageDownloadButton.tsx src/app/viewer/page.tsx package.json package-lock.json yarn.lock
git commit -m "fix(fusion): finalize package downloads"
```

Otherwise retain the preceding task commits. Stop before push or deployment.
