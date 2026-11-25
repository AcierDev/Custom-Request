import {
  MECHITZA_DEFAULT_ART_COLOR,
  MECHITZA_DEFAULT_FILM,
  type MechitzaArtColor,
  type MechitzaFilm,
} from "./options.ts";

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
  { id: "saltwashed-oak", label: "Saltwashed Oak", swatch: "#F4EBDC" },
  { id: "bleached-maple", label: "Bleached Maple", swatch: "#EEE3CD" },
  { id: "white-ash", label: "White Ash", swatch: "#DED2BC" },
  { id: "wheat", label: "Wheat", swatch: "#D5B788" },
  MECHITZA_DEFAULT_FINISH,
  { id: "honey-oak", label: "Honey Oak", swatch: "#BA8B52" },
  { id: "hazelnut", label: "Hazelnut", swatch: "#A88965" },
  { id: "cognac", label: "Cognac", swatch: "#AD734C" },
  { id: "chestnut", label: "Chestnut", swatch: "#946647" },
  { id: "smoked-oak", label: "Smoked Oak", swatch: "#79655A" },
  { id: "mocha", label: "Mocha", swatch: "#6F5141" },
  { id: "walnut", label: "Walnut", swatch: "#604534" },
  { id: "carbon-oak", label: "Carbon Oak", swatch: "#424449" },
  { id: "espresso", label: "Espresso", swatch: "#45342B" },
  { id: "ebony", label: "Ebony", swatch: "#292727" },
] as const;

export type MechitzaFinish = (typeof MECHITZA_FINISHES)[number];

function getMechitzaAssetName(model: MechitzaModel["id"], finish: MechitzaFinish["id"]) {
  const variant = finish === MECHITZA_DEFAULT_FINISH.id ? model : `${finish}-${model}`;
  return `v10-linen-marquetry-${variant}`;
}

export function getMechitzaBaseAssets(model: MechitzaModel["id"], finish: MechitzaFinish["id"]) {
  const base = `/mechitza-assets/${getMechitzaAssetName(model, finish)}`;
  return { poster: `${base}.webp?v=2`, glb: `${base}.glb?v=4`, usdz: `${base}.usdz?v=4` };
}

export function getMechitzaAssets(
  model: MechitzaModel["id"],
  finish: MechitzaFinish["id"],
  film: MechitzaFilm["id"] = MECHITZA_DEFAULT_FILM.id,
  art: MechitzaArtColor["id"] = MECHITZA_DEFAULT_ART_COLOR.id,
  people = true,
) {
  const { poster } = getMechitzaBaseAssets(model, finish);
  const path = `/api/mechitza-model/${getMechitzaAssetName(model, finish)}`;
  const query = new URLSearchParams({ film, art, v: "8" });
  if (!people) query.set("people", "0");
  return { poster, glb: `${path}.glb?${query}`, usdz: `${path}.usdz?${query}` };
}
