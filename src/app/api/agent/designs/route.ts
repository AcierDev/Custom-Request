import { NextRequest, NextResponse } from "next/server";
import { requireAgentAuth } from "@/lib/agentDesign/auth";
import { getPaintLookup } from "@/lib/agentDesign/paintLookup";
import {
  AgentSpecError,
  computePanelGrids,
  gridToRowStrings,
  summarizeColorUsage,
  validateAgentSpec,
} from "@/lib/agentDesign/spec";
import {
  AGENT_FIXED_DESIGN_FIELDS,
  buildCombinedDesignData,
  buildPanelDesignData,
  panelLabel,
  planCombinedDesign,
} from "@/lib/agentDesign/designData";
import {
  appendSavedPalette,
  insertAgentDesign,
  insertSharedDesign,
  insertSharedDesignSet,
  newAgentDesignId,
  usesLocalStores,
} from "@/lib/agentDesign/store";
import { SCREENSHOT_CONFIG } from "@/lib/agentDesign/screenshot";

export const runtime = "nodejs";

// POST /api/agent/designs — build customer design previews from a strict
// spec. See docs/agent-design-api.md.
export async function POST(request: NextRequest) {
  const denied = requireAgentAuth(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "body must be valid JSON", field: "body" }, { status: 400 });
  }

  let spec;
  try {
    spec = validateAgentSpec(body, getPaintLookup());
  } catch (error) {
    if (error instanceof AgentSpecError) {
      return NextResponse.json({ error: error.message, field: error.field }, { status: 400 });
    }
    throw error;
  }

  try {
    const origin = request.nextUrl.origin;
    const grids = computePanelGrids(spec);
    const agentDesignId = newAgentDesignId();

    const panelShareIds: Record<string, string> = {};
    const panelResults = [];
    for (const panel of spec.panels) {
      const designData = buildPanelDesignData(spec, panel.id, grids[panel.id]);
      const shared = await insertSharedDesign(designData, origin);
      panelShareIds[panel.id] = shared.shareId;
      panelResults.push({
        id: panel.id,
        label: panelLabel(panel.row, panel.col),
        position: { row: panel.row + 1, col: panel.col + 1 },
        squares: { width: panel.widthSquares, height: panel.heightSquares, total: panel.widthSquares * panel.heightSquares },
        inches: { width: panel.widthInches, height: panel.heightInches },
        offsetInches: { x: panel.xInches, y: panel.yInches },
        shareId: shared.shareId,
        shareUrl: shared.shareUrl,
        rows: gridToRowStrings(grids[panel.id]),
      });
    }

    const plan = planCombinedDesign(spec);
    let combined: { shareId: string; shareUrl: string; panelCount: number; panelSpacingInches: number; panelRemainderMode: string } | null = null;
    if (plan.possible) {
      const designData = buildCombinedDesignData(spec, grids, plan.panelRemainderMode);
      const shared = await insertSharedDesign(designData, origin);
      combined = {
        ...shared,
        panelCount: spec.layout.cols,
        panelSpacingInches: spec.layout.gapInches,
        panelRemainderMode: plan.panelRemainderMode,
      };
    }

    let set: { setId: string; setUrl: string; breakdownUrl: string } | null = null;
    if (spec.layout.rows > 1) {
      set = await insertSharedDesignSet(
        spec.panels.map((panel) => ({
          designData: buildPanelDesignData(spec, panel.id, grids[panel.id]),
          label: panelLabel(panel.row, panel.col),
        })),
        origin,
      );
    }

    await insertAgentDesign({
      agentDesignId,
      createdAt: new Date(),
      spec,
      grids,
      inputSpec: body,
      panelShareIds,
      combinedShareId: combined?.shareId ?? null,
      setId: set?.setId ?? null,
    });

    const savedPaletteResult = await appendSavedPalette(spec);
    const colorUsage = summarizeColorUsage(spec, grids);
    const warnings: string[] = [];
    for (const c of colorUsage) {
      if (c.squareCount === 0) warnings.push(`colors[${c.index}] (${c.code ?? c.hex}) is not used by any square`);
    }
    if (usesLocalStores()) {
      warnings.push("local dev store (no MONGODB_URI): records live in server memory and vanish on restart");
    }

    const screenshotBase = `${origin}/api/agent/designs/${agentDesignId}/screenshot.png`;
    return NextResponse.json({
      agentDesignId,
      title: spec.title,
      panels: panelResults,
      combinedDesign: combined,
      combinedDesignReason: plan.possible ? null : plan.reason,
      designSet: set,
      designSetReason: set ? null : "layout is a single row; no set created",
      screenshot: {
        url: screenshotBase,
        roomUrl: `${screenshotBase}?room=1`,
        defaultWidthPx: SCREENSHOT_CONFIG.defaultWidthPx,
        widthRangePx: [SCREENSHOT_CONFIG.minWidthPx, SCREENSHOT_CONFIG.maxWidthPx],
        requiresAuth: true,
      },
      savedPalette: savedPaletteResult?.saved ? savedPaletteResult : null,
      savedPaletteReason: !spec.savePalette
        ? "savePalette not requested"
        : savedPaletteResult && !savedPaletteResult.saved
          ? savedPaletteResult.reason
          : null,
      resolved: {
        squareSize: spec.squareSize,
        squareEdgeInches: spec.squareEdgeInches,
        squareGapInches: spec.squareGapInches,
        layout: {
          rows: spec.layout.rows,
          cols: spec.layout.cols,
          order: spec.layout.order,
          gapInches: spec.layout.gapInches,
          overallInches: { width: spec.layout.widthInches, height: spec.layout.heightInches },
          canvasSquares: { width: spec.layout.canvasWidthSquares, height: spec.layout.canvasHeightSquares },
        },
        inchesNote: "square span only (edge × count + square gaps); backboard lip not included",
        fill: spec.fill,
        colorKey: "panels[].rows use one char per square: colors[i].key",
        colors: colorUsage,
        wallColor: spec.wallColor
          ? { brand: spec.wallColor.brandLabel, code: spec.wallColor.code, name: spec.wallColor.name, hex: spec.wallColor.hex }
          : null,
        wallColorNote: spec.wallColor ? null : "wallColor not given; omitted from designData (viewer keeps its own wall color)",
        fixedDesignFields: AGENT_FIXED_DESIGN_FIELDS,
      },
      warnings,
    });
  } catch (error) {
    console.error("Agent design creation failed:", error);
    return NextResponse.json({ error: "failed to create agent design" }, { status: 500 });
  }
}
