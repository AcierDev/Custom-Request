# Solid Backboard Color Design

## Goal

Render a selected backboard color as opaque paint with no visible plywood grain. Selecting **Natural** restores the existing plywood appearance.

## Design

- Keep the existing state model: a hex color represents paint and `null` represents Natural.
- In both single-panel and multi-panel backboard renderers, attach the plywood texture only when the backboard color is `null` and wood grain is enabled.
- Continue applying the selected solid color to every backboard face and edge.
- Leave the color picker, Natural button, saved designs, exports, and unrelated artwork materials unchanged.

## Tests

Add a small material-selection helper and unit tests proving:

- Natural uses the plywood texture when wood grain is enabled.
- A selected color never uses the plywood texture.
- Natural respects the existing disabled-grain state.
