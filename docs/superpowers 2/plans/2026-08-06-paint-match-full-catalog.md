# Paint Match Full-Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make normal paint matching search the complete available catalog and
preserve an imported paint's identity when equally close catalog entries tie.

**Architecture:** Extract nearest-paint ranking into a pure library module. The
palette page supplies its filtered paint pool, source hex, and original purchase
label; the matcher ranks by Delta E and uses the label only as a distance-tie
breaker. The default pool becomes `Any`, while explicit filters remain intact.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner.

## Global Constraints

- Numeric values use named constants.
- Explicit brand and retailer filters continue to constrain matching.
- A preferred imported label never beats a genuinely closer paint.
- Preserve unrelated dirty-worktree changes.
- Do not commit or push without explicit user instruction.

---

### Task 1: Pure nearest-paint ranking

**Files:**

- Create: `src/lib/paintMatch.test.mjs`
- Create: `src/lib/paintMatch.ts`
- Modify: `src/app/palette/page.tsx`

**Interfaces:**

- Consumes: `PaintColor`, source hex, precomputed LAB entries, requested match
  count, lightness mode, and optional preferred purchase label.
- Produces: `findClosestPaintMatches(...): PaintMatch[]`,
  `getGroundablePaintColors(...)`, `DEFAULT_PAINT_MATCH_BRAND`, and shared
  paint-match types used by the palette page.

- [x] **Step 1: Write the failing matcher tests**

Create literal fixtures covering an identical-hex tie and a preferred paint
that is farther away:

```js
assert.equal(matches[0].paintColor.code, "SW 2704");
assert.equal(closerMatches[0].paintColor.code, "NEAR 1");
```

- [x] **Step 2: Verify the tests fail for the missing module**

Run: `node --no-warnings --test src/lib/paintMatch.test.mjs`

Expected: FAIL because `src/lib/paintMatch.ts` does not exist.

- [x] **Step 3: Implement the pure matcher**

Export the matcher and its supporting types. Filter by requested lightness,
fall back to the full eligible pool when the directional pool is empty, rank by
Delta E, and compare preferred purchase labels only when distances are equal.

- [x] **Step 4: Replace the page-local matcher**

Import the library matcher into `src/app/palette/page.tsx`, remove its duplicate
implementation, and pass `sourceNameOf(customColor)` as the preferred label in
palette grounding calls. Calls that do not represent a specific imported paint
omit the preferred label.

- [x] **Step 5: Verify the focused matcher tests pass**

Run: `node --no-warnings --test src/lib/paintMatch.test.mjs`

Expected: all matcher tests PASS.

---

### Task 2: Complete-catalog default and catalog regression

**Files:**

- Modify: `src/app/palette/page.tsx`
- Modify: `src/lib/paintMatch.test.mjs`

**Interfaces:**

- Consumes: `BRAND_OPTIONS`, available paint datasets, and
  `findClosestPaintMatches` from Task 1.
- Produces: normal palette matching with `Any` as its initial brand pool.

- [x] **Step 1: Add the failing SW 2704 regression test**

Load the real paint fixtures, call `getGroundablePaintColors` without a brand,
and assert the literal Merlot outcome:

```js
assert.equal(match.paintColor.code, "SW 2704");
assert.equal(match.paintColor.name, "Merlot");
```

- [x] **Step 2: Verify the regression test fails against the restricted default**

Run: `node --no-warnings --test src/lib/paintMatch.test.mjs`

Expected: FAIL because `getGroundablePaintColors` does not yet provide the
full-catalog normal default.

- [x] **Step 3: Default normal matching to the full catalog**

Define `DEFAULT_PAINT_MATCH_BRAND` with value `"Any"`. Implement
`getGroundablePaintColors` in the shared module with that default, initialize
`groundBrand` from the same constant, and retain the existing explicit brand,
Lowe's, availability, and verified-only filters.

- [x] **Step 4: Verify focused behavior**

Run: `node --no-warnings --test src/lib/paintMatch.test.mjs`

Expected: Merlot, tie-break, closer-color, and filtered-pool tests PASS.

- [x] **Step 5: Audit imported identity across the real catalog**

For every non-discontinued catalog entry, match within its exact-hex group with
its purchase label preferred and assert that the returned paint is the same
record. This covers unique colors and duplicate hex values across every loaded
brand without an impractical all-pairs search.

- [x] **Step 6: Run full verification**

Run:

```bash
node --no-warnings --test
npx tsc --noEmit
npm run lint
git diff --check
npm run build
```

Expected: all supported commands exit successfully. If the repository has no
lint script, record that fact and continue with the remaining checks.
