import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getMechitzaAssetName,
  MECHITZA_DEFAULT_FINISH,
  MECHITZA_FINISHES,
  MECHITZA_MODELS,
} from "@/app/mechitza/models";
import {
  findMechitzaArtColor,
  MECHITZA_ASSET_ART_COLOR,
  MECHITZA_DEFAULT_ART_COLOR,
  MECHITZA_DEFAULT_FILM,
  MECHITZA_FILMS,
} from "@/app/mechitza/options";
import { getFilmUpload, saveFilmUpload } from "@/lib/mechitza/filmUploadCache";
import { encodeSolidJpeg } from "@/lib/mechitza/solidJpeg";
import { MAX_FILM_BYTES, readUploadedFilm } from "@/lib/mechitza/uploadedFilm";
import { customizeGlb, customizeUsdz, mergeFiguresGlb } from "@/lib/mechitza/variantModel";

export const runtime = "nodejs";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const MIME_TYPES = {
  glb: "model/gltf-binary",
  usdz: "model/vnd.usdz+zip",
} as const;
const MAX_MODEL_BYTES = 8_000_000;
const STREAM_THRESHOLD_BYTES = 4_500_000;
const STREAM_CHUNK_BYTES = 128 * 1024;
const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const NO_STORE = { "Cache-Control": "private, no-store" };

const modelFiles = new Map(
  MECHITZA_MODELS.flatMap((model) => MECHITZA_FINISHES.flatMap((finish) => (
    (["glb", "usdz"] as const).map((format) => [
      `${getMechitzaAssetName(model.id, finish.id)}.${format}` as string,
      {
        format,
        finish: finish.id,
        sourceFile: `${getMechitzaAssetName(model.id, MECHITZA_DEFAULT_FINISH.id)}.${format}`,
      },
    ] as const)
  ))),
);

function prepareOptions(file: string, query: URLSearchParams) {
  const model = modelFiles.get(file);
  if (!model) return new Response("Unknown Mechitza model", { status: 404 });

  const film = MECHITZA_FILMS.find((option) => option.id === (query.get("film") ?? MECHITZA_DEFAULT_FILM.id));
  const artwork = findMechitzaArtColor(query.get("art") ?? MECHITZA_DEFAULT_ART_COLOR.id);
  if (!film || !artwork) return new Response("Unknown Mechitza finish option", { status: 400 });

  return { file, ...model, film, artwork, withPeople: query.get("people") !== "0" };
}

type ModelOptions = Exclude<ReturnType<typeof prepareOptions>, Response>;

function buildModelResponse(bytes: Buffer, file: string, format: keyof typeof MIME_TYPES, cacheControl: string) {
  const headers: Record<string, string> = {
    "Cache-Control": cacheControl,
    "Content-Type": MIME_TYPES[format],
  };
  if (format === "usdz") headers["Content-Disposition"] = `inline; filename="${file}"`;
  if (bytes.length <= STREAM_THRESHOLD_BYTES) {
    return new Response(Uint8Array.from(bytes), {
      headers: { ...headers, "Content-Length": String(bytes.length) },
    });
  }

  // Vercel's buffered response limit is 4.5 MB. Stream larger USDZ models
  // containing the height references in bounded chunks.
  let offset = 0;
  const body = new ReadableStream({
    pull(controller) {
      const end = Math.min(offset + STREAM_CHUNK_BYTES, bytes.length);
      controller.enqueue(bytes.subarray(offset, end));
      offset = end;
      if (offset === bytes.length) controller.close();
    },
  });
  return new Response(body, { headers });
}

async function renderModel({ file, sourceFile, format, finish, film, artwork, withPeople }: ModelOptions, uploadedFilm: Buffer | null) {
  const customArt = artwork.group === "Custom";
  try {
    const [source, texture, artImage, figureModel, previewLayer, woodTexture] = await Promise.all([
      readFile(path.join(PUBLIC_DIR, "mechitza-assets", sourceFile)),
      uploadedFilm ?? (film.id === MECHITZA_DEFAULT_FILM.id
        ? null
        : readFile(path.join(PUBLIC_DIR, "mechitza-films", `${film.id}.jpg`))),
      format !== "usdz" || artwork.id === MECHITZA_ASSET_ART_COLOR.id
        ? null
        : customArt
          ? encodeSolidJpeg(artwork.swatch)
          : readFile(path.join(PUBLIC_DIR, "mechitza-figures", "art-colors", `${artwork.id}.jpg`)),
      withPeople ? readFile(path.join(PUBLIC_DIR, "mechitza-figures", `mechitza-women.${format}`)) : null,
      withPeople && format === "usdz"
        ? readFile(path.join(PUBLIC_DIR, "mechitza-figures", "preview.usdc"))
        : null,
      finish === MECHITZA_DEFAULT_FINISH.id
        ? null
        : readFile(path.join(PUBLIC_DIR, "mechitza-wood", `${finish}.jpg`)),
    ]);
    if (texture && texture.length > MAX_FILM_BYTES) throw new Error("Mechitza film texture exceeds size limit");

    let bytes: Buffer;
    if (format === "usdz") {
      const figures = previewLayer && figureModel ? { previewLayer, figurePackage: figureModel } : undefined;
      bytes = customizeUsdz(source, texture, artImage, figures, woodTexture);
    } else {
      bytes = customizeGlb(source, texture, artwork.id === MECHITZA_ASSET_ART_COLOR.id ? null : artwork.swatch, woodTexture);
      if (figureModel) bytes = mergeFiguresGlb(bytes, figureModel);
    }
    if (bytes.length > MAX_MODEL_BYTES) throw new Error("Generated Mechitza model exceeds size limit");

    const cacheControl = uploadedFilm
      ? NO_STORE["Cache-Control"]
      : customArt ? "private, max-age=300" : CACHE_CONTROL;
    return buildModelResponse(bytes, file, format, cacheControl);
  } catch (error) {
    console.error("Unable to generate Mechitza model", error);
    return new Response("Mechitza model unavailable", { status: 500, headers: NO_STORE });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const query = new URL(req.url).searchParams;
  const options = prepareOptions(file, query);
  if (options instanceof Response) return options;

  const uploadId = query.get("upload");
  if (uploadId === null) return renderModel(options, null);

  try {
    const jpeg = await getFilmUpload(uploadId);
    if (!jpeg) return new Response("This uploaded glass preview has expired", { status: 404, headers: NO_STORE });
    return renderModel(options, jpeg);
  } catch (error) {
    console.error("Unable to read a temporary Mechitza glass design", error);
    return new Response("The uploaded glass preview is unavailable", { status: 503, headers: NO_STORE });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const url = new URL(req.url);
  const options = prepareOptions(file, url.searchParams);
  if (options instanceof Response) return options;

  const uploaded = await readUploadedFilm(req);
  if ("status" in uploaded) return new Response(uploaded.message, { status: uploaded.status, headers: NO_STORE });
  if (url.searchParams.get("prepare") !== "1") return renderModel(options, uploaded.jpeg);

  try {
    // Store only the validated image. The same-origin GET builds and streams the
    // model so iOS Quick Look can fetch an ordinary .usdz URL on a later tap.
    const { id, expiresAt } = await saveFilmUpload(uploaded.jpeg);
    url.searchParams.delete("prepare");
    url.searchParams.set("upload", id);
    return Response.json({ url: url.pathname + url.search, expiresAt: expiresAt.toISOString() }, { headers: NO_STORE });
  } catch (error) {
    console.error("Unable to save a temporary Mechitza glass design", error);
    return new Response("Temporary glass previews are unavailable", { status: 503, headers: NO_STORE });
  }
}
