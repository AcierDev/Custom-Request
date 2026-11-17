import { NextRequest, NextResponse } from "next/server";
import {
  PreviewInputError,
  loadDesignSource,
  previewErrorResponse,
} from "@/lib/agentDesign/previewApi";
import { QUOTE_CONFIG, buildQuote, type QuoteListing } from "@/lib/agentDesign/quote";
import { summarizeColorUsage } from "@/lib/agentDesign/spec";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUOTE_LIMITS = { maxListings: 50, maxCustomColors: 62, maxInches: 1000, maxBodyChars: 24000 } as const;
const ALLOWED_FIELDS = new Set(["spec", "agentDesignId", "widthInches", "heightInches", "listings", "customColors"]);

const positiveInches = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 && value <= QUOTE_LIMITS.maxInches;

function parseListings(raw: unknown): QuoteListing[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > QUOTE_LIMITS.maxListings) {
    throw new PreviewInputError(`array of 1-${QUOTE_LIMITS.maxListings} {widthInches, heightInches, priceUsd}`, "listings");
  }
  return raw.map((entry, i) => {
    const l = entry as Partial<QuoteListing> | null;
    if (!l || !positiveInches(l.widthInches) || !positiveInches(l.heightInches) || typeof l.priceUsd !== "number" || !(l.priceUsd > 0)) {
      throw new PreviewInputError("needs positive widthInches, heightInches and priceUsd", `listings[${i}]`);
    }
    return { widthInches: l.widthInches, heightInches: l.heightInches, priceUsd: l.priceUsd };
  });
}

// POST /api/preview/quote
// { spec? | agentDesignId?, widthInches?, heightInches?, listings: [{widthInches, heightInches, priceUsd}], customColors?: n }
// Size comes from the design's layout unless given. Listing prices are the LIVE
// Etsy prices the caller just read; nothing is stored. With a design, the
// response also carries its block counts. Method: docs/preview-tools.md.
export async function POST(request: NextRequest) {
  try {
    const text = await request.text();
    if (text.length > QUOTE_LIMITS.maxBodyChars) throw new PreviewInputError("body is too large", "body", 413);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      throw new PreviewInputError("must be valid JSON", "body");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new PreviewInputError("must be an object", "body");
    for (const key of Object.keys(body)) {
      if (!ALLOWED_FIELDS.has(key)) {
        throw new PreviewInputError(`unknown field; allowed: ${[...ALLOWED_FIELDS].join(", ")}`, key);
      }
    }
    if (body.spec !== undefined && body.agentDesignId !== undefined) {
      throw new PreviewInputError("give spec or agentDesignId, not both", "agentDesignId");
    }

    const listings = parseListings(body.listings);
    const customColors = body.customColors ?? 0;
    if (!Number.isInteger(customColors) || (customColors as number) < 0 || (customColors as number) > QUOTE_LIMITS.maxCustomColors) {
      throw new PreviewInputError(`whole number 0-${QUOTE_LIMITS.maxCustomColors}`, "customColors");
    }

    let widthInches = body.widthInches;
    let heightInches = body.heightInches;
    let blocks: unknown = null;
    const designRef = body.spec ?? body.agentDesignId;
    if (designRef !== undefined) {
      const { spec, grids } = await loadDesignSource(request, designRef, body.spec !== undefined ? "spec" : "agentDesignId");
      widthInches ??= spec.layout.widthInches;
      heightInches ??= spec.layout.heightInches;
      const usage = summarizeColorUsage(spec, grids);
      blocks = {
        totalSquares: usage.reduce((sum, c) => sum + c.squareCount, 0),
        panels: spec.panels.length,
        colors: usage.map((c) => ({ index: c.index, code: c.code ?? null, name: c.name ?? null, hex: c.hex, squareCount: c.squareCount })),
      };
    }
    if (!positiveInches(widthInches) || !positiveInches(heightInches)) {
      throw new PreviewInputError("give widthInches and heightInches (or a spec / agentDesignId)", "widthInches");
    }

    return NextResponse.json({
      widthInches,
      heightInches,
      ...buildQuote({ widthInches, heightInches, listings, customColors: customColors as number }),
      customColorFeeEachUsd: QUOTE_CONFIG.customColorFeeUsd,
      blocks,
      note: "Prices come only from the listings you pass in. A per-customer custom-color waiver is not applied.",
    });
  } catch (error) {
    return previewErrorResponse(error);
  }
}
