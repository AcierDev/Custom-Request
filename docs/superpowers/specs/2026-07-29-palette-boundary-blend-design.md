# Palette Boundary Blend Design

## Goal

Make Palette Blend vary only the mix at adjacent color boundaries, and expose its slider inline like Scatter controls.

## Pattern Behavior

- Palette bands retain their current sizes and order.
- At 0%, every boundary remains a hard line.
- Increasing the percentage swaps more paired squares between the two lines directly touching each boundary.
- A color may cross its boundary by one line only. Palette Blend never places it two or more columns or rows into a neighboring band.
- Each exchange is paired, preserving the exact number of squares assigned to every color.
- Horizontal, vertical, rotated, and reversed palettes follow the same rule.
- Scatter remains the only pattern that spreads colors farther from their boundaries.

## Controls

When Palette is selected, show the Palette Blend percentage and slider inline below the pattern choices using the same layout as Scatter's sliders. Remove the right-click, keyboard context-menu, popover, and tooltip interaction.

## Architecture

`generateColorMap` continues to build solid Palette bands first. It then passes the map to the existing seam-blending path, configured to mix only each seam's immediate pair of lines. Blend percentage controls swap density along those lines, not transition depth.

`PatternControls` conditionally renders an inline Palette Blend block when `colorPattern === "fade"`.

## Testing

- Prove 0% produces hard bands.
- Prove 100% preserves exact color counts while every displaced square stays in a boundary-adjacent line.
- Cover horizontal, vertical, and reversed maps.
- Prove Palette renders the inline slider without context-menu instructions, while Scatter continues to render its controls.
- Run the complete test suite, type-check, and production build.
