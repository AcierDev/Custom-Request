import { create } from "zustand";
import { ItemSizes, ItemDesigns, Dimensions } from "@/typings/types";
import { calculatePrice, PriceBreakdown } from "@/lib/pricing";
import { mixPaintColors } from "@/lib/colorUtils";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { createStore } from "zustand/vanilla";

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
  style: StyleType;
  savedPalettes: SavedPalette[];
  activeTab: "create" | "saved" | "official";
  editingPaletteId: string | null;
  viewSettings: {
    showRuler: boolean;
    showWoodGrain: boolean;
    showColorInfo: boolean;
  };
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
  setActiveTab: (tab: string) => void;
  updateColorName: (index: number, name: string) => void;
  updateColorHex: (index: number, hex: string) => void;
  resetPaletteEditor: () => void;
  loadOfficialPalette: (design: ItemDesigns) => void;
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

export const useCustomStore = create<CustomStore>((set, get) => ({
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
        console.log("Already have 2 colors selected, replacing the first one");
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
      savedPalettes: state.savedPalettes.filter((palette) => palette.id !== id),
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

  setActiveTab: (tab) => set({ activeTab: tab }),

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
}));
