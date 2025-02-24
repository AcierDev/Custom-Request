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

export const useCustomStore = create<CustomStore>((set) => ({
  dimensions: { width: 16, height: 10 },
  selectedDesign: ItemDesigns.Custom,
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
    set((state) => ({
      selectedColors: state.selectedColors.includes(hex)
        ? state.selectedColors.filter((h) => h !== hex)
        : state.selectedColors.length < 2
        ? [...state.selectedColors, hex]
        : state.selectedColors,
    })),
  clearSelectedColors: () =>
    set({
      selectedColors: [],
    }),
  addBlendedColors: (count) =>
    set((state) => {
      if (state.selectedColors.length !== 2) return state;

      const [color1, color2] = state.selectedColors;
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

      const indices = state.selectedColors.map((hex) =>
        state.customPalette.findIndex((color) => color.hex === hex)
      );
      const [startIndex, endIndex] = indices.sort((a, b) => a - b);

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
}));
