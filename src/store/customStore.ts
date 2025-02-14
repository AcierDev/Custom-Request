import { create } from "zustand";
import { ItemSizes } from "@/typings/types";
import { calculatePrice, PriceBreakdown } from "@/lib/pricing";

export type ShippingSpeed = "standard" | "expedited" | "rushed";

interface CustomStore {
  selectedSize: ItemSizes | null;
  selectedDesign: number;
  shippingSpeed: ShippingSpeed;
  pricing: PriceBreakdown;
  setSelectedSize: (size: ItemSizes | null) => void;
  setSelectedDesign: (designIndex: number) => void;
  setShippingSpeed: (speed: ShippingSpeed) => void;
}

export const useCustomStore = create<CustomStore>((set) => ({
  selectedSize: null,
  selectedDesign: 0,
  shippingSpeed: "standard",
  pricing: calculatePrice(null, "standard"),
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
}));
