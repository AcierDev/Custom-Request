import { create } from "zustand";
import { ItemSizes, ItemDesigns, Dimensions } from "@/typings/types";
import { calculatePrice, PriceBreakdown } from "@/lib/pricing";
import { mixPaintColors } from "@/lib/colorUtils";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { createStore } from "zustand/vanilla";
import {
  generateShareableUrl,
  extractStateFromUrl,
  generateShortShareableUrl,
  extractStateFromShortUrl,
} from "@/lib/urlUtils";
import { subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";

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
  hex: string;
  name?: string;
};

export type SavedPalette = {
  id: string;
  name: string;
  colors: CustomColor[];
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
  patternStyle: PatternType;
  isReversed: boolean;
  style: StyleType;
  savedPalettes: SavedPalette[];
  activeTab: "create" | "saved" | "official";
  editingPaletteId: string | null;
  viewSettings: {
    showRuler: boolean;
    showWoodGrain: boolean;
    showColorInfo: boolean;
  };
  lastSaved: number; // Add timestamp for last save
  autoSaveEnabled: boolean; // Flag to enable/disable auto-save
}

interface CustomStore extends CustomState {
  setDimensions: (dimensions: Dimensions) => void;
  setSelectedDesign: (design: ItemDesigns) => void;
  setShippingSpeed: (speed: ShippingSpeed) => void;
  setColorPattern: (pattern: ColorPattern) => void;
  setOrientation: (orientation: Orientation) => void;
  isReversed: boolean;
  setIsReversed: (value: boolean) => void;
  updateCurrentColors: (design: ItemDesigns) => void;
  addCustomColor: (hex: string) => void;
  removeCustomColor: (index: number) => void;
  toggleColorSelection: (hex: string) => void;
  clearSelectedColors: () => void;
  addBlendedColors: (count: number) => void;
  moveColorLeft: (index: number) => void;
  moveColorRight: (index: number) => void;
  setIsRotated: (value: boolean) => void;
  setPatternType: (type: PatternType) => void;
  setStyle: (style: StyleType) => void;
  setShowRuler: (value: boolean) => void;
  setShowWoodGrain: (value: boolean) => void;
  setShowColorInfo: (value: boolean) => void;
  savePalette: (name: string) => void;
  updatePalette: (id: string, updates: Partial<SavedPalette>) => void;
  deletePalette: (id: string) => void;
  applyPalette: (paletteId: string) => void;
  loadPaletteForEditing: (paletteId: string) => void;
  setActiveTab: (tab: "create" | "saved" | "official") => void;
  updateColorName: (index: number, name: string) => void;
  updateColorHex: (index: number, hex: string) => void;
  resetPaletteEditor: () => void;
  loadOfficialPalette: (design: ItemDesigns) => void;
  setCustomPalette: (palette: CustomColor[]) => void;
  generateShareableLink: () => string;
  generateShortShareableLink: () => string;
  loadFromShareableData: (data: string) => boolean;
  saveToDatabase: () => Promise<boolean>;
  loadFromDatabase: () => Promise<boolean>;
  syncWithDatabase: (autoSave?: boolean) => void;
  setAutoSaveEnabled: (enabled: boolean) => void; // Add method to toggle auto-save
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

// Define the shareable state interface - only include what's needed for sharing
interface ShareableState {
  dimensions: Dimensions;
  selectedDesign: ItemDesigns;
  shippingSpeed: ShippingSpeed;
  colorPattern: ColorPattern;
  orientation: Orientation;
  isReversed: boolean;
  customPalette: CustomColor[];
  isRotated: boolean;
  patternStyle: PatternType;
  style: StyleType;
}

// Define what we want to persist in the database
interface PersistentState extends ShareableState {
  savedPalettes: SavedPalette[];
  viewSettings: {
    showRuler: boolean;
    showWoodGrain: boolean;
    showColorInfo: boolean;
  };
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
  "patternStyle",
  "style",
  "savedPalettes",
  "viewSettings",
];

// Create the store with the subscribeWithSelector middleware
export const useCustomStore = create<CustomStore>()(
  subscribeWithSelector((set, get) => ({
    dimensions: { width: 16, height: 10 },
    selectedDesign: ItemDesigns.Coastal,
    shippingSpeed: "standard",
    pricing: calculatePrice({ width: 16, height: 10 }, "standard"),
    colorPattern: "fade",
    orientation: "horizontal",
    isReversed: false,
    currentColors: DESIGN_COLORS[ItemDesigns.Custom],
    customPalette: [],
    selectedColors: [],
    isRotated: false,
    patternStyle: "tiled",
    style: "geometric",
    savedPalettes: [],
    activeTab: "create",
    editingPaletteId: null,
    viewSettings: {
      showRuler: false,
      showWoodGrain: true,
      showColorInfo: false,
    },
    lastSaved: 0,
    autoSaveEnabled: true,
    setDimensions: (dimensions) => {
      set({ dimensions });
      set((state) => ({
        pricing: calculatePrice(dimensions, state.shippingSpeed),
      }));
    },
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
        const newPalette = [...state.customPalette, { hex }];
        return {
          customPalette: newPalette,
          selectedDesign: ItemDesigns.Custom,
          currentColors: createColorMap(newPalette),
        };
      }),
    removeCustomColor: (index) =>
      set((state) => {
        const newPalette = state.customPalette.filter((_, i) => i !== index);
        return {
          customPalette: newPalette,
          selectedColors: state.selectedColors.filter(
            (hex) => hex !== state.customPalette[index].hex
          ),
          currentColors:
            newPalette.length > 0
              ? createColorMap(newPalette)
              : DESIGN_COLORS[ItemDesigns.Custom],
          selectedDesign: ItemDesigns.Custom,
        };
      }),
    toggleColorSelection: (hex) =>
      set((state) => {
        // If the color is already selected, remove it
        if (state.selectedColors.includes(hex)) {
          return {
            selectedColors: state.selectedColors.filter((h) => h !== hex),
          };
        }
        // If we have less than 2 colors selected, add this one
        else if (state.selectedColors.length < 2) {
          return {
            selectedColors: [...state.selectedColors, hex],
          };
        }
        // If we already have 2 colors selected, replace the first one with this new one
        else {
          console.log(
            "Already have 2 colors selected, replacing the first one"
          );
          return {
            selectedColors: [hex, state.selectedColors[1]],
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

        // Find the indices of the selected colors in the palette
        const indices = state.selectedColors.map((hex) =>
          state.customPalette.findIndex((color) => color.hex === hex)
        );

        // Sort indices to determine the direction (always blend from lower to higher index)
        const [startIndex, endIndex] = indices.sort((a, b) => a - b);

        // Get the actual colors based on their position in the palette
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

          blendedColors.push({ hex: blendedHex });
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

        return {
          customPalette: newPalette,
          currentColors: createColorMap(newPalette),
        };
      }),
    moveColorRight: (index) =>
      set((state) => {
        if (index < 0 || index >= state.customPalette.length - 1) return state;

        const newPalette = [...state.customPalette];
        const temp = newPalette[index];
        newPalette[index] = newPalette[index + 1];
        newPalette[index + 1] = temp;

        return {
          customPalette: newPalette,
          currentColors: createColorMap(newPalette),
        };
      }),
    setIsRotated: (value) => set({ isRotated: value }),
    setPatternType: (type) => set({ patternStyle: type }),
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
    savePalette: (name) =>
      set((state) => {
        if (state.customPalette.length === 0) return state;

        const newPalette: SavedPalette = {
          id: Date.now().toString(),
          name: name || `Palette ${state.savedPalettes.length + 1}`,
          colors: [...state.customPalette],
          createdAt: new Date().toISOString(),
        };

        return {
          savedPalettes: [...state.savedPalettes, newPalette],
        };
      }),

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

        return {
          customPalette: [...palette.colors],
          selectedDesign: ItemDesigns.Custom,
          currentColors: createColorMap(palette.colors),
          selectedColors: [], // Clear any selected colors
        };
      }),

    updateColorName: (index, name) =>
      set((state) => {
        if (index < 0 || index >= state.customPalette.length) return state;

        const newPalette = [...state.customPalette];
        newPalette[index] = { ...newPalette[index], name };

        return {
          customPalette: newPalette,
          currentColors: createColorMap(newPalette),
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

        return {
          customPalette: newPalette,
          currentColors: createColorMap(newPalette),
          selectedColors: state.selectedColors.map((color) =>
            color === state.customPalette[index].hex ? hex : color
          ),
        };
      }),

    setActiveTab: (tab: "create" | "saved" | "official") =>
      set({ activeTab: tab as "create" | "saved" | "official" }),

    resetPaletteEditor: () =>
      set({
        customPalette: [],
        selectedColors: [],
        editingPaletteId: null,
      }),

    loadOfficialPalette: (design: ItemDesigns) =>
      set((state) => {
        // Convert the official design colors to the CustomColor format
        const designColors = DESIGN_COLORS[design];
        const customColors: CustomColor[] = Object.values(designColors).map(
          (color) => ({
            hex: color.hex,
            name: color.name,
          })
        );

        return {
          customPalette: customColors,
          selectedDesign: ItemDesigns.Custom, // Set to Custom since we're creating a custom palette from an official one
          currentColors: createColorMap(customColors),
          selectedColors: [], // Clear any selected colors
          activeTab: "create", // Switch to create tab
        };
      }),

    setCustomPalette: (palette: CustomColor[]) =>
      set({
        customPalette: palette,
        currentColors: createColorMap(palette),
      }),

    generateShareableLink: () => {
      const state = get();

      // Extract only the properties we want to share
      const shareableState: ShareableState = {
        dimensions: state.dimensions,
        selectedDesign: state.selectedDesign,
        shippingSpeed: state.shippingSpeed,
        colorPattern: state.colorPattern,
        orientation: state.orientation,
        isReversed: state.isReversed,
        customPalette: state.customPalette,
        isRotated: state.isRotated,
        patternStyle: state.patternStyle,
        style: state.style,
      };

      // Use the compression utility to generate a more compact URL
      return generateShareableUrl(shareableState);
    },

    generateShortShareableLink: () => {
      const state = get();

      // Extract only the properties we want to share
      const shareableState: ShareableState = {
        dimensions: state.dimensions,
        selectedDesign: state.selectedDesign,
        shippingSpeed: state.shippingSpeed,
        colorPattern: state.colorPattern,
        orientation: state.orientation,
        isReversed: state.isReversed,
        customPalette: state.customPalette,
        isRotated: state.isRotated,
        patternStyle: state.patternStyle,
        style: state.style,
      };

      // Use the short URL compression utility
      return generateShortShareableUrl(shareableState);
    },

    loadFromShareableData: (data: string) => {
      try {
        // Determine if this is a short URL or regular URL based on the parameter
        // Short URLs use 's=' parameter, regular URLs use 'share='
        let shareableState: ShareableState;

        if (data.includes("s=")) {
          // Extract the actual data part after 's='
          const shortData = data.split("s=")[1];
          shareableState = extractStateFromShortUrl<ShareableState>(shortData);
        } else {
          // Regular URL format
          const regularData = data.includes("share=")
            ? data.split("share=")[1]
            : data;
          shareableState = extractStateFromUrl<ShareableState>(regularData);
        }

        // Validate the data structure
        if (!shareableState.dimensions || !shareableState.selectedDesign) {
          return false;
        }

        // Update the store with the shared state
        set({
          dimensions: shareableState.dimensions,
          selectedDesign: shareableState.selectedDesign,
          shippingSpeed: shareableState.shippingSpeed,
          colorPattern: shareableState.colorPattern,
          orientation: shareableState.orientation,
          isReversed: shareableState.isReversed,
          customPalette: shareableState.customPalette,
          isRotated: shareableState.isRotated,
          patternStyle: shareableState.patternStyle,
          style: shareableState.style,
          // Update the current colors based on the custom palette
          currentColors:
            shareableState.selectedDesign === ItemDesigns.Custom &&
            shareableState.customPalette.length > 0
              ? createColorMap(shareableState.customPalette)
              : DESIGN_COLORS[shareableState.selectedDesign],
          // Update pricing based on the dimensions and shipping speed
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

    // Save the current state to MongoDB
    saveToDatabase: async () => {
      try {
        // Only run in browser
        if (typeof window === "undefined") return false;

        // Get the auth context from window
        const authContext = (window as any).__authContext;
        if (!authContext || !authContext.user || !authContext.saveUserData) {
          console.warn("Auth context not available for saving data");
          return false;
        }

        // Extract the data we want to persist
        const state = get();
        const persistentState: PersistentState = {
          dimensions: state.dimensions,
          selectedDesign: state.selectedDesign,
          shippingSpeed: state.shippingSpeed,
          colorPattern: state.colorPattern,
          orientation: state.orientation,
          isReversed: state.isReversed,
          customPalette: state.customPalette,
          isRotated: state.isRotated,
          patternStyle: state.patternStyle,
          style: state.style,
          savedPalettes: state.savedPalettes,
          viewSettings: state.viewSettings,
        };

        console.log("Persistent state:", persistentState);

        // Save to MongoDB via the auth context
        const success = await authContext.saveUserData(persistentState);

        if (success) {
          console.log("Store data saved to database");
          set({ lastSaved: Date.now() });
        } else {
          console.error("Failed to save store data to database");
        }

        return success;
      } catch (error) {
        console.error("Error saving to database:", error);
        return false;
      }
    },

    // Load state from MongoDB
    loadFromDatabase: async () => {
      try {
        // Only run in browser
        if (typeof window === "undefined") return false;

        // Get the auth context from window
        const authContext = (window as any).__authContext;
        if (!authContext || !authContext.user || !authContext.loadUserData) {
          console.warn("Auth context not available for loading data");
          return false;
        }

        // Load from MongoDB via the auth context
        const data = await authContext.loadUserData();

        if (!data) {
          console.log("No stored data found for user");
          return false;
        }

        // Update the store with the loaded data
        set({
          dimensions: data.dimensions || get().dimensions,
          selectedDesign: data.selectedDesign || get().selectedDesign,
          shippingSpeed: data.shippingSpeed || get().shippingSpeed,
          colorPattern: data.colorPattern || get().colorPattern,
          orientation: data.orientation || get().orientation,
          isReversed:
            data.isReversed !== undefined ? data.isReversed : get().isReversed,
          customPalette: data.customPalette || get().customPalette,
          isRotated:
            data.isRotated !== undefined ? data.isRotated : get().isRotated,
          patternStyle: data.patternStyle || get().patternStyle,
          style: data.style || get().style,
          savedPalettes: data.savedPalettes || get().savedPalettes,
          viewSettings: data.viewSettings || get().viewSettings,
          // Update the current colors based on the custom palette
          currentColors:
            data.selectedDesign === ItemDesigns.Custom &&
            data.customPalette?.length > 0
              ? createColorMap(data.customPalette)
              : DESIGN_COLORS[data.selectedDesign as ItemDesigns] ||
                get().currentColors,
          // Update pricing based on the dimensions and shipping speed
          pricing: calculatePrice(
            data.dimensions || get().dimensions,
            data.shippingSpeed || get().shippingSpeed
          ),
          lastSaved: Date.now(),
        });

        console.log("Store data loaded from database");
        return true;
      } catch (error) {
        console.error("Error loading from database:", error);
        return false;
      }
    },

    // Set up automatic syncing with the database
    syncWithDatabase: (autoSave = true) => {
      // Only run in browser
      if (typeof window === "undefined") return;

      // Load data initially
      get().loadFromDatabase();

      if (autoSave) {
        // Set up auto-save
        const saveInterval = setInterval(() => {
          if (get().autoSaveEnabled) {
            get().saveToDatabase();
          }
        }, 30000); // Save every 30 seconds

        // Clean up on unmount
        return () => clearInterval(saveInterval);
      }
    },

    // Toggle auto-save functionality
    setAutoSaveEnabled: (enabled) => set({ autoSaveEnabled: enabled }),
  }))
);

// Create a debounced save function
const debouncedSave = debounce(() => {
  useCustomStore.getState().saveToDatabase();
}, 2000);

// Set up a listener for state changes that should trigger auto-save
useCustomStore.subscribe(
  (state) => {
    // Create a selector that picks the tracked properties
    return AUTO_SAVE_TRACKED_PROPERTIES.reduce((acc, key) => {
      acc[key] = state[key];
      return acc;
    }, {} as Partial<CustomState>);
  },
  (newState, prevState) => {
    // Only proceed if auto-save is enabled
    if (!useCustomStore.getState().autoSaveEnabled) return;

    // Check if any tracked property has changed
    const hasChanged = !shallow(newState, prevState);

    if (hasChanged) {
      // If something changed, trigger a debounced save
      debouncedSave();
    }
  }
);
