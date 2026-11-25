export const MECHITZA_MODELS = [
  {
    id: "one",
    label: "One unit",
    count: 1,
    widthInches: 66,
    width: "5 ft 6 in",
  },
  {
    id: "three",
    label: "Three units",
    count: 3,
    widthInches: 198,
    width: "16 ft 6 in",
  },
] as const;

export type MechitzaModel = (typeof MECHITZA_MODELS)[number];

export const MECHITZA_DEFAULT_FINISH = {
  id: "natural",
  label: "Warm Natural",
  swatch: "#CEAE8B",
} as const;

export const MECHITZA_FINISHES = [
  { id: "bleached-maple", label: "Bleached Maple", swatch: "#EEE3CD" },
  { id: "white-ash", label: "White Ash", swatch: "#DED2BC" },
  MECHITZA_DEFAULT_FINISH,
  { id: "honey-oak", label: "Honey Oak", swatch: "#BA8B52" },
  { id: "cognac", label: "Cognac", swatch: "#AD734C" },
  { id: "chestnut", label: "Chestnut", swatch: "#946647" },
  { id: "smoked-oak", label: "Smoked Oak", swatch: "#79655A" },
  { id: "walnut", label: "Walnut", swatch: "#604534" },
  { id: "espresso", label: "Espresso", swatch: "#45342B" },
  { id: "ebony", label: "Ebony", swatch: "#292727" },
] as const;

export type MechitzaFinish = (typeof MECHITZA_FINISHES)[number];

export function getMechitzaAssets(model: MechitzaModel["id"], finish: MechitzaFinish["id"]) {
  const variant = finish === MECHITZA_DEFAULT_FINISH.id ? model : `${finish}-${model}`;
  const stem = `/mechitza-assets/v10-linen-marquetry-${variant}`;
  return {
    poster: `${stem}.webp?v=2`,
    glb: `${stem}.glb?v=2`,
    usdz: `${stem}.usdz?v=2`,
  };
}
