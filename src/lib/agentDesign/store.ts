// Persistence for the agent design API: new shared designs / sets (same
// records POST /api/shared-designs and /api/shared-design-sets create) and
// the agentDesigns layout record the screenshot route renders from.
// Every write inserts a NEW record; nothing existing is updated except an
// append-only $push into the configured user's savedPalettes.
import { nanoid } from "nanoid";
import { getCollection } from "@/lib/mongodb";
import { appUrl } from "@/lib/appPaths";
import {
  LOCAL_SHARED_DESIGN_CONFIG,
  localSharedDesignStore,
} from "@/lib/localSharedDesignStore";
import {
  LOCAL_SHARED_DESIGN_SET_CONFIG,
  USE_LOCAL_SHARED_STORES,
  localSharedDesignSetStore,
} from "@/lib/localSharedDesignSetStore";
import type { ColorGrid, ResolvedSpec } from "./spec";

export const AGENT_STORE_CONFIG = {
  sharedDesignsCollection: "sharedDesigns",
  sharedDesignSetsCollection: "sharedDesignSets",
  agentDesignsCollection: "agentDesigns",
  userDataCollection: "userData",
  agentDesignIdLength: 16,
  savedPaletteIdLength: 21,
  setViewerBaseUrl: "http://viewer.everwoodus.com",
} as const;

export interface AgentDesignRecord {
  agentDesignId: string;
  createdAt: Date;
  spec: ResolvedSpec;
  grids: Record<string, ColorGrid>;
  inputSpec: unknown;
  panelShareIds: Record<string, string>;
  combinedShareId: string | null;
  setId: string | null;
}

declare global {
  var everwoodLocalAgentDesigns: Map<string, AgentDesignRecord> | undefined;
}

const localAgentDesigns: Map<string, AgentDesignRecord> =
  globalThis.everwoodLocalAgentDesigns ?? new Map();
if (process.env.NODE_ENV !== "production") {
  globalThis.everwoodLocalAgentDesigns = localAgentDesigns;
}

export const usesLocalStores = (): boolean => USE_LOCAL_SHARED_STORES;

export async function insertSharedDesign(
  designData: Record<string, unknown>,
  origin: string,
): Promise<{ shareId: string; shareUrl: string }> {
  let shareId: string;
  if (USE_LOCAL_SHARED_STORES) {
    shareId = localSharedDesignStore.create({ designData }).shareId;
  } else {
    const collection = await getCollection(AGENT_STORE_CONFIG.sharedDesignsCollection);
    shareId = nanoid(LOCAL_SHARED_DESIGN_CONFIG.shareIdLength);
    const now = new Date();
    await collection.insertOne({
      shareId,
      designData,
      userId: null,
      email: null,
      createdAt: now,
      lastAccessed: now,
      accessCount: 0,
    });
  }
  return {
    shareId,
    shareUrl: appUrl(`/shared/${shareId}`, USE_LOCAL_SHARED_STORES ? origin : undefined),
  };
}

export async function insertSharedDesignSet(
  designs: { designData: Record<string, unknown>; label: string }[],
  origin: string,
): Promise<{ setId: string; setUrl: string; breakdownUrl: string }> {
  let setId: string;
  if (USE_LOCAL_SHARED_STORES) {
    setId = localSharedDesignSetStore.create({ designs }).setId;
  } else {
    const collection = await getCollection(AGENT_STORE_CONFIG.sharedDesignSetsCollection);
    setId = nanoid(LOCAL_SHARED_DESIGN_SET_CONFIG.setIdLength);
    const now = new Date();
    await collection.insertOne({
      setId,
      designs,
      userId: null,
      email: null,
      createdAt: now,
      lastAccessed: now,
      accessCount: 0,
    });
  }
  return {
    setId,
    setUrl: `${AGENT_STORE_CONFIG.setViewerBaseUrl}/?setId=${setId}`,
    breakdownUrl: appUrl(`/shared-set/${setId}/breakdown`, USE_LOCAL_SHARED_STORES ? origin : undefined),
  };
}

export const newAgentDesignId = (): string => nanoid(AGENT_STORE_CONFIG.agentDesignIdLength);

export async function insertAgentDesign(record: AgentDesignRecord): Promise<void> {
  if (USE_LOCAL_SHARED_STORES) {
    localAgentDesigns.set(record.agentDesignId, record);
    return;
  }
  const collection = await getCollection(AGENT_STORE_CONFIG.agentDesignsCollection);
  await collection.insertOne({ ...record });
  await collection.createIndexes([{ key: { agentDesignId: 1 }, unique: true }]);
}

export async function getAgentDesign(agentDesignId: string): Promise<AgentDesignRecord | null> {
  if (USE_LOCAL_SHARED_STORES) return localAgentDesigns.get(agentDesignId) ?? null;
  const collection = await getCollection(AGENT_STORE_CONFIG.agentDesignsCollection);
  const doc = await collection.findOne({ agentDesignId });
  return (doc as unknown as AgentDesignRecord) ?? null;
}

export type SavedPaletteResult =
  | { saved: true; userId: string; paletteId: string; name: string; colorCount: number }
  | { saved: false; reason: string };

/** Append a NEW SavedPalette to AGENT_USER_ID's savedPalettes (never overwrites). */
export async function appendSavedPalette(spec: ResolvedSpec): Promise<SavedPaletteResult | null> {
  if (!spec.savePalette) return null;
  const userId = process.env.AGENT_USER_ID;
  if (!userId) return { saved: false, reason: "AGENT_USER_ID is not set on the server" };
  if (USE_LOCAL_SHARED_STORES) {
    return { saved: false, reason: "no MONGODB_URI; user data is not available in local dev" };
  }
  const collection = await getCollection(AGENT_STORE_CONFIG.userDataCollection);
  const now = new Date().toISOString();
  const paletteId = nanoid(AGENT_STORE_CONFIG.savedPaletteIdLength);
  const palette = {
    id: paletteId,
    name: spec.savePalette.name,
    colors: spec.colors.map((c) => ({ id: nanoid(), hex: c.hex, ...(c.name ? { name: c.name } : {}) })),
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection.updateOne(
    { userId },
    { $push: { "storeData.savedPalettes": palette } as never, $set: { lastUpdated: new Date() } },
  );
  if (result.matchedCount === 0) {
    return { saved: false, reason: `no userData document for AGENT_USER_ID` };
  }
  return { saved: true, userId, paletteId, name: palette.name, colorCount: palette.colors.length };
}
