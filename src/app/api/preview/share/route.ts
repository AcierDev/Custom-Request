import { NextRequest, NextResponse } from "next/server";
import {
  compileWithLimits,
  previewErrorResponse,
  previewLinks,
  readSpecInput,
} from "@/lib/agentDesign/previewApi";
import {
  buildPreviewDesignData,
  summarizePreviewColors,
} from "@/lib/agentDesign/previewSpec";
import { insertSharedDesign } from "@/lib/agentDesign/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST <spec JSON> — creates a customer share link (/shared/<id>) from a
// shorthand or full agent spec. Same record POST /api/shared-designs makes.
export async function POST(request: NextRequest) {
  try {
    const raw = await readSpecInput(request);
    const compiled = compileWithLimits(request, raw);
    const { designData, warnings } = buildPreviewDesignData(compiled);
    const shared = await insertSharedDesign(designData, request.nextUrl.origin);
    return NextResponse.json({
      shareId: shared.shareId,
      shareUrl: shared.shareUrl,
      title: compiled.spec.title,
      colors: summarizePreviewColors(compiled),
      links: previewLinks(request, raw),
      warnings,
    });
  } catch (error) {
    return previewErrorResponse(error);
  }
}
