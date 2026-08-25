# Size 5.25 Yellow-Gold Wedding Band Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add and run a Fusion bridge job that creates one US-size-5.25 comfort-fit wedding band with a polished yellow-gold appearance.

**Architecture:** A focused `wedding_band` job validates numeric parameters with pure Python, builds a rounded cross-section sketch, revolves it into one body, and selects the best installed gold appearance by deterministic name scoring. Existing queue and document-isolation behavior remains unchanged.

**Tech Stack:** Python 3, Autodesk Fusion API (`adsk.core`, `adsk.fusion`), `unittest`, existing file-queue bridge.

## Global Constraints

- Create a new unsaved Fusion design; do not modify an existing document.
- Default dimensions are 15.9 mm inside diameter, 6.0 mm width, 2.0 mm radial thickness, and 0.75 mm edge radius.
- Produce exactly one solid body named `Size 5.25 Yellow Gold Wedding Band`.
- Apply the best installed polished yellow-gold appearance and report its exact name.
- Do not commit or push unless explicitly requested.

---

### Task 1: Pure parameter and appearance selection behavior

**Files:**
- Create: `fusion_bridge/jobs/wedding_band.py`
- Modify: `fusion_bridge/tests/test_jobs.py`

**Interfaces:**
- Produces: `band_dimensions(parameters: dict) -> dict[str, float]`
- Produces: `select_gold_appearance_name(names: list[str]) -> str | None`

- [ ] **Step 1: Write failing tests**

Add tests asserting exact defaults, rejection of an edge radius at least half the smaller cross-section dimension, and preference order `Gold - Polished Yellow` over `Gold - Polished` over `Gold`.

- [ ] **Step 2: Verify the tests fail**

Run: `python3 -m unittest fusion_bridge.tests.test_jobs.WeddingBandJobTests -v`

Expected: FAIL because `wedding_band` does not exist.

- [ ] **Step 3: Implement the minimal pure functions**

Define named constants for every default and numeric boundary. Validate booleans separately from numbers. Score appearance names with explicit tokens so the result is deterministic.

- [ ] **Step 4: Verify the tests pass**

Run: `python3 -m unittest fusion_bridge.tests.test_jobs.WeddingBandJobTests -v`

Expected: all wedding-band unit tests pass.

### Task 2: Fusion model generation

**Files:**
- Modify: `fusion_bridge/jobs/wedding_band.py`
- Modify: `fusion_bridge/tests/test_jobs.py`

**Interfaces:**
- Produces: `rounded_profile_points(dimensions: dict[str, float]) -> dict[str, tuple[float, float]]`
- Produces: `run(context) -> dict`

- [ ] **Step 1: Write a failing geometry test**

Assert that the rounded-profile control points span radii 7.95–9.95 mm and axial positions -3.0–3.0 mm for the defaults.

- [ ] **Step 2: Verify the geometry test fails**

Run: `python3 -m unittest fusion_bridge.tests.test_jobs.WeddingBandJobTests -v`

Expected: FAIL because `rounded_profile_points` does not exist.

- [ ] **Step 3: Implement the rounded sketch and revolve**

Create eight tangent points and four 45-degree arc points for a rounded rectangle. Add four straight sketch segments plus four three-point arcs on the X-Y plane, add a construction axis at X=0, revolve the closed profile through `2 * math.pi`, and name the resulting body.

- [ ] **Step 4: Implement appearance assignment**

Enumerate `context.app.materialLibraries`, rank all appearances by lowercase name tokens, copy the best match into `design.appearances` with `addByCopy`, and assign it to the body. Raise a clear error if no gold appearance is installed.

- [ ] **Step 5: Run the full test suite and compiler check**

Run: `python3 -m unittest discover -s fusion_bridge/tests -v`

Run: `python3 -m compileall -q fusion_bridge`

Expected: all tests pass and compilation exits zero.

### Task 3: End-to-end Fusion verification

**Files:**
- Create at runtime: `fusion_bridge/queue/results/size_5_25_yellow_gold_band.result.json`

**Interfaces:**
- Consumes: `submit_job.py --job wedding_band --target new_document`
- Produces: a new unsaved Fusion document and result JSON.

- [ ] **Step 1: Submit the job**

Run: `python3 fusion_bridge/submit_job.py --root fusion_bridge --job wedding_band --target new_document --request-id size_5_25_yellow_gold_band`

- [ ] **Step 2: Verify the result contract**

Assert `status == "success"`, `body_count == 1`, dimensions match the defaults, `outer_diameter_mm == 19.9`, and the returned appearance contains `gold` case-insensitively.

- [ ] **Step 3: Visually inspect Fusion**

Confirm the active new document visibly contains one ring-shaped body with a yellow-metal appearance. Leave it unsaved and do not alter other documents.
