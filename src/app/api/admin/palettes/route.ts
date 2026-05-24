import { NextRequest, NextResponse } from "next/server";
import { canViewAllPalettes } from "@/lib/admin";
import { getAllUserPaletteArchives } from "@/lib/userDataService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const requesterEmail =
      request.headers.get("x-user-email") ??
      request.nextUrl.searchParams.get("email");

    if (!canViewAllPalettes(requesterEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const users = await getAllUserPaletteArchives();

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("API error getting all palettes:", error);
    return NextResponse.json(
      { error: "Failed to get all palettes" },
      { status: 500 }
    );
  }
}
