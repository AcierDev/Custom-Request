import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { nanoid } from "nanoid";

// Collection name for shared design sets
const SHARED_DESIGN_SETS_COLLECTION = "sharedDesignSets";
const VIEWER_BASE_URL = "http://viewer.everwoodus.com";

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
    // Create indexes for better performance (idempotent)
    try {
      await collection.createIndexes([
        { key: { setId: 1 }, unique: true },
        { key: { userId: 1 } },
        { key: { createdAt: 1 } }, // Removed TTL to keep designs indefinitely
      ]);
    } catch (error: any) {
      if (error.code === 85) {
        console.log("Dropping conflicting index createdAt_1 to remove TTL...");
        await collection.dropIndex("createdAt_1");
        await collection.createIndexes([
          { key: { setId: 1 }, unique: true },
          { key: { userId: 1 } },
          { key: { createdAt: 1 } },
        ]);
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      setId,
      setUrl: `${VIEWER_BASE_URL}/?setId=${setId}`,
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

    const collection = await getCollection(SHARED_DESIGN_SETS_COLLECTION);

    // List last 10 shared sets when no id is provided
    if (!setId) {
      const limit = Math.min(
        Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)),
        50
      );
      const cursor = collection
        .find(
          {},
          {
            projection: { setId: 1, createdAt: 1, accessCount: 1 },
          }
        )
        .sort({ createdAt: -1 })
        .limit(limit);

      const sets = await cursor.toArray();
      const items = sets.map((s) => ({
        setId: s.setId,
        link: `${VIEWER_BASE_URL}/?setId=${s.setId}`,
        createdAt: s.createdAt,
        accessCount: s.accessCount ?? 0,
      }));

      return NextResponse.json({
        sets: items,
        count: items.length,
      });
    }

    // Fetch single set by id
    const sharedSet = await collection.findOne({ setId });

    if (!sharedSet) {
      return NextResponse.json(
        { error: "Shared design set not found" },
        { status: 404 }
      );
    }

    const wantBreakdown = searchParams.get("breakdown") === "colors";

    if (!wantBreakdown) {
      await collection.updateOne(
        { setId },
        {
          $inc: { accessCount: 1 },
          $set: { lastAccessed: new Date() },
        }
      );
    }

    const designs = sharedSet.designs as Array<{
      designData: {
        customPalette?: Array<{
          hex: string;
          name?: string | null;
          extraPercent?: number;
        }>;
        selectedDesign?: string;
        dimensions?: { width?: number; height?: number };
      };
      label?: string | null;
    }>;

    type ColorEntry = {
      hex: string;
      name: string | null;
      extraPercent: number;
      designIndex: number;
      designLabel: string | null;
    };

    const allColorEntries: ColorEntry[] = [];
    (designs || []).forEach((d, i) => {
      const palette = d?.designData?.customPalette;
      const label = d?.label ?? `Design ${i + 1}`;
      if (Array.isArray(palette)) {
        palette.forEach((c) => {
          if (c && typeof c === "object" && c.hex) {
            allColorEntries.push({
              hex: String(c.hex),
              name: c.name != null ? String(c.name) : null,
              extraPercent:
                typeof c.extraPercent === "number" && !Number.isNaN(c.extraPercent)
                  ? c.extraPercent
                  : 0,
              designIndex: i,
              designLabel: label,
            });
          }
        });
      }
    });

    // Unique colors across the set (by hex), with first name and list of designs
    const byHex = new Map<
      string,
      {
        hex: string;
        name: string | null;
        designs: { index: number; label: string | null; extraPercent: number }[];
      }
    >();
    for (const e of allColorEntries) {
      const key = e.hex.startsWith("#")
        ? e.hex.toUpperCase()
        : `#${e.hex.toUpperCase()}`;
      if (!byHex.has(key)) {
        byHex.set(key, {
          hex: key,
          name: e.name,
          designs: [],
        });
      }
      const rec = byHex.get(key)!;
      if (!rec.name && e.name) rec.name = e.name;
      rec.designs.push({
        index: e.designIndex,
        label: e.designLabel,
        extraPercent: e.extraPercent,
      });
    }

    const colorBreakdown = Array.from(byHex.entries()).map(([, v]) => ({
      hex: v.hex,
      name: v.name,
      designCount: v.designs.length,
      designs: v.designs,
    }));

    const response: Record<string, unknown> = {
      setId: sharedSet.setId,
      designs: sharedSet.designs,
      createdAt: sharedSet.createdAt,
      accessCount: sharedSet.accessCount + (wantBreakdown ? 0 : 1),
      setUrl: `${VIEWER_BASE_URL}/?setId=${setId}`,
    };

    if (wantBreakdown) {
      response.colorBreakdown = {
        totalUniqueColors: colorBreakdown.length,
        totalColorSlots: allColorEntries.length,
        byColor: colorBreakdown.sort((a, b) =>
          a.hex.localeCompare(b.hex, "en", { sensitivity: "base" })
        ),
        byDesign: (designs || []).map((d, i) => {
          const palette = d?.designData?.customPalette ?? [];
          return {
            index: i,
            label: d?.label ?? `Design ${i + 1}`,
            colorCount: Array.isArray(palette) ? palette.length : 0,
            colors: Array.isArray(palette)
              ? palette.map((c: { hex?: string; name?: string | null }) => ({
                  hex: c?.hex ?? "",
                  name: c?.name ?? null,
                }))
              : [],
          };
        }),
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error retrieving shared design set:", error);
    return NextResponse.json(
      { error: "Failed to retrieve shared design set" },
      { status: 500 }
    );
  }
}
