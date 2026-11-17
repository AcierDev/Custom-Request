import { NextRequest, NextResponse } from "next/server";
import {
  compileWithLimits,
  previewErrorResponse,
  readScreenshotOptions,
  readSpecInput,
} from "@/lib/agentDesign/previewApi";
import { renderScreenshotPng } from "@/lib/agentDesign/screenshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?spec=<base64url JSON>&width=&room=0|1&gaps=0|1 (or POST a JSON body) —
// straight-on art PNG with no UI, no margins beyond the room/no-room framing.
async function handle(request: NextRequest) {
  try {
    const options = readScreenshotOptions(request);
    const compiled = compileWithLimits(request, await readSpecInput(request));
    const { png, heightPx, wallSource } = await renderScreenshotPng(compiled.spec, compiled.grids, options);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "X-Image-Width": String(options.widthPx),
        "X-Image-Height": String(heightPx),
        "X-Wall-Color-Source": wallSource,
      },
    });
  } catch (error) {
    return previewErrorResponse(error);
  }
}

export const GET = handle;
export const POST = handle;
