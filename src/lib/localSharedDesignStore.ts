import { nanoid } from "nanoid";

export const LOCAL_SHARED_DESIGN_CONFIG = {
  shareIdLength: 12,
  initialAccessCount: 0,
  accessIncrement: 1,
} as const;

export interface LocalSharedDesign {
  shareId: string;
  designData: unknown;
  userId: string | null;
  email: string | null;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

interface CreateLocalSharedDesignInput {
  designData: unknown;
  userId?: string;
  email?: string;
}

interface LocalSharedDesignStoreOptions {
  createId?: () => string;
  now?: () => Date;
}

export const createLocalSharedDesignStore = (
  options: LocalSharedDesignStoreOptions = {},
) => {
  const designs = new Map<string, LocalSharedDesign>();
  const createId =
    options.createId ??
    (() => nanoid(LOCAL_SHARED_DESIGN_CONFIG.shareIdLength));
  const now = options.now ?? (() => new Date());

  return {
    create(input: CreateLocalSharedDesignInput): LocalSharedDesign {
      const shareId = createId();
      const createdAt = now();
      const design: LocalSharedDesign = {
        shareId,
        designData: input.designData,
        userId: input.userId || null,
        email: input.email || null,
        createdAt,
        lastAccessed: createdAt,
        accessCount: LOCAL_SHARED_DESIGN_CONFIG.initialAccessCount,
      };
      designs.set(shareId, design);
      return design;
    },

    get(shareId: string, isPoll: boolean): LocalSharedDesign | null {
      const design = designs.get(shareId);
      if (!design) return null;
      if (!isPoll) {
        design.accessCount += LOCAL_SHARED_DESIGN_CONFIG.accessIncrement;
        design.lastAccessed = now();
      }
      return design;
    },
  };
};

export type LocalSharedDesignStore = ReturnType<
  typeof createLocalSharedDesignStore
>;

declare global {
  var everwoodLocalSharedDesignStore: LocalSharedDesignStore | undefined;
}

export const localSharedDesignStore =
  globalThis.everwoodLocalSharedDesignStore ?? createLocalSharedDesignStore();

if (process.env.NODE_ENV !== "production") {
  globalThis.everwoodLocalSharedDesignStore = localSharedDesignStore;
}
