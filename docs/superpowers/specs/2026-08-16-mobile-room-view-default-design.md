# Mobile Room View Default Design

## Goal

When either viewer first opens on a mobile-width viewport, Room View starts off. Desktop behavior stays unchanged.

## Design

- Add one shared hook that reads the initial viewport width once on mount.
- On mobile widths, the hook calls the supplied Room View setter with `false`.
- On desktop widths, it does nothing, preserving the current saved/default setting.
- The main viewer supplies its existing store setter.
- Main-viewer saved-state hydration resolves Room View against the same mobile breakpoint, preventing asynchronous persistence loading from turning it back on.
- A transient session marker distinguishes automatic initialization from an explicit Room View selection. Once the user changes it, later conflict-recovery hydration and viewer remounts preserve the live choice.
- The shared viewer keeps isolated local Room View state and supplies its setter.
- The one-time effect does not respond to later viewport resizing, so it cannot undo a user's subsequent Room View choice.

## Verification

- Unit-test the mobile/desktop boundary, callback behavior, late hydration behavior, post-user-selection rehydration, and viewer remount behavior.
- Run the complete Node test suite, TypeScript check, and production build.
