import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { blenderJobImagePath } from "@/lib/blender/blenderRenderJobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const image = blenderJobImagePath((await params).id);
  if (!image) return NextResponse.json({ error: "Render not ready." }, { status: 404 });
  return new NextResponse(new Uint8Array(await readFile(image)), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
}
