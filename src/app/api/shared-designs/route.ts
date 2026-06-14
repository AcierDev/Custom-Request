import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { nanoid } from "nanoid";
import { ItemDesigns } from "@/typings/types";

// Collection name for shared designs
const SHARED_DESIGNS_COLLECTION = "sharedDesigns";
// Each user's whole store snapshot (including savedPalettes) lives in one
// doc here — the live source the share overlay reads from.
const USER_DATA_COLLECTION = "userData";

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
    // Create indexes for better performance
    try {
      await collection.createIndexes([
        { key: { shareId: 1 }, unique: true },
        { key: { userId: 1 } },
        { key: { createdAt: 1 } }, // Removed TTL to keep designs indefinitely
      ]);
    } catch (error: any) {
      if (error.code === 85) {
        // IndexOptionsConflict: Index exists with different options (likely TTL)
        // Drop the conflicting index and retry
        console.log("Dropping conflicting index createdAt_1 to remove TTL...");
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

    return NextResponse.json({
      shareId,
      shareUrl: `${
        process.env.NEXT_PUBLIC_APP_URL || "https://custom.everwood.shop"
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
    // Refresh polls from an already-open shared page pass poll=1 so a
    // viewer sitting on the page doesn't inflate the view count.
    const isPoll = searchParams.get("poll") === "1";

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
    if (!isPoll) {
      await collection.updateOne(
        { shareId },
        {
          $inc: { accessCount: 1 },
          $set: { lastAccessed: new Date() },
        }
      );
    }

    // The share doc is a frozen snapshot, but a custom-palette share should
    // always show its owner's LATEST saved palette: resolve it fresh on
    // every read and lay its colors over the snapshot. The snapshot remains
    // the fallback for legacy/guest shares (no owner identity), owners with
    // no saved palettes yet, and official-catalog designs (whose colors are
    // fixed, not palette-driven).
    const latestPalette =
      sharedDesign.designData?.selectedDesign === ItemDesigns.Custom
        ? await resolveLatestSavedPalette(sharedDesign.userId, sharedDesign.email)
        : null;
    const designData = latestPalette
      ? {
          ...sharedDesign.designData,
          customPalette: latestPalette.colors,
        }
      : sharedDesign.designData;

    return NextResponse.json({
      shareId: sharedDesign.shareId,
      designData,
      paletteName: latestPalette?.name ?? null,
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

interface StoredSavedPalette {
  name?: string;
  colors?: unknown[];
  createdAt?: string;
  updatedAt?: string;
}

/** Most recent save wins: editing an existing palette (updatedAt) counts as
 *  much as creating a new one (createdAt). */
function paletteSavedAtMs(palette: StoredSavedPalette): number {
  return Date.parse(palette.updatedAt ?? palette.createdAt ?? "") || 0;
}

/** Look up the share owner's userData doc and return their most recently
 *  saved palette, or null when it can't be resolved. Never throws — a
 *  lookup failure degrades to the share's frozen snapshot. */
async function resolveLatestSavedPalette(
  userId: string | null | undefined,
  email: string | null | undefined
): Promise<StoredSavedPalette | null> {
  const identityClauses: Record<string, string>[] = [];
  if (userId) identityClauses.push({ userId });
  if (email) identityClauses.push({ email });
  if (identityClauses.length === 0) return null;

  try {
    const userData = await getCollection(USER_DATA_COLLECTION);
    const owner = await userData.findOne(
      { $or: identityClauses },
      { projection: { "storeData.savedPalettes": 1 } }
    );
    const palettes = owner?.storeData?.savedPalettes;
    if (!Array.isArray(palettes)) return null;

    let latest: StoredSavedPalette | null = null;
    for (const palette of palettes as StoredSavedPalette[]) {
      if (!Array.isArray(palette?.colors) || palette.colors.length === 0) {
        continue;
      }
      if (!latest || paletteSavedAtMs(palette) > paletteSavedAtMs(latest)) {
        latest = palette;
      }
    }
    return latest;
  } catch (error) {
    console.error("Error resolving latest saved palette:", error);
    return null;
  }
}
