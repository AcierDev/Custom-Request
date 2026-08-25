# Save Palette Autofocus Design

Date: 2026-07-28
Status: Approved

## Goal

When **Save Palette** opens its dialog, immediately focus the palette-name
input so the user can type without clicking it.

## Behavior

Use the dialog's `onOpenAutoFocus` event and an input ref to override Radix's
default focus target. Focus only; do not select or replace existing text.
Saving, validation, mode switching, and keyboard behavior remain unchanged.

## Verification

Open the dialog in a browser and confirm the name field is the active element,
typing enters text immediately, and the browser console stays error-free.
