import { NextRequest, NextResponse } from "next/server";
import { requireAgentAuth } from "@/lib/agentDesign/auth";
import { PaintLookupError, getPaintLookup } from "@/lib/agentDesign/paintLookup";

export const runtime = "nodejs";

// GET /api/agent/colors?code=SW6764[&brand=sherwin] → {brand, code, name, hex}
export async function GET(request: NextRequest) {
  const denied = requireAgentAuth(request);
  if (denied) return denied;

  const code = request.nextUrl.searchParams.get("code");
  const brand = request.nextUrl.searchParams.get("brand");
  if (!code) {
    return NextResponse.json({ error: "code: is required", field: "code" }, { status: 400 });
  }
  try {
    const paint = getPaintLookup().lookup(code, brand);
    return NextResponse.json({
      brand: paint.brand,
      brandLabel: paint.brandLabel,
      code: paint.code,
      name: paint.name,
      hex: paint.hex,
    });
  } catch (error) {
    if (error instanceof PaintLookupError) {
      return NextResponse.json({ error: `code: ${error.message}`, field: "code" }, { status: 400 });
    }
    throw error;
  }
}
