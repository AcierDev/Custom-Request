import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import {
  LOCAL_SHARED_DESIGN_CONFIG,
  localSharedDesignStore,
} from "@/lib/localSharedDesignStore";
import { nanoid } from "nanoid";

// Collection name for shared designs
const SHARED_DESIGNS_COLLECTION = "sharedDesigns";
const DEFAULT_PRODUCTION_SHARE_ORIGIN = "https://custom.everwood.shop";
const USE_LOCAL_SHARED_DESIGN_STORE =
  process.env.NODE_ENV !== "production" && !process.env.MONGODB_URI;

const getShareOrigin = (request: NextRequest): string =>
  process.env.NEXT_PUBLIC_APP_URL ||
  (USE_LOCAL_SHARED_DESIGN_STORE
    ? request.nextUrl.origin
    : DEFAULT_PRODUCTION_SHARE_ORIGIN);

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

    let shareId: string;
    if (USE_LOCAL_SHARED_DESIGN_STORE) {
      shareId = localSharedDesignStore.create({
        designData,
        userId,
        email,
      }).shareId;
    } else {
      const collection = await getCollection(SHARED_DESIGNS_COLLECTION);
      shareId = nanoid(LOCAL_SHARED_DESIGN_CONFIG.shareIdLength);
      const now = new Date();
      await collection.insertOne({
        shareId,
        designData,
        userId: userId || null,
        email: email || null,
        createdAt: now,
        lastAccessed: now,
        accessCount: 0,
      });

      // Create indexes for better performance
      try {
        await collection.createIndexes([
          { key: { shareId: 1 }, unique: true },
          { key: { userId: 1 } },
          { key: { createdAt: 1 } },
        ]);
      } catch (error: any) {
        if (error.code === 85) {
          // IndexOptionsConflict: replace the old TTL index.
          await collection.dropIndex("createdAt_1");
          await collection.createIndexes([
            { key: { shareId: 1 }, unique: true },
            { key: { userId: 1 } },
            { key: { createdAt: 1 } },
          ]);
        } else {
          throw error;
        }
      }
    }

    return NextResponse.json({
      shareId,
      shareUrl: `${getShareOrigin(request)}/shared/${shareId}`,
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
    // Refresh polls from an already-open shared page pass poll=1 so a
    // viewer sitting on the page doesn't inflate the view count.
    const isPoll = searchParams.get("poll") === "1";

    if (!shareId) {
      return NextResponse.json(
        { error: "Share ID is required" },
        { status: 400 }
      );
    }

    if (USE_LOCAL_SHARED_DESIGN_STORE) {
      const sharedDesign = localSharedDesignStore.get(shareId, isPoll);
      if (!sharedDesign) {
        return NextResponse.json(
          { error: "Shared design not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        shareId: sharedDesign.shareId,
        designData: sharedDesign.designData,
        createdAt: sharedDesign.createdAt,
        accessCount: sharedDesign.accessCount,
      });
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
    if (!isPoll) {
      await collection.updateOne(
        { shareId },
        {
          $inc: { accessCount: 1 },
          $set: { lastAccessed: new Date() },
        }
      );
    }

    return NextResponse.json({
      shareId: sharedDesign.shareId,
      // A shared design is immutable: return the exact palette, square color
      // map, and direction map captured by POST.
      designData: sharedDesign.designData,
      createdAt: sharedDesign.createdAt,
      accessCount: (sharedDesign.accessCount ?? 0) + (isPoll ? 0 : 1), // Return updated count
    });
  } catch (error) {
    console.error("Error retrieving shared design:", error);
    return NextResponse.json(
      { error: "Failed to retrieve shared design" },
      { status: 500 }
    );
  }
}
