# Shared Mobile Details and Edit Design

## Goal

Let mobile shared-viewer visitors open artwork details or viewing controls directly from two bottom actions.

## Design

- Keep the existing mobile AR action as the first row.
- Replace the single full-width **Details** button with two equal-width, side-by-side buttons:
  - **Details** opens the existing About content.
  - **Edit** opens the existing View controls.
- Remove the redundant About/View tab switcher from the open sheet.
- Show **Details** or **Edit** as the sheet title, based on the selected action, with the existing close control beside it.
- Leave the desktop copy-link CTA and desktop viewing controls unchanged.

## Structure

Create a focused `SharedMobilePanelNavigation.tsx` component containing the Details/Edit action group and the sheet header. The page composes the existing AR action above it. Both navigation components consume the same `SharedMobilePanel` value (`"about" | "view"`), so button-to-panel mapping and sheet labeling cannot drift apart.

## Accessibility

- Use real buttons for both actions.
- Keep the sheet close button labeled with the visible panel name.
- Preserve the existing sheet backdrop and close behavior.

## Verification

- Component tests verify the side-by-side action group, exact Details/Edit labels, About/View callback mapping, and a non-switching sheet header.
- Run focused tests, the full Node test suite, TypeScript, the production build, and diff checks.
