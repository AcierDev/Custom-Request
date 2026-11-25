export const MECHITZA_FILMS = [
  { id: "linen-marquetry", label: "Linen Marquetry" },
  { id: "indigo-lattice", label: "Indigo Lattice" },
  { id: "linen-arches", label: "Linen Arches" },
  { id: "walnut-ribbon", label: "Walnut Ribbon" },
  { id: "champagne-reeding", label: "Champagne Reeding" },
  { id: "pomegranate-vine", label: "Pomegranate Vine" },
  { id: "olive-trellis", label: "Olive Trellis" },
  { id: "ivory-flutes", label: "Ivory Flutes" },
  { id: "bronze-weave", label: "Bronze Weave" },
  { id: "dusk-chevron", label: "Dusk Chevron" },
  { id: "pearl-fan", label: "Pearl Fan" },
  { id: "woven-oat", label: "Woven Oat" },
  { id: "reed-check", label: "Reed Check" },
  { id: "ink-botanical", label: "Ink Botanical" },
  { id: "sandstone-mosaic", label: "Sandstone Mosaic" },
] as const;

export const MECHITZA_ART_GROUPS = ["Light neutrals", "Earth tones", "Deep shades"] as const;

export const MECHITZA_DEFAULT_ART_COLOR = {
  id: "navy",
  label: "Midnight Navy",
  swatch: "#22406B",
  group: "Deep shades",
} as const;

export const MECHITZA_ART_COLORS = [
  { id: "chalk", label: "Chalk", swatch: "#E4DED1", group: "Light neutrals" },
  { id: "ivory", label: "Ivory", swatch: "#D7CDBD", group: "Light neutrals" },
  { id: "sand", label: "Sand", swatch: "#BAA88E", group: "Light neutrals" },
  { id: "greige", label: "Greige", swatch: "#A59B8D", group: "Light neutrals" },
  { id: "pewter", label: "Pewter", swatch: "#9A9B94", group: "Light neutrals" },
  { id: "sage", label: "Sage", swatch: "#929984", group: "Earth tones" },
  { id: "fawn", label: "Fawn", swatch: "#AD8E76", group: "Earth tones" },
  { id: "mushroom", label: "Mushroom", swatch: "#918678", group: "Earth tones" },
  { id: "taupe", label: "Taupe", swatch: "#897B70", group: "Earth tones" },
  { id: "clay", label: "Clay", swatch: "#9A7666", group: "Earth tones" },
  { id: "olive", label: "Dried Olive", swatch: "#787A62", group: "Deep shades" },
  { id: "slate", label: "Slate", swatch: "#5B6570", group: "Deep shades" },
  { id: "charcoal", label: "Charcoal", swatch: "#484646", group: "Deep shades" },
  { id: "espresso", label: "Espresso", swatch: "#514039", group: "Deep shades" },
  MECHITZA_DEFAULT_ART_COLOR,
] as const;

export const MECHITZA_DEFAULT_FILM = MECHITZA_FILMS[0];

export type MechitzaFilm = (typeof MECHITZA_FILMS)[number];
export type MechitzaArtColor = (typeof MECHITZA_ART_COLORS)[number];
