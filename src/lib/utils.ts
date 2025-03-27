import { Dimensions, ItemSizes } from "@/typings/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const BLOCK_SIZE = 3; // inches

export const getDimensionsDetails = (dimensions: Dimensions | null) => {
  if (!dimensions) return null;

  const { width, height } = dimensions;

  return {
    inches: {
      width: width * BLOCK_SIZE,
      height: height * BLOCK_SIZE,
    },
    feet: {
      width: (width * BLOCK_SIZE) / 12,
      height: (height * BLOCK_SIZE) / 12,
    },
    blocks: {
      width,
      height,
      total: width * height,
    },
    area: {
      squareInches: width * BLOCK_SIZE * (height * BLOCK_SIZE),
      squareFeet: (width * BLOCK_SIZE * (height * BLOCK_SIZE)) / 144,
    },
    weight: {
      // Assuming 1 lb per square inch
      pounds: width * BLOCK_SIZE * (height * BLOCK_SIZE),
      kilograms: width * BLOCK_SIZE * (height * BLOCK_SIZE) * 0.453592, // Convert to kg
    },
  };
};

export const sizeToDimensions = (size: ItemSizes) => {
  const [width, height] = size.split(" x ").map(Number);
  return { width, height };
};

/**
 * Helper function to reset onboarding state
 * Can be called in the browser console for testing the onboarding flow
 */
export function resetOnboarding() {
  console.log("Resetting onboarding state");
  localStorage.removeItem("onboardingCompleted");
  sessionStorage.removeItem("fromOnboarding");
  sessionStorage.removeItem("redirectingFromSignIn");

  // Also offer option to reset guest state
  const resetGuest = confirm("Do you also want to reset guest login state?");
  if (resetGuest) {
    localStorage.removeItem("everwood_guest_mode");
    localStorage.removeItem("everwood_is_guest");
    console.log("Guest state reset");
  }

  console.log("Onboarding state reset");
  console.log("You can now refresh the page to see the onboarding flow");
  return true;
}
