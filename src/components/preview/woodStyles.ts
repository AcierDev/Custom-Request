//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪵 WOOD STYLE                                                         ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Single hard-coded wood look: the plywood texture used on viewer.everwoodus's
// shared viewer. The picker that let users swap between oak/walnut/etc. was
// removed — there is now one shipped look and these are its parameters.

export interface WoodStyle {
  /** Grain image used on the top / front faces. */
  topTexture: string;
  /** Grain image used on the side faces. */
  sideTexture: string;
  /** THREE texture repeat factor — lower = larger grain. */
  topScale: number;
  /** PBR roughness — higher = more matte. */
  roughness: number;
  /** PBR metalness — small values add a subtle sheen. */
  metalness: number;
}

// Tuned to match viewer.everwoodus.com: `/textures/plywood.jpg` mapped with
// `repeat.set(0.2, 0.2)`, `roughness: 0.8`, `metalness: 0.05`.
export const WOOD_STYLE: WoodStyle = {
  topTexture: "/textures/plywood.jpg",
  sideTexture: "/textures/wood-side-grain.jpg",
  topScale: 0.2,
  roughness: 0.8,
  metalness: 0.05,
};

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
