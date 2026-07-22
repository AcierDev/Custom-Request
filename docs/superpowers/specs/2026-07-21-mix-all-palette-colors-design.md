# Mix All Palette Colors Design

Date: 2026-07-21  
Status: Approved design

## Goal

Let users generate evenly spaced colors between every adjacent color in the current palette without repeatedly selecting pairs.

## Interaction

- The existing **Mix** mode gains a two-option scope control: **Two colors** and **All colors**.
- **Two colors** remains the default and preserves the current selection workflow.
- Choosing **All colors** clears any pair selection and immediately shows the blend controls when the palette contains at least two colors.
- The slider is labeled **Colors between each** and keeps the existing range of 1–10, with 3 as the default. These values will be named configuration constants.
- **Create Blend** applies the selected count to every adjacent pair, exits Mix mode, and reports success.
- Switching back to **Two colors** requires the user to select a new pair.

## Page Cleanup

The palette editor will receive a focused visual cleanup while retaining every existing capability:

- establish a clearer hierarchy between palette creation, palette-wide settings, color strips, and contextual tools;
- group related actions and remove avoidable visual noise or duplicated guidance;
- make labels, spacing, control sizes, and responsive wrapping consistent;
- keep advanced controls available without letting them compete with the primary palette workflow;
- preserve accessible labels, focus states, touch targets, and desktop/mobile usability.

The cleanup will follow the page's existing dark glass-and-gradient visual language rather than introducing a new theme.

## Palette Result

For an ordered palette `A, B, C` and two colors between each, the result is:

`A, AB1, AB2, B, BC1, BC2, C`

The operation:

- preserves every original color and its order;
- does not blend the last color back into the first;
- produces `originalCount + (originalCount - 1) * colorsBetween` colors;
- calculates each inserted color with the existing perceptual OKLab blend function;
- records the neighboring original colors and interpolation position as mix metadata;
- calculates the existing hand-mix metadata for every inserted color;
- uses a snapshot of the pre-operation palette so newly inserted colors are not processed again during the same operation.

## State and History

`PaletteManager` will build the complete palette through the pure palette-generation helper, then call the existing `setCustomPalette` store action exactly once. The operation will also:

- clear selected colors;
- refresh the rendered color map and pattern palette mapping;
- append exactly one palette-history entry so one Undo restores the original palette;
- safely do nothing when fewer than two colors are available;
- normalize the requested count to a finite integer within the configured range.

## Components

- `PaletteManager`: owns the Mix scope state and renders the scope selector and contextual instructions.
- `customStore`: retains its existing palette commit, history, and pattern-remap responsibilities without a new action.
- A small pure palette-generation helper owns palette construction and accepts a blend factory so its output can be tested deterministically.

## Verification

Automated coverage will verify:

- three originals with two colors between produces seven colors in the correct order;
- interpolation positions are evenly spaced and exclude endpoints;
- generated colors reference the correct adjacent parents and contain hand-mix metadata;
- the operation creates one history entry and clears selection;
- fewer than two colors is a no-op;
- the existing two-color blend behavior remains unchanged.

Type checking/build verification and browser checks at desktop and mobile widths will confirm the page has no console errors, the cleaned layout remains usable, and both Mix scopes work end to end.

## Non-goals

- Circular blending from the final color back to the first.
- Changing the blend algorithm or paint-mix simulation.
- Replacing or removing the existing two-color workflow.
- Adding a separate permanent **Mix All** toolbar button.
