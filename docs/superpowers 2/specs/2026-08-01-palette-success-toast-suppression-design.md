# Palette Success Toast Suppression Design

## Goal

Routine actions on `/palette` must not show green success notifications in the
top-right corner. Errors, warnings, and informational messages must remain
visible. Other routes must retain their existing notifications.

## Approaches

1. **Route-aware toast facade (selected):** Route every existing toast import
   through one facade that suppresses only `success` on `/palette`. This also
   covers shared dialogs and navigation components used by the palette page.
2. **Delete palette success calls:** Simple per call site, but high-churn and
   easy to miss success calls from shared components.
3. **Hide success toast CSS:** Low code churn, but hidden toasts still occupy
   Sonner's queue and could delay visible error messages.

## Design

Add a toast facade that preserves Sonner's callable API and methods. Its
`success` method checks the current pathname at call time. `/palette` and any
nested palette route return without adding a toast; every other route delegates
to Sonner unchanged. All current Sonner imports in application source use the
facade, providing one consistent boundary without changing individual actions.

Use named constants for the palette route and suppressed result. Server-side
calls continue to delegate because no browser pathname exists there.

## Testing

- Assert a success call on `/palette` does not enter Sonner's real toast state.
- Assert a success call on `/viewer` still enters Sonner's real toast state.
- Assert error/info methods remain available through the facade.
- Run the full test suite, TypeScript, diff checks, and production build.
