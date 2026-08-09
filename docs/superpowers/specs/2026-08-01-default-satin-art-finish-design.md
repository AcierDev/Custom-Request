# Default Satin Art Finish

## Goal

Make the colored wooden squares read as real satin-painted objects instead of flat, inexpensive 3D geometry. Preserve their current colors, wedge geometry, grain artwork, layout, shadows, and interaction behavior.

## Chosen approach

Replace the default zero-specular Phong material with a restrained dielectric PBR material. Use high roughness, zero metalness, reduced specular intensity, and a softly blurred neutral room reflection. This produces a broad highlight that moves with the camera and lighting without creating chrome, wet paint, or a sharp white rim.

The existing grain atlas remains the diffuse surface detail. When grain is enabled, its luminance will also create a small roughness variation on the front face, breaking up perfectly uniform reflections without adding new texture assets or draw calls.

Alternatives rejected:

- A glossy Phong material is simpler but tends to look synthetic and cannot represent the room reflection as naturally.
- New normal and roughness texture assets could add more close-up detail, but they add an art pipeline and memory cost that are unnecessary for the current viewing distance.

## Implementation boundaries

- Define all finish values as named material configuration parameters.
- Generate the existing neutral PMREM environment for the default finish as well as the experimental metallic path.
- Keep tone mapping disabled on the art material so established palette colors and dark-color visibility do not regress.
- Keep the metallic experiment functionally unchanged; it is not part of this visual redesign.
- Reuse the single instanced material and existing shader hook so performance and draw-call count remain unchanged.

## Verification

- Unit tests confirm that the default finish is a physical, nonmetallic material with the configured satin roughness, restrained specular response, environment reflection, and existing color-fidelity policy.
- Existing metallic coverage continues to pass.
- The focused material tests, TypeScript compiler, and production build must pass.
- Visual verification should confirm broad soft highlights, visible relief, stable paint colors, and no sharp plastic edge highlight.
