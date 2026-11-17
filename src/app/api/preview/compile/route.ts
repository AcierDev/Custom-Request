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
import { gridToRowStrings } from "@/lib/agentDesign/spec";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?spec=<base64url JSON> | POST <JSON> — compiles a preview spec (shorthand
// or full agent spec) WITHOUT storing anything. /viewer?spec= and
// /shared/preview?spec= call this to load a design. See docs/preview-tools.md.
async function handle(request: NextRequest) {
  try {
    const raw = await readSpecInput(request);
    const compiled = compileWithLimits(request, raw);
    const { designData, warnings } = buildPreviewDesignData(compiled);
    const { spec } = compiled;
    return NextResponse.json(
      {
        title: spec.title,
        designData,
        squares: {
          width: spec.layout.canvasWidthSquares,
          height: spec.layout.canvasHeightSquares,
          total: spec.layout.canvasWidthSquares * spec.layout.canvasHeightSquares,
        },
        inches: { width: spec.layout.widthInches, height: spec.layout.heightInches },
        squareSize: spec.squareSize,
        colors: summarizePreviewColors(compiled),
        rows: Object.fromEntries(spec.panels.map((p) => [p.id, gridToRowStrings(compiled.grids[p.id])])),
        links: previewLinks(request, raw),
        warnings,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return previewErrorResponse(error);
  }
}

export const GET = handle;
export const POST = handle;
