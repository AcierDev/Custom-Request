//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ✨ AI PALETTE CONTRACT                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export const AI_PALETTE_CONFIG = {
  apiPath: "/api/ai-palette",
  defaultModel: "openrouter/free",
  minPromptLength: 1,
  maxPromptLength: 500,
  maxConversationMessages: 10,
  maxConversationMessageLength: 300,
  minPaletteColors: 1,
  maxPaletteColors: 32,
  minPaletteIndex: 0,
  maxPaletteIndex: 31,
  defaultGeneratedColorCount: 6,
  defaultColorPattern: "fade",
  maxColorNameLength: 48,
  minDimensionSquares: 1,
  maxDimensionSquares: 64,
  maxRequestBytes: 16_384,
  maxOutputTokens: 1_536,
  minBlendColorCount: 2,
  minMultiBlendStops: 3,
  minColorsBetweenStops: 1,
  minAdjustmentPercent: 1,
  maxAdjustmentPercent: 100,
  defaultAdjustmentPercent: 20,
  slightAdjustmentPercent: 10,
  strongAdjustmentPercent: 35,
  minHueShiftDegrees: -360,
  maxHueShiftDegrees: 360,
  maxCommandsPerRequest: 8,
  modelTemperature: 0.15,
  requestTimeoutMs: 45_000,
  clientRequestTimeoutMs: 50_000,
  rateLimitWindowMs: 60_000,
  rateLimitMaxRequests: 10,
  rateLimitMaxEntries: 1_000,
  responseCacheTtlMs: 600_000,
  responseCacheMaxEntries: 250,
} as const;

export const AI_PALETTE_COLOR_PATTERNS = [
  "striped",
  "gradient",
  "checkerboard",
  "random",
  "fade",
  "center-fade",
  "scatter",
] as const;

export const AI_PALETTE_ORIENTATIONS = ["horizontal", "vertical"] as const;
export const AI_SQUARE_DIRECTIONS = [
  "north",
  "east",
  "south",
  "west",
] as const;

export const HEX_COLOR_PATTERN = /^#[\dA-Fa-f]{6}$/;

export type AiPaletteColorPattern =
  (typeof AI_PALETTE_COLOR_PATTERNS)[number];

export type AiPaletteOrientation =
  (typeof AI_PALETTE_ORIENTATIONS)[number];

export type AiSquareDirection = (typeof AI_SQUARE_DIRECTIONS)[number];
export type AiSquareEdit =
  | {
      type: "color";
      colorIndex: number;
      sourceColorIndexes: number[];
    }
  | {
      type: "direction";
      direction: AiSquareDirection;
      sourceColorIndexes: number[];
    }
  | {
      type: "visibility";
      hidden: boolean;
      sourceColorIndexes: number[];
    }
  | {
      type: "reset";
      target: "colors" | "directions" | "visibility" | "all";
    };

export interface AiPaletteColor {
  hex: string;
  name?: string;
}

export interface AiPalettePattern {
  colorPattern: AiPaletteColorPattern;
  orientation: AiPaletteOrientation;
  isReversed: boolean;
  isRotated: boolean;
}

export interface AiPaletteDimensions {
  width: number;
  height: number;
}

export interface AiPaletteRequest {
  prompt: string;
  currentPalette: AiPaletteColor[];
  pattern: AiPalettePattern;
  dimensions: AiPaletteDimensions;
  backboardColor: string | null;
  conversation?: AiPaletteConversationMessage[];
  clarificationContext?: string;
  previousAdjustment?: AiPaletteAdjustment;
}

export interface AiPaletteConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export type AiPaletteOperation =
  | "replace_colors"
  | "set_palette"
  | "set_blended_palette"
  | "set_dimensions"
  | "set_backboard_color"
  | "edit_squares"
  | "ask_question";

export interface AiPaletteBlend {
  start: AiPaletteColor;
  end: AiPaletteColor;
  totalColorCount: number;
  stops?: AiPaletteColor[];
  colorsBetweenStops?: number;
}

export interface AiPaletteReplacement {
  sourceHex: string;
  sourceIndex?: number;
  replacement: AiPaletteColor;
}

export type AiPaletteAdjustment =
  | {
      type: "brightness";
      direction: "darker" | "lighter";
      percent: number;
      sourceColorIndexes: number[];
    }
  | {
      type: "saturation";
      direction: "more" | "less";
      percent: number;
      sourceColorIndexes: number[];
    }
  | {
      type: "temperature";
      direction: "warmer" | "cooler";
      percent: number;
      sourceColorIndexes: number[];
    }
  | {
      type: "hue";
      degrees: number;
      sourceColorIndexes: number[];
    }
  | {
      type: "color_tint";
      target: AiPaletteColor;
      percent: number;
      sourceColorIndexes: number[];
    };

export interface AiPaletteResponse {
  operation: AiPaletteOperation;
  palette: AiPaletteColor[];
  pattern: AiPalettePattern;
  dimensions: AiPaletteDimensions;
  replacements: AiPaletteReplacement[];
  squareEdit?: AiSquareEdit;
  squareEdits?: AiSquareEdit[];
  blend?: AiPaletteBlend;
  adjustment?: AiPaletteAdjustment;
  backboardColor?: string;
  question?: string;
}
