# Fusion 360 Editable STEP Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development while implementing, vercel:react-best-practices after the React edits, vercel:agent-browser-verify for the running-app check, and superpowers:verification-before-completion before committing or pushing. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Download the current viewer artwork as one correctly scaled, color-preserving AP242 STEP file whose Fusion 360 browser tree is `Everwood Art > Backboard` plus `Everwood Art > Squares > Square NNN`.

**Architecture:** Extend the live `ArtSnapshot` with final physical square transforms and exact backboard bodies. Convert that serializable snapshot into a pure millimeter CAD plan. A lazily loaded Web Worker initializes full OpenCascade bindings, creates BRep solids and an XCAF assembly with names/colors, and returns a single STEP byte buffer. The main thread owns status, download, cleanup, and errors.

**Tech Stack:** TypeScript 5.9, React 19, Next.js 16 with Turbopack, Web Workers, `replicad-opencascadejs` 0.23.0, OpenCascade XCAF/STEPCAF, Node.js built-in test runner.

## Global Constraints

- Preserve every unrelated user change in the dirty worktree.
- Keep all dimensions, tolerances, units, filenames, and protocol values in named configuration constants.
- Export only visible squares.
- Give every square a unique XCAF definition; shared geometry definitions would make Fusion edits propagate and are forbidden.
- Put every `Square NNN` beneath the single `Squares` assembly.
- Put single- or multi-panel backboard solids beneath one separate `Backboard` component.
- Export millimeters at the established scale: one scene unit equals six inches.
- Preserve solid RGB colors; do not attempt procedural wood-grain transfer.
- Generate locally in the browser; do not upload model data.
- Do not bundle or initialize OpenCascade on initial viewer load.
- Keep the generated WASM asset out of git while ensuring `dev` and `build` prepare it.
- Use npm/package-lock for the new dependency. Preserve the user's unrelated `yarn.lock` edits.
- Commit with subject `feat(viewer): add Fusion STEP export`, then push only after all integrated checks pass.

---

### Task 1: Make wedge and backboard geometry shareable and testable

**Files:**

- Create: `src/lib/wedgeGeometry.ts`
- Create: `src/lib/wedgeGeometry.test.mjs`
- Create: `src/lib/backboardGeometry.ts`
- Create: `src/lib/backboardGeometry.test.mjs`
- Modify: `src/components/preview/InstancedSquares.tsx`
- Modify: `src/components/preview/PlywoodBase.tsx`
- Modify: `src/components/preview/MultiPanelPlywoodBase.tsx`
- Modify: `package.json`

**Interfaces:**

```ts
export const WEDGE_GEOMETRY_CONFIG = {
  inchesPerSceneUnit: 6,
  fullSquareSizeSceneUnits: 0.5,
  miniScale: 0.9,
  angleDegrees: 21.5,
  backboardLipInches: 3 / 16,
  normalizedHalfEdge: 0.5,
} as const;

export interface NormalizedPoint3 {
  x: number;
  y: number;
  z: number;
}

export function getNormalizedWedgeCorners(): readonly NormalizedPoint3[];

export interface BackboardBodyGeometry {
  id: string;
  baseCenter: readonly [number, number, number];
  size: readonly [number, number, number];
  panelOffsetMultiplier: number;
}

export interface BackboardLayoutInput {
  columnCount: number;
  rowCount: number;
  squareSizeSceneUnits: number;
  squareSpacingScale: number;
  useMini: boolean;
  squareGapInches: number;
  panelCount: number;
}

export function buildBackboardBodyGeometry(
  input: BackboardLayoutInput,
): BackboardBodyGeometry[];

export function resolveBackboardBodies(
  bodies: readonly BackboardBodyGeometry[],
  panelDriftSceneUnits: number,
  driftFactor: number,
): ResolvedBackboardBodyGeometry[];
```

- [ ] **Step 1: Write wedge geometry tests in RED**

Use named constants to assert:

- the normalized square edge is one geometry unit;
- the full physical edge is 3 inches / 76.2 millimeters;
- mini scale is 2.7 inches / 68.58 millimeters;
- the raised wedge depth is `tan(21.5°)` normalized units;
- the backboard lip is 3/16 inch;
- the corner set closes a valid six-face solid.

Run:

```bash
node --no-warnings --test src/lib/wedgeGeometry.test.mjs
```

Expected: fail because the shared module does not exist.

- [ ] **Step 2: Extract the minimal pure wedge configuration**

Move the physical wedge constants and normalized corner generation out of
`InstancedSquares.tsx`. Keep Three.js-specific `BufferGeometry`, UVs, indices,
grain mask, centering, and translation in `createWedgeGeometry()`.

`createWedgeGeometry()` must consume `getNormalizedWedgeCorners()` so the live
viewer and STEP builder derive solids from the same profile.

- [ ] **Step 3: Run wedge tests in GREEN and visually preserve the live mesh**

Run:

```bash
node --no-warnings --test src/lib/wedgeGeometry.test.mjs
npx tsc --noEmit
```

Expected: pass with no live geometry API changes.

- [ ] **Step 4: Write backboard layout tests in RED**

Cover:

- one panel returns one body;
- multiple panels return one body per effective panel;
- square gaps increase the panel width/height through the shared grid-span helpers;
- the half-inch perimeter inset remains on each exposed outer edge;
- panel drift resolves through `panelOffsetMultiplier`;
- body depth equals the shared backboard thickness;
- a non-even column count follows `buildPanelColumnLayout`.

- [ ] **Step 5: Implement the pure backboard body helper**

Use:

- `PANEL_LAYOUT_CONFIG.inchesPerSceneUnit`;
- `buildPanelColumnLayout`;
- `getSquareGapSceneUnits`;
- `getSquareGridSpanSceneUnits`;
- named backboard thickness, inset, grid-origin, mini-correction, and minimum-dimension constants.

Return body-local centers and sizes without Three.js or OpenCascade imports.

- [ ] **Step 6: Make preview backboards consume the helper**

`MultiPanelPlywoodBase` maps the helper bodies to its animated groups, resolving
the X center with its live spring factor. `PlywoodBase` consumes the same
single-body metrics for its panel mesh while retaining its hanger and material
behavior.

- [ ] **Step 7: Run geometry tests and type checking**

Add:

```json
"test:step-geometry": "node --no-warnings --test src/lib/wedgeGeometry.test.mjs src/lib/backboardGeometry.test.mjs"
```

Run:

```bash
npm run test:step-geometry
npx tsc --noEmit
```

Expected: all geometry tests and type checking pass.

---

### Task 2: Publish a CAD-complete live snapshot

**Files:**

- Create: `src/lib/ar/artSnapshot.test.mjs`
- Modify: `src/components/preview/InstancedSquares.tsx`
- Modify: `src/components/preview/GeometricPattern.tsx`
- Modify: `src/lib/ar/artSnapshot.ts`
- Modify: `src/lib/ar/buildExportScene.ts`

**Interfaces:**

Extend `SquareInstance`:

```ts
/** Uniform physical scale, excluding the renderer-only edge overlap. */
physicalScale: number;
```

Extend `ArtSnapshot`:

```ts
/** Visible instances with their final split-panel X positions resolved. */
instances: SquareInstance[];
backboardBodies: ResolvedBackboardBodyGeometry[];
squareGapInches: number;
panelCount: number;
panelSpacingInches: number;
```

Add pure helper:

```ts
export function resolveFinalSquareInstances(
  instances: readonly SquareInstance[],
  panelDriftSceneUnits: number,
): SquareInstance[];
```

- [ ] **Step 1: Write failing snapshot-transform tests**

Assert:

- hidden instances are excluded;
- a non-panel square keeps `px`;
- a panel square resolves to
  `baseX + driftDir * panelDriftSceneUnits`;
- resolution does not mutate the renderer's live instance array;
- `physicalScale` does not contain the zero-gap visual overlap;
- resolved backboard bodies use final drift factor `1`;
- snapshot metadata preserves gap, panel count, and panel spacing.

- [ ] **Step 2: Run the snapshot tests in RED**

Run:

```bash
node --no-warnings --test src/lib/ar/artSnapshot.test.mjs
```

Expected: fail because the final-transform helper and new snapshot fields do not exist.

- [ ] **Step 3: Add the physical square scale**

In `GeometricPattern`, assign:

```ts
physicalScale: squareSize * sizeScale,
```

Keep:

- `scaleXY` for renderer overlap;
- `scaleZ` for renderer relief;
- `physicalScale` for manufacturing geometry.

- [ ] **Step 4: Publish final, visible transforms and backboard bodies**

Before `publishArtSnapshot`, derive:

```ts
const finalInstances = resolveFinalSquareInstances(instances, driftAmount);
const finalBackboardBodies = resolveBackboardBodies(
  backboardBodyGeometry,
  driftAmount,
  FINAL_PANEL_DRIFT_FACTOR,
);
```

Define `FINAL_PANEL_DRIFT_FACTOR` as a named constant equal to the spring's
settled state. Publish the new fields and include every input in the effect
dependency list.

- [ ] **Step 5: Keep AR export correct**

`buildExportScene` continues consuming `snapshot.instances`, which now contain
settled panel positions. Replace its duplicate unit and board constants with
the shared geometry constants where practical. It must not apply drift a
second time.

- [ ] **Step 6: Run snapshot, existing AR, and type checks**

Run:

```bash
node --no-warnings --test src/lib/ar/artSnapshot.test.mjs
npm run test:step-geometry
npx tsc --noEmit
```

Expected: pass.

---

### Task 3: Convert the snapshot into a pure millimeter CAD plan

**Files:**

- Create: `src/lib/step/stepConfig.ts`
- Create: `src/lib/step/stepTypes.ts`
- Create: `src/lib/step/stepModel.ts`
- Create: `src/lib/step/stepModel.test.mjs`

**Interfaces:**

```ts
export const STEP_EXPORT_CONFIG = {
  rootName: "Everwood Art",
  backboardName: "Backboard",
  squaresName: "Squares",
  squareNamePrefix: "Square",
  filenamePrefix: "everwood-art",
  fileExtension: ".step",
  mediaType: "model/step",
  millimetersPerInch: 25.4,
  inchesPerSceneUnit: 6,
  schema: "AP242DIS",
  stepUnit: "MM",
  assemblyMode: 2,
  wasmPublicUrl: "/wasm/replicad_with_exceptions.wasm",
  virtualOutputPath: "/tmp/everwood-art.step",
  componentNumberWidth: 3,
} as const;

export interface StepTransform {
  translationMm: readonly [number, number, number];
  rotationZRadians: number;
}

export interface StepSquarePlan {
  id: string;
  name: string;
  colorHex: string;
  physicalScaleMm: number;
  transform: StepTransform;
}

export interface StepBackboardBodyPlan {
  id: string;
  sizeMm: readonly [number, number, number];
  transform: StepTransform;
}

export interface StepModelPlan {
  rootName: string;
  backboard: {
    name: string;
    colorHex: string;
    bodies: StepBackboardBodyPlan[];
  };
  squares: {
    name: string;
    children: StepSquarePlan[];
  };
  boundsMm: {
    min: readonly [number, number, number];
    max: readonly [number, number, number];
  };
}

export function sceneUnitsToMillimeters(sceneUnits: number): number;
export function buildStepModelPlan(snapshot: ArtSnapshot): StepModelPlan;
```

- [ ] **Step 1: Write pure model-plan tests in RED**

Use a small serializable snapshot fixture and assert:

- root/backboard/squares names exactly match the approved tree;
- visible square count equals child-component count;
- names are zero-padded `Square 001`, `Square 002`, and so on;
- every square has a distinct ID even when color/geometry match;
- full and mini square edge dimensions are life size;
- square RGB hex values and backboard fallback color are retained;
- final square translation includes configured square and panel gaps;
- group orientation rotates square and backboard transforms together;
- the combined output bounding-box center is the origin;
- recentering preserves the pre-center span;
- multi-panel bodies stay separate inside `backboard.bodies`;
- input objects remain unchanged.

- [ ] **Step 2: Run model-plan tests in RED**

Run:

```bash
node --no-warnings --test src/lib/step/stepModel.test.mjs
```

Expected: fail because the STEP modules do not exist.

- [ ] **Step 3: Implement unit conversion, orientation, bounds, and recentering**

Build local square and body transforms first. Apply
`snapshot.orientationRotationZ` to every XY translation and add it to each
square's local Z rotation. Calculate the combined oriented bounds, then
subtract its center from every translation.

Do not mutate the snapshot. Do not use `scaleXY`; use `physicalScale`.

- [ ] **Step 4: Run pure plan tests in GREEN**

Run:

```bash
node --no-warnings --test src/lib/step/stepModel.test.mjs
```

Expected: all hierarchy, unit, transform, color, and recentering tests pass.

---

### Task 4: Install and prepare the lazy OpenCascade runtime

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/prepare-step-wasm.mjs`
- Modify: `.gitignore`
- Create: `src/types/replicad-opencascadejs.d.ts`
- Create: `THIRD_PARTY_NOTICES.md`

**Dependency:**

```json
"replicad-opencascadejs": "0.23.0"
```

- [ ] **Step 1: Add the exact dependency with npm**

Run:

```bash
npm install --save-exact replicad-opencascadejs@0.23.0
```

Expected: `package.json` and `package-lock.json` update. Do not stage or rewrite the unrelated dirty `yarn.lock`.

- [ ] **Step 2: Add the WASM preparation script**

`scripts/prepare-step-wasm.mjs` must:

1. resolve the package's `src/replicad_with_exceptions.wasm`;
2. create `public/wasm`;
3. copy to `public/wasm/replicad_with_exceptions.wasm`;
4. verify the copied file has nonzero size;
5. print the source and destination.

Use named source/destination constants and `mkdir`, `copyFile`, and `stat` from
`node:fs/promises`.

- [ ] **Step 3: Wire preparation into local and production commands**

Add:

```json
"prepare:step-wasm": "node scripts/prepare-step-wasm.mjs",
"predev": "npm run prepare:step-wasm",
"prebuild": "npm run prepare:step-wasm"
```

Append to `.gitignore`:

```gitignore
/public/wasm/replicad_with_exceptions.wasm
```

- [ ] **Step 4: Add a narrow deep-import declaration**

Declare the module
`replicad-opencascadejs/src/replicad_with_exceptions.js` with an async factory
that accepts an optional `locateFile(path: string): string` and resolves to
the package's `OpenCascadeInstance` type. Do not use `any` in production
interfaces.

- [ ] **Step 5: Add third-party notices**

Document:

- package name/version and MIT package license;
- bundled OpenCascade license and exception;
- upstream copyright/license locations;
- that the distributed WASM is dynamically relinkable/replacable as required
  by the OpenCascade exception.

- [ ] **Step 6: Verify the prepared asset and dependency isolation**

Run:

```bash
npm run prepare:step-wasm
test -s public/wasm/replicad_with_exceptions.wasm
git check-ignore public/wasm/replicad_with_exceptions.wasm
```

Expected: the asset exists locally, is nonempty, and is ignored.

---

### Task 5: Build and verify the OpenCascade XCAF exporter

**Files:**

- Create: `src/lib/step/openCascadeExporter.ts`
- Create: `scripts/step/load-open-cascade.mjs`
- Create: `src/lib/step/openCascadeExporter.test.mjs`
- Modify: `package.json`

**Interfaces:**

```ts
export interface StepExportResult {
  bytes: Uint8Array;
  filename: string;
}

export function exportStepModel(
  openCascade: OpenCascadeInstance,
  plan: StepModelPlan,
): StepExportResult;
```

- [ ] **Step 1: Write an integration test around a two-square fixture**

The test must initialize the package's exception-enabled OpenCascade build,
export a plan with two differently colored squares and two backboard bodies,
then assert:

- nonempty STEP bytes;
- AP242 schema record;
- `.MILLI.` unit declaration;
- `PRODUCT` records for `Everwood Art`, `Backboard`, `Squares`,
  `Square 001`, and `Square 002`;
- nested assembly usage records;
- at least the expected distinct `COLOUR_RGB` records;
- no `Square 003`;
- `STEPControl_Reader` can read the generated bytes;
- OpenCascade's read-back bounding box matches the pure plan within a named
  millimeter tolerance.

- [ ] **Step 2: Add the Node-only OpenCascade loader**

The package's Emscripten source is browser-oriented. In
`scripts/step/load-open-cascade.mjs`, read the installed JavaScript, replace
only its terminal `export default Module` with `module.exports = Module`, and
evaluate it through `new Function` with Node's `require`, `module`,
`exports`, `__dirname`, and `__filename`.

This loader is test-only. Production must import the package normally in the
worker and must never evaluate source text.

- [ ] **Step 3: Run the exporter integration test in RED**

Run:

```bash
node --no-warnings --test src/lib/step/openCascadeExporter.test.mjs
```

Expected: fail because `exportStepModel` is not implemented.

- [ ] **Step 4: Implement solid builders**

Create:

- `buildWedgeSolid(openCascade, physicalScaleMm)` from the shared normalized
  corners using edges, wires, faces, sewing, and a checked solid;
- `buildBoxSolid(openCascade, sizeMm)` with `BRepPrimAPI_MakeBox`;
- `makeLocation(openCascade, StepTransform)` for translation and Z rotation;
- `parseHexColor(hex)` returning normalized RGB;
- disposal helpers that delete temporary OpenCascade objects.

Validate every wedge with `BRepCheck_Analyzer`. Throw a concise named error if
the model is invalid.

- [ ] **Step 5: Build the exact XCAF hierarchy**

Create one `TDocStd_Document`, shape tool, and color tool. Build:

```text
Everwood Art (assembly definition)
├── Backboard (one component definition containing a compound of body solids)
└── Squares (assembly definition)
    ├── Square 001 (unique shape definition)
    └── Square 002 (unique shape definition)
```

Requirements:

- `rootDefinition` and `squaresDefinition` are assemblies;
- the backboard compound contains one solid per body and exposes those as
  subshapes/bodies;
- every square gets a newly built or newly copied shape definition, never a
  shared definition label;
- `TDataStd_Name.Set_1` names definitions and occurrences;
- apply `XCAFDoc_ColorGen` and `XCAFDoc_ColorSurf` to square definitions,
  occurrences, and solids;
- apply the selected/fallback backboard color to its definition, occurrence,
  and bodies;
- call `shapeTool.UpdateAssemblies()` before transfer.

- [ ] **Step 6: Configure and write one AP242 file**

Instantiate `STEPCAFControl_Writer` before applying `Interface_Static`
settings. Use named values for:

- schema `AP242DIS`;
- unit `MM`;
- assembly mode `2`;
- document length unit `0.001` meters;
- color and name modes enabled.

Transfer the document with a null multi-file prefix so the writer emits one
file. Read bytes from OpenCascade's virtual filesystem and remove the virtual
file in `finally`.

- [ ] **Step 7: Run the exporter integration test in GREEN**

Add:

```json
"test:step": "npm run test:step-geometry && node --no-warnings --test src/lib/ar/artSnapshot.test.mjs src/lib/step/stepModel.test.mjs src/lib/step/openCascadeExporter.test.mjs"
```

Run:

```bash
npm run test:step
```

Expected: pure and OpenCascade integration tests pass.

---

### Task 6: Move generation into a one-shot Web Worker

**Files:**

- Create: `src/lib/step/stepWorkerProtocol.ts`
- Create: `src/lib/step/stepExport.worker.ts`
- Create: `src/lib/step/exportStep.ts`
- Create: `src/lib/step/exportStep.test.mjs`

**Interfaces:**

```ts
export type StepWorkerRequest = {
  kind: "generate";
  requestId: string;
  snapshot: ArtSnapshot;
};

export type StepWorkerResponse =
  | {
      kind: "success";
      requestId: string;
      filename: string;
      buffer: ArrayBuffer;
    }
  | {
      kind: "error";
      requestId: string;
      message: string;
    };

export function generateStepDownload(
  snapshot: ArtSnapshot,
  options?: StepDownloadOptions,
): Promise<void>;
```

- [ ] **Step 1: Write main-thread lifecycle tests in RED**

Inject a worker factory, object-URL factory/revoker, and anchor-click adapter.
Assert:

- one request is posted with a generated request ID;
- success creates one STEP blob and downloads the returned filename;
- the response buffer is transferred;
- the object URL is revoked;
- the worker terminates after success;
- errors reject with the worker's concise message;
- worker `error` events reject;
- the worker terminates after every failure;
- mismatched request IDs are ignored.

- [ ] **Step 2: Run lifecycle tests in RED**

Run:

```bash
node --no-warnings --test src/lib/step/exportStep.test.mjs
```

Expected: fail because the protocol/client do not exist.

- [ ] **Step 3: Implement the worker**

The worker:

1. receives one `generate` request;
2. lazily imports/initializes
   `replicad-opencascadejs/src/replicad_with_exceptions.js`;
3. passes `locateFile` that returns
   `STEP_EXPORT_CONFIG.wasmPublicUrl` for the WASM request;
4. builds the pure model plan;
5. calls `exportStepModel`;
6. posts the `ArrayBuffer` as a transferable;
7. serializes unknown failures to a concise error message;
8. closes after responding.

No OpenCascade import may appear in a viewer component or main-thread module.

- [ ] **Step 4: Implement the main-thread download lifecycle**

Construct the worker exactly through:

```ts
new Worker(new URL("./stepExport.worker.ts", import.meta.url), {
  type: "module",
});
```

Create a `Blob` with `STEP_EXPORT_CONFIG.mediaType`, trigger the download,
revoke the URL, and terminate the worker in `finally`.

- [ ] **Step 5: Run lifecycle and type tests in GREEN**

Run:

```bash
node --no-warnings --test src/lib/step/exportStep.test.mjs
npx tsc --noEmit
```

Expected: pass.

---

### Task 7: Add the viewer Download STEP action

**Files:**

- Create: `src/components/StepDownloadButton.tsx`
- Modify: `src/app/viewer/page.tsx`

**Behavior:**

- Desktop label: `Download STEP`
- Compact accessible label/title: `Download STEP`
- Busy label: `Generating STEP…`
- Missing-snapshot error: concise retry instruction
- Success: browser downloads `everwood-art-<timestamp>.step`

- [ ] **Step 1: Write the component around the existing snapshot API**

`StepDownloadButton`:

- accepts `isMobile` and existing button class overrides;
- reads `getArtSnapshot()` only when clicked;
- disables itself while generating;
- sets `aria-busy`;
- calls `generateStepDownload(snapshot)`;
- reports success/error through the existing `sonner` Toaster;
- restores idle state in `finally`;
- uses a CAD/file icon distinct from Save Image.

- [ ] **Step 2: Place it in the viewer action dock**

Insert the action beside Save Image and AR while `showUIControls` is true.
Desktop shows icon plus text. Mobile shows the icon with an accessible label
and tooltip consistent with the existing action dock.

- [ ] **Step 3: Run the React best-practices review**

Use `vercel:react-best-practices` and correct findings within scope,
especially:

- no OpenCascade import on the main bundle;
- no stale state after unmount;
- no duplicate click while busy;
- stable props and no unnecessary viewer rerender loop.

- [ ] **Step 4: Run type checking and production build**

Run:

```bash
npx tsc --noEmit
npm run build
```

Expected: worker and WASM asset compile successfully; no SSR/client-boundary error.

---

### Task 8: Verify the complete download in a real browser

**Files:**

- No planned source changes

**Required sub-skills:**

- Use `vercel:agent-browser-verify` when starting/reusing the dev server.
- Use `vercel:agent-browser` for UI and download verification.

- [ ] **Step 1: Start or reuse one healthy dev server**

Check for a server and port conflict first. Start:

```bash
npm run dev
```

Confirm the app loads, logs show no obvious errors, and no duplicate process
started during this task remains.

- [ ] **Step 2: Configure an export-sensitive viewer state**

Use:

- at least two square colors;
- a nonzero square gap;
- multiple backboard panels with nonzero panel spacing;
- at least one hidden square;
- a non-default orientation;
- a selected backboard color.

- [ ] **Step 3: Download the STEP file**

Click **Download STEP** and verify:

- the button disables and shows its busy state;
- the viewer remains responsive;
- exactly one `.step` file downloads;
- success feedback appears;
- the browser console and network panels show no error;
- the WASM request occurs only after the click.

- [ ] **Step 4: Inspect the downloaded artifact**

Use `file`, byte count, and source-token inspection to confirm:

- nonempty ISO-10303 STEP text;
- AP242 and millimeter records;
- exact root/Backboard/Squares names;
- one `Square NNN` product per visible viewer square;
- no product for the hidden square;
- color records;
- nested assembly usage.

- [ ] **Step 5: Open/import in Fusion 360 if available**

Verify:

```text
Everwood Art
├── Backboard
└── Squares
    ├── Square 001
    ├── Square 002
    └── ...
```

Measure one full tile as 76.2 mm and the assembled width/height against the
viewer. Edit one square and confirm the others do not change.

If Fusion 360 is unavailable in the environment, the OpenCascade read-back,
STEP-token inspection, and exact-size browser artifact checks are the required
automated substitute; report that limitation without claiming a Fusion UI
check.

---

### Task 9: Run final verification, commit, and push

**Files:**

- Stage only STEP-export code, dependency/notice files, relevant shared-geometry changes, tests, and approved STEP documentation

- [ ] **Step 1: Run all feature-focused tests**

Run:

```bash
npm run test:square-gap
npm run test:paint
npm run test:step
npm run test:palette-blend
```

Expected: all tests pass.

- [ ] **Step 2: Run repository-level verification**

Run:

```bash
npx tsc --noEmit
npm run build
git diff --check
```

Expected: all commands exit successfully.

- [ ] **Step 3: Review worktree and selective staging**

Run:

```bash
git status --short
git diff -- package.json package-lock.json .gitignore THIRD_PARTY_NOTICES.md
git diff -- src/lib/step src/lib/wedgeGeometry.ts src/lib/backboardGeometry.ts
git diff -- src/lib/ar/artSnapshot.ts src/lib/ar/buildExportScene.ts
git diff -- src/components/preview/InstancedSquares.tsx
git diff -- src/components/preview/PlywoodBase.tsx src/components/preview/MultiPanelPlywoodBase.tsx
git diff -- src/components/preview/GeometricPattern.tsx src/components/StepDownloadButton.tsx src/app/viewer/page.tsx
```

Use selective staging in all pre-existing dirty files. Do not stage the
generated WASM or unrelated `yarn.lock` edits.

- [ ] **Step 4: Stage relevant documentation**

Stage this plan and
`docs/superpowers/specs/2026-07-26-fusion-step-export-design.md`.

- [ ] **Step 5: Audit the exact staged diff**

Run:

```bash
git diff --cached --check
git diff --cached --stat
git diff --cached
```

Expected: STEP export and necessary geometry/snapshot support only.

- [ ] **Step 6: Re-run verification on the exact staged state**

Run:

```bash
npm run test:step
npx tsc --noEmit
npm run build
```

Expected: pass.

- [ ] **Step 7: Commit STEP export**

Run:

```bash
git commit -m "feat(viewer): add Fusion STEP export"
```

- [ ] **Step 8: Verify the three-commit delivery order**

Run:

```bash
git log -3 --oneline
git status --short
```

Expected, newest first:

```text
feat(viewer): add Fusion STEP export
feat(paints): add historic interior Lowe's matches
feat(viewer): add configurable square spacing
```

Unrelated user changes may remain unstaged.

- [ ] **Step 9: Push the explicitly authorized branch**

Run:

```bash
git push origin feat/ai-palette-prompt-20260713
```

Expected: remote branch advances through all three verified commits.

- [ ] **Step 10: Confirm remote state**

Run:

```bash
git status -sb
git log -3 --oneline --decorate
```

Expected: local branch is synchronized with its remote, the three commits are
present in order, and unrelated uncommitted files remain preserved.
