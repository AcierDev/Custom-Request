import { nanoid } from "nanoid";

// In-memory shared design sets for local dev without MONGODB_URI (mirrors
// localSharedDesignStore). Lost on server restart.
export const LOCAL_SHARED_DESIGN_SET_CONFIG = {
  setIdLength: 12,
  initialAccessCount: 0,
} as const;

export interface LocalSharedDesignSet {
  setId: string;
  designs: { designData: Record<string, unknown>; label: string | null }[];
  userId: string | null;
  email: string | null;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

const createLocalSharedDesignSetStore = () => {
  const sets = new Map<string, LocalSharedDesignSet>();
  return {
    create(input: {
      designs: LocalSharedDesignSet["designs"];
      userId?: string | null;
      email?: string | null;
    }): LocalSharedDesignSet {
      const now = new Date();
      const set: LocalSharedDesignSet = {
        setId: nanoid(LOCAL_SHARED_DESIGN_SET_CONFIG.setIdLength),
        designs: input.designs,
        userId: input.userId || null,
        email: input.email || null,
        createdAt: now,
        lastAccessed: now,
        accessCount: LOCAL_SHARED_DESIGN_SET_CONFIG.initialAccessCount,
      };
      sets.set(set.setId, set);
      return set;
    },
    get(setId: string): LocalSharedDesignSet | null {
      return sets.get(setId) ?? null;
    },
    list(limit: number): LocalSharedDesignSet[] {
      return [...sets.values()]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    },
  };
};

type LocalSharedDesignSetStore = ReturnType<typeof createLocalSharedDesignSetStore>;

declare global {
  var everwoodLocalSharedDesignSetStore: LocalSharedDesignSetStore | undefined;
}

export const localSharedDesignSetStore =
  globalThis.everwoodLocalSharedDesignSetStore ?? createLocalSharedDesignSetStore();

if (process.env.NODE_ENV !== "production") {
  globalThis.everwoodLocalSharedDesignSetStore = localSharedDesignSetStore;
}

export const USE_LOCAL_SHARED_STORES =
  process.env.NODE_ENV !== "production" && !process.env.MONGODB_URI;
