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

export const MECHITZA_FINISHES = [
  { id: "natural", label: "Warm Natural", swatch: "#CEAE8B" },
  { id: "white-ash", label: "White Ash", swatch: "#DED2BC" },
  { id: "honey-oak", label: "Honey Oak", swatch: "#BA8B52" },
  { id: "chestnut", label: "Chestnut", swatch: "#946647" },
  { id: "walnut", label: "Walnut", swatch: "#604534" },
] as const;

export type MechitzaFinish = (typeof MECHITZA_FINISHES)[number];

export function getMechitzaAssets(model: MechitzaModel["id"], finish: MechitzaFinish["id"]) {
  const variant = finish === "natural" ? model : `${finish}-${model}`;
  const stem = `/mechitza-assets/v10-linen-marquetry-${variant}`;
  return { poster: `${stem}.webp`, glb: `${stem}.glb`, usdz: `${stem}.usdz` };
}
