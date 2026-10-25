import { NextResponse } from "next/server";
import { BLENDER_RENDER_JOB_CONFIG as C, blenderRenderAvailable, startBlenderJob } from "@/lib/blender/blenderRenderJobs";
import { BLENDER_PACKAGE_CONFIG as P } from "@/lib/blender/blenderPackage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Starts an art-only Blender render of the posted design on this Mac.
 * 503 means Blender is not installed here, so the client renders in-browser. */
export async function POST(request: Request) {
  if (!blenderRenderAvailable()) return NextResponse.json({ error: "Blender rendering is not available." }, { status: 503 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > C.maxInputBytes) return NextResponse.json({ error: "This design is too large to render." }, { status: 413 });
  let packet: { schema?: unknown };
  try { packet = await request.json(); } catch { return NextResponse.json({ error: "Invalid design file." }, { status: 400 }); }
  if (packet?.schema !== P.schema) return NextResponse.json({ error: "Invalid design file." }, { status: 400 });
  try { return NextResponse.json(await startBlenderJob(packet), { status: 202 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "The render could not start." }, { status: 429 }); }
}
