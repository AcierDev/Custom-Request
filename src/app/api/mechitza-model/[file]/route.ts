import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getMechitzaBaseAssets,
  MECHITZA_FINISHES,
  MECHITZA_MODELS,
} from "@/app/mechitza/models";
import {
  MECHITZA_ART_COLORS,
  MECHITZA_DEFAULT_ART_COLOR,
  MECHITZA_DEFAULT_FILM,
  MECHITZA_FILMS,
} from "@/app/mechitza/options";
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
const MAX_FILM_BYTES = 140_000;
const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

const modelFiles = new Map(
  MECHITZA_MODELS.flatMap((model) => MECHITZA_FINISHES.flatMap((finish) => {
    const assets = getMechitzaBaseAssets(model.id, finish.id);
    return (["glb", "usdz"] as const).map((format) => {
      const filename = path.basename(assets[format].split("?")[0]);
      return [filename, format] as const;
    });
  })),
);

function buildModelResponse(bytes: Buffer, format: keyof typeof MIME_TYPES) {
  const headers = {
    "Cache-Control": CACHE_CONTROL,
    "Content-Type": MIME_TYPES[format],
  };
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

export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const format = modelFiles.get(file);
  if (!format) return new Response("Unknown Mechitza model", { status: 404 });

  const query = new URL(req.url).searchParams;
  const withPeople = query.get("people") !== "0";
  const film = MECHITZA_FILMS.find((option) => option.id === (query.get("film") ?? MECHITZA_DEFAULT_FILM.id));
  const artwork = MECHITZA_ART_COLORS.find((option) => option.id === (query.get("art") ?? MECHITZA_DEFAULT_ART_COLOR.id));
  if (!film || !artwork) return new Response("Unknown Mechitza finish option", { status: 400 });

  try {
    const [source, texture, artImage, figureModel, previewLayer] = await Promise.all([
      readFile(path.join(PUBLIC_DIR, "mechitza-assets", file)),
      film.id === MECHITZA_DEFAULT_FILM.id
        ? null
        : readFile(path.join(PUBLIC_DIR, "mechitza-films", `${film.id}.jpg`)),
      format !== "usdz" || artwork.id === MECHITZA_DEFAULT_ART_COLOR.id
        ? null
        : readFile(path.join(PUBLIC_DIR, "mechitza-figures", "art-colors", `${artwork.id}.jpg`)),
      withPeople ? readFile(path.join(PUBLIC_DIR, "mechitza-figures", `mechitza-women.${format}`)) : null,
      withPeople && format === "usdz"
        ? readFile(path.join(PUBLIC_DIR, "mechitza-figures", "preview.usdc"))
        : null,
    ]);
    if (texture && texture.length > MAX_FILM_BYTES) throw new Error("Mechitza film texture exceeds size limit");

    let bytes: Buffer;
    if (format === "usdz") {
      const figures = previewLayer && figureModel ? { previewLayer, figurePackage: figureModel } : undefined;
      bytes = customizeUsdz(source, texture, artImage, figures);
    } else {
      bytes = customizeGlb(source, texture, artwork.id === MECHITZA_DEFAULT_ART_COLOR.id ? null : artwork.swatch);
      if (figureModel) bytes = mergeFiguresGlb(bytes, figureModel);
    }
    if (bytes.length > MAX_MODEL_BYTES) throw new Error("Generated Mechitza model exceeds size limit");
    return buildModelResponse(bytes, format);
  } catch (error) {
    console.error("Unable to generate Mechitza model", error);
    return new Response("Mechitza model unavailable", { status: 500 });
  }
}
