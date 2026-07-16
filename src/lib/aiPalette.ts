//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ✨ AI PALETTE CONTRACT                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export const AI_PALETTE_CONFIG = {
  apiPath: "/api/ai-palette",
  defaultModel: "openrouter/free",
  minPromptLength: 1,
  maxPromptLength: 500,
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
  maxOutputTokens: 768,
  modelTemperature: 0,
  requestTimeoutMs: 30_000,
  clientRequestTimeoutMs: 35_000,
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
      target: "directions" | "visibility" | "all";
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
  clarificationContext?: string;
}

export type AiPaletteOperation =
  | "replace_colors"
  | "set_palette"
  | "set_dimensions"
  | "edit_squares"
  | "ask_question";

export interface AiPaletteReplacement {
  sourceHex: string;
  replacement: AiPaletteColor;
}

export interface AiPaletteResponse {
  operation: AiPaletteOperation;
  palette: AiPaletteColor[];
  pattern: AiPalettePattern;
  dimensions: AiPaletteDimensions;
  replacements: AiPaletteReplacement[];
  squareEdit?: AiSquareEdit;
  question?: string;
}
