import { create } from "zustand";
import { ItemSizes } from "@/typings/types";
import { calculatePrice, PriceBreakdown } from "@/lib/pricing";

export type ShippingSpeed = "standard" | "expedited" | "rushed";
export type ColorPattern =
  | "striped"
  | "gradient"
  | "checkerboard"
  | "random"
  | "fade"
  | "center-fade";

type Orientation = "horizontal" | "vertical";

interface CustomState {
  selectedSize: ItemSizes | null;
  selectedDesign: number;
  shippingSpeed: ShippingSpeed;
  pricing: PriceBreakdown;
  colorPattern: ColorPattern;
  orientation: Orientation;
}

interface CustomStore extends CustomState {
  setSelectedSize: (size: ItemSizes | null) => void;
  setSelectedDesign: (designIndex: number) => void;
  setShippingSpeed: (speed: ShippingSpeed) => void;
  setColorPattern: (pattern: ColorPattern) => void;
  setOrientation: (orientation: Orientation) => void;
  isReversed: boolean;
  setIsReversed: (value: boolean) => void;
}

export const useCustomStore = create<CustomStore>((set) => ({
  selectedSize: ItemSizes.TwentyFour_By_Twelve,
  selectedDesign: 0,
  shippingSpeed: "standard",
  pricing: calculatePrice(ItemSizes.TwentyFour_By_Twelve, "standard"),
  colorPattern: "fade",
  orientation: "horizontal",
  isReversed: false,
  setSelectedSize: (size) =>
    set((state) => ({
      selectedSize: size,
      pricing: calculatePrice(size, state.shippingSpeed),
    })),
  setSelectedDesign: (designIndex) => set({ selectedDesign: designIndex }),
  setShippingSpeed: (speed) =>
    set((state) => ({
      shippingSpeed: speed,
      pricing: calculatePrice(state.selectedSize, speed),
    })),
  setColorPattern: (pattern) => set({ colorPattern: pattern }),
  setOrientation: (orientation) => set({ orientation }),
  setIsReversed: (value) => set({ isReversed: value }),
}));
