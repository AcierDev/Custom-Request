//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪵 WOOD STYLE PRESETS                                                 ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// A browsable catalog of wood looks for the 3D rendered art. Each entry
// combines a grain image with a surface finish and a grain scale. Pick the
// one you like in the viewer's "Wood Style" dropdown, then set its id as
// DEFAULT_WOOD_STYLE_ID below to make it the default.

export interface WoodStyle {
  id: string;
  label: string;
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

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ GENERATION CONFIG                                                  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const GRAIN_IMAGES: {
  key: string;
  label: string;
  file: string;
  /** Optional side-face grain; defaults to SIDE_TEXTURE below. */
  side?: string;
}[] = [
  {
    key: "dougfir",
    label: "Douglas Fir",
    file: "/textures/douglas-fir.png",
    side: "/textures/douglas-fir.png",
  },
  { key: "oak", label: "Oak", file: "/textures/bw-wood-texture-1.jpg" },
  { key: "walnut", label: "Walnut", file: "/textures/bw-wood-texture-2.jpg" },
  { key: "ash", label: "Ash", file: "/textures/bw-wood-texture-3.jpg" },
  { key: "maple", label: "Maple", file: "/textures/bw-wood-texture-4.jpg" },
  { key: "ply", label: "Plywood", file: "/textures/plywood.jpg" },
];

const FINISHES: {
  key: string;
  label: string;
  roughness: number;
  metalness: number;
}[] = [
  { key: "matte", label: "Matte", roughness: 0.95, metalness: 0.0 },
  { key: "satin", label: "Satin", roughness: 0.65, metalness: 0.05 },
  { key: "gloss", label: "Glossy", roughness: 0.35, metalness: 0.12 },
];

// `scale` is the texture repeat — higher = tighter grain (more rings/square).
// Medium & Bold were tightened 25%; "Medium-Tight" sits between them.
const SCALES: { key: string; label: string; scale: number }[] = [
  { key: "fine", label: "Fine grain", scale: 0.4 },
  { key: "med", label: "Medium grain", scale: 0.25 },
  { key: "medtight", label: "Medium-Tight grain", scale: 0.1875 },
  { key: "bold", label: "Bold grain", scale: 0.125 },
];

const SIDE_TEXTURE = "/textures/wood-side-grain.jpg";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📚 CATALOG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export const WOOD_STYLES: WoodStyle[] = GRAIN_IMAGES.flatMap((grain) =>
  FINISHES.flatMap((finish) =>
    SCALES.map((scale) => ({
      id: `${grain.key}-${finish.key}-${scale.key}`,
      label: `${grain.label} · ${finish.label} · ${scale.label}`,
      topTexture: grain.file,
      sideTexture: grain.side ?? SIDE_TEXTURE,
      topScale: scale.scale,
      roughness: finish.roughness,
      metalness: finish.metalness,
    }))
  )
);

// Current shipped look: Douglas fir, satin, medium grain scale.
// Change this once you've picked a favorite in the viewer.
export const DEFAULT_WOOD_STYLE_ID = "dougfir-satin-medtight";

export function getWoodStyle(id: string | undefined): WoodStyle {
  return (
    WOOD_STYLES.find((s) => s.id === id) ??
    WOOD_STYLES.find((s) => s.id === DEFAULT_WOOD_STYLE_ID) ??
    WOOD_STYLES[0]
  );
}
