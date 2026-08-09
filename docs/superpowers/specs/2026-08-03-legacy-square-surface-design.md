# Legacy Square Surface in the Current Viewer

## Goal

Make the geometric squares match the original `viewer.everwoodus.com`
surface appearance while preserving the current viewer's room, camera,
lighting directions, time-of-day behavior, shadows, layout, interactions, and
instanced-rendering performance.

The target is the supplied comparison screenshot: stronger paint color,
clearly readable individual wood grain, textured square sides, and a natural
matte wood response instead of the newer washed-out satin response.

## Chosen approach

Keep the current instanced wedge renderer and restore the legacy square
surface response inside its shared material and shader. This provides the old
look without returning to the old per-square meshes and their thousands of
materials and draw calls.

The default nonmetallic finish will use the original viewer's standard wood
material behavior:

- standard physically based material;
- legacy roughness and metalness values;
- normal scene tone mapping;
- no neutral environment reflection;
- the original grain blend strength;
- no global post-grain darkening;
- no grain-driven roughness variation.

The current optional metallic finish remains unchanged.

This design supersedes the uncommitted default-satin finish for the
nonmetallic path. Any useful separation of material and shader logic from that
work may remain, but its physical satin material, default environment
reflection, and grain-linked roughness behavior do not.

## Texture treatment

The existing 14-image grain atlas retains the original source detail and will
remain the front-face texture source. Each square continues to select one
stable atlas cell through its instance grain index.

Front faces will sample the complete legacy grain image and multiply it into
the square paint color using the original blend. Atlas padding may remain only
as needed to prevent mip bleeding; it must not visibly crop or enlarge the
grain.

The original `wood-side-grain.jpg` asset will be added to the current app and
sampled on the wedge side faces with the legacy repeat behavior. The shader
will distinguish front and side faces within the existing instanced geometry,
so this does not add another mesh or draw call. The hidden back face may use
the side treatment because it is not visible in normal viewing.

All material, blend, sampling, repeat, and anisotropy values will be named
configuration parameters rather than inline numeric values.

## Rendering boundaries

The change is limited to square geometry rendered through
`InstancedSquares`. It therefore applies consistently to the main viewer, the
shared gallery page, and browser image captures that reuse the same scene.

The following remain unchanged:

- room geometry and furnishings;
- camera placement and controls;
- light positions, directions, colors, and time-of-day scaling;
- room-source shadow keys and shadow settings;
- wedge geometry, square placement, color selection, and animation;
- hover, selection, and pattern-editing behavior;
- metallic-finish behavior;
- AR, USDZ, STEP, and Fusion export material pipelines.

The neutral PMREM environment will only be created when the metallic finish
needs it. The default legacy finish will not consume it.

## Components

`woodStyles.ts` owns named legacy surface and texture-sampling configuration,
including the atlas and side-grain paths.

`artMaterial.ts` owns the default and metallic material factories plus the
shader patch that combines instance color, front grain, and side grain.

`InstancedSquares.tsx` loads the shared textures, supplies the side-grain
sampler, keeps the single instanced material, and creates the metallic
environment only when required.

No lighting component should change.

## Verification

Automated coverage will verify:

- the default material type and legacy roughness, metalness, and tone-mapping
  policy;
- absence of a default environment reflection;
- unchanged metallic material behavior;
- original front-grain blend without brightness or roughness modification;
- side-grain sampling and front/side masking;
- named configuration values rather than new inline tuning numbers.

Focused material tests, the TypeScript compiler, and the production build must
pass. The final diff must pass `git diff --check`.

Visual verification will compare the same shared design in the old and new
viewers from equivalent camera angles. It must confirm readable individual
grain, saturated paint colors, naturally shaded relief, textured visible
sides, and no regression to the current room or lighting direction.
