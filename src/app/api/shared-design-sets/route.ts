import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { nanoid } from "nanoid";

// Collection name for shared design sets
const SHARED_DESIGN_SETS_COLLECTION = "sharedDesignSets";

type SharedDesignSetItem = {
  designData: Record<string, unknown>;
  label?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { designs, userId, email } = body as {
      designs?: SharedDesignSetItem[];
      userId?: string;
      email?: string;
    };

    if (!Array.isArray(designs) || designs.length === 0) {
      return NextResponse.json(
        { error: "Designs array is required" },
        { status: 400 }
      );
    }

    const normalizedDesigns: SharedDesignSetItem[] = designs
      .filter((d) => d && typeof d === "object" && d.designData)
      .map((d) => ({
        designData: d.designData,
        label: d.label ?? null,
      }));

    if (normalizedDesigns.length === 0) {
      return NextResponse.json(
        { error: "At least one design with designData is required" },
        { status: 400 }
      );
    }

    const collection = await getCollection(SHARED_DESIGN_SETS_COLLECTION);

    const setId = nanoid(12);
    const sharedDesignSet = {
      setId,
      designs: normalizedDesigns,
      userId: userId || null,
      email: email || null,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
    };

    await collection.insertOne(sharedDesignSet);

    // Create indexes for better performance (idempotent)
    await collection.createIndexes([
      { key: { setId: 1 }, unique: true },
      { key: { userId: 1 } },
      { key: { createdAt: 1 } }, // Removed TTL to keep designs indefinitely
    ]);

    const viewerBaseUrl = "http://viewer.everwoodus.com";

    return NextResponse.json({
      setId,
      setUrl: `${viewerBaseUrl}/?setId=${setId}`,
    });
  } catch (error) {
    console.error("Error creating shared design set:", error);
    return NextResponse.json(
      { error: "Failed to create shared design set" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const setId = searchParams.get("id");

    if (!setId) {
      return NextResponse.json(
        { error: "Set ID is required" },
        { status: 400 }
      );
    }

    const collection = await getCollection(SHARED_DESIGN_SETS_COLLECTION);
    const sharedSet = await collection.findOne({ setId });

    if (!sharedSet) {
      return NextResponse.json(
        { error: "Shared design set not found" },
        { status: 404 }
      );
    }

    await collection.updateOne(
      { setId },
      {
        $inc: { accessCount: 1 },
        $set: { lastAccessed: new Date() },
      }
    );

    return NextResponse.json({
      setId: sharedSet.setId,
      designs: sharedSet.designs,
      createdAt: sharedSet.createdAt,
      accessCount: sharedSet.accessCount + 1,
    });
  } catch (error) {
    console.error("Error retrieving shared design set:", error);
    return NextResponse.json(
      { error: "Failed to retrieve shared design set" },
      { status: 500 }
    );
  }
}
