# Add to Existing Palette Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add name search and persisted last-opened ordering to the Save Palette dialog's **Add to existing** mode.

**Architecture:** A pure helper filters and sorts palette-like records and immutably stamps a selected palette. Store entry points use the stamp helper for editor and viewer opens, while a focused React picker renders the searchable recent-first list inside the existing save dialog.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Zustand 5, Node test runner, Tailwind CSS.

## Global Constraints

- Search matches palette names only and is case-insensitive.
- Editor opens, viewer opens, version opens, and attaching work to an existing palette all update `lastOpenedAt`.
- Never-opened palettes sort after opened palettes, newest-created first.
- Existing saved data remains valid because `lastOpenedAt` is optional.
- Do not change ordering on the Saved Palettes page.
- Do not commit or push unless the user explicitly requests it.

---

### Task 1: Pure palette recency behavior

**Files:**
- Create: `src/lib/paletteRecency.ts`
- Create: `src/lib/paletteRecency.test.mjs`

**Interfaces:**
- Produces: `filterAndSortPalettesByRecentOpen<T extends PaletteRecencyRecord>(palettes, query): T[]`
- Produces: `markPaletteOpened<T extends PaletteRecencyRecord>(palettes, paletteId, openedAt): T[]`

- [ ] **Step 1: Write failing helper tests**

Cover:

```js
test("filters case-insensitively by palette name only", () => {
  const result = filterAndSortPalettesByRecentOpen(palettes, "oCeAn");
  assert.deepEqual(result.map(({ id }) => id), ["name-match"]);
});

test("orders opened palettes by last open and unopened palettes by creation", () => {
  const result = filterAndSortPalettesByRecentOpen(palettes, "");
  assert.deepEqual(
    result.map(({ id }) => id),
    ["recent-open", "older-open", "new-unopened", "old-unopened"],
  );
});

test("uses name and id as deterministic tie breakers without mutating input", () => {
  const originalIds = palettes.map(({ id }) => id);
  const result = filterAndSortPalettesByRecentOpen(palettes, "");
  assert.deepEqual(palettes.map(({ id }) => id), originalIds);
  assert.deepEqual(result.map(({ id }) => id), expectedIds);
});

test("stamps only the opened palette without mutating source records", () => {
  const result = markPaletteOpened(palettes, "target", OPENED_AT);
  assert.equal(result.find(({ id }) => id === "target")?.lastOpenedAt, OPENED_AT);
  assert.equal(palettes.find(({ id }) => id === "target")?.lastOpenedAt, undefined);
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run:

```bash
node --no-warnings --test src/lib/paletteRecency.test.mjs
```

Expected: FAIL because `paletteRecency.ts` does not exist.

- [ ] **Step 3: Implement the pure helpers**

Use this record boundary:

```ts
export interface PaletteRecencyRecord {
  id: string;
  name: string;
  createdAt: string;
  lastOpenedAt?: string;
}
```

Normalize the query with `trim().toLocaleLowerCase()`. Sort a copied array with these keys in order:

1. valid `lastOpenedAt` presence;
2. `lastOpenedAt` descending;
3. `createdAt` descending;
4. `name.localeCompare`;
5. `id.localeCompare`.

`markPaletteOpened` maps the source array and spreads only the matching record with the supplied timestamp.

- [ ] **Step 4: Run helper tests and confirm GREEN**

Run:

```bash
node --no-warnings --test src/lib/paletteRecency.test.mjs
```

Expected: all helper tests pass.

### Task 2: Persist recent opens through every saved-palette entry point

**Files:**
- Modify: `src/store/customStore.ts:260-285`
- Modify: `src/store/customStore.ts:1996-2255`
- Test: `src/lib/paletteRecency.test.mjs`

**Interfaces:**
- Consumes: `markPaletteOpened`
- Produces: optional `SavedPalette.lastOpenedAt`

- [ ] **Step 1: Extend the failing stamp tests**

Add coverage for a missing palette ID and record identity:

```js
test("leaves non-target records unchanged", () => {
  const result = markPaletteOpened(palettes, "target", OPENED_AT);
  assert.equal(result.find(({ id }) => id === "other"), palettes[OTHER_INDEX]);
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run:

```bash
node --no-warnings --test src/lib/paletteRecency.test.mjs
```

Expected: FAIL until `markPaletteOpened` preserves non-target object identity.

- [ ] **Step 3: Integrate the recency stamp**

Add:

```ts
lastOpenedAt?: string;
```

to `SavedPalette`. Import `markPaletteOpened`, create the current timestamp once per action, and update `savedPalettes` in:

- `applyPalette`;
- `applyPaletteVersion`;
- `applyViewerVersion` when it belongs to a saved palette;
- `loadPaletteForEditing`;
- `setEditingPaletteId` when the ID is non-null.

This last setter covers version-history editing and **Add to existing** without changing those callers. Null IDs leave the palette list unchanged.

- [ ] **Step 4: Run helper tests and type checking**

Run:

```bash
node --no-warnings --test src/lib/paletteRecency.test.mjs
npx tsc --noEmit
```

Expected: tests pass and TypeScript exits successfully.

### Task 3: Searchable Add to Existing picker

**Files:**
- Create: `src/app/palette/components/ExistingPalettePicker.tsx`
- Modify: `src/app/palette/page.tsx:1-45`
- Modify: `src/app/palette/page.tsx:220-235`
- Modify: `src/app/palette/page.tsx:2340-2485`

**Interfaces:**
- Consumes: `SavedPalette[]`, search query, selected palette ID, and selection callbacks.
- Consumes: `filterAndSortPalettesByRecentOpen`.
- Produces: an accessible search input and `role="listbox"` palette choices.

- [ ] **Step 1: Add the picker shell against the helper**

Define:

```ts
interface ExistingPalettePickerProps {
  palettes: readonly SavedPalette[];
  query: string;
  selectedId: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (query: string) => void;
  onSelect: (paletteId: string) => void;
}
```

Render:

- a labeled `Input` with placeholder `Search palette names…`;
- a bounded, vertically scrollable `role="listbox"`;
- one full-width button per filtered palette with name and version count;
- `aria-selected` and a visible selected treatment;
- `No palettes match "<query>".` when filtering returns no rows.

- [ ] **Step 2: Wire dialog state and focus**

In `page.tsx`:

- add `connectSearchQuery` state and `connectSearchInputRef`;
- clear both query and selection whenever the dialog opens;
- focus the search input when mode changes to `"existing"`;
- replace the native `<select>` with `ExistingPalettePicker`;
- keep `connectTargetId` as the existing save validation and target.

- [ ] **Step 3: Type-check the UI**

Run:

```bash
npx tsc --noEmit
```

Expected: TypeScript exits successfully.

### Task 4: Full verification

**Files:**
- Verify all changed files.

**Interfaces:**
- Consumes the completed feature.
- Produces verification evidence only.

- [ ] **Step 1: Run all automated tests**

Run every discovered `*.test.mjs` file:

```bash
node --no-warnings --test $(rg --files -g '*.test.mjs' | sort)
```

Expected: all tests pass.

- [ ] **Step 2: Run static and production checks**

Run:

```bash
npx tsc --noEmit
npm run build
git diff --check
```

Expected: every command exits successfully.

- [ ] **Step 3: Verify the browser flow**

In a local browser session:

1. Open the palette editor as a guest.
2. Create a non-empty unsaved palette and open **Save Palette**.
3. Choose **Add to existing** and confirm search receives focus.
4. Search with mixed letter casing and confirm only palette-name matches remain.
5. Select a result and save it as a new version.
6. Reopen the dialog and confirm that palette is first.
7. Open a different palette in the viewer, return, and confirm it becomes first.
8. Check browser errors and confirm no feature-related error occurred.

- [ ] **Step 4: Review the final diff**

Run:

```bash
git status --short
git diff --stat
git diff -- src/lib/paletteRecency.ts src/lib/paletteRecency.test.mjs src/store/customStore.ts src/app/palette/components/ExistingPalettePicker.tsx src/app/palette/page.tsx
```

Confirm the diff contains only the approved feature and documentation, preserving unrelated workspace changes.
