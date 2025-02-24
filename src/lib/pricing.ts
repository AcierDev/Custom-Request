import { ShippingSpeed } from "@/store/customStore";
import { ItemSizes } from "@/typings/types";

const BLOCK_SIZE = 3; // Block size in inches

const PRICE_DATA_POINTS = [
  { squares: 67, price: 385.0 },
  { squares: 98, price: 485.0 },
  { squares: 160, price: 720.0 },
  { squares: 200, price: 850.0 },
  { squares: 240, price: 950.0 },
  { squares: 288, price: 1125.0 },
  { squares: 336, price: 1225.0 },
  { squares: 448, price: 1625.0 },
  { squares: 512, price: 1825.0 },
  { squares: 576, price: 2025.0 },
];

const interpolatePrice = (squares: number): number => {
  const exactMatch = PRICE_DATA_POINTS.find(
    (point) => point.squares === squares
  );
  if (exactMatch) {
    return exactMatch.price;
  }

  for (let i = 1; i < PRICE_DATA_POINTS.length; i++) {
    const lower = PRICE_DATA_POINTS[i - 1];
    const upper = PRICE_DATA_POINTS[i];
    if (squares < upper.squares) {
      const proportion =
        (squares - lower.squares) / (upper.squares - lower.squares);
      const price = lower.price + proportion * (upper.price - lower.price);
      return price;
    }
  }

  const fallbackPrice =
    PRICE_DATA_POINTS[PRICE_DATA_POINTS.length - 1]?.price ?? 0;
  return fallbackPrice;
};

export interface PriceBreakdown {
  basePrice: number;
  shipping: {
    base: number;
    additionalHeight: number;
    expedited: number;
    total: number;
  };
  tax: number;
  total: number;
  customFee: number;
  debug: {
    dimensions: { height: number; width: number };
    blocks: { height: number; width: number; total: number };
  };
}

export function calculatePrice(
  dimensions: { height: number; width: number },
  shippingSpeed: ShippingSpeed = "standard"
): PriceBreakdown {
  if (!dimensions) {
    return {
      basePrice: 0,
      shipping: { base: 0, additionalHeight: 0, expedited: 0, total: 0 },
      customFee: 0,
      tax: 0,
      total: 0,
      debug: {
        dimensions: { height: 0, width: 0 },
        blocks: { height: 0, width: 0, total: 0 },
      },
    };
  }

  // Parse dimensions from size string (e.g., "14 x 7")
  const { width, height } = dimensions;

  // Convert dimensions to blocks (3 inches per block)
  // Convert dimensions to blocks (3 inches per block)
  const totalBlocks = height * width;

  // Calculate base price using interpolation
  const basePrice = interpolatePrice(totalBlocks);

  // Calculate shipping
  const baseShipping = 0;
  let additionalHeightCharge = 0;
  if (height > 65) {
    const extraHeight = height - 65;
    additionalHeightCharge = Math.ceil(extraHeight / 16) * 100;
  }

  let speedCharge = 0;
  switch (shippingSpeed) {
    case "expedited":
      speedCharge = 75;
      break;
    case "rushed":
      speedCharge = 150;
      break;
    default:
      speedCharge = 0;
  }

  const totalShipping = baseShipping + additionalHeightCharge + speedCharge;

  // Calculate tax
  const taxRate = 0.1;
  const tax = (basePrice + totalShipping) * taxRate;

  // Calculate total
  const total = basePrice + totalShipping + tax;

  return {
    basePrice,
    shipping: {
      base: baseShipping,
      additionalHeight: additionalHeightCharge,
      expedited: speedCharge,
      total: totalShipping,
    },
    tax,
    total,
    customFee: 0,
    debug: {
      dimensions: { height, width },
      blocks: {
        height: height,
        width: width,
        total: totalBlocks,
      },
    },
  };
}
