import { MAX_FILM_BYTES } from "../../lib/mechitza/filmJpeg.ts";

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_TYPES = /^image\/(jpeg|png|webp|avif|heic|heif)$/i;
const TEXTURE_WIDTH = 1536;
const TEXTURE_HEIGHT = 731;

export const FILM_CROP_ASPECT = TEXTURE_WIDTH / TEXTURE_HEIGHT;
export const MAX_FILM_CROP_ZOOM = 4;
export type FilmCrop = { x: number; y: number; zoom: number };
export const DEFAULT_FILM_CROP: FilmCrop = { x: 0.5, y: 0.5, zoom: 1 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function resolveFilmCrop(sourceWidth: number, sourceHeight: number, crop: FilmCrop) {
  const width = Math.min(sourceWidth, sourceHeight * FILM_CROP_ASPECT) / crop.zoom;
  const height = Math.min(sourceHeight, sourceWidth / FILM_CROP_ASPECT) / crop.zoom;
  return {
    x: clamp(crop.x * sourceWidth - width / 2, 0, sourceWidth - width),
    y: clamp(crop.y * sourceHeight - height / 2, 0, sourceHeight - height),
    width,
    height,
  };
}

export function panFilmCrop(
  sourceWidth: number,
  sourceHeight: number,
  crop: FilmCrop,
  horizontal: number,
  vertical: number,
): FilmCrop {
  const frame = resolveFilmCrop(sourceWidth, sourceHeight, crop);
  const x = clamp(frame.x - horizontal * frame.width, 0, sourceWidth - frame.width);
  const y = clamp(frame.y - vertical * frame.height, 0, sourceHeight - frame.height);
  return {
    x: (x + frame.width / 2) / sourceWidth,
    y: (y + frame.height / 2) / sourceHeight,
    zoom: crop.zoom,
  };
}

export function openCustomFilm(file: File) {
  if (file.size > MAX_SOURCE_BYTES) throw new Error("Choose an image smaller than 25 MB.");
  if (file.type && !ACCEPTED_TYPES.test(file.type)) {
    throw new Error("Choose a JPEG, PNG, WebP, AVIF, or HEIC image.");
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.src = objectUrl;
  return { image, dispose: () => URL.revokeObjectURL(objectUrl) };
}

export async function renderCustomFilmCrop(image: HTMLImageElement, crop: FilmCrop): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });
  if (!context || !image.naturalWidth || !image.naturalHeight) throw new Error("This image couldn’t be opened.");
  const frame = resolveFilmCrop(image.naturalWidth, image.naturalHeight, crop);

  for (const width of [TEXTURE_WIDTH, 1024, 768, 512]) {
    canvas.width = width;
    canvas.height = Math.round(width / FILM_CROP_ASPECT);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, frame.x, frame.y, frame.width, frame.height, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.87, 0.7, 0.53, 0.36]) {
      const texture = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (texture?.type === "image/jpeg" && texture.size <= MAX_FILM_BYTES) return texture;
    }
  }
  throw new Error("This crop couldn’t be prepared. Try a smaller image.");
}
