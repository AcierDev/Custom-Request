# Fusion 360 STEP Export Design

Date: 2026-07-26
Status: Approved

## Goal

Add a viewer-page download that exports the current artwork as one life-size,
editable AP242 STEP file for Fusion 360. Preserve the visible layout, square
spacing, component hierarchy, and solid colors.

STEP will provide editable boundary-representation solids and components.
Fusion 360 will not receive the application's parametric feature history.

## Component Structure

The Fusion browser tree will be:

```text
Everwood Art
├── Backboard
└── Squares
    ├── Square 001
    ├── Square 002
    └── ...
```

Every visible wooden square will have its own component definition so it can
be selected and edited without modifying the other squares. Hidden squares
will not be exported.

`Backboard` will be a separate component. A multi-panel design will keep its
physical panels as separate bodies inside that component while preserving the
viewer panel spacing.

## Geometry and Scale

The export will consume the same `ArtSnapshot` and per-square transforms used
by the live viewer. The snapshot contract will include any state needed to
reproduce the backboard, panel layout, and square-gap setting.

All calculations will use named configuration values. Scene units will be
converted to millimeters using the existing relationship of six inches per
scene unit. The exported STEP document will declare millimeter units.

Each square will use the existing 21.5-degree wedge profile, including its
backboard lip, orientation, rotation, scale, drift, and final position.
Backboard thickness, inset, orientation, panel count, panel spacing, and
overall dimensions will match the viewer. The assembled model will be
recentered without changing its dimensions or relative transforms.

## Colors

OpenCascade XCAF colors will assign the square's current RGB color to both its
component and solid. The backboard will receive its selected RGB color or the
existing natural-backboard fallback.

STEP cannot carry the viewer's procedural wood-grain texture reliably into
Fusion 360. The export will therefore retain the underlying solid color and
omit the grain texture.

## Export Architecture

The recommended implementation uses the full OpenCascade bindings from
`replicad-opencascadejs` in a dedicated Web Worker:

- The dependency and WASM asset load lazily only after a STEP download.
- The worker builds exact BRep solids and an XCAF assembly.
- `STEPCAFControl_Writer` writes one AP242 file with names, colors, assemblies,
  and millimeter units.
- Generation stays off the UI thread and no model data is uploaded.
- The worker terminates after completion, and temporary object URLs are
  revoked.

A working proof of concept verified one-file output containing the nested
`Everwood Art` / `Squares` assembly, individual square products, backboard,
RGB `COLOUR_RGB` records, and `.MILLI.` units.

## Viewer Experience

The existing viewer action dock will gain a **Download STEP** action. Desktop
shows its text label; compact layouts use an icon with an accessible label and
tooltip.

During generation the action is disabled and shows a progress state. Success
downloads a filename beginning with `everwood-art` and ending in `.step`.
Missing artwork or generation failures produce a concise retryable error
without affecting the viewer.

## Alternatives Considered

- Server-side OpenCascade avoids the browser WASM download, but adds model
  uploads, cold starts, hosting limits, and server cost.
- 3MF or OBJ can preserve mesh colors with a smaller implementation, but they
  do not provide the requested editable BRep STEP solids.
- A smaller high-level STEP wrapper was rejected because it could not create
  the required nested `Squares` assembly reliably.

## Verification

Automated checks will cover:

- scene-unit-to-millimeter conversion and life-size dimensions;
- the wedge and backboard dimensions;
- square rotations, positions, and configured square gaps;
- exclusion of hidden squares;
- the exact root, `Backboard`, and `Squares` hierarchy;
- one independently editable component per visible square;
- AP242 names, RGB colors, and millimeter declarations.

A generated fixture will be read back with OpenCascade to verify its bounding
box. The emitted AP242 records will be inspected for the exact assembly
structure, names, colors, and units. The focused test suite and production
build will run, followed by a browser download check from the viewer.

## Delivery

The existing viewer square-spacing feature is required scope. Its control,
preview geometry, backboard sizing, saved/shared state, and URL persistence
will be audited and tested. Its complete implementation will be included in
the next commit and pushed with this work.

## Non-goals

- Parametric Fusion sketches or feature-history reconstruction.
- Wood-grain texture transfer.
- STL, OBJ, 3MF, or native `.f3d` export.
- Changing the artwork, palette, spacing, or dimensions during export.
