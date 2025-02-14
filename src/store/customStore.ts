import { create } from "zustand";
import { ItemSizes } from "@/typings/types";
import { calculatePrice, PriceBreakdown } from "@/lib/pricing";

export type ShippingSpeed = "standard" | "expedited" | "rushed";
export type ColorPattern = "striped" | "gradient" | "checkerboard" | "random";

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
}

export const useCustomStore = create<CustomStore>((set) => ({
  selectedSize: null,
  selectedDesign: 0,
  shippingSpeed: "standard",
  pricing: calculatePrice(null, "standard"),
  colorPattern: "striped",
  orientation: "horizontal",
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
}));
