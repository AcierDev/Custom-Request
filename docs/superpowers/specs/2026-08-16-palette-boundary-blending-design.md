# Palette Boundary Blending Design

## Goal

Make every adjacent palette color boundary visibly blend while ensuring a color never appears more than one progression-axis square outside its original band and no square is isolated from its color by edge adjacency.

Every palette color must first receive an equal share of the artwork's total square count. When the total is not evenly divisible, counts may differ only by one square. Column preservation and blending may arrange those fixed quotas but must never change them.

## Design

Keep the existing deterministic, count-preserving swaps across adjacent boundary columns or rows. Remove the solid-line preservation rule that skips boundaries for narrow bands. Instead, reserve positions on every boundary line as swaps are planned so a square introduced from one neighbor cannot be reused and carried across the next seam.

For bands three or more lines wide, blending both edge lines leaves at least one solid interior line. One- and two-line bands have exactly enough or only one more line than the solid minimum, so blending every adjacent seam takes priority over retaining a solid line. For a one-line band, the left and right seams share a line, so their reserved positions must be disjoint. If the requested density exceeds the remaining positions, cap that seam to the available capacity.

The algorithm remains in `patternUtils.ts`, shared by `/viewer` and `/shared/[id]`, remains deterministic, and preserves exact palette color counts. Quotas are calculated from total squares rather than progression-axis columns so a 24×12 grid with 14 colors yields 20–21 squares per color instead of 12 or 24.

After planning the seam swaps, validate every square using only orthogonal neighbors. If a square has no edge-sharing same-color neighbor, revert the complete swap responsible for that isolation. Reverting both sides preserves exact color counts; repeat until no unsafe blend swap remains. Corner-only contact does not satisfy the rule.

## Verification

- A three-color palette with two-column bands blends both boundaries at 100%.
- A three-color palette with three-column bands blends both boundaries and retains a solid interior column.
- A three-color palette with one-column bands blends both boundaries without any color moving two columns from its source.
- Every blended square has an orthogonally adjacent square of the same color.
- A grid whose columns do not divide evenly among its colors still differs by at most one square per color.
- Horizontal, vertical, reversed, and zero-percent behavior remain covered.
