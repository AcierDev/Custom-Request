//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪵 WOOD STYLE                                                         ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Material params (roughness/metalness) for the art squares + the legacy
// per-mesh Square path. The SQUARES' grain is NOT a single sampled texture —
// it's the GRAIN ATLAS below (one of 14 distinct grain images per square),
// exactly like production viewer.everwoodus.com. plywood.jpg is only the
// literal backing board (see PlywoodBase).

export interface WoodStyle {
  /** PBR roughness — higher = more matte. */
  roughness: number;
  /** PBR metalness — small values add a subtle sheen. */
  metalness: number;
}

export const WOOD_STYLE: WoodStyle = {
  roughness: 0.8,
  metalness: 0.05,
};

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🌾 GRAIN ATLAS                                                        ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Production (viewer.everwoodus.com) gives every square ONE of 14 distinct
// straight-lined-with-slight-curve grain images (from /textures/grain/, via a
// getGrainTextures server action), shown whole and blended at 40% opacity:
//   diffuse *= mix(white, grain, GRAIN_OPACITY)
// The instanced renderer can't bind 14 maps, so the 14 images are packed into
// one 4×4 atlas (public/textures/grain-atlas.png) and each square samples its
// own cell by a per-square index. This replicates the production look exactly,
// instead of sampling a single texture at offsets (which never matched).
export const GRAIN_ATLAS = {
  /** 4×4 atlas of the 14 grain images (last 2 cells blank). */
  texture: "/textures/grain-atlas.png",
  /** Atlas is GRID×GRID cells. */
  grid: 4,
  /** Number of real grain images (cells 0..count-1 are used). */
  count: 14,
  /** Blend strength of grain over the flat square color (production = 0.4). */
  opacity: 0.4,
  /** Fraction of the cell kept clear of the border so mip filtering can't
   *  bleed one grain image into its neighbour. */
  cellInset: 0.94,
  /** Grain zoom — higher = larger / less-tight grain (samples a smaller,
   *  centered region of each cell). 1.1 = zoomed in 10% vs. the base inset. */
  zoom: 1.1,
  /** Overall square brightness multiplier applied after the grain blend.
   *  <1 darkens the squares (0.9 = 10% darker). */
  brightness: 0.9,
} as const;

// Identifier for the single shipped wood look. The picker that swapped
// between styles is gone, but `viewSettings.woodStyle` is still persisted
// as a string; this is the value it defaults to.
export const DEFAULT_WOOD_STYLE_ID = "plywood";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ✨ METALLIC PAINT                                                     ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// A subtle metallic-paint finish layered over the wood grain — a soft sheen,
// NOT a mirror. Toggled on/off in the viewer (see the "Metallic" switch).
export const METALLIC_PAINT = {
  /**
   * Partial metalness: keeps ~40% diffuse so the wood grain still reads,
   * while the metallic share picks up the room reflection below.
   */
  metalness: 0.6,
  /** Satin, not mirror — a soft brushed sheen rather than chrome. */
  roughness: 0.5,
  /**
   * MeshStandardMaterial metalness is BLACK without something to reflect.
   * This env-map intensity is what actually makes it read as metal (vs.
   * just darker); tuned for a subtle, paint-like sheen.
   */
  envMapIntensity: 0.85,
} as const;
