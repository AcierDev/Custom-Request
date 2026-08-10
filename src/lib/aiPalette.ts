//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ✨ AI PALETTE CONTRACT                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export const AI_PALETTE_CONFIG = {
  apiPath: "/api/ai-palette",
  defaultModel: "openrouter/free",
  defaultImageModel: "google/gemini-3.1-flash-lite-image",
  minPromptLength: 1,
  maxPromptLength: 500,
  maxConversationMessages: 20,
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
  minArtworkUsedColors: 2,
  generatedArtworkPaletteColorCount: 12,
  modelTemperature: 0.15,
  requestTimeoutMs: 45_000,
  imageRequestTimeoutMs: 90_000,
  clientRequestTimeoutMs: 95_000,
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

export const AI_ARTWORK_PALETTE_INDEX_SYMBOLS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUV";

export const HEX_COLOR_PATTERN = /^#[\dA-Fa-f]{6}$/;
export const AI_ARTWORK_ROW_PATTERN = /^[0-9A-V]+$/;
const AI_REQUEST_SEQUENCE_INCREMENT = 1;
const AI_ARTWORK_EXPLICIT_ACTION_PATTERN =
  /^\s*(?:please\s+)?(?:draw|depict|render|illustrate|sketch|paint)\b/i;
const AI_ARTWORK_CREATE_SUBJECT_PATTERN =
  /^\s*(?:please\s+)?(?:make|create|generate)(?:\s+me)?\s+(?:a|an|the)\b/i;
const AI_ARTWORK_DIRECT_DESCRIPTION_PATTERN = /^\s*(?:a|an|the)\s+\S+/i;
const AI_ARTWORK_SUBJECT_PATTERN =
  /\b(?:art(?:work|\s+piece)?|flag|scene|portrait|landscape|picture|image|symbol|icon|object|animal|flower|mountain|boat|building|skyline)\b/i;
const AI_ARTWORK_EDIT_ONLY_PATTERN =
  /\b(?:palette|colou?rs?|squares?|backboard|layout|size|dimensions?|darker|lighter|warmer|cooler|brighter|muted|vibrant|rotate|reverse|hide|show)\b/i;

export interface AiRequestActionState {
  type: "button" | "submit";
  disabled: boolean;
  label: string;
}

export const getAiRequestActionState = (
  isSubmitting: boolean,
  canSubmit: boolean,
): AiRequestActionState =>
  isSubmitting
    ? { type: "button", disabled: false, label: "Stop AI generation" }
    : {
        type: "submit",
        disabled: !canSubmit,
        label: "Apply AI pattern edit",
      };

export const cancelAiRequest = (
  controller: AbortController | null,
  requestSequence: number,
): number => {
  controller?.abort();
  return requestSequence + AI_REQUEST_SEQUENCE_INCREMENT;
};

export const createAiRequestAbortSignal = (
  requestSignal: AbortSignal,
  timeoutMs: number,
): AbortSignal =>
  AbortSignal.any([requestSignal, AbortSignal.timeout(timeoutMs)]);

export const getAiConversationWindow = <Message>(
  messages: readonly Message[],
): Message[] => messages.slice(-AI_PALETTE_CONFIG.maxConversationMessages);

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

export interface AiArtwork {
  /** Palette-index symbols, ordered from the artwork's top row downward. */
  width: number;
  height: number;
  rows: string[];
}

export interface AiArtworkPatternCell {
  color: string;
  colorName?: string;
}

export const isAiArtwork = (
  value: unknown,
  paletteLength: number,
  dimensions: AiPaletteDimensions,
): value is AiArtwork => {
  if (!value || typeof value !== "object") return false;
  const artwork = value as Partial<AiArtwork>;
  const rows = artwork.rows;
  if (
    !Number.isInteger(artwork.width) ||
    !Number.isInteger(artwork.height) ||
    Number(artwork.width) < AI_PALETTE_CONFIG.minDimensionSquares ||
    Number(artwork.height) < AI_PALETTE_CONFIG.minDimensionSquares ||
    Number(artwork.width) > dimensions.width ||
    Number(artwork.height) > dimensions.height ||
    !Array.isArray(rows) ||
    rows.length !== artwork.height
  ) {
    return false;
  }

  return rows.every(
    (row) =>
      typeof row === "string" &&
      row.length === artwork.width &&
      AI_ARTWORK_ROW_PATTERN.test(row) &&
      Array.from(row).every((symbol) => {
        const paletteIndex = AI_ARTWORK_PALETTE_INDEX_SYMBOLS.indexOf(symbol);
        return (
          paletteIndex >= AI_PALETTE_CONFIG.minPaletteIndex &&
          paletteIndex < paletteLength
        );
      }),
  );
};

export const isAiArtworkCreationPrompt = (prompt: string): boolean => {
  const normalizedPrompt = prompt.trim();
  if (AI_ARTWORK_EXPLICIT_ACTION_PATTERN.test(normalizedPrompt)) return true;
  if (AI_ARTWORK_EDIT_ONLY_PATTERN.test(normalizedPrompt)) return false;
  return (
    AI_ARTWORK_CREATE_SUBJECT_PATTERN.test(normalizedPrompt) ||
    AI_ARTWORK_DIRECT_DESCRIPTION_PATTERN.test(normalizedPrompt) ||
    AI_ARTWORK_SUBJECT_PATTERN.test(normalizedPrompt)
  );
};

export const hasAiArtworkColorVariation = (artwork: AiArtwork): boolean =>
  new Set(artwork.rows.join("")).size >=
  AI_PALETTE_CONFIG.minArtworkUsedColors;

export const createAiArtworkPatternGrid = (
  artwork: AiArtwork,
  palette: readonly AiPaletteColor[],
  dimensions: AiPaletteDimensions = artwork,
): AiArtworkPatternCell[][] =>
  Array.from({ length: dimensions.height }, (_, targetRowIndex) => {
    const sourceRowIndex = Math.floor(
      (targetRowIndex * artwork.height) / dimensions.height,
    );
    const sourceRow = artwork.rows[sourceRowIndex];
    return Array.from({ length: dimensions.width }, (_, targetColumnIndex) => {
      const sourceColumnIndex = Math.floor(
        (targetColumnIndex * artwork.width) / dimensions.width,
      );
      const symbol = sourceRow?.[sourceColumnIndex] ?? "";
      const paletteIndex = AI_ARTWORK_PALETTE_INDEX_SYMBOLS.indexOf(symbol);
      const color = palette[paletteIndex];
      if (!color) {
        throw new RangeError("AI artwork references an unavailable color.");
      }
      return {
        color: color.hex.toUpperCase(),
        ...(color.name ? { colorName: color.name } : {}),
      };
    });
  });

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
  | "set_artwork"
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
  artwork?: AiArtwork;
  question?: string;
}
