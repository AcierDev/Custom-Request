# Reverse Palette Order

## Goal

Add a compact action to the palette editor that reverses the order of every
color in the current palette.

## Design

- Place a small `Reverse` button in the palette action row beside the existing
  non-destructive editing actions.
- Enable it only when the palette contains at least two colors.
- Reverse a copied array and pass it through the editor's existing
  history-aware `setCustomPalette` action. This preserves color objects and
  IDs, updates dependent pattern color indexes, and makes the change undoable.
- Use a clear directional icon, an accessible label, and a short tooltip.
- Do not add persistence, confirmation, or a new mode. Saving continues to use
  the editor's existing workflow.

## Verification

- Unit-test that reversal changes the full order without mutating the source
  array or its color records.
- Confirm TypeScript and the complete test suite pass.
- In the browser, verify the button reverses visible swatches and Undo restores
  their original order.
