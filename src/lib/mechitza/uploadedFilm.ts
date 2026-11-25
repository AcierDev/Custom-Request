import { isUploadedFilmJpeg, MAX_FILM_BYTES } from "./filmJpeg.ts";

export { MAX_FILM_BYTES } from "./filmJpeg.ts";

type FilmUpload = { jpeg: Buffer } | { status: number; message: string };

export async function readUploadedFilm(request: Request): Promise<FilmUpload> {
  const mime = request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase();
  if (mime !== "image/jpeg") return { status: 415, message: "Upload a JPEG glass design" };

  const tooLarge = { status: 413, message: "JPEG glass designs must be under 140 KB" };
  if (Number(request.headers.get("Content-Length")) > MAX_FILM_BYTES) return tooLarge;

  const invalid = { status: 400, message: "Use a valid JPEG no larger than 2048 pixels per side" };
  const reader = request.body?.getReader();
  if (!reader) return invalid;

  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_FILM_BYTES) {
        void reader.cancel().catch(() => undefined);
        return tooLarge;
      }
      chunks.push(chunk.value);
    }
    const jpeg = Buffer.concat(chunks, bytes);
    return isUploadedFilmJpeg(jpeg) ? { jpeg } : invalid;
  } catch {
    return invalid;
  } finally {
    reader.releaseLock();
  }
}
