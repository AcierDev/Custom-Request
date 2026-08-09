# Grain Micro-Relief for Geometric Squares

## Goal

Make the visible wood grain feel physically present by giving the softer
earlywood bands a slight recessed response while the denser, darker latewood
lines remain subtly proud.

The effect must read through moving light, not through stronger printed
contrast. It should feel like sanded or naturally weathered wood under paint,
never carved, embossed, or deeply grooved.

## Chosen approach

Reuse the existing 14-image grain atlas as both the color source and a very
shallow bump-height source. Three.js bump mapping perturbs the lighting normal
without moving vertices, so it adds micro-highlights and micro-shadows while
retaining the current wedge silhouette, instanced geometry, and single draw
call.

The atlas is mostly pale wood separated by dark dense grain lines. A named
negative bump scale will invert its ordinary height interpretation: pale
earlywood becomes slightly recessed and dark latewood stays relatively proud.

The existing custom atlas UV must also drive the standard material's bump UV.
On front-face vertices it will use the square's selected atlas cell. On side
and back vertices it will collapse to the cell center, producing no bump
gradient there. The existing side-grain color texture remains unchanged.

## Scope and boundaries

The change applies only when all of the following are true:

- the geometric square renderer is active;
- wood grain is enabled;
- the normal nonmetallic wood finish is selected.

It does not alter:

- grain color, opacity, scale, or cell selection;
- square geometry, silhouette, placement, or draw count;
- room lights, contact shadows, camera, or time-of-day behavior;
- the metallic finish;
- the backing board, furniture, AR, STEP, Fusion, or USDZ outputs.

## Configuration

`woodStyles.ts` will own a named grain-relief configuration value. The first
pass will deliberately use a low bump magnitude. Future visual tuning should
change only this named value.

`createArtMaterial` will bind the existing front atlas as the default wood
material's bump map only while grain is visible. `applyArtGrainShader` will
remap the built-in bump varying to the same per-instance atlas cell already
used for color.

No new texture asset, geometry subdivision, post-processing pass, or light is
needed.

## Alternatives rejected

- A generated normal-map atlas offers more art direction but adds another
  asset and texture sample before the simpler height source is proven.
- Real vertex displacement would require subdividing every wedge, increase
  GPU cost substantially, and distort silhouettes for a microscopic effect.
- Roughness-only variation changes sheen but cannot create the directional
  depth cue the user described.

## Verification

Automated tests will confirm that default grained wood binds the atlas as a
bump map with the named inverted strength, grain-off and metallic materials do
not, and the shader maps bump UVs to the front-face atlas cell while disabling
the effect on other faces.

Focused material tests, the complete test suite, TypeScript, the production
build, and `git diff --check` must pass. Visual verification should confirm a
barely perceptible recessed response at raking angles with no change to grain
color or square silhouette.
