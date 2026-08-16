# Shared Viewer Image Save Confirmation Design

## Goal

Make the shared viewer's image-save action read as a screenshot/camera action and prevent an unexpected mobile download.

## Design

- Replace the download glyph with Lucide's `Camera` icon in every shared-viewer layout.
- Keep desktop behavior fast: selecting **Save image** starts the existing four-angle image export immediately.
- On mobile, the camera button opens a compact confirmation dialog instead of saving immediately.
- Explain that the action creates one image showing the artwork from four angles and saves it to the device.
- Provide **Not now** and **Save image** actions. Only the confirmation action invokes the existing save callback.
- Keep the export implementation and filename unchanged.

## Structure

Extract the shared-viewer image action into `SharedImageSaveAction.tsx`. The component owns the mobile/desktop presentation and confirmation wiring while the page continues to own image capture state.

## Accessibility

- Use an explicit **Save artwork image** accessible label for the camera button.
- Preserve busy and disabled states.
- Use the existing Radix alert-dialog primitives for focus management, labeling, Escape handling, and a modal backdrop.

## Verification

- Component tests cover the camera glyph, immediate desktop save, guarded mobile save, confirmation copy, and cancellation path.
- Run the focused shared-viewer tests, full Node test suite, TypeScript, production build, and a browser check at mobile and desktop widths.
