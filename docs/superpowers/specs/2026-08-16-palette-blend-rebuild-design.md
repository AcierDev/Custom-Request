# Palette Blend Line-First Rebuild Design

## Goal

Make Palette blend look like ordered color bands with softened edges, while preserving exact color quotas and all locality and attachment constraints.

## Root Cause

The failed generator treats every palette seam as a two-dimensional swap field. On the representative 32×12, 15-color artwork, it reduces 19 solid columns at 0% to 2 at 100%, producing blobs and horizontal chains. The earlier visually successful generator kept mixing inside the line that already contained a quota transition.

## Chosen Design

- Assign exact per-color square quotas sequentially along a serpentine progression path.
- Classify each adjacent-color boundary from its cumulative quota:
  - A boundary inside a progression line may only rearrange the two colors already in that transition line.
  - A boundary exactly between two solid lines may exchange distributed squares across those two touching lines.
- Build a deterministic, evenly interleaved target for each transition line. Blend percentage applies a proportional prefix of the swaps needed to reach that target.
- Prefer solid progression lines as the dominant structure. Below 15% the boundary planner alone controls mixing. At 15% and above, a deterministic separation pass prevents adjacent solid progression lines by exchanging supported squares with the nearest mixed transition line.
- For the representative 32×12, 15-color grid, the separated layout retains the maximum feasible 15 solid columns after accounting for quota-transition lines, the aligned seam, and the two endpoint pairs.
- Every exchange preserves exact counts, stays within one progression line of the 0% color region, and is rejected if any square loses an orthogonal same-color neighbor.
- Adjacent boundaries must all respond at full blend, including aligned seams.
- The pure generator remains the single implementation used by `/viewer` and `/shared/[id]`.

## Alternatives Rejected

- Global candidate swaps: exact but destroys solid-line structure.
- Smooth noisy boundary scores: attractive for wide bands, but exact quota repair and one-line attachment become fragile for one-column colors.
- Post-processing the current output to recover lines: cannot reliably undo clumps without breaking counts or slider monotonicity.

## Verification

- Exact quotas differ by at most one when the grid is not evenly divisible.
- The 32×12, 15-color layout has no adjacent solid columns from 15% through 100% and retains 15 solid columns.
- 0%, 25%, 50%, 75%, and 100% progressively change more transition squares.
- Every square has an orthogonal same-color neighbor across realistic color counts and both orientations.
- No color appears more than one progression line outside its 0% range.
- Every adjacent palette boundary visibly changes at 100%.
