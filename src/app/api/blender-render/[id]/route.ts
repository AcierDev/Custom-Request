import { NextResponse } from "next/server";
import { cancelBlenderJob, getBlenderJob } from "@/lib/blender/blenderRenderJobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const job = getBlenderJob((await params).id);
  return job ? NextResponse.json(job) : NextResponse.json({ error: "Render not found." }, { status: 404 });
}

export async function DELETE(_request: Request, { params }: Context) {
  cancelBlenderJob((await params).id);
  return new NextResponse(null, { status: 204 });
}
