# Paint Match Full-Catalog Design

## Goal

Normal “Convert to paint” matching must search every available paint color so
an imported paint such as Sherwin-Williams SW 2704 Merlot resolves to itself.
A brand or retailer selection narrows the catalog only when the user explicitly
selects it.

## Approaches

1. **Full catalog plus identity tie-break (selected):** Default the selector to
   `Any`, rank every available paint by color distance, and prefer the imported
   purchase label only when distances tie.
2. **Full catalog only:** Fixes unique colors such as Merlot, but an imported
   paint can still be renamed when another brand has the identical hex.
3. **Lock imported paints:** Preserves identity but prevents intentional
   conversion to a selected retailer or brand.

## Design

Move the pure nearest-paint ranking logic from the palette page into a focused
library module. The matcher receives the source hex, eligible paint LAB values,
match count, lightness direction, and optional source purchase label. It sorts
first by Delta E and uses an exact purchase-label match only to break equal
distances. A closer eligible paint always wins.

The palette page defaults its matching pool to `Any`. Existing filters continue
to define the eligible pool when selected. Grounding passes the original swatch
name as the preferred label, preserving imported identity only when that paint
is present and equally close.

This affects `/palette` only; it does not change artwork viewing or interaction
in `/viewer` or `/shared/[id]`.

## Testing

- SW 2704 Merlot resolves to itself from the full catalog.
- An imported purchase label wins an equal-distance, same-hex tie.
- A genuinely closer paint beats the preferred label.
- Explicitly filtered pools still return the closest eligible paint.
- Run focused tests, the full test suite, TypeScript, lint/diff checks, and the
  production build.
