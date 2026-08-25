# Wave Pattern Generator Design

## Goal

Add an undoable Wave option to the Viewer Pattern Editor's left-side **Extra Options** section. Applying it turns the palette progression 90 degrees into horizontal bands, then sweeps every boundary upward from left to right while keeping every square discrete.

## Interaction

Extra Options contains a compact **Wave pattern** control with **Apply wave**, **Flip**, and **Mirror** buttons, no subtitle, and a **Corner color amount** slider. All actions are enabled when the rendered grid and at least two colors are available. Apply generates the reference orientation using the selected amount, Flip turns the current grid top-to-bottom, and Mirror reflects the current grid left-to-right. Moving the slider updates the artwork live while retaining the current Flip/Mirror combination.

Applying or transforming the wave replaces all per-square color overrides in one history entry. Flip and Mirror transform the color grid currently shown rather than regenerating from the reference orientation, so actions compose in any order. Once Wave is active, changing the authoritative rendered grid size regenerates the complete wave immediately at the new size while preserving the selected Corner color amount and current Flip/Mirror combination. A size change does not generate Wave before the user has activated it, and switching palettes or designs clears the active Wave session state. Existing square direction and visibility edits remain unchanged. Undo restores the prior color overrides, and the generated squares remain editable with the existing Pattern Editor tools.

No Wave item is added to the general Pattern menu.

## Generation

A pure helper receives the authoritative current grid size and palette color count. The editor derives that size through the same mini/drawn-pattern layout logic as the renderer, so stale overrides from an earlier artwork size cannot enlarge the result. The helper assigns equal-height color bands from the first palette color at the top to the last at the bottom. Every boundary starts level on the left and moves monotonically upward across the artwork. The rise uses accelerating horizontal progress, so it changes slowly at first and faster near the right edge. Its calibrated maximum rise strongly suppresses the upper colors at the far-right edge while preserving more of them through the middle. Lower palette colors therefore occupy progressively more space while upper colors narrow.

Named configuration values define the maximum rise, acceleration exponent, safe grid/color limits, supported transformations, and Corner color amount range. The amount is a relative weight from 25% through 400%; 100% preserves equal palette-band weighting. Only the terminal palette color receives this weight, while every other color retains equal weight. Every generated output index is clamped to the available palette. Missing, unsafe, oversized, or underspecified inputs return no overrides. Flip reverses only row coordinates and Mirror reverses only column coordinates. Each reads the existing authoritative color overrides, with a generated standard wave at the selected corner amount filling any missing cells, so actions compose. The control tracks whether Wave has been activated and the active Flip/Mirror combination locally for live amount and grid-size regeneration, resets that state on palette or design change, and persists the resulting complete overrides without adding share-schema fields.

The generator covers the complete authoritative rectangle, including hidden edge squares, without reading historical override keys. Applying a wave changes colors only; it does not change the palette, dimensions, orientation, square direction, visibility, or backboard settings.

## Persistence and Sharing

The generator writes through the existing `patternOverride` store action. Pattern overrides already persist with palettes, viewer versions, and shared designs, and the shared viewer already renders them through `GeometricPattern`. No new share schema or URL state is needed.

## Testing

Pure helper tests verify deterministic output, a 90-degree top-to-bottom progression, boundaries that rise without reversing, stronger change near the right edge, increasing corner-color coverage, exact top-bottom Flip output, exact left-right Mirror output, Mirror-then-Flip composition, live amount regeneration that retains both transformations, oriented regeneration after an active grid-size change, no regeneration while Wave is inactive, valid palette indexes, complete authoritative-grid coverage, and safe handling of undersized or unsafe inputs. Component tests verify the Wave actions, Corner color amount control, disabled/enabled behavior, and current/drawn grid-size resolution. Existing store history, viewer, sharing, type-check, and production-build checks guard integration.
