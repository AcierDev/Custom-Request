# Color Picker Drag Dismissal Design

Date: 2026-07-22
Status: Approved design

## Goal

Keep the palette page's **Edit Color** and **Add Color** popups open when a user drags either `react-colorful` control to or beyond an edge.

## Root Cause

Both custom popups dismiss from an unguarded backdrop `click`. `react-colorful` starts a drag inside the picker, then tracks movement and release on `window`. If the release occurs outside the panel, the resulting click can target the backdrop and close the popup even though the interaction began inside it.

## Interaction

Each affected backdrop will dismiss on pointer-down only when the backdrop itself is the original event target. Therefore:

- a direct press on the backdrop closes the popup;
- a drag beginning inside the popup never closes it when released outside;
- mouse, touch, and pen input follow the same rule;
- Cancel, Save Changes, Add Color, and other explicit controls retain their current behavior.

The **Color Harmony Generator** remains unchanged.

## Components

- `PaletteManager/index.tsx`: update the Edit Color backdrop.
- `PaletteManager/AddColorButton.tsx`: update the Add Color backdrop.
- A small shared predicate identifies direct-backdrop interactions so both components use one tested rule.

No layout, animation, color calculation, or popup content changes.

## Verification

Automated coverage will prove that:

- a pointer-down directly on a backdrop requests dismissal;
- a pointer-down originating from any child does not request dismissal;
- both affected components use the shared rule instead of unguarded backdrop clicks.

The production build and repository tests will run after implementation. Live browser verification will be attempted if a browser connection is available; otherwise the limitation will be reported.

## Non-goals

- Changing Color Harmony Generator dismissal.
- Preventing intentional backdrop presses from closing a popup.
- Replacing the custom popups with Radix Dialog.
- Changing `react-colorful`.
