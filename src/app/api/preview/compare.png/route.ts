import { NextRequest, NextResponse } from "next/server";
import { COMPARE_CONFIG, renderComparePng } from "@/lib/agentDesign/compare";
import {
  PreviewInputError,
  loadDesignSource,
  previewErrorResponse,
  readScreenshotOptions,
} from "@/lib/agentDesign/previewApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMPARE_PARAMS = {
  designA: "a",
  designB: "b",
  captionA: "captionA",
  captionB: "captionB",
  defaultCaptionA: "Before",
  defaultCaptionB: "After",
} as const;

// GET ?a=<spec>&b=<spec>[&captionA=Before&captionB=After&width=&room=&gaps=&margin=]
// Two designs stacked (A on top) in one PNG, each under a caption bar. `a`/`b`
// are spec params, or agent design ids when the agent bearer key is sent.
export async function GET(request: NextRequest) {
  try {
    const options = readScreenshotOptions(request);
    const params = request.nextUrl.searchParams;
    const refs = [params.get(COMPARE_PARAMS.designA), params.get(COMPARE_PARAMS.designB)];
    if (!refs[0] || !refs[1]) {
      throw new PreviewInputError("a and b are required (spec params, or agent design ids with the key)", refs[0] ? "b" : "a");
    }
    const [a, b] = await Promise.all([
      loadDesignSource(request, refs[0], COMPARE_PARAMS.designA),
      loadDesignSource(request, refs[1], COMPARE_PARAMS.designB),
    ]);
    const { png, widthPx, heightPx } = await renderComparePng(
      [
        { ...a, caption: params.get(COMPARE_PARAMS.captionA) ?? COMPARE_PARAMS.defaultCaptionA },
        { ...b, caption: params.get(COMPARE_PARAMS.captionB) ?? COMPARE_PARAMS.defaultCaptionB },
      ],
      { widthPx: options.widthPx ?? COMPARE_CONFIG.defaultWidthPx, room: options.room, gaps: options.gaps, marginRatio: options.marginRatio },
    );
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "X-Image-Width": String(widthPx),
        "X-Image-Height": String(heightPx),
      },
    });
  } catch (error) {
    return previewErrorResponse(error);
  }
}
