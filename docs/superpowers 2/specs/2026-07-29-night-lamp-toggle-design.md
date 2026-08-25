# Night Lamp Toggle Design

## Goal

In both the main viewer and shared viewer, clicking the floor lamp toggles it on or off while night lighting is selected.

## Interaction

- The local lamp switch starts on, preserving the current automatic night appearance.
- During morning or afternoon lighting, the lamp remains off and clicks do nothing.
- During night lighting, clicking any visible lamp part or its enlarged hit area toggles the switch.
- The pointer cursor identifies the lamp as interactive only at night.
- The switch survives time-of-day changes during the page session. A lamp switched off at night remains off after changing to day and back to night.
- The switch is local display state. It is not saved to viewer versions, shared URLs, accounts, or guest storage.

## Architecture

The main viewer page and shared viewer page each own a `lampOn` boolean. `GalleryArtScene` forwards the shared viewer's value and toggle callback. `Room` receives the value for its shade glow and point light, and owns the raycast hit target that invokes the callback. `RotatableLighting` receives the same value so the lamp-driven art light and shadow disappear whenever the visible lamp is off.

The effective lamp state is `timeOfDay === "night" && lampOn`. Existing night-entry delay and light easing remain, while switching off is immediate.

## Testing

- Unit-test the pure effective-state and toggle rules: daytime never toggles, nighttime toggles both ways, and the stored switch survives time-of-day changes.
- Type-check the main and gallery scene prop wiring so both pass one switch value to `Room` and `RotatableLighting`.
- Browser-check the main viewer and a shared viewer: enter night, click the lamp off and on, confirm the visible glow and lamp-driven lighting change together, then confirm daytime clicks do nothing.
