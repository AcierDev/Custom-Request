# Legacy Square Solidity in the Current Viewer

## Goal

Give the geometric squares the original viewer's heavier, more physical
appearance while preserving the current viewer's room, time-of-day behavior,
light direction, color, camera, and material treatment.

## Root cause

The current geometric rig retained the old viewer's five raking light
positions, but made all five shadowless. Separate overhead and window/lamp
lights now cast the scene shadows. Those softer source-aligned shadows suit
the room, but they remove the close self-shadowing between neighboring wedge
squares that made the old artwork look solid.

The material and grain are already matched to the old viewer, so changing
roughness, texture strength, or geometry would address the wrong layer.

## Chosen approach

Let the existing dominant geometric key cast one additional contact-shadow
map. This is the same light already used by the current viewer, inside the
same time-of-day rotation, so the illumination strength, tint, and direction
do not change. No light is added.

The current shadow-camera resolution and art-sized orthographic frustum will
be reused. That keeps the added pass centered on the artwork instead of
restoring the old viewer's five broad shadow maps. Existing room-source
shadows stay unchanged. All shadow settings remain named configuration
values.

## Alternatives considered

- Restore shadows on all five old lights: closest to the legacy renderer, but
  expensive and produces several competing shadows across the current room.
- Lower ambient intensity: increases contrast globally but does not restore
  square-to-square occlusion and changes the current lighting balance.
- Add ambient occlusion post-processing: broad, expensive, and unnecessary
  for a defect isolated to the artwork relief.

## Components

`artLighting.ts` owns the pure Three.js helper that configures the existing
key's shadow camera without changing the light itself.

`LightingSetups.tsx` applies that helper to the current dominant geometric
key and otherwise leaves every light position, intensity, tint, and rotation
unchanged.

`InstancedSquares.tsx` needs no additional shadow behavior because its visible
mesh already casts and receives shadows.

## Verification

Automated coverage will prove that the configured key casts shadows, uses the
art-sized camera bounds, and retains its original position, intensity, and
color. Focused tests, TypeScript, the production build, and `git diff --check`
must pass.

The visual target is deeper contact at wedge boundaries without any change
to the room composition, light direction, time-of-day color, or square grain.
