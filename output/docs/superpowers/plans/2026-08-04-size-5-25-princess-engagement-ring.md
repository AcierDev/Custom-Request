# Size 5.25 Princess-Cut Engagement Ring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and verify the approved size-5.25 yellow-gold princess-cut engagement ring in a new unsaved Fusion document.

**Architecture:** A focused `engagement_ring` job exposes pure parameter and placement helpers, then uses the Fusion API to create the band, reusable gemstone components, bridge, and four curved prongs. The existing local file-queue bridge supplies document isolation and result reporting.

**Tech Stack:** Python 3, Autodesk Fusion API (`adsk.core`, `adsk.fusion`), `unittest`, existing Fusion file-queue bridge.

## Global Constraints

- Use named configuration constants for every numeric value.
- Keep the current wedding-band job unchanged.
- Create a new unsaved Fusion design.
- Do not commit or push unless explicitly requested.
- Create exactly one center stone, four prongs, four halo rails, 16 halo diamonds, and ten shoulder diamonds.

---

### Task 1: Parameter and placement contract

**Files:**
- Create: `fusion_bridge/jobs/engagement_ring.py`
- Modify: `fusion_bridge/tests/test_jobs.py`

**Interfaces:**
- Produces: `ring_parameters(overrides: dict) -> dict[str, float]`
- Produces: `shoulder_stone_placements(parameters: dict) -> list[dict]`
- Produces: `halo_stone_placements(parameters: dict) -> list[dict]`
- Produces: `prong_paths(parameters: dict) -> list[list[tuple[float, float, float]]]`

- [ ] **Step 1: Write failing tests**

Assert the approved defaults and exact placement counts. Assert one shoulder row at axial coordinate zero, five stones on each shoulder, four halo stones on each square side, and four three-point prong paths.

- [ ] **Step 2: Verify the tests fail**

Run: `python3 -m unittest fusion_bridge.tests.test_jobs.EngagementRingJobTests -v`

Expected: FAIL because `engagement_ring` does not exist.

- [ ] **Step 3: Implement the pure helpers**

Define named constants for the 15.9 mm inside diameter, 3.0 mm band width, 2.0 mm radial thickness, 6.5 mm center stone, 1.0 mm prongs, 1.0 mm halo diamonds, 2.3 mm shoulder diamonds, and all placement angles/heights. Validate all overridable dimensions as positive finite numbers.

- [ ] **Step 4: Verify the helper tests pass**

Run: `python3 -m unittest fusion_bridge.tests.test_jobs.EngagementRingJobTests -v`

Expected: all engagement-ring helper tests pass.

### Task 2: Band, metalwork, and appearances

**Files:**
- Modify: `fusion_bridge/jobs/engagement_ring.py`

**Interfaces:**
- Produces: `create_band(root_component, design, parameters)`
- Produces: `create_halo_bridge(root_component, parameters)`
- Produces: `create_prongs(root_component, parameters)`
- Produces: `select_appearance_name(names: list[str], preferred_tokens: tuple[str, ...]) -> str | None`

- [ ] **Step 1: Build the 3.0 mm comfort-fit band**

Create the same topology-stable rounded radial/axial profile used by `wedding_band.py`, revolve it once, and name the body `Size 5.25 Yellow Gold Engagement Ring Band`.

- [ ] **Step 2: Build the raised hidden-halo bridge**

Create four slim rectangular gold rails around the center-stone footprint at the configured halo height.

- [ ] **Step 3: Build exactly four curved prongs**

For each configured three-point path, sample a quadratic curve, join consecutive points with overlapping tapered cylinders, add joint spheres, and union the temporary bodies into one prong body.

- [ ] **Step 4: Assign metal appearance**

Deterministically prefer installed appearance names containing `gold`, `yellow`, and `polished`; copy the selected appearance into the design and assign it to every metal body.

### Task 3: Gemstones and linked placement

**Files:**
- Modify: `fusion_bridge/jobs/engagement_ring.py`

**Interfaces:**
- Produces: `create_princess_stone(component, parameters)`
- Produces: `create_round_stone_component(root_component, diameter_mm, name)`
- Produces: `place_component(root_component, component, placement)`

- [ ] **Step 1: Build the princess-cut center stone**

Loft centered square sections from culet to 6.5 mm girdle to smaller table, keeping the square axes aligned with the band axes.

- [ ] **Step 2: Build two reusable round-stone masters**

Loft octagonal culet, girdle, and table sections for 1.0 mm halo stones and 2.3 mm shoulder stones.

- [ ] **Step 3: Place all linked occurrences**

Place 16 halo occurrences facing outward from the square bridge and ten shoulder occurrences facing radially outward along the band. Keep every shoulder occurrence centered at axial coordinate zero.

- [ ] **Step 4: Assign stone appearance**

Prefer an installed appearance containing `diamond`; otherwise use the best clear glass or clear gem appearance. Apply it to the center stone and both reusable round-stone masters.

### Task 4: End-to-end execution and verification

**Files:**
- Modify: `fusion_bridge/tests/test_jobs.py`
- Create at runtime: `fusion_bridge/queue/results/size_5_25_princess_engagement_ring.result.json`

**Interfaces:**
- Produces: `run(context) -> dict`

- [ ] **Step 1: Run all local tests and compilation**

Run: `python3 -m unittest discover -s fusion_bridge/tests -v`

Run: `python3 -m compileall -q fusion_bridge`

Expected: all tests pass and compilation exits zero.

- [ ] **Step 2: Submit the Fusion job**

Run: `python3 fusion_bridge/submit_job.py --root fusion_bridge --job engagement_ring --target new_document --request-id size_5_25_princess_engagement_ring`

- [ ] **Step 3: Verify the result contract**

Require `status == "success"` and returned counts of one center stone, four prongs, four halo rails, 16 halo diamonds, and ten shoulder diamonds.

- [ ] **Step 4: Inspect the active Fusion design**

Confirm the ring is visible, yellow-gold metal and clear stones are distinguishable, the princess stone is square with the band, each shoulder has one wide centered row stopping halfway down, the hidden halo is raised, and no extra side supports exist.
