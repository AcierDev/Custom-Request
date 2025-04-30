import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json(
        { error: "Palette ID is required" },
        { status: 400 }
      );
    }

    // Access the user data collection
    const collection = await getCollection("userData");

    // Find all docs that have this palette ID in their savedPalettes array
    const query = { "storeData.savedPalettes": { $elemMatch: { id } } };
    const projection = { "storeData.savedPalettes.$": 1 };

    const result = await collection.findOne(query, { projection });

    if (
      !result ||
      !result.storeData ||
      !result.storeData.savedPalettes ||
      result.storeData.savedPalettes.length === 0
    ) {
      return NextResponse.json({ error: "Palette not found" }, { status: 404 });
    }

    const palette = result.storeData.savedPalettes[0];

    // Check if the palette is public
    if (!palette.isPublic) {
      return NextResponse.json(
        { error: "This palette is not shared publicly" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      palette: {
        id: palette.id,
        name: palette.name,
        colors: palette.colors,
        createdAt: palette.createdAt,
        updatedAt: palette.updatedAt,
        isPublic: palette.isPublic,
      },
    });
  } catch (error) {
    console.error("Error fetching palette:", error);
    return NextResponse.json(
      { error: "Failed to fetch palette" },
      { status: 500 }
    );
  }
}
