import { create } from "zustand";
import { ItemSizes } from "@/typings/types";
import { calculatePrice, PriceBreakdown } from "@/lib/pricing";
import * as ColorMaps from "@/typings/color-maps";
import { mixPaintColors } from "@/lib/colorUtils";

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

interface CustomState {
  selectedSize: ItemSizes | null;
  selectedDesign: number;
  shippingSpeed: ShippingSpeed;
  pricing: PriceBreakdown;
  colorPattern: ColorPattern;
  orientation: Orientation;
  currentColors: ColorMap | null;
  customPalette: CustomColor[];
  selectedColors: string[];
}

interface CustomStore extends CustomState {
  setSelectedSize: (size: ItemSizes | null) => void;
  setSelectedDesign: (designIndex: number) => void;
  setShippingSpeed: (speed: ShippingSpeed) => void;
  setColorPattern: (pattern: ColorPattern) => void;
  setOrientation: (orientation: Orientation) => void;
  isReversed: boolean;
  setIsReversed: (value: boolean) => void;
  updateCurrentColors: (designName: string) => void;
  addCustomColor: (hex: string) => void;
  removeCustomColor: (index: number) => void;
  toggleColorSelection: (hex: string) => void;
  clearSelectedColors: () => void;
  addBlendedColors: (count: number) => void;
}

const getDesignColors = (designName: string): ColorMap | null => {
  const normalizedName = designName
    .replace(/-/g, "_")
    .replace("striped_", "")
    .replace("tiled_", "")
    .toUpperCase();
  const colorMapKey = `${normalizedName}_COLORS` as keyof typeof ColorMaps;
  const colors = ColorMaps[colorMapKey] || null;

  // Add debugging
  console.log("Getting colors for design:", {
    designName,
    normalizedName,
    colorMapKey,
    colorsFound: colors ? Object.keys(colors).length : 0,
  });

  return colors;
};

const designs = [
  "custom",
  "abyss",
  "aloe",
  "amber",
  "autumn",
  "coastal",
  "elemental",
  "forest",
  "ft5",
  "mirage",
  "sapphire",
  "spectrum",
  "striped-coastal",
  "striped-ft5",
  "striped-timberline",
  "tidal",
  "tiled-coastal",
  "tiled-ft5",
  "tiled-timberline",
  "timberline",
  "winter",
];

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
  selectedSize: ItemSizes.TwentyFour_By_Twelve,
  selectedDesign: 1,
  shippingSpeed: "standard",
  pricing: calculatePrice(ItemSizes.TwentyFour_By_Twelve, "standard"),
  colorPattern: "fade",
  orientation: "horizontal",
  isReversed: false,
  currentColors: getDesignColors("abyss"),
  customPalette: [],
  selectedColors: [],
  setSelectedSize: (size) =>
    set((state) => ({
      selectedSize: size,
      pricing: calculatePrice(size, state.shippingSpeed),
    })),
  setSelectedDesign: (designIndex) => {
    const designName = designs[designIndex];
    set((state) => ({
      selectedDesign: designIndex,
      currentColors:
        designIndex === 0 && state.customPalette.length > 0
          ? createColorMap(state.customPalette)
          : getDesignColors(designName),
    }));
  },
  setShippingSpeed: (speed) =>
    set((state) => ({
      shippingSpeed: speed,
      pricing: calculatePrice(state.selectedSize, speed),
    })),
  setColorPattern: (pattern) => set({ colorPattern: pattern }),
  setOrientation: (orientation) => set({ orientation }),
  setIsReversed: (value) => set({ isReversed: value }),
  updateCurrentColors: (designName) => {
    set({ currentColors: getDesignColors(designName) });
  },
  addCustomColor: (hex) =>
    set((state) => {
      const newPalette = [...state.customPalette, { hex }];
      return {
        customPalette: newPalette,
        selectedDesign: 0,
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
            : getDesignColors("abyss"),
        selectedDesign: newPalette.length > 0 ? 0 : 1,
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
}));
