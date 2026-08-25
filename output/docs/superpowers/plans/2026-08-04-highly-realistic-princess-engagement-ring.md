# Highly Realistic Princess Engagement Ring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing engagement-ring blockout with a clean, highly realistic Fusion presentation model matching the approved reference.

**Architecture:** Keep dimension and placement calculations in pure Python, generate watertight gemstone triangle meshes without construction sketches, and use Fusion B-Rep features for the shank, seats, gallery, and tapered prongs. Build a new unsaved document, hide all helper geometry, and finish with a configured side three-quarter camera.

**Tech Stack:** Python 3, Fusion 360 Python API, `unittest`, local Fusion queue bridge.

## Global Constraints

- US size 5.25; 15.9 mm inside diameter.
- 3.0 mm yellow-gold shank width and 2.0 mm radial thickness.
- One 6.5 mm square princess center stone, four prongs, 16 hidden-halo diamonds, and ten 2.3 mm shoulder diamonds.
- One shoulder row only; the lower shank remains plain.
- Visual realism takes priority over manufacturing tolerances.
- All numeric geometry values are named configuration parameters.
- Do not create a git commit unless the user explicitly requests one.

---

### Task 1: Watertight Gemstone Mesh Core

**Files:**
- Create: `fusion_bridge/jobs/gem_mesh.py`
- Modify: `fusion_bridge/tests/test_jobs.py`

**Interfaces:**
- Produces: `MeshData(vertices_mm, triangles)`, `build_princess_mesh(size_mm, levels)`, `build_round_brilliant_mesh(diameter_mm, levels, segment_count)`, `edge_use_counts(mesh)`.

- [x] **Step 1: Write failing tests for closure, symmetry, and bounds**

```python
princess = gem_mesh.build_princess_mesh(6.5, gem_mesh.princess_levels())
self.assertTrue(all(count == 2 for count in gem_mesh.edge_use_counts(princess).values()))
self.assertEqual(princess.bounds_mm()[0][0], -3.25)
self.assertEqual(princess.bounds_mm()[1][0], 3.25)
```

- [x] **Step 2: Run `python3 -m unittest fusion_bridge.tests.test_jobs` and confirm the new tests fail because `gem_mesh` does not exist**

- [x] **Step 3: Implement immutable mesh data, chamfered-square loops, round facet rings, triangle winding, and edge counting**

```python
@dataclass(frozen=True)
class MeshData:
    vertices_mm: tuple[tuple[float, float, float], ...]
    triangles: tuple[tuple[int, int, int], ...]
```

- [x] **Step 4: Run the focused tests and confirm both gemstone meshes are closed, symmetric, and correctly scaled**

### Task 2: Mesh Bodies and Clean Occurrences in Fusion

**Files:**
- Modify: `fusion_bridge/jobs/engagement_ring.py`
- Modify: `fusion_bridge/tests/test_jobs.py`

**Interfaces:**
- Consumes: `MeshData` from Task 1.
- Produces: `_create_mesh_body(component, design, mesh, name)` and `_create_and_place_mesh_stones(...)`.

- [x] **Step 1: Add failing tests for coordinate flattening and triangle index flattening**

```python
coordinates, indices = self.job.fusion_mesh_arrays(mesh, scale=0.1)
self.assertEqual(len(coordinates), len(mesh.vertices_mm) * 3)
self.assertEqual(len(indices), len(mesh.triangles) * 3)
```

- [x] **Step 2: Run the focused tests and confirm the helper is missing**

- [x] **Step 3: Implement `fusion_mesh_arrays` and create mesh masters with `component.meshBodies.addByTriangleMeshData`**

```python
body = component.meshBodies.addByTriangleMeshData(
    coordinates_cm,
    triangle_indices,
    [],
    [],
)
```

- [x] **Step 4: Replace lofted center, halo, and shoulder gemstone bodies with the mesh builders; retain linked occurrences and diamond appearance overrides**

- [x] **Step 5: Run all job tests and confirm the counts remain one center, 16 halo, and ten shoulder stones**

### Task 3: Recessed Shoulder Pavé

**Files:**
- Modify: `fusion_bridge/jobs/engagement_ring.py`
- Modify: `fusion_bridge/tests/test_jobs.py`

**Interfaces:**
- Produces: `shoulder_seat_specs(parameters)` and `_cut_shoulder_seats(root_component, design, band_body, specs)`.

- [x] **Step 1: Add failing tests that each shoulder stone has one coaxial tapered seat and that all seats stop before the plain lower shank**

```python
seats = self.job.shoulder_seat_specs(self.job.ring_parameters({}))
self.assertEqual(len(seats), 10)
self.assertLessEqual(max(seat["angle_degrees"] for seat in seats), 70.0)
```

- [x] **Step 2: Run the focused test and confirm `shoulder_seat_specs` is missing**

- [x] **Step 3: Implement named seat radii and depth parameters, create coaxial temporary tapered cutters, persist them in a base feature, and cut them from the shank with one combine feature**

- [x] **Step 4: Place paired shared gold beads between adjacent stones and verify the beads intersect the shank surface**

- [x] **Step 5: Run the full test suite**

### Task 4: Refined Hidden-Halo Gallery

**Files:**
- Modify: `fusion_bridge/jobs/engagement_ring.py`
- Modify: `fusion_bridge/tests/test_jobs.py`

**Interfaces:**
- Produces: `halo_gallery_segments(parameters)`, `halo_separator_centers(parameters)`, and `_create_halo_gallery(...)`.

- [x] **Step 1: Add failing tests for eight horizontal gallery wires, four restrained corner posts, 12 separator beads, and a halo top below the center girdle**

```python
segments = self.job.halo_gallery_segments(parameters)
self.assertEqual(sum(item["kind"] == "wire" for item in segments), 8)
self.assertEqual(sum(item["kind"] == "post" for item in segments), 4)
```

- [x] **Step 2: Run the focused tests and confirm the gallery helpers are missing**

- [x] **Step 3: Implement upper and lower rounded square wires, short corner posts, and separator beads using named diameters and heights**

- [x] **Step 4: Position the 16 halo mesh occurrences between the two wires so only one row reads from each side**

- [x] **Step 5: Run the full test suite**

### Task 5: Smooth Tapered Four-Prong Setting

**Files:**
- Modify: `fusion_bridge/jobs/engagement_ring.py`
- Modify: `fusion_bridge/tests/test_jobs.py`

**Interfaces:**
- Produces: `prong_profile_specs(parameters)` and `_create_tapered_prongs(...)`.

- [x] **Step 1: Add failing tests for four monotonically rising paths and decreasing root-to-tip diameters**

```python
for specs in self.job.prong_profile_specs(parameters):
    self.assertGreater(specs[0]["diameter_mm"], specs[-1]["diameter_mm"])
```

- [x] **Step 2: Run the focused test and confirm the profile helper is missing**

- [x] **Step 3: Create a 3D fitted centerline, normal construction planes at every path point, circular profiles with decreasing diameters, and a solid centerline loft for each prong**

```python
loft_input.centerLineOrRails.addCenterLine(spline)
loft_input.isSolid = True
```

- [x] **Step 4: Add small rounded tip beads and verify exactly four finished prong bodies are returned**

- [x] **Step 5: Run the full test suite**

### Task 6: Presentation Cleanup and Camera

**Files:**
- Modify: `fusion_bridge/jobs/engagement_ring.py`
- Modify: `fusion_bridge/tests/test_jobs.py`

**Interfaces:**
- Produces: `presentation_camera_spec(parameters)`, `_hide_construction(component)`, and `_apply_presentation_view(app, design, parameters)`.

- [x] **Step 1: Add failing tests for named eye, target, up-vector, and orthographic extent values**

- [x] **Step 2: Implement recursive hiding for sketches, construction planes, cutter bodies, and helper components**

- [x] **Step 3: Apply `ShadedVisualStyle`, polished yellow-gold and diamond appearances, and the side three-quarter camera with `isFitView=True`**

- [x] **Step 4: Add result diagnostics for mesh closure, seat count, gallery part count, prong profile type, and hidden construction count**

- [x] **Step 5: Run all tests and compile every bridge Python file**

### Task 7: Live Fusion Generation and Visual Gate

**Files:**
- Inspect: `fusion_bridge/queue/results/<request>.result.json`
- Inspect: current Fusion viewport

**Interfaces:**
- Consumes: the completed `engagement_ring.run(context)` job.
- Produces: one new active unsaved Fusion presentation document.

- [x] **Step 1: Submit a uniquely named engagement-ring job targeting a new document**

```bash
python3 -m fusion_bridge.submit_job --job engagement_ring --request-id size_5_25_princess_engagement_ring_realistic_v1
```

- [x] **Step 2: Wait for the result file and verify the required body, mesh, stone, seat, bead, gallery, and prong counts**

- [x] **Step 3: Inspect the Fusion viewport from the configured side view and a temporary top view**

- [x] **Step 4: If any visual gate fails, record the exact mismatch, adjust one geometry cause, rerun automated tests, and generate a new uniquely named document**

- [x] **Step 5: Finish only when the active document has no visible construction clutter, embedded shoulder pavé, a discreet single-row halo, smooth tapered prongs, and a detailed princess center stone**
