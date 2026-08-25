# Viewer Edit Panel Modernization

## Goal

Make the editing controls in `/viewer` and `/shared/[id]` feel current, calm, and premium without changing what any control does. The shared desktop and mobile viewers must use the same control content and visual language.

## Visual Direction

Use a restrained studio-console aesthetic:

- deep charcoal glass with a subtle warm highlight, stronger blur, and softer shadow;
- one dominant panel surface instead of several unrelated floating cards;
- small icon-led section headers, concise supporting copy, and consistent dividers;
- pill or tile selection states with a warm white active surface and muted inactive states;
- tabular value badges beside sliders;
- rounded, generous mobile touch targets without making desktop controls bulky;
- short opacity and position transitions that respect reduced-motion preferences.

The artwork remains the visual focus. Indigo is retained only as a restrained interaction accent so the controls do not compete with the palette.

## Architecture

Add shared presentational primitives for the panel shell, header, section, value badge, and option tile. These components contain no store logic and expose normal React children and actions. Both viewers compose their existing controls inside these primitives.

The shared primitives also provide native `details`/`summary` disclosures. Pattern, wall color, and panel layout start collapsed to keep the artwork dominant and remain keyboard-operable without custom disclosure state.

The shared viewer's edit content is extracted from the route into a reusable component. Desktop and mobile render the same component; the mobile sheet supplies its own close header and asks the edit component to omit the duplicate desktop heading.

Existing store selectors, callbacks, pattern behavior, palette blending, size selection, wall selection, and lighting behavior remain unchanged.

## Main Viewer

The left Pattern Editor adopts the shared shell and gets:

- a compact title/subtitle header with a clear active status chip;
- grouped tool sections instead of a continuous stack of labels;
- consistent icon buttons for brush, direction, visibility, and reset tools;
- clearer selected, hover, focus, disabled, and replace-mode states;
- a compact contextual instruction/status footer;
- the existing extra-options disclosure, history, AI prompt, and all editing actions preserved.

The right options stack also inherits the modernized shared control cards for view, pattern, lighting, and wall controls so the page does not mix old and new surfaces. Its square-size choices use the product-facing labels `3" (standard)` and `2.65" (mini)`.

## Shared Viewer

The desktop edit panel becomes one unified control surface headed “Edit view.” Its sections are:

1. Size
2. Pattern and orientation
3. Lighting
4. Wall color and named paint search

Pattern and wall color start collapsed on both the desktop panel and the mobile sheet.

The width may increase slightly to prevent cramped labels, while its height remains viewport-bound and scrollable.

## Mobile Shared Viewer

The existing Edit shortcut still opens the same sheet and the Details shortcut remains unchanged. The edit sheet gains:

- a centered grab handle;
- a more opaque, high-contrast panel surface;
- a sticky header with an icon, title, and short description;
- edge-to-edge shared edit content with mobile-safe section spacing;
- touch targets of at least 44 CSS pixels for primary selection controls where space allows;
- safe-area-aware bottom padding.

Phone landscape keeps the existing left-side one-fifth action rail and uses the same redesigned sheet/content.

## Accessibility

- Preserve labels, `aria-pressed`, `aria-expanded`, `role="switch"`, and slider names.
- Use native disclosure semantics for collapsed sections.
- Maintain visible focus rings on all custom buttons.
- Do not communicate selected state by color alone; use borders, surface changes, icons, or labels.
- Decorative panel highlights and icons are hidden from assistive technology.
- Motion is subtle and disabled or reduced when the user requests reduced motion.

## Verification

- Add structural regression tests for the shared panel primitives and for both desktop/mobile shared-view composition.
- Keep existing interaction tests passing, especially pattern blend and mobile navigation tests.
- Run all canonical Node tests, TypeScript, and the production build.
- Start the development server and visually inspect `/viewer` plus a shared viewer at desktop and mobile widths when browser automation is available.

## Out of Scope

- No store schema changes.
- No artwork rendering, palette-generation, blend-boundary, camera, or gesture changes.
- No new editing features.
- No redesign of the Details placard or the global navigation.
