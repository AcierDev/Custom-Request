import { NextRequest, NextResponse } from "next/server";
import { requireAgentAuth } from "@/lib/agentDesign/auth";
import { getAgentDesign } from "@/lib/agentDesign/store";
import {
  parseScreenshotOptions,
  renderScreenshotPng,
} from "@/lib/agentDesign/screenshot";

export const runtime = "nodejs";

// GET /api/agent/designs/{id}/screenshot.png?width=&room=0|1&gaps=0|1
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAgentAuth(request);
  if (denied) return denied;

  const options = parseScreenshotOptions(request.nextUrl.searchParams);
  if ("error" in options) {
    return NextResponse.json(
      { error: `${options.field}: ${options.error}`, field: options.field },
      { status: 400 },
    );
  }

  const { id } = await params;
  const record = await getAgentDesign(id);
  if (!record) {
    return NextResponse.json({ error: "agent design not found" }, { status: 404 });
  }

  try {
    const { png, heightPx, wallSource } = await renderScreenshotPng(
      record.spec,
      record.grids,
      options,
    );
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=0, no-store",
        "X-Image-Width": String(options.widthPx),
        "X-Image-Height": String(heightPx),
        "X-Wall-Color-Source": wallSource,
      },
    });
  } catch (error) {
    console.error("Agent screenshot render failed:", error);
    return NextResponse.json({ error: "failed to render screenshot" }, { status: 500 });
  }
}
