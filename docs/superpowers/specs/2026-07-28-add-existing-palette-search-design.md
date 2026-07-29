# Add to Existing Palette Search Design

Date: 2026-07-28
Status: Approved by user direction

## Goal

Make the **Save Palette → Add to existing** flow fast to use with large
palette libraries by adding name search and ordering choices by recent use.

## Interaction

- Replace the native palette select with a search field and scrollable list.
- Filter palette names case-insensitively; color names are not searched.
- Selecting a row keeps the existing **Save as New Version** behavior.
- Show the selected palette clearly and provide an empty state when no name
  matches.

## Recent Ordering

- Add an optional persisted `lastOpenedAt` timestamp to each saved palette.
- Count opening a palette or one of its versions in either the palette editor
  or the 3D viewer.
- Adding the current work to an existing palette also counts because that
  palette becomes the active editing target.
- Sort palettes with the newest `lastOpenedAt` first.
- Palettes never opened under the new behavior follow, newest-created first.
- Use palette name and ID as deterministic tie-breakers without reordering the
  stored array.

## Structure

- A pure palette-selection helper owns name filtering and recent-first sorting.
- Store actions mark palettes opened through one shared immutable helper.
- The save dialog owns only search text and selected target state.
- Existing palette data remains compatible because `lastOpenedAt` is optional.

## Verification

Automated tests cover name-only filtering, case-insensitive matching,
recent-first ordering, unopened fallback ordering, deterministic ties, and
immutable input. Store-level behavior is verified for editor and viewer opens.
Browser verification covers searching, choosing a result, and saving a new
version from the dialog.

## Non-goals

- Searching by color name, hex value, folder, or version name.
- Changing the Saved Palettes page ordering.
- Adding fuzzy matching or server-side search.
