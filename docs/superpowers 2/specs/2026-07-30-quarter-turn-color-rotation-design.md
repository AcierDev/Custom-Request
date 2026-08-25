# Quarter-Turn Color Rotation Design

## Goal

Each press of **Rotate Colors** advances the viewer by another 90 degrees,
allowing a complete 360-degree cycle.

## Design

Use the existing persisted `isRotated` and `isReversed` flags as four states:

| Quarter turn | `isRotated` | `isReversed` |
| --- | --- | --- |
| 0° | `false` | `false` |
| 90° | `true` | `false` |
| 180° | `false` | `true` |
| 270° | `true` | `true` |

The next state is calculated by a pure helper and applied through one Zustand
action so the two flags update atomically. The first press keeps the current
90-degree behavior. The existing save and share formats require no migration.

The button remains visually active for every non-zero rotation and returns to
its inactive appearance after the fourth press.

## Verification

- Unit-test all four transitions and wraparound.
- Exercise the real store action through the complete cycle.
- Run the full test suite, TypeScript check, and production build.
