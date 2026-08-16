# Mobile Orbit Gesture Recovery Design

## Goal

Prevent a large camera-distance jump when a second touch joins an existing drag, and keep one-finger rotation working when a two-finger gesture returns to one finger.

## Scope

- Apply identical controls to `/viewer` and `/shared/[id]`.
- Preserve the existing one-finger rotate, two-finger dolly, damping, zoom speed, camera bounds, and room collision behavior.
- Avoid changes to mouse, wheel, artwork layout, or camera framing.

## Design

Add a shared React Three Fiber control component backed by the official `three/addons/controls/OrbitControls.js` implementation already installed with Three.js. The wrapper will connect the control to the active canvas, update it each frame, invalidate on camera changes, and register it as the default React Three Fiber control so the existing collision and pivot helpers continue to work.

Both viewer scenes will replace Drei's `OrbitControls` wrapper with this shared component. This avoids the stale touch-coordinate and pointer-up state bugs in the installed `three-stdlib` implementation without patching dependency internals.

## Verification

An automated regression will replay a long one-finger rotation, add a second finger, move it one pixel, lift it, and continue moving the first finger. It must verify that the pinch does not cause a large distance change and that rotation resumes. Source integration assertions will ensure both viewer scenes use the shared component.

The complete viewer change set will then pass focused tests, the full test suite, TypeScript checking, linting, a production build, and mobile portrait/landscape visual checks before release.
