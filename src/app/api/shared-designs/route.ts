import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { nanoid } from "nanoid";

// Collection name for shared designs
const SHARED_DESIGNS_COLLECTION = "sharedDesigns";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { designData, userId, email } = body;

    if (!designData) {
      return NextResponse.json(
        { error: "Design data is required" },
        { status: 400 }
      );
    }

    const collection = await getCollection(SHARED_DESIGNS_COLLECTION);

    // Generate a unique ID for the shared design
    const shareId = nanoid(12); // 12 character ID for shorter URLs

    // Create the shared design document
    const sharedDesign = {
      shareId,
      designData,
      userId: userId || null,
      email: email || null,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
    };

    // Insert the shared design
    await collection.insertOne(sharedDesign);

    // Create indexes for better performance
    await collection.createIndexes([
      { key: { shareId: 1 }, unique: true },
      { key: { userId: 1 } },
      { key: { createdAt: 1 } }, // Removed TTL to keep designs indefinitely
    ]);

    return NextResponse.json({
      shareId,
      shareUrl: `${
        process.env.NEXT_PUBLIC_APP_URL || "http://viewer.everwoodus.com"
      }/shared/${shareId}`,
    });
  } catch (error) {
    console.error("Error creating shared design:", error);
    return NextResponse.json(
      { error: "Failed to create shared design" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get("id");

    if (!shareId) {
      return NextResponse.json(
        { error: "Share ID is required" },
        { status: 400 }
      );
    }

    const collection = await getCollection(SHARED_DESIGNS_COLLECTION);

    // Find the shared design
    const sharedDesign = await collection.findOne({ shareId });

    if (!sharedDesign) {
      return NextResponse.json(
        { error: "Shared design not found" },
        { status: 404 }
      );
    }

    // Update access count and last accessed time
    await collection.updateOne(
      { shareId },
      {
        $inc: { accessCount: 1 },
        $set: { lastAccessed: new Date() },
      }
    );

    return NextResponse.json({
      shareId: sharedDesign.shareId,
      designData: sharedDesign.designData,
      createdAt: sharedDesign.createdAt,
      accessCount: sharedDesign.accessCount + 1, // Return updated count
    });
  } catch (error) {
    console.error("Error retrieving shared design:", error);
    return NextResponse.json(
      { error: "Failed to retrieve shared design" },
      { status: 500 }
    );
  }
}
