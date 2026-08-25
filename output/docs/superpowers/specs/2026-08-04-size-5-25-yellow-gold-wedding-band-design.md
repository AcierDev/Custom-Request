# Size 5.25 Yellow-Gold Wedding Band Design

## Goal

Create a new unsaved Fusion design containing one wearable, classic wedding band with a polished yellow-gold appearance. Existing documents must not be modified.

## Selected Design

- US ring size: 5.25
- Inside diameter: 15.9 mm
- Band width: 6.0 mm
- Radial thickness: 2.0 mm
- Profile: comfort-fit rounded rectangle
- Edge radius: 0.75 mm
- Finish: polished yellow gold
- Body name: `Size 5.25 Yellow Gold Wedding Band`

GIA identifies US size 5.25 as a 15.9 mm inside diameter. The dimensions are modeling defaults, not manufacturing tolerances; a jeweler should confirm final sizing and casting allowances.

## Alternatives Considered

1. Classic comfort-fit band — selected because it is recognizable, wearable, and easy to resize parametrically.
2. Flat court band — cleaner and more modern, but less aligned with the unspecified “wedding band” request.
3. Fully domed band — more traditional, but its stronger exterior curvature makes width and thickness less visually neutral.

## Modeling Approach

Sketch the radial/axial cross-section on a plane through the ring axis, then revolve it 360 degrees as a new solid body. Round the four profile corners in the sketch so the inner surface is comfortable and the exterior edges are softened without relying on topology-sensitive 3D edge selection.

Search Fusion's installed material libraries for an appearance whose name contains both `gold` and `polished`, preferring names containing `yellow`. Copy the match into the design and assign it to the body. If no polished match exists, use the best available gold appearance and report the exact applied name.

## Parameters and Validation

The job accepts `inside_diameter_mm`, `band_width_mm`, `radial_thickness_mm`, and `edge_radius_mm`. Values must be positive numbers. The edge radius must be less than half of both the band width and radial thickness.

## Output and Verification

The job returns the requested dimensions, body count and name, applied appearance name, and measured radial/axial extents. Success requires one solid body, a 15.9 mm inner diameter by construction, a 19.9 mm outer diameter, a 6.0 mm axial width, and a gold appearance applied.
