# Palette Delete Batching Design

## Goal

Keep palette swatches in place while a user rapidly deletes several colors, then remove the queued colors together after 1.5 seconds without another delete.

## Behavior

- Direct trash-button clicks queue colors by stable ID instead of deleting by index immediately.
- A queued swatch remains in its slot and receives a pending visual treatment.
- Every additional direct delete restarts the 1.5-second idle timer.
- When the timer expires, all still-present queued colors are removed in one palette update and one history entry.
- The existing Select & Delete flow remains immediate because it already keeps the layout stable during selection.
- Unmounting cancels the timer without committing hidden work.

## Architecture

Put the timer and ID queue in a small framework-independent controller with injected scheduling functions. `PaletteManager` owns one controller, renders pending IDs, and commits the queued IDs against the latest store palette. `ColorSwatch` receives a pending flag so both mobile and desktop trash buttons become disabled while the swatch waits.

## Verification

- The first delete does not commit before the idle deadline.
- A second delete restarts the deadline and both IDs commit together.
- Duplicate clicks do not duplicate IDs.
- Disposal cancels the pending commit.
