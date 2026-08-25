# Palette Viewer Reset Design

## Problem

Creating or opening a palette replaces its colors but leaves shared viewer state unchanged. Rotation, reversal, pattern, orientation, dimensions, materials, room controls, panel layout, and pattern-editor state can therefore leak from the prior palette.

## Design

Define one factory in the custom store that returns fresh copies of every initial viewer setting. Apply that reset at palette boundaries before adding the new palette-specific data:

- starting a new palette;
- opening a saved palette for editing or viewing;
- opening a saved palette color version; and
- loading or directly selecting an official palette.

The selected palette's colors, piece-size data, and saved palette-specific square overrides still load normally. Loading an explicitly saved viewer version remains an exception because its purpose is to restore that version's viewer settings.

Centralizing the reset in store actions covers UI and programmatic callers. A component effect would be unsafe because ordinary color edits also change palette identity; duplicating resets in click handlers would miss non-UI callers.

## Defaults

The factory mirrors store initialization: default dimensions and pattern, horizontal orientation, no rotation or reversal, default scatter and blend values, default room/material/panel settings, palette mode, no drawn pattern, and inactive/empty pattern-editor state.

## Tests

A store regression suite will dirty all viewer fields, invoke each palette-boundary action, and verify that defaults are restored while the requested palette colors still load. It will also verify that applying a saved viewer version continues to restore its intentionally saved rotation and pattern settings.
