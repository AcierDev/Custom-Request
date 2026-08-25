# Historic Interior Lowe's Matches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development while implementing, then superpowers:verification-before-completion before committing. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all 80 current Sherwin-Williams **Historic Interior Color Wall** colors to **Lowe's matches**, preserve native Lowe's catalogs, exclude other Sherwin-Williams collections, and relabel both palette reset buttons **New Palette**.

**Architecture:** Preserve the official Sherwin-Williams Prism API collection metadata during import. A shared, pure paint predicate combines native Lowe's retailer eligibility with the exact Historic Interior collection tag; both existing paint-match consumers call it. Availability remains a separate existing consumer filter. Palette labels change without altering reset behavior or the confirmation title.

**Tech Stack:** TypeScript 5.9, JavaScript ES modules, React 19, Next.js 16, Node.js built-in test runner, official Sherwin-Williams Prism API dataset.

## Global Constraints

- The exact included Sherwin-Williams collection is `Historic Interior Color Wall`.
- Keep Valspar and HGTV Home by Sherwin-Williams eligible through their Lowe's retailer metadata.
- Exclude Historic Exterior and every other Sherwin-Williams collection.
- Preserve each record's real `brand`, `retailer`, `code`, `hex`, `available`, and `lrv`.
- Do not make the predicate responsible for availability; existing callers continue excluding `available: false`.
- Define counts and fixture values as named constants.
- Preserve unrelated dirty-worktree changes and stage only this feature.
- This work is committed after the square-spacing commit, with subject `feat(paints): add historic interior Lowe's matches`.

---

### Task 1: Preserve official collection metadata in the importer

**Files:**

- Create: `scripts/paints/import-sherwin.test.mjs`
- Modify: `scripts/paints/import-sherwin.mjs`
- Modify: `package.json`

**Interfaces:**

- Produces: `normalizeSherwinColors(raw: unknown[]): NormalizedSherwinColor[]`
- Extends normalized records with: `collections?: string[]`
- Keeps CLI behavior: `npm run paints:sherwin`

- [ ] **Step 1: Write importer tests before changing the importer**

Create a fixture with:

- one current Historic Interior color;
- one current non-Historic color;
- one archived Historic Interior color;
- one duplicate color number;
- one invalid record.

Use named constants such as:

```js
const HISTORIC_INTERIOR_COLLECTION = "Historic Interior Color Wall";
const HISTORIC_EXTERIOR_COLLECTION = "Historic Exterior Color Wall";
const CURRENT_HISTORIC_NUMBER = "0035";
const ARCHIVED_HISTORIC_NUMBER = "0001";
const EXPECTED_NORMALIZED_COUNT = 3;
```

Assert that normalization:

- converts `0035` to `SW 0035`;
- lowercases hex;
- copies and de-duplicates valid `brandedCollectionNames` strings to `collections`;
- leaves collection-less records without a serialized `collections` property;
- maps `archived: true` to `available: false`;
- keeps current records available;
- de-duplicates by color number;
- rejects incomplete records;
- retains stable availability/code sorting.

- [ ] **Step 2: Run the importer test and verify RED**

Run:

```bash
node --no-warnings --test scripts/paints/import-sherwin.test.mjs
```

Expected: fail because `normalizeSherwinColors` is not exported and collection metadata is not preserved.

- [ ] **Step 3: Extract a testable normalizer and guard the CLI entry point**

In `scripts/paints/import-sherwin.mjs`:

```js
import { pathToFileURL } from "node:url";

export function normalizeSherwinColors(raw) {
  // existing normalization plus collections
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main().catch(handleImportFailure);
}
```

Normalize collection metadata through a named helper:

```js
function normalizeCollections(value) {
  if (!Array.isArray(value)) return undefined;
  const collections = [
    ...new Set(
      value
        .filter((entry) => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ];
  return collections.length > 0 ? collections : undefined;
}
```

Assign:

```js
collections: normalizeCollections(c.brandedCollectionNames),
```

JSON serialization will omit `undefined`.

- [ ] **Step 4: Run the importer tests in GREEN**

Run:

```bash
node --no-warnings --test scripts/paints/import-sherwin.test.mjs
```

Expected: all importer tests pass without making a network request.

---

### Task 2: Implement the exact shared Lowe's-match predicate

**Files:**

- Create: `src/lib/paint.test.mjs`
- Modify: `src/lib/paint.ts`
- Modify: `src/app/palette/page.tsx`
- Modify: `src/components/preview/PaintColorPicker.tsx`

**Interfaces:**

- Extends: `PaintColor` with `collections?: string[]`
- Adds constant: `SHERWIN_HISTORIC_INTERIOR_COLLECTION`
- Replaces: `isLowesColor`
- Produces:

```ts
isLowesMatchColor(
  color: Pick<PaintColor, "brand" | "retailer" | "collections">,
): boolean
```

- [ ] **Step 1: Write the eligibility tests**

Cover these named fixtures:

```js
const HISTORIC_INTERIOR_COLOR = {
  brand: "Sherwin-Williams",
  retailer: "Sherwin-Williams",
  collections: ["Historic Interior Color Wall"],
};
const NON_HISTORIC_SHERWIN_COLOR = {
  brand: "Sherwin-Williams",
  retailer: "Sherwin-Williams",
  collections: ["Designer Color Collection"],
};
const HISTORIC_EXTERIOR_COLOR = {
  brand: "Sherwin-Williams",
  retailer: "Sherwin-Williams",
  collections: ["Historic Exterior Color Wall"],
};
```

Assert:

- Historic Interior Sherwin-Williams is eligible;
- a Sherwin record tagged with multiple collections remains eligible when one exact tag matches;
- non-Historic and Historic Exterior Sherwin-Williams are excluded;
- a Sherwin record without collection metadata is excluded;
- Valspar at Lowe's is eligible;
- HGTV Home by Sherwin-Williams at Lowe's is eligible;
- retailer fallback still handles those brands when `retailer` is absent;
- Behr, PPG, and Benjamin Moore are excluded;
- calling the predicate does not mutate metadata.

- [ ] **Step 2: Run the eligibility tests in RED**

Run:

```bash
node --no-warnings --test src/lib/paint.test.mjs
```

Expected: fail because the schema, constant, and renamed predicate do not exist.

- [ ] **Step 3: Add schema, constant, and minimal predicate**

In `src/lib/paint.ts`:

```ts
export const SHERWIN_HISTORIC_INTERIOR_COLLECTION =
  "Historic Interior Color Wall";

export interface PaintColor {
  // existing fields
  /** Official manufacturer collection memberships, when supplied. */
  collections?: string[];
}

export function isLowesMatchColor(
  color: Pick<PaintColor, "brand" | "retailer" | "collections">,
): boolean {
  const isHistoricInterior =
    color.brand === "Sherwin-Williams" &&
    color.collections?.includes(
      SHERWIN_HISTORIC_INTERIOR_COLLECTION,
    ) === true;

  return retailerFor(color) === LOWES_RETAILER || isHistoricInterior;
}
```

Update nearby comments to distinguish match eligibility from native retailer metadata.

- [ ] **Step 4: Run eligibility tests in GREEN**

Run:

```bash
node --no-warnings --test src/lib/paint.test.mjs
```

Expected: all predicate tests pass.

- [ ] **Step 5: Wire both consumers to the exact predicate**

In `src/app/palette/page.tsx` and
`src/components/preview/PaintColorPicker.tsx`, import
`isLowesMatchColor` and replace the `isLowesColor` call.

Do not change the surrounding availability checks. Confirm palette grounding still filters with:

```ts
color.available !== false
```

- [ ] **Step 6: Verify stale predicate removal**

Run:

```bash
rg -n "isLowesColor" src
```

Expected: no matches.

---

### Task 3: Regenerate and verify the official Sherwin-Williams dataset

**Files:**

- Modify: `public/paints/sherwin/colors.json`
- Create: `src/lib/sherwinHistoricDataset.test.mjs`
- Modify: `package.json`

**Interfaces:**

- Source field: `brandedCollectionNames`
- Normalized field: `collections`
- Expected current Historic Interior count: `80`

- [ ] **Step 1: Regenerate from the official source**

Run:

```bash
npm run paints:sherwin
```

Expected: the command fetches the Prism source and writes normalized JSON with collection metadata.

- [ ] **Step 2: Write the generated-dataset contract test**

Read `public/paints/sherwin/colors.json` with `readFile` and define:

```js
const HISTORIC_INTERIOR_COLLECTION = "Historic Interior Color Wall";
const EXPECTED_CURRENT_HISTORIC_INTERIOR_COUNT = 80;
const REPRESENTATIVE_CODES = new Set(["SW 0035", "SW 0055"]);
const NON_HISTORIC_CODE = "SW 6258";
```

Assert:

- every record has the expected Sherwin-Williams brand and retailer;
- exactly 80 records are both available and tagged Historic Interior;
- every Historic Interior record is available;
- the representative codes are present in that set;
- `SW 6258` exists and is not tagged Historic Interior;
- no record contains an empty, duplicate, or non-string collection entry.

- [ ] **Step 3: Run the dataset test**

Run:

```bash
node --no-warnings --test src/lib/sherwinHistoricDataset.test.mjs
```

Expected: all dataset assertions pass.

- [ ] **Step 4: Inspect the regenerated scope**

Run:

```bash
git diff --stat -- public/paints/sherwin/colors.json
git diff -- public/paints/sherwin/colors.json | sed -n '1,220p'
```

Expected: normalized current Sherwin records with official collections; no retailer or brand rewriting.

---

### Task 4: Rename both palette actions without changing reset behavior

**Files:**

- Create: `src/app/palette/components/PaletteManager/newPaletteLabel.test.mjs`
- Modify: `src/app/palette/components/PaletteManager/index.tsx`
- Modify: `package.json`

**Contract:**

- Button label count: two occurrences of `New Palette`
- Confirmation title: one occurrence of `Reset Palette?`
- Destructive action label remains `Yes, Reset`

- [ ] **Step 1: Write a source-level label regression test**

Read `PaletteManager/index.tsx` and use named expected-count constants. Assert:

- the source contains exactly two rendered `New Palette` labels;
- it contains no rendered `Reset Palette` button label without `?`;
- it still contains `Reset Palette?`;
- it still contains `Yes, Reset`.

- [ ] **Step 2: Run the label test in RED**

Run:

```bash
node --no-warnings --test src/app/palette/components/PaletteManager/newPaletteLabel.test.mjs
```

Expected: fail because both buttons still say `Reset Palette`.

- [ ] **Step 3: Change only the two button labels**

Replace the immediate-reset and confirmation-trigger button text with:

```tsx
New Palette
```

Keep the confirmation title, description, and action behavior unchanged.

- [ ] **Step 4: Run the label test in GREEN**

Run:

```bash
node --no-warnings --test src/app/palette/components/PaletteManager/newPaletteLabel.test.mjs
```

Expected: all label assertions pass.

---

### Task 5: Run focused and production verification

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Register one focused paint test script**

Add:

```json
"test:paint": "node --no-warnings --test scripts/paints/import-sherwin.test.mjs src/lib/paint.test.mjs src/lib/sherwinHistoricDataset.test.mjs src/app/palette/components/PaletteManager/newPaletteLabel.test.mjs"
```

- [ ] **Step 2: Run focused tests**

Run:

```bash
npm run test:paint
```

Expected: importer, predicate, dataset, and label tests all pass.

- [ ] **Step 3: Type-check and build**

Run:

```bash
npx tsc --noEmit
npm run build
```

Expected: both commands exit successfully.

- [ ] **Step 4: Verify exact collection totals and consumer wiring**

Run:

```bash
node --input-type=module -e '
import { readFile } from "node:fs/promises";
const path = "public/paints/sherwin/colors.json";
const collection = "Historic Interior Color Wall";
const colors = JSON.parse(await readFile(path, "utf8"));
const matches = colors.filter(
  (color) =>
    color.available !== false &&
    color.collections?.includes(collection),
);
console.log({ count: matches.length, first: matches[0], last: matches.at(-1) });
'
rg -n "isLowesMatchColor" src/app/palette/page.tsx src/components/preview/PaintColorPicker.tsx
rg -n "New Palette|Reset Palette\\?" src/app/palette/components/PaletteManager/index.tsx
```

Expected: count 80, both consumers use the shared matcher, two `New Palette` labels, and the confirmation title remains.

---

### Task 6: Commit only the paint and label feature

**Files:**

- Stage only the files and hunks listed in this plan

- [ ] **Step 1: Review and selectively stage**

Run:

```bash
git status --short
git diff -- scripts/paints/import-sherwin.mjs public/paints/sherwin/colors.json
git diff -- src/lib/paint.ts src/app/palette/page.tsx src/components/preview/PaintColorPicker.tsx
git diff -- src/app/palette/components/PaletteManager/index.tsx package.json
```

Use selective staging for files with unrelated edits, especially
`src/app/palette/page.tsx`, `PaletteManager/index.tsx`, and `package.json`.

- [ ] **Step 2: Stage new tests and the approved design/plan documents**

Stage the focused test files, this plan, and
`docs/superpowers/specs/2026-07-22-lowes-retail-colors-design.md`.

- [ ] **Step 3: Audit the staged diff**

Run:

```bash
git diff --cached --check
git diff --cached --stat
git diff --cached
```

Expected: official collection metadata, exact matcher, two labels, tests, and relevant documentation only.

- [ ] **Step 4: Re-run focused verification**

Run:

```bash
npm run test:paint
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 5: Commit**

Run:

```bash
git commit -m "feat(paints): add historic interior Lowe's matches"
```

- [ ] **Step 6: Confirm square spacing remains the prior commit**

Run:

```bash
git log -2 --oneline
git status --short
```

Expected: paint matching is HEAD, square spacing is immediately below it, and unrelated work remains unstaged.
