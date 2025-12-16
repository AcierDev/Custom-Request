import { create } from "zustand";
import { ItemDesigns, Dimensions } from "@/typings/types";
import { calculatePrice, PriceBreakdown } from "@/lib/pricing";
import { mixPaintColors } from "@/lib/colorUtils";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { createStore } from "zustand/vanilla";
import { createWithEqualityFn } from "zustand/traditional";
import {
  generateShareableUrl,
  extractStateFromUrl,
  generateShortShareableUrl,
  extractStateFromShortUrl,
} from "@/lib/urlUtils";
import { subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import { nanoid } from "nanoid";

// Add debounce utility function
const debounce = (fn: Function, ms = 1000) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

export type ShippingSpeed = "standard" | "expedited" | "rushed";
export type ColorPattern =
  | "striped"
  | "gradient"
  | "checkerboard"
  | "random"
  | "fade"
  | "center-fade";

type Orientation = "horizontal" | "vertical";

export type ColorInfo = {
  hex: string;
  name: string;
};

export type ColorMap = Record<string, ColorInfo>;

export type CustomColor = {
  id: string;
  hex: string;
  name?: string;
};

// Add a new type for custom modes
export type CustomMode = "palette" | "pattern";

export interface SavedPalette {
  id: string;
  name: string;
  colors: CustomColor[];
  createdAt: string;
  updatedAt?: string;
  folderId?: string;
  isPublic?: boolean;
}

export type SavedDesign = {
  id: string;
  name: string;
  dimensions: Dimensions;
  selectedDesign: ItemDesigns;
  shippingSpeed: ShippingSpeed;
  colorPattern: ColorPattern;
  orientation: Orientation;
  isReversed: boolean;
  customPalette: CustomColor[];
  isRotated: boolean;
  style: StyleType;
  useMini: boolean;
  createdAt: string;
  updatedAt?: string;
  folderId?: string;
};

export type Folder = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
};

export type PatternType = "tiled" | "geometric";

export type StyleType = "geometric" | "tiled" | "striped";

// Add new types for hover state
export interface HoverInfo {
  position: [number, number];
  color: string;
  colorName?: string;
}

// Add PatternCell type definition here for the store
// This avoids needing to import it from the page component
export type PatternCell = {
  color: string | null;
  colorName?: string;
};

interface CustomState {
  dimensions: Dimensions;
  selectedDesign: ItemDesigns;
  shippingSpeed: ShippingSpeed;
  pricing: PriceBreakdown;
  colorPattern: ColorPattern;
  orientation: Orientation;
  currentColors: ColorMap | null;
  customPalette: CustomColor[];
  selectedColors: string[];
  isRotated: boolean;
  style: StyleType;
  useMini: boolean;
  isReversed: boolean;
  savedPalettes: SavedPalette[];
  savedDesigns: SavedDesign[];
  paletteFolders: Folder[];
  designFolders: Folder[];
  folders: Folder[];
  activeTab: "create" | "saved" | "official" | "extract";
  editingPaletteId: string | null;
  editingDesignId: string | null;
  viewSettings: {
    showRuler: boolean;
    showWoodGrain: boolean;
    showColorInfo: boolean;
    showHanger: boolean;
    showSplitPanel: boolean;
    showFPS: boolean;
    showUIControls: boolean;
  };
  lastSaved: number;
  autoSaveEnabled: boolean;
  dataSyncVersion: number;

  // State for directly drawn patterns
  drawnPatternGrid: PatternCell[][] | null;
  drawnPatternGridSize: { width: number; height: number } | null;

  // New property to track which custom mode is active
  activeCustomMode: CustomMode;

  // Pattern override functionality for individual block editing
  patternOverride: Record<string, number>;
  patternEditingMode: {
    selectedColorIndex: number;
    isErasing: boolean;
  };
  isPatternEditorActive: boolean;

  paletteHistory: Array<Array<CustomColor>>;
  paletteHistoryIndex: number;
  draftSet: DraftSetItem[];
}

interface CustomStore extends CustomState {
  setDimensions: (dimensions: Dimensions) => void;
  setSelectedDesign: (design: ItemDesigns) => void;
  previousDesign: () => void;
  nextDesign: () => void;
  setShippingSpeed: (speed: ShippingSpeed) => void;
  setColorPattern: (pattern: ColorPattern) => void;
  setOrientation: (orientation: Orientation) => void;
  isReversed: boolean;
  setIsReversed: (value: boolean) => void;
  updateCurrentColors: (design: ItemDesigns) => void;
  addCustomColor: (hex: string) => void;
  removeCustomColor: (index: number) => void;
  duplicateCustomColor: (index: number) => void;
  toggleColorSelection: (hex: string) => void;
  clearSelectedColors: () => void;
  addBlendedColors: (count: number) => void;
  moveColorLeft: (index: number) => void;
  moveColorRight: (index: number) => void;
  reorderPalette: (newOrder: CustomColor[]) => void;
  commitPaletteToHistory: () => void;
  setIsRotated: (value: boolean) => void;
  setStyle: (style: StyleType) => void;
  setUseMini: (value: boolean) => void;
  setShowRuler: (value: boolean) => void;
  setShowWoodGrain: (value: boolean) => void;
  setShowColorInfo: (value: boolean) => void;
  setShowHanger: (value: boolean) => void;
  setShowSplitPanel: (value: boolean) => void;
  setShowFPS: (value: boolean) => void;
  setShowUIControls: (value: boolean) => void;
  savePalette: (name: string, folderId?: string) => void;
  updatePalette: (id: string, updates: Partial<SavedPalette>) => void;
  deletePalette: (id: string) => void;
  applyPalette: (paletteId: string) => void;
  loadPaletteForEditing: (paletteId: string) => void;
  saveDesign: (name: string, folderId?: string) => void;
  updateDesign: (id: string, updates: Partial<SavedDesign>) => void;
  deleteDesign: (id: string) => void;
  applyDesign: (designId: string) => void;
  loadDesignForEditing: (designId: string) => void;
  setActiveTab: (tab: "create" | "saved" | "official" | "extract") => void;
  updateColorName: (index: number, name: string) => void;
  updateColorHex: (index: number, hex: string) => void;
  resetPaletteEditor: () => void;
  resetDesignEditor: () => void;
  loadOfficialPalette: (design: ItemDesigns) => void;
  setCustomPalette: (palette: CustomColor[]) => void;
  generateShareableLink: () => string;
  generateShortShareableLink: () => string;
  getShareableStateSnapshot: () => ShareableState;
  getShareableDesignData: () => {
    dimensions: Dimensions;
    selectedDesign: ItemDesigns;
    colorPattern: ColorPattern;
    orientation: Orientation;
    isReversed: boolean;
    customPalette: Array<{ hex: string; name?: string }>;
    isRotated: boolean;
    useMini: boolean;
  };
  createSharedDesign: (
    userId?: string,
    email?: string
  ) => Promise<{
    success: boolean;
    shareId?: string;
    shareUrl?: string;
    error?: string;
  }>;
  createSharedDesignSet: (
    designs: Array<{ label?: string | null; designData: ShareableState }>,
    userId?: string,
    email?: string
  ) => Promise<
    | { success: true; setId: string; setUrl: string }
    | { success: false; error: string }
  >;
  createSharedDesignSetFromPalettes: (
    paletteIds: string[],
    userId?: string,
    email?: string
  ) => Promise<
    | { success: true; setId: string; setUrl: string }
    | { success: false; error: string }
  >;
  loadFromShareableData: (data: string) => boolean;
  loadFromDatabaseData: (designData: ShareableState) => boolean;
  saveToDatabase: () => Promise<boolean>;
  loadFromDatabase: () => Promise<boolean>;
  syncWithDatabase: (autoSave?: boolean) => (() => void) | void;
  setAutoSaveEnabled: (enabled: boolean) => void;
  saveToLocalStorage: () => boolean;
  createDraftOrder: () => Promise<{
    success: boolean;
    checkoutUrl?: string;
    error?: string;
    draftOrder?: any;
  }>;
  createPaletteFolder: (name: string) => string;
  updatePaletteFolder: (id: string, updates: Partial<Folder>) => void;
  deletePaletteFolder: (id: string) => void;
  movePaletteToFolder: (paletteId: string, folderId: string | null) => void;
  createDesignFolder: (name: string) => string;
  updateDesignFolder: (id: string, updates: Partial<Folder>) => void;
  deleteDesignFolder: (id: string) => void;
  moveDesignToFolder: (designId: string, folderId: string | null) => void;
  init: () => void;
  togglePalettePublic: (id: string) => void;

  // New action to set the active custom mode
  setActiveCustomMode: (mode: CustomMode) => void;

  // Draft Set Actions
  addToDraftSet: (item: { label?: string; designData: ShareableState }) => void;
  removeFromDraftSet: (id: string) => void;
  clearDraftSet: () => void;
  updateDraftSetItemLabel: (id: string, label: string) => void;

  setPatternOverride: (overrides: Record<string, number>) => void;
  clearPatternOverride: () => void;
  setPatternEditingMode: (mode: {
    selectedColorIndex: number;
    isErasing: boolean;
  }) => void;
  setIsPatternEditorActive: (active: boolean) => void;

  // Action for setting a directly drawn pattern
  setDrawnPattern: (
    grid: PatternCell[][],
    size: { width: number; height: number },
    keepCustomPalette?: boolean
  ) => void;

  // Action for clearing a drawn pattern
  clearDrawnPattern: (keepCustomPalette?: boolean) => void;

  undoPaletteAction: () => boolean;
  redoPaletteAction: () => boolean;
}

interface HoverState {
  hoverInfo: HoverInfo | null;
  pinnedInfo: HoverInfo | null;
  setHoverInfo: (info: HoverInfo | null) => void;
  setPinnedInfo: (info: HoverInfo | null) => void;
}

// Create a separate vanilla store for hover state
export const hoverStore = createStore<HoverState>((set) => ({
  hoverInfo: null,
  pinnedInfo: null,
  setHoverInfo: (info) => set({ hoverInfo: info }),
  setPinnedInfo: (info) => set({ pinnedInfo: info }),
}));

// Helper function to create a ColorMap from CustomColor array
const createColorMap = (colors: CustomColor[]): ColorMap => {
  return Object.fromEntries(
    colors.map((color, i) => [
      i.toString(),
      { hex: color.hex, name: `Color ${i + 1}` },
    ])
  );
};

const normalizeSavedPaletteToCustomColors = (
  palette: SavedPalette
): CustomColor[] =>
  palette.colors.map((c) => ({
    id: nanoid(),
    hex: c.hex,
    name: c.name ?? "",
  }));

const buildShareableStateForPalette = (
  base: ShareableState,
  palette: SavedPalette,
  overrides?: Partial<ShareableState>
): ShareableState => {
  const next: ShareableState = { ...base, ...(overrides ?? {}) };
  if (!overrides?.customPalette) {
    next.customPalette = normalizeSavedPaletteToCustomColors(palette);
  }
  return next;
};

// Define the shareable state interface - only include what's needed for sharing
export interface ShareableState {
  dimensions: Dimensions;
  selectedDesign: ItemDesigns;
  shippingSpeed: ShippingSpeed;
  colorPattern: ColorPattern;
  orientation: Orientation;
  isReversed: boolean;
  customPalette: CustomColor[];
  isRotated: boolean;
  style: StyleType;
  useMini: boolean;
  activeCustomMode: CustomMode;
}

export type DraftSetItem = {
  id: string;
  label: string;
  designData: ShareableState;
  createdAt: number;
};

// Define what we want to persist in the database
interface PersistentState extends ShareableState {
  savedPalettes: SavedPalette[];
  savedDesigns: SavedDesign[];
  paletteFolders: Folder[];
  designFolders: Folder[];
  useMini: boolean;
  viewSettings: {
    showRuler: boolean;
    showWoodGrain: boolean;
    showColorInfo: boolean;
    showHanger: boolean;
    showSplitPanel: boolean;
    showFPS: boolean;
    showUIControls: boolean;
  };
  dataSyncVersion?: number;
  draftSet?: DraftSetItem[];
}

// List of state properties that should trigger an auto-save when changed
const AUTO_SAVE_TRACKED_PROPERTIES: (keyof CustomState)[] = [
  "dimensions",
  "selectedDesign",
  "shippingSpeed",
  "colorPattern",
  "orientation",
  "isReversed",
  "customPalette",
  "isRotated",
  "style",
  "savedPalettes",
  "savedDesigns",
  "paletteFolders",
  "designFolders",
  "viewSettings",
  "paletteHistory",
  "paletteHistoryIndex",
  "activeCustomMode",
  "draftSet",
];

// Create the store with the subscribeWithSelector middleware
export const useCustomStore = create<CustomStore>()(
  subscribeWithSelector((set, get) => ({
    dimensions: { width: 24, height: 12 },
    selectedDesign: ItemDesigns.Coastal,
    shippingSpeed: "standard",
    pricing: {
      basePrice: 0,
      shipping: { base: 0, additionalHeight: 0, expedited: 0, total: 0 },
      tax: 0,
      total: 0,
      customFee: 0,
      debug: {
        dimensions: { height: 0, width: 0 },
        blocks: { height: 0, width: 0, total: 0 },
      },
    },
    colorPattern: "fade",
    orientation: "horizontal",
    currentColors: null,
    customPalette: [],
    selectedColors: [],
    isRotated: false,
    style: "geometric",
    useMini: false,
    isReversed: false,
    savedPalettes: [],
    savedDesigns: [],
    folders: [],
    paletteFolders: [],
    designFolders: [],
    activeTab: "create",
    editingPaletteId: null,
    editingDesignId: null,
    viewSettings: {
      showRuler: true,
      showWoodGrain: true,
      showColorInfo: false,
      showHanger: true,
      showSplitPanel: false,
      showFPS: false,
      showUIControls: true,
    },
    lastSaved: 0,
    autoSaveEnabled: true,
    dataSyncVersion: 1,
    drawnPatternGrid: null,
    drawnPatternGridSize: null,
    paletteHistory: [],
    paletteHistoryIndex: -1,
    activeCustomMode: "palette",
    draftSet: [],
    patternOverride: {},
    patternEditingMode: {
      selectedColorIndex: -1,
      isErasing: false,
    },
    isPatternEditorActive: false,
    init: () => {
      if (typeof window !== "undefined") {
        const localState = localStorage.getItem("everwood-custom-design");
        if (localState) {
          try {
            const parsedState = JSON.parse(localState);

            // Migration: Ensure all colors have IDs
            if (parsedState.customPalette) {
              parsedState.customPalette = parsedState.customPalette.map(
                (c: any) => ({
                  ...c,
                  id: c.id || nanoid(),
                })
              );
            }

            if (parsedState.savedPalettes) {
              parsedState.savedPalettes = parsedState.savedPalettes.map(
                (p: any) => ({
                  ...p,
                  colors: p.colors.map((c: any) => ({
                    ...c,
                    id: c.id || nanoid(),
                  })),
                })
              );
            }

            if (parsedState.savedDesigns) {
              parsedState.savedDesigns = parsedState.savedDesigns.map(
                (d: any) => ({
                  ...d,
                  customPalette: d.customPalette.map((c: any) => ({
                    ...c,
                    id: c.id || nanoid(),
                  })),
                })
              );
            }

            if (parsedState.draftSet) {
              parsedState.draftSet = parsedState.draftSet.map((item: any) => ({
                ...item,
                designData: {
                  ...item.designData,
                  customPalette: item.designData.customPalette.map(
                    (c: any) => ({
                      ...c,
                      id: c.id || nanoid(),
                    })
                  ),
                },
              }));
            }

            set(parsedState);

            // Determine initial active tab based on conditions
            const savedPalettes = parsedState.savedPalettes || [];
            const customPalette = parsedState.customPalette || [];
            let initialTab: "create" | "saved" | "official" | "extract" =
              "official";

            if (customPalette.length > 0) {
              initialTab = "create";
            } else if (savedPalettes.length > 0) {
              initialTab = "saved";
            }

            set({ activeTab: initialTab });

            if (
              parsedState.folders &&
              parsedState.folders.length > 0 &&
              (!parsedState.paletteFolders ||
                parsedState.paletteFolders.length === 0) &&
              (!parsedState.designFolders ||
                parsedState.designFolders.length === 0)
            ) {
              const paletteFolderIds = new Set<string>();
              const designFolderIds = new Set<string>();

              if (parsedState.savedPalettes) {
                parsedState.savedPalettes.forEach((palette: SavedPalette) => {
                  if (palette.folderId) {
                    paletteFolderIds.add(palette.folderId);
                  }
                });
              }

              if (parsedState.savedDesigns) {
                parsedState.savedDesigns.forEach((design: SavedDesign) => {
                  if (design.folderId) {
                    designFolderIds.add(design.folderId);
                  }
                });
              }

              const paletteFolders = parsedState.folders.filter(
                (folder: Folder) => paletteFolderIds.has(folder.id)
              );

              const designFolders = parsedState.folders.filter(
                (folder: Folder) => designFolderIds.has(folder.id)
              );

              const unassignedFolders = parsedState.folders.filter(
                (folder: Folder) =>
                  !paletteFolderIds.has(folder.id) &&
                  !designFolderIds.has(folder.id)
              );

              set({
                paletteFolders: [...paletteFolders, ...unassignedFolders],
                designFolders,
              });

              console.log(
                `Migrated ${paletteFolders.length} palette folders and ${designFolders.length} design folders from ${parsedState.folders.length} total folders.`
              );
            }

            console.log("Loaded state from local storage");
          } catch (e) {
            console.error("Failed to parse local storage state", e);
          }
        }
      }
    },
    setDimensions: (dimensions) => {
      set({ dimensions });
      set((state) => ({
        pricing: calculatePrice(dimensions, state.shippingSpeed),
      }));
    },
    setUseMini: (value: boolean) => set({ useMini: value }),
    setSelectedDesign: (design: ItemDesigns) => {
      const designName = design;
      set((state) => ({
        selectedDesign: design,
        currentColors:
          design === ItemDesigns.Custom && state.customPalette.length > 0
            ? createColorMap(state.customPalette)
            : DESIGN_COLORS[design],
      }));
    },
    previousDesign: () => {
      const designKeys = Object.values(ItemDesigns);
      const currentDesign = get().selectedDesign;
      const currentIndex = designKeys.indexOf(currentDesign);
      const prevIndex =
        (currentIndex - 1 + designKeys.length) % designKeys.length;
      get().setSelectedDesign(designKeys[prevIndex]);
    },
    nextDesign: () => {
      const designKeys = Object.values(ItemDesigns);
      const currentDesign = get().selectedDesign;
      const currentIndex = designKeys.indexOf(currentDesign);
      const nextIndex = (currentIndex + 1) % designKeys.length;
      get().setSelectedDesign(designKeys[nextIndex]);
    },
    setShippingSpeed: (speed) =>
      set((state) => ({
        shippingSpeed: speed,
        pricing: calculatePrice(state.dimensions, speed),
      })),
    setColorPattern: (pattern) => set({ colorPattern: pattern }),
    setOrientation: (orientation) => set({ orientation }),
    setIsReversed: (value) => set({ isReversed: value }),
    updateCurrentColors: (design: ItemDesigns) => {
      set({ currentColors: DESIGN_COLORS[design] });
    },
    addCustomColor: (hex) =>
      set((state) => {
        const newPalette = [
          ...state.customPalette,
          { id: nanoid(), hex, name: "" },
        ];

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(newPalette);

        return {
          customPalette: newPalette,
          currentColors: createColorMap(newPalette),
          selectedDesign: ItemDesigns.Custom,
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    removeCustomColor: (index) =>
      set((state) => {
        const removedColorId = state.customPalette[index].id;
        const newPalette = state.customPalette.filter((_, i) => i !== index);

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(newPalette);

        return {
          customPalette: newPalette,
          selectedColors: state.selectedColors.filter(
            (id) => id !== removedColorId
          ),
          currentColors:
            newPalette.length > 0
              ? createColorMap(newPalette)
              : DESIGN_COLORS[ItemDesigns.Custom],
          selectedDesign: ItemDesigns.Custom,
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    duplicateCustomColor: (index) =>
      set((state) => {
        // Bounds checking
        if (index < 0 || index >= state.customPalette.length) return state;

        const newPalette = [...state.customPalette];
        const newColor = { ...newPalette[index], id: nanoid() };
        newPalette.splice(index + 1, 0, newColor);

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(newPalette);

        return {
          customPalette: newPalette,
          currentColors: createColorMap(newPalette),
          selectedDesign: ItemDesigns.Custom,
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    toggleColorSelection: (id) =>
      set((state) => {
        if (state.selectedColors.includes(id)) {
          return {
            selectedColors: state.selectedColors.filter((i) => i !== id),
          };
        } else if (state.selectedColors.length < 2) {
          return {
            selectedColors: [...state.selectedColors, id],
          };
        } else {
          console.log(
            "Already have 2 colors selected, replacing the first one"
          );
          return {
            selectedColors: [id, state.selectedColors[1]],
          };
        }
      }),
    clearSelectedColors: () =>
      set({
        selectedColors: [],
      }),
    addBlendedColors: (count) =>
      set((state) => {
        if (state.selectedColors.length !== 2) return state;

        const indices = state.selectedColors.map((id) =>
          state.customPalette.findIndex((color) => color.id === id)
        );

        const [startIndex, endIndex] = indices.sort((a, b) => a - b);

        const color1 = state.customPalette[startIndex].hex;
        const color2 = state.customPalette[endIndex].hex;

        const blendedColors: CustomColor[] = [];

        for (let i = 1; i <= count; i++) {
          const ratio = i / (count + 1);
          const blendedHex = mixPaintColors([
            color1,
            ...Array(Math.floor(ratio * 100)).fill(color2),
            ...Array(Math.floor((1 - ratio) * 100)).fill(color1),
          ]);

          blendedColors.push({ id: nanoid(), hex: blendedHex });
        }

        const newPalette = [...state.customPalette];
        newPalette.splice(startIndex + 1, 0, ...blendedColors);

        return {
          customPalette: newPalette,
          selectedColors: [],
          currentColors: createColorMap(newPalette),
        };
      }),
    moveColorLeft: (index) =>
      set((state) => {
        if (index <= 0 || index >= state.customPalette.length) return state;

        const newPalette = [...state.customPalette];
        const temp = newPalette[index];
        newPalette[index] = newPalette[index - 1];
        newPalette[index - 1] = temp;

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(newPalette);

        return {
          customPalette: newPalette,
          currentColors: createColorMap(newPalette),
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    moveColorRight: (index) =>
      set((state) => {
        if (index < 0 || index >= state.customPalette.length - 1) return state;

        const newPalette = [...state.customPalette];
        const temp = newPalette[index];
        newPalette[index] = newPalette[index + 1];
        newPalette[index + 1] = temp;

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(newPalette);

        return {
          customPalette: newPalette,
          currentColors: createColorMap(newPalette),
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    reorderPalette: (newOrder) =>
      set((state) => {
        return {
          customPalette: newOrder,
          currentColors: createColorMap(newOrder),
        };
      }),
    commitPaletteToHistory: () =>
      set((state) => {
        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push([...state.customPalette]);

        return {
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    setIsRotated: (value) => set({ isRotated: value }),
    setStyle: (style) => set({ style }),
    setShowRuler: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, showRuler: value },
      })),
    setShowWoodGrain: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, showWoodGrain: value },
      })),
    setShowColorInfo: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, showColorInfo: value },
      })),
    setShowHanger: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, showHanger: value },
      })),
    setShowSplitPanel: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, showSplitPanel: value },
      })),
    setShowFPS: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, showFPS: value },
      })),
    setShowUIControls: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, showUIControls: value },
      })),
    savePalette: (name: string, folderId?: string) => {
      const { customPalette } = get();
      if (customPalette.length === 0) {
        return;
      }

      const paletteId = Date.now().toString();
      const newPalette: SavedPalette = {
        id: paletteId,
        name,
        colors: [...customPalette],
        createdAt: new Date().toISOString(),
        folderId,
      };

      const editingId = get().editingPaletteId;
      if (editingId) {
        set((state) => ({
          savedPalettes: state.savedPalettes.map((palette) =>
            palette.id === editingId
              ? {
                  ...palette,
                  name,
                  colors: [...customPalette],
                  updatedAt: new Date().toISOString(),
                  folderId,
                }
              : palette
          ),
          editingPaletteId: null,
          lastSaved: Date.now(),
        }));
      } else {
        set((state) => ({
          savedPalettes: [...state.savedPalettes, newPalette],
          editingPaletteId: null,
          lastSaved: Date.now(),
        }));
      }
    },
    updatePalette: (id, updates) =>
      set((state) => ({
        savedPalettes: state.savedPalettes.map((palette) =>
          palette.id === id
            ? {
                ...palette,
                ...updates,
                updatedAt: new Date().toISOString(),
              }
            : palette
        ),
      })),
    deletePalette: (id) =>
      set((state) => ({
        savedPalettes: state.savedPalettes.filter(
          (palette) => palette.id !== id
        ),
      })),
    applyPalette: (paletteId) =>
      set((state) => {
        const palette = state.savedPalettes.find((p) => p.id === paletteId);
        if (!palette) return state;

        return {
          customPalette: [...palette.colors],
          selectedDesign: ItemDesigns.Custom,
          currentColors: createColorMap(palette.colors),
        };
      }),
    loadPaletteForEditing: (paletteId) =>
      set((state) => {
        const palette = state.savedPalettes.find((p) => p.id === paletteId);
        if (!palette) return state;

        // Ensure all colors have IDs
        const colorsWithIds = palette.colors.map((c) => ({
          ...c,
          id: c.id || nanoid(),
        }));

        // Initialize history with the loaded palette
        const newHistory = [[...colorsWithIds]];

        return {
          customPalette: [...colorsWithIds],
          selectedDesign: ItemDesigns.Custom,
          currentColors: createColorMap(colorsWithIds),
          selectedColors: [],
          editingPaletteId: paletteId,
          paletteHistory: newHistory,
          paletteHistoryIndex: 0,
        };
      }),
    updateColorName: (index, name) =>
      set((state) => {
        if (index < 0 || index >= state.customPalette.length) return state;

        const newPalette = [...state.customPalette];
        newPalette[index] = { ...newPalette[index], name };

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(newPalette);

        return {
          customPalette: newPalette,
          currentColors: createColorMap(newPalette),
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    updateColorHex: (index, hex) =>
      set((state) => {
        if (
          index < 0 ||
          index >= state.customPalette.length ||
          !/^#[0-9A-Fa-f]{6}$/.test(hex)
        )
          return state;

        const newPalette = [...state.customPalette];
        newPalette[index] = { ...newPalette[index], hex };

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(newPalette);

        return {
          customPalette: newPalette,
          currentColors: createColorMap(newPalette),
          // selectedColors stores IDs, so no need to update it when hex changes
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    setActiveTab: (tab: "create" | "saved" | "official" | "extract") =>
      set({ activeTab: tab }),
    resetPaletteEditor: () =>
      set({
        customPalette: [],
        selectedColors: [],
        editingPaletteId: null,
        paletteHistory: [],
        paletteHistoryIndex: -1,
      }),
    loadOfficialPalette: (design: ItemDesigns) =>
      set((state) => {
        const designColors = DESIGN_COLORS[design];
        const customColors: CustomColor[] = Object.values(designColors).map(
          (color) => ({
            id: nanoid(),
            hex: color.hex,
            name: color.name,
          })
        );

        // Initialize history with the new palette
        const newHistory = [...state.paletteHistory, customColors];

        return {
          customPalette: customColors,
          selectedDesign: ItemDesigns.Custom,
          currentColors: createColorMap(customColors),
          selectedColors: [],
          activeTab: "create",
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    setCustomPalette: (palette: CustomColor[]) =>
      set((state) => {
        const paletteWithIds = palette.map((c) => ({
          ...c,
          id: c.id || nanoid(),
        }));

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(paletteWithIds);

        return {
          customPalette: paletteWithIds,
          currentColors: createColorMap(paletteWithIds),
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    generateShareableLink: () => {
      return generateShareableUrl(get().getShareableStateSnapshot());
    },
    generateShortShareableLink: () => {
      return generateShortShareableUrl(get().getShareableStateSnapshot());
    },
    getShareableStateSnapshot: () => {
      const state = get();
      return {
        dimensions: state.dimensions,
        selectedDesign: state.selectedDesign,
        shippingSpeed: state.shippingSpeed,
        colorPattern: state.colorPattern,
        orientation: state.orientation,
        isReversed: state.isReversed,
        customPalette: state.customPalette,
        isRotated: state.isRotated,
        style: state.style,
        useMini: state.useMini,
        activeCustomMode: state.activeCustomMode,
      };
    },
    getShareableDesignData: () => {
      const state = get();
      return {
        dimensions: state.dimensions,
        selectedDesign: state.selectedDesign,
        colorPattern: state.colorPattern,
        orientation: state.orientation,
        isReversed: state.isReversed,
        customPalette: state.customPalette.map((c) => ({
          hex: c.hex,
          name: c.name,
        })),
        isRotated: state.isRotated,
        useMini: state.useMini,
      };
    },
    createSharedDesign: async (userId?: string, email?: string) => {
      const shareableState = get().getShareableStateSnapshot();

      try {
        const response = await fetch("/api/shared-designs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            designData: shareableState,
            userId,
            email,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create shared design");
        }

        const result = await response.json();
        return {
          success: true,
          shareId: result.shareId,
          shareUrl: result.shareUrl,
        };
      } catch (error) {
        console.error("Error creating shared design:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    createSharedDesignSet: async (designs, userId, email) => {
      if (!Array.isArray(designs) || designs.length === 0) {
        return { success: false, error: "Add at least one design to share." };
      }

      try {
        const response = await fetch("/api/shared-design-sets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ designs, userId, email }),
        });

        if (!response.ok) {
          throw new Error("Failed to create shared design set");
        }

        const result: { setId: string; setUrl: string } = await response.json();
        return { success: true, setId: result.setId, setUrl: result.setUrl };
      } catch (error) {
        console.error("Error creating shared design set:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    createSharedDesignSetFromPalettes: async (
      paletteIds: string[],
      userId?: string,
      email?: string
    ) => {
      const state = get();
      const normalizedIds = paletteIds.filter(Boolean);

      if (normalizedIds.length === 0) {
        return { success: false, error: "Select at least one palette." };
      }

      const baseDesign = get().getShareableStateSnapshot();
      const palettes = normalizedIds
        .map((id) => state.savedPalettes.find((p) => p.id === id))
        .filter((p): p is SavedPalette => Boolean(p));

      if (palettes.length === 0) {
        return {
          success: false,
          error: "No matching palettes found. Please reselect and try again.",
        };
      }

      const designs = palettes.map((palette) => ({
        label: palette.name,
        designData: buildShareableStateForPalette(baseDesign, palette),
      }));

      return get().createSharedDesignSet(designs, userId, email);
    },
    loadFromShareableData: (data: string) => {
      try {
        let shareableState: ShareableState;

        if (data.includes("s=")) {
          const shortData = data.split("s=")[1];
          shareableState = extractStateFromShortUrl<ShareableState>(shortData);
        } else {
          const regularData = data.includes("share=")
            ? data.split("share=")[1]
            : data;
          shareableState = extractStateFromUrl<ShareableState>(regularData);
        }

        if (!shareableState.dimensions || !shareableState.selectedDesign) {
          return false;
        }

        // Ensure loaded palette has IDs
        const loadedPalette = shareableState.customPalette.map((c) => ({
          ...c,
          id: c.id || nanoid(),
        }));

        set({
          dimensions: shareableState.dimensions,
          selectedDesign: shareableState.selectedDesign,
          shippingSpeed: shareableState.shippingSpeed,
          colorPattern: shareableState.colorPattern,
          orientation: shareableState.orientation,
          isReversed: shareableState.isReversed,
          customPalette: loadedPalette,
          isRotated: shareableState.isRotated,
          style: shareableState.style,
          activeCustomMode: shareableState.activeCustomMode || "palette",
          currentColors:
            shareableState.selectedDesign === ItemDesigns.Custom &&
            loadedPalette.length > 0
              ? createColorMap(loadedPalette)
              : DESIGN_COLORS[shareableState.selectedDesign as ItemDesigns] ||
                get().currentColors,
          pricing: calculatePrice(
            shareableState.dimensions,
            shareableState.shippingSpeed
          ),
        });

        return true;
      } catch (error) {
        console.error("Failed to load shared data:", error);
        return false;
      }
    },
    loadFromDatabaseData: (designData: ShareableState) => {
      try {
        if (!designData.dimensions || !designData.selectedDesign) {
          return false;
        }

        // Ensure loaded palette has IDs
        const loadedPalette = designData.customPalette.map((c) => ({
          ...c,
          id: c.id || nanoid(),
        }));

        set({
          dimensions: designData.dimensions,
          selectedDesign: designData.selectedDesign,
          shippingSpeed: designData.shippingSpeed,
          colorPattern: designData.colorPattern,
          orientation: designData.orientation,
          isReversed: designData.isReversed,
          customPalette: loadedPalette,
          isRotated: designData.isRotated,
          style: designData.style,
          activeCustomMode: designData.activeCustomMode || "palette",
          currentColors:
            designData.selectedDesign === ItemDesigns.Custom &&
            loadedPalette.length > 0
              ? createColorMap(loadedPalette)
              : DESIGN_COLORS[designData.selectedDesign as ItemDesigns] ||
                get().currentColors,
          pricing: calculatePrice(
            designData.dimensions,
            designData.shippingSpeed
          ),
        });

        return true;
      } catch (error) {
        console.error("Failed to load database data:", error);
        return false;
      }
    },
    syncWithDatabase: (autoSave = true): (() => void) | void => {
      if (typeof window === "undefined") return;

      const authContext = (window as any).__authContext;
      const isAuthenticated = authContext?.user !== null;
      const isGuest = authContext?.isGuest === true;

      if (isAuthenticated) {
        get().loadFromDatabase();
      } else if (isGuest) {
        try {
          const savedState = localStorage.getItem("everwood_guest_data");
          if (savedState) {
            const data = JSON.parse(savedState) as PersistentState & {
              dataSyncVersion?: number;
            };

            const viewSettings = {
              showRuler: data.viewSettings?.showRuler ?? false,
              showWoodGrain: data.viewSettings?.showWoodGrain ?? true,
              showColorInfo: data.viewSettings?.showColorInfo ?? false,
              showHanger: data.viewSettings?.showHanger ?? true,
              showSplitPanel: data.viewSettings?.showSplitPanel ?? false,
              showFPS: data.viewSettings?.showFPS ?? false,
              showUIControls: data.viewSettings?.showUIControls ?? true,
            };

            const localVersion = get().dataSyncVersion;
            const storedVersion = data.dataSyncVersion || 0;

            if (storedVersion >= localVersion || get().lastSaved === 0) {
              set({
                ...data,
                viewSettings,
                paletteFolders: data.paletteFolders || [],
                designFolders: data.designFolders || [],
                currentColors:
                  data.customPalette && data.customPalette.length > 0
                    ? createColorMap(data.customPalette)
                    : DESIGN_COLORS[data.selectedDesign as ItemDesigns] ||
                      get().currentColors,
                pricing: calculatePrice(
                  data.dimensions || get().dimensions,
                  data.shippingSpeed || get().shippingSpeed
                ),
                dataSyncVersion: Math.max(storedVersion, localVersion),
                lastSaved: Date.now(),
              });

              console.log(
                `Loaded data from localStorage (version ${storedVersion})`
              );
            } else {
              console.log(
                `Local data (v${localVersion}) is newer than stored data (v${storedVersion}). Keeping local data.`
              );
            }
          }
        } catch (error) {
          console.error("Error loading from localStorage:", error);
        }
      }

      if (autoSave) {
        const saveInterval = setInterval(() => {
          if (!get().autoSaveEnabled) return;

          const authContext = (window as any).__authContext;
          const isAuthenticated = authContext?.user !== null;
          const isGuest = authContext?.isGuest === true;

          if (isAuthenticated) {
            get().saveToDatabase();
          } else if (isGuest) {
            get().saveToLocalStorage();
          }
        }, 30000);

        return () => clearInterval(saveInterval);
      }
    },
    saveToLocalStorage: (): boolean => {
      try {
        const currentVersion = get().dataSyncVersion;
        const newVersion = currentVersion + 1;

        const stateToSave: PersistentState & { dataSyncVersion: number } = {
          dimensions: get().dimensions,
          selectedDesign: get().selectedDesign,
          shippingSpeed: get().shippingSpeed,
          colorPattern: get().colorPattern,
          orientation: get().orientation,
          isReversed: get().isReversed,
          customPalette: get().customPalette,
          isRotated: get().isRotated,
          style: get().style,
          savedPalettes: get().savedPalettes,
          savedDesigns: get().savedDesigns,
          paletteFolders: get().paletteFolders,
          designFolders: get().designFolders,
          useMini: get().useMini,
          viewSettings: get().viewSettings,
          activeCustomMode: get().activeCustomMode,
          draftSet: get().draftSet,
          dataSyncVersion: newVersion,
        };

        localStorage.setItem(
          "everwood_guest_data",
          JSON.stringify(stateToSave)
        );

        set({
          lastSaved: Date.now(),
          dataSyncVersion: newVersion,
        });

        console.log(
          `Store data saved to local storage (version ${newVersion})`
        );
        return true;
      } catch (error) {
        console.error("Error saving data to local storage:", error);
        return false;
      }
    },
    saveToDatabase: async (): Promise<boolean> => {
      if (typeof window !== "undefined") {
        const authContext = (window as any).__authContext;
        const isAuthenticated = authContext?.user !== null;
        const isGuest = authContext?.isGuest === true;

        if (isGuest) {
          return get().saveToLocalStorage();
        }

        if (isAuthenticated) {
          try {
            const currentVersion = get().dataSyncVersion;
            const newVersion = currentVersion + 1;

            const stateToSave: PersistentState & { dataSyncVersion: number } = {
              dimensions: get().dimensions,
              selectedDesign: get().selectedDesign,
              shippingSpeed: get().shippingSpeed,
              colorPattern: get().colorPattern,
              orientation: get().orientation,
              isReversed: get().isReversed,
              customPalette: get().customPalette,
              isRotated: get().isRotated,
              style: get().style,
              savedPalettes: get().savedPalettes,
              savedDesigns: get().savedDesigns,
              paletteFolders: get().paletteFolders,
              designFolders: get().designFolders,
              useMini: get().useMini,
              viewSettings: get().viewSettings,
              activeCustomMode: get().activeCustomMode,
              dataSyncVersion: newVersion,
            };

            const hasNoLocalData =
              stateToSave.savedPalettes.length === 0 &&
              stateToSave.savedDesigns.length === 0 &&
              stateToSave.paletteFolders.length === 0 &&
              stateToSave.designFolders.length === 0;
            const isKnownFreshStart = get().lastSaved === 0;

            if (hasNoLocalData && !isKnownFreshStart) {
              try {
                const currentData = await authContext.loadUserData();

                if (currentData) {
                  if (
                    currentData.dataSyncVersion &&
                    currentData.dataSyncVersion > currentVersion
                  ) {
                    console.warn(
                      "Server has newer data (version mismatch). Aborting save to prevent data loss."
                    );
                    const loadSuccess = await get().loadFromDatabase();
                    return loadSuccess;
                  }

                  if (
                    currentData.savedPalettes?.length > 0 ||
                    currentData.savedDesigns?.length > 0 ||
                    currentData.paletteFolders?.length > 0 ||
                    currentData.designFolders?.length > 0
                  ) {
                    stateToSave.savedPalettes = currentData.savedPalettes || [];
                    stateToSave.savedDesigns = currentData.savedDesigns || [];
                    stateToSave.paletteFolders =
                      currentData.paletteFolders || [];
                    stateToSave.designFolders = currentData.designFolders || [];
                    console.log(
                      "Preserved existing palettes, designs, and folders during save"
                    );
                  }
                }
              } catch (fetchError) {
                console.error(
                  "Failed to fetch current data during save:",
                  fetchError
                );
                return false;
              }
            }

            const success = await authContext.saveUserData(stateToSave);

            if (success) {
              set({
                lastSaved: Date.now(),
                dataSyncVersion: newVersion,
              });
              return true;
            }
          } catch (error) {
            console.error("Error saving data to database:", error);
          }
        }
      }
      return false;
    },
    loadFromDatabase: async (): Promise<boolean> => {
      try {
        if (typeof window === "undefined") return false;

        const authContext = (window as any).__authContext;
        if (!authContext || !authContext.user || !authContext.loadUserData) {
          console.error("Auth context not available for database load");
          return false;
        }

        let loadAttempts = 0;
        const maxAttempts = 3;
        let data = null;

        while (loadAttempts < maxAttempts && !data) {
          try {
            data = await authContext.loadUserData();
            break;
          } catch (loadError) {
            loadAttempts++;
            console.error(`Load attempt ${loadAttempts} failed:`, loadError);

            if (loadAttempts < maxAttempts) {
              await new Promise((resolve) =>
                setTimeout(resolve, 500 * Math.pow(2, loadAttempts - 1))
              );
            }
          }
        }

        if (!data) {
          console.error("Failed to load user data after multiple attempts");
          return false;
        }

        if (!data.dimensions) {
          console.error("Loaded data is missing key properties");
          return false;
        }

        const localVersion = get().dataSyncVersion;
        const serverVersion = data.dataSyncVersion || 0;

        if (localVersion > serverVersion && get().lastSaved > 0) {
          console.log(
            `Local data (v${localVersion}) is newer than server data (v${serverVersion}). Keeping local data.`
          );
          return false;
        }

        const isFirstLoad = get().lastSaved === 0;

        let mergedState: Partial<PersistentState> = { ...data };

        if (
          !isFirstLoad &&
          get().lastSaved > 0 &&
          localVersion >= serverVersion
        ) {
          const currentState = get();

          if (
            currentState.savedPalettes.length >
            (data.savedPalettes?.length || 0)
          ) {
            console.log("Using local palettes which appear more complete");
            mergedState.savedPalettes = currentState.savedPalettes;
          }

          if (
            currentState.savedDesigns.length > (data.savedDesigns?.length || 0)
          ) {
            console.log("Using local designs which appear more complete");
            mergedState.savedDesigns = currentState.savedDesigns;
          }

          if (
            currentState.paletteFolders.length >
            (data.paletteFolders?.length || 0)
          ) {
            console.log(
              "Using local palette folders which appear more complete"
            );
            mergedState.paletteFolders = currentState.paletteFolders;
          }

          if (
            currentState.designFolders.length >
            (data.designFolders?.length || 0)
          ) {
            console.log(
              "Using local design folders which appear more complete"
            );
            mergedState.designFolders = currentState.designFolders;
          }
        }

        const finalState = {
          dimensions: mergedState.dimensions || get().dimensions,
          selectedDesign: mergedState.selectedDesign || get().selectedDesign,
          shippingSpeed: mergedState.shippingSpeed || get().shippingSpeed,
          colorPattern: mergedState.colorPattern || get().colorPattern,
          orientation: mergedState.orientation || get().orientation,
          isReversed: mergedState.isReversed ?? get().isReversed,
          customPalette: mergedState.customPalette || get().customPalette,
          isRotated: mergedState.isRotated ?? get().isRotated,
          style: mergedState.style || get().style,
          activeCustomMode:
            mergedState.activeCustomMode || get().activeCustomMode,
          savedPalettes: mergedState.savedPalettes || [],
          savedDesigns: mergedState.savedDesigns || [],
          paletteFolders: mergedState.paletteFolders || [],
          designFolders: mergedState.designFolders || [],
          useMini: mergedState.useMini ?? get().useMini,
          viewSettings: {
            showRuler:
              mergedState.viewSettings?.showRuler ??
              get().viewSettings.showRuler,
            showWoodGrain:
              mergedState.viewSettings?.showWoodGrain ??
              get().viewSettings.showWoodGrain,
            showColorInfo:
              mergedState.viewSettings?.showColorInfo ??
              get().viewSettings.showColorInfo,
            showHanger:
              mergedState.viewSettings?.showHanger ??
              get().viewSettings.showHanger,
            showSplitPanel:
              mergedState.viewSettings?.showSplitPanel ??
              get().viewSettings.showSplitPanel,
            showFPS:
              mergedState.viewSettings?.showFPS ?? get().viewSettings.showFPS,
            showUIControls:
              mergedState.viewSettings?.showUIControls ??
              get().viewSettings.showUIControls,
          },
          currentColors:
            mergedState.selectedDesign === ItemDesigns.Custom &&
            mergedState.customPalette?.length! > 0
              ? createColorMap(mergedState.customPalette!)
              : DESIGN_COLORS[mergedState.selectedDesign as ItemDesigns] ||
                get().currentColors,
          pricing: calculatePrice(
            mergedState.dimensions || get().dimensions,
            mergedState.shippingSpeed || get().shippingSpeed
          ),
          dataSyncVersion: Math.max(serverVersion, localVersion),
        };

        set({
          ...finalState,
          lastSaved: Date.now(),
        });

        console.log(
          `Successfully loaded and merged user data from database (version ${serverVersion})`
        );
        return true;
      } catch (error) {
        console.error("Unexpected error loading from database:", error);
        return false;
      }
    },
    setAutoSaveEnabled: (enabled) => set({ autoSaveEnabled: enabled }),
    createDraftOrder: async () => {
      try {
        const state = get();

        const response = await fetch("/api/create-draft-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dimensions: state.dimensions,
            selectedDesign: state.selectedDesign,
            shippingSpeed: state.shippingSpeed,
            colorPattern: state.colorPattern,
            orientation: state.orientation,
            customPalette: state.customPalette,
            pricing: state.pricing,
            isReversed: state.isReversed,
            style: state.style,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: data.error || "Failed to create order",
          };
        }

        return {
          success: true,
          checkoutUrl: data.checkoutUrl || null,
          draftOrder: data.draftOrder || null,
        };
      } catch (error) {
        console.error("Error creating order:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create order",
        };
      }
    },
    createPaletteFolder: (name: string) => {
      const id = Date.now().toString();
      const newFolder: Folder = {
        id,
        name,
        createdAt: new Date().toISOString(),
      };

      set((state) => ({
        paletteFolders: [...state.paletteFolders, newFolder],
        lastSaved: Date.now(),
      }));

      return id;
    },
    updatePaletteFolder: (id: string, updates: Partial<Folder>) => {
      set((state) => ({
        paletteFolders: state.paletteFolders.map((folder) =>
          folder.id === id
            ? {
                ...folder,
                ...updates,
                updatedAt: new Date().toISOString(),
              }
            : folder
        ),
        lastSaved: Date.now(),
      }));
    },
    deletePaletteFolder: (id: string) => {
      set((state) => ({
        paletteFolders: state.paletteFolders.filter(
          (folder) => folder.id !== id
        ),
        savedPalettes: state.savedPalettes.map((palette) =>
          palette.folderId === id
            ? { ...palette, folderId: undefined }
            : palette
        ),
        lastSaved: Date.now(),
      }));
    },
    movePaletteToFolder: (paletteId: string, folderId: string | null) => {
      set((state) => ({
        savedPalettes: state.savedPalettes.map((palette) =>
          palette.id === paletteId
            ? { ...palette, folderId: folderId || undefined }
            : palette
        ),
        lastSaved: Date.now(),
      }));
    },
    createDesignFolder: (name: string) => {
      const id = Date.now().toString();
      const newFolder: Folder = {
        id,
        name,
        createdAt: new Date().toISOString(),
      };

      set((state) => ({
        designFolders: [...state.designFolders, newFolder],
        lastSaved: Date.now(),
      }));

      return id;
    },
    updateDesignFolder: (id: string, updates: Partial<Folder>) => {
      set((state) => ({
        designFolders: state.designFolders.map((folder) =>
          folder.id === id
            ? {
                ...folder,
                ...updates,
                updatedAt: new Date().toISOString(),
              }
            : folder
        ),
        lastSaved: Date.now(),
      }));
    },
    deleteDesignFolder: (id: string) => {
      set((state) => ({
        designFolders: state.designFolders.filter((folder) => folder.id !== id),
        savedDesigns: state.savedDesigns.map((design) =>
          design.folderId === id ? { ...design, folderId: undefined } : design
        ),
        lastSaved: Date.now(),
      }));
    },
    moveDesignToFolder: (designId: string, folderId: string | null) => {
      set((state) => ({
        savedDesigns: state.savedDesigns.map((design) =>
          design.id === designId
            ? {
                ...design,
                folderId: folderId || undefined,
                updatedAt: new Date().toISOString(),
              }
            : design
        ),
        lastSaved: Date.now(),
      }));

      if (get().autoSaveEnabled) {
        get().saveToDatabase();
      }
    },
    saveDesign: (name: string, folderId?: string) => {
      const id = nanoid();
      const now = new Date().toISOString();

      const newDesign: SavedDesign = {
        id,
        name,
        dimensions: get().dimensions,
        selectedDesign: get().selectedDesign,
        shippingSpeed: get().shippingSpeed,
        colorPattern: get().colorPattern,
        orientation: get().orientation,
        isReversed: get().isReversed,
        customPalette: get().customPalette,
        isRotated: get().isRotated,
        style: get().style,
        useMini: get().useMini,
        createdAt: now,
        folderId,
      };

      set((state) => ({
        savedDesigns: [...state.savedDesigns, newDesign],
        editingDesignId: null,
      }));

      if (get().autoSaveEnabled) {
        get().saveToDatabase();
      }

      return id;
    },
    updateDesign: (id: string, updates: Partial<SavedDesign>) => {
      const now = new Date().toISOString();

      set((state) => ({
        savedDesigns: state.savedDesigns.map((design) =>
          design.id === id ? { ...design, ...updates, updatedAt: now } : design
        ),
      }));

      if (get().autoSaveEnabled) {
        get().saveToDatabase();
      }
    },
    deleteDesign: (id: string) => {
      set((state) => ({
        savedDesigns: state.savedDesigns.filter((design) => design.id !== id),
        editingDesignId:
          state.editingDesignId === id ? null : state.editingDesignId,
      }));

      if (get().autoSaveEnabled) {
        get().saveToDatabase();
      }
    },
    applyDesign: (designId: string) => {
      const design = get().savedDesigns.find((d) => d.id === designId);

      if (!design) {
        console.error(`Design with ID ${designId} not found`);
        return;
      }

      set({
        dimensions: design.dimensions,
        selectedDesign: design.selectedDesign,
        shippingSpeed: design.shippingSpeed,
        colorPattern: design.colorPattern,
        orientation: design.orientation,
        isReversed: design.isReversed,
        customPalette: design.customPalette,
        isRotated: design.isRotated,
        style: design.style,
        useMini: design.useMini,
        currentColors:
          design.selectedDesign === ItemDesigns.Custom &&
          design.customPalette.length > 0
            ? createColorMap(design.customPalette)
            : DESIGN_COLORS[design.selectedDesign] || null,
        pricing: calculatePrice(design.dimensions, design.shippingSpeed),
      });
    },
    loadDesignForEditing: (designId: string) => {
      const design = get().savedDesigns.find((d) => d.id === designId);

      if (!design) {
        console.error(`Design with ID ${designId} not found`);
        return;
      }

      set({
        editingDesignId: designId,
        dimensions: design.dimensions,
        selectedDesign: design.selectedDesign,
        shippingSpeed: design.shippingSpeed,
        colorPattern: design.colorPattern,
        orientation: design.orientation,
        isReversed: design.isReversed,
        customPalette: design.customPalette,
        isRotated: design.isRotated,
        style: design.style,
        useMini: design.useMini,
        currentColors:
          design.selectedDesign === ItemDesigns.Custom &&
          design.customPalette.length > 0
            ? createColorMap(design.customPalette)
            : DESIGN_COLORS[design.selectedDesign] || null,
        pricing: calculatePrice(design.dimensions, design.shippingSpeed),
      });
    },
    resetDesignEditor: () => {
      set({
        editingDesignId: null,
      });
    },
    togglePalettePublic: (id: string) =>
      set((state) => ({
        savedPalettes: state.savedPalettes.map((palette) =>
          palette.id === id
            ? {
                ...palette,
                isPublic: !palette.isPublic,
                updatedAt: new Date().toISOString(),
              }
            : palette
        ),
      })),
    setDrawnPattern: (
      grid: PatternCell[][],
      size: { width: number; height: number },
      keepCustomPalette?: boolean
    ) => {
      set((state) => ({
        drawnPatternGrid: grid,
        drawnPatternGridSize: size,
        selectedDesign: ItemDesigns.Custom, // Ensure design type is Custom
        activeCustomMode: "pattern", // Set to pattern mode
        // Keep both custom palette and current colors - don't clear anything
        currentColors: null, // Clear currentColors as the pattern has embedded colors
      }));
    },
    clearDrawnPattern: (keepCustomPalette?: boolean) => {
      set((state) => ({
        drawnPatternGrid: null,
        drawnPatternGridSize: null,
        // If we still have a custom palette, stay in Custom mode but switch to palette mode
        selectedDesign:
          state.customPalette.length > 0
            ? ItemDesigns.Custom
            : ItemDesigns.Coastal,
        activeCustomMode:
          state.customPalette.length > 0 ? "palette" : "palette",
        currentColors:
          state.customPalette.length > 0
            ? createColorMap(state.customPalette)
            : DESIGN_COLORS[ItemDesigns.Coastal],
      }));
    },
    undoPaletteAction: () => {
      const state = get();
      if (state.paletteHistoryIndex <= 0) return false;

      const newIndex = state.paletteHistoryIndex - 1;
      const previousPalette = state.paletteHistory[newIndex];

      set({
        customPalette: previousPalette,
        currentColors: createColorMap(previousPalette),
        paletteHistoryIndex: newIndex,
      });

      return true;
    },
    redoPaletteAction: () => {
      const state = get();
      if (state.paletteHistoryIndex >= state.paletteHistory.length - 1)
        return false;

      const newIndex = state.paletteHistoryIndex + 1;
      const nextPalette = state.paletteHistory[newIndex];

      set({
        customPalette: nextPalette,
        currentColors: createColorMap(nextPalette),
        paletteHistoryIndex: newIndex,
      });

      return true;
    },
    setActiveCustomMode: (mode: CustomMode) => set({ activeCustomMode: mode }),

    // Draft Set Actions
    addToDraftSet: (item) =>
      set((state) => ({
        draftSet: [
          ...state.draftSet,
          {
            id: nanoid(),
            label: item.label || `Design ${state.draftSet.length + 1}`,
            designData: item.designData,
            createdAt: Date.now(),
          },
        ],
      })),
    removeFromDraftSet: (id) =>
      set((state) => ({
        draftSet: state.draftSet.filter((item) => item.id !== id),
      })),
    clearDraftSet: () => set({ draftSet: [] }),
    updateDraftSetItemLabel: (id, label) =>
      set((state) => ({
        draftSet: state.draftSet.map((item) =>
          item.id === id ? { ...item, label } : item
        ),
      })),

    setPatternOverride: (overrides: Record<string, number>) =>
      set({ patternOverride: overrides }),
    clearPatternOverride: () => set({ patternOverride: {} }),
    setPatternEditingMode: (mode: {
      selectedColorIndex: number;
      isErasing: boolean;
    }) => set({ patternEditingMode: mode }),
    setIsPatternEditorActive: (active: boolean) =>
      set({ isPatternEditorActive: active }),
  }))
);

const debouncedSave = debounce(() => {
  useCustomStore.getState().saveToDatabase();
}, 2000);

useCustomStore.subscribe(
  (state) => {
    return AUTO_SAVE_TRACKED_PROPERTIES.reduce((acc, key) => {
      acc[key] = state[key] as any;
      return acc;
    }, {} as Partial<CustomState>);
  },
  (newState, prevState) => {
    if (!useCustomStore.getState().autoSaveEnabled) return;

    const hasChanged = !shallow(newState, prevState);

    if (hasChanged) {
      debouncedSave();
    }
  }
);

// After the store is created, call the init function to migrate data
const isStore = "everwood-init";
if (!(globalThis as any)[isStore]) {
  useCustomStore.getState().init();
  (globalThis as any)[isStore] = true;
}

// For direct access to the hover store
export const useHoverStore = createWithEqualityFn<HoverState>(
  (set) => ({
    hoverInfo: null,
    pinnedInfo: null,
    setHoverInfo: (info) => set({ hoverInfo: info }),
    setPinnedInfo: (info) => set({ pinnedInfo: info }),
  }),
  shallow
);
