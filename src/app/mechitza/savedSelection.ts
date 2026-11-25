import { isUploadedFilmJpeg, MAX_FILM_BYTES } from "../../lib/mechitza/filmJpeg.ts";
import { MECHITZA_FINISHES, MECHITZA_MODELS, type MechitzaFinish, type MechitzaModel } from "./models.ts";
import { findMechitzaArtColor, MECHITZA_FILMS, type MechitzaArtColor, type MechitzaFilm } from "./options.ts";

const SELECTION_VERSION = 1;
const MAX_FILM_NAME_LENGTH = 255;
const MAX_ENCODED_FILM_LENGTH = 4 * Math.ceil(MAX_FILM_BYTES / 3);
const INVALID_FILE = "Choose a valid Mechitza selection file.";
const INVALID_FILM = "The custom glass image is invalid or exceeds 140 KB.";
const INVALID_OPTION = "This Mechitza selection contains an unavailable option.";

export const MAX_SAVED_MECHITZA_BYTES = 200_000;

export type SavedMechitzaSelection = {
  arrangement: MechitzaModel["id"];
  finish: MechitzaFinish["id"];
  film: MechitzaFilm["id"];
  art: MechitzaArtColor["id"];
  people: boolean;
  customFilm?: { name: string; data: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findSelectionOptions(value: {
  arrangement?: unknown;
  finish?: unknown;
  film?: unknown;
  art?: unknown;
}) {
  const arrangement = MECHITZA_MODELS.find(({ id }) => id === value.arrangement);
  const finish = MECHITZA_FINISHES.find(({ id }) => id === value.finish);
  const film = MECHITZA_FILMS.find(({ id }) => id === value.film);
  const art = findMechitzaArtColor(value.art);
  if (!arrangement || !finish || !film || !art) {
    throw new Error(INVALID_OPTION);
  }
  return { arrangement, finish, film, art };
}

function readCustomFilm(value: unknown): NonNullable<SavedMechitzaSelection["customFilm"]> {
  if (!isRecord(value) || typeof value.name !== "string" || typeof value.data !== "string") {
    throw new Error(INVALID_FILM);
  }
  const name = value.name.trim();
  const { data } = value;
  if (
    !name || name.length > MAX_FILM_NAME_LENGTH
    || [...name].some((character) => character < " " || character === "\u007f")
    || !data || data.length > MAX_ENCODED_FILM_LENGTH
  ) {
    throw new Error(INVALID_FILM);
  }

  let decoded: string;
  try {
    decoded = atob(data);
  } catch {
    throw new Error(INVALID_FILM);
  }
  if (btoa(decoded) !== data || !isUploadedFilmJpeg(Uint8Array.from(decoded, (byte) => byte.charCodeAt(0)))) {
    throw new Error(INVALID_FILM);
  }
  return { name, data };
}

function readSelection(value: unknown): SavedMechitzaSelection {
  if (!isRecord(value) || !("version" in value)) throw new Error(INVALID_FILE);
  if (value.version !== SELECTION_VERSION) {
    throw new Error("This Mechitza selection file uses an unsupported version.");
  }

  const { arrangement, finish, film, art } = findSelectionOptions(value);
  if (typeof value.people !== "boolean") throw new Error(INVALID_OPTION);
  const selection: SavedMechitzaSelection = {
    arrangement: arrangement.id,
    finish: finish.id,
    film: film.id,
    art: art.id,
    people: value.people,
  };
  if (value.customFilm !== undefined) selection.customFilm = readCustomFilm(value.customFilm);
  return selection;
}

export function serializeMechitzaSelection(selection: SavedMechitzaSelection): string {
  const validated = readSelection({ ...selection, version: SELECTION_VERSION });
  return JSON.stringify({ version: SELECTION_VERSION, ...validated }, null, 2) + "\n";
}

export function parseMechitzaSelection(text: string): SavedMechitzaSelection {
  if (text.length > MAX_SAVED_MECHITZA_BYTES || new TextEncoder().encode(text).length > MAX_SAVED_MECHITZA_BYTES) {
    throw new Error("This Mechitza selection file is too large.");
  }
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error(INVALID_FILE);
  }
  return readSelection(value);
}

export function mechitzaSelectionFilename(selection: SavedMechitzaSelection): string {
  const { arrangement, finish, film, art } = findSelectionOptions(selection);
  const glassLabel = selection.customFilm ? "Custom glass" : film.label;
  const artLabel = art.group === "Custom" ? art.swatch : art.label;
  return `Mechitza V10 - ${arrangement.label} - ${finish.label} - ${glassLabel} - ${artLabel}.json`;
}
