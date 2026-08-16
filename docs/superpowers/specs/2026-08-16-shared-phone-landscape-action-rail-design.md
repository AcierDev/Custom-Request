# Shared Phone Landscape Action Rail Design

## Goal

Keep the shared viewer's mobile action buttons compact and out of the artwork's way when a phone rotates to landscape.

## Design

- Treat a viewport as phone landscape only when it is mobile-width, wider than tall, and no taller than the named phone-landscape height limit.
- In phone landscape, place the AR, Details, and Edit action cluster in a vertically centered rail against the left safe area.
- Make the rail exactly one-fifth of the viewport width (`20vw`).
- Stack AR, Details, and Edit vertically at full rail width so their labels remain readable in the narrow landscape rail.
- Keep Details/Edit equal-width and side by side in portrait.
- Preserve the existing portrait mobile layout and desktop layout.
- Leave the shared viewer's camera/hide controls and brand placement unchanged.

## Structure

Add `useIsPhoneLandscape.ts` with named viewport limits and a pure `isPhoneLandscapeViewport` classifier. The shared page uses that state to choose the CTA wrapper placement and select the mobile action component's portrait-row or landscape-rail layout.

## Verification

- Unit tests cover landscape phones, portrait phones, and landscape tablet/desktop exclusions at the configured bounds.
- Existing mobile action tests continue to cover AR-adjacent Details/Edit behavior.
- Run focused tests, the full Node suite, TypeScript, production build, and diff checks.
