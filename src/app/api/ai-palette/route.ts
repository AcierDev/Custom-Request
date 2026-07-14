import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  generateText,
  LoadAPIKeyError,
  NoObjectGeneratedError,
  Output,
} from "ai";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  AI_PALETTE_COLOR_PATTERNS,
  AI_PALETTE_CONFIG,
  AI_PALETTE_ORIENTATIONS,
  HEX_COLOR_PATTERN,
  type AiPaletteColor,
  type AiPaletteResponse,
} from "@/lib/aiPalette";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🛡️ REQUEST BOUNDS                                                   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const HTTP_STATUS = {
  badRequest: 400,
  unauthorized: 401,
  paymentRequired: 402,
  forbidden: 403,
  requestTimeout: 408,
  payloadTooLarge: 413,
  unprocessableContent: 422,
  tooManyRequests: 429,
  internalServerError: 500,
  badGateway: 502,
  serviceUnavailable: 503,
  gatewayTimeout: 504,
} as const;

const MILLISECONDS_PER_SECOND = 1_000;
const FIRST_FORWARDED_ADDRESS_INDEX = 0;
const INITIAL_REQUEST_COUNT = 1;
const REQUEST_COUNT_INCREMENT = 1;
const EMPTY_BYTE_COUNT = 0;
const FALLBACK_CLIENT_KEY = "unknown-client";
const CACHE_CONTROL_HEADERS = { "Cache-Control": "no-store" } as const;
const AI_ERROR_NAME = {
  abort: "AbortError",
  timeoutDom: "TimeoutError",
} as const;

class RequestBodyTooLargeError extends Error {}

const inputColorSchema = z.object({
  hex: z.string().regex(HEX_COLOR_PATTERN),
  name: z
    .string()
    .trim()
    .max(AI_PALETTE_CONFIG.maxColorNameLength)
    .optional(),
});

const generatedColorSchema = z.object({
  hex: z.string().regex(HEX_COLOR_PATTERN),
  name: z.string().trim().max(AI_PALETTE_CONFIG.maxColorNameLength),
});

const patternSchema = z.object({
  colorPattern: z.enum(AI_PALETTE_COLOR_PATTERNS),
  orientation: z.enum(AI_PALETTE_ORIENTATIONS),
  isReversed: z.boolean(),
  isRotated: z.boolean(),
});

const requestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(AI_PALETTE_CONFIG.minPromptLength)
    .max(AI_PALETTE_CONFIG.maxPromptLength),
  currentPalette: z
    .array(inputColorSchema)
    .min(AI_PALETTE_CONFIG.minPaletteColors)
    .max(AI_PALETTE_CONFIG.maxPaletteColors),
  pattern: patternSchema,
});

const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("replace_colors"),
    sourceIndexes: z
      .array(
        z
          .number()
          .int()
          .min(AI_PALETTE_CONFIG.minPaletteIndex)
          .max(AI_PALETTE_CONFIG.maxPaletteIndex)
      )
      .min(AI_PALETTE_CONFIG.minPaletteColors)
      .max(AI_PALETTE_CONFIG.maxPaletteColors),
    replacement: generatedColorSchema,
    pattern: patternSchema,
  }),
  z.object({
    type: z.literal("set_palette"),
    palette: z
      .array(generatedColorSchema)
      .min(AI_PALETTE_CONFIG.minPaletteColors)
      .max(AI_PALETTE_CONFIG.maxPaletteColors),
    pattern: patternSchema,
  }),
]);

const outputSchema = z.object({ command: commandSchema });

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitEntries = new Map<string, RateLimitEntry>();

function getClientKey(request: NextRequest): string {
  const forwardedAddress = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .at(FIRST_FORWARDED_ADDRESS_INDEX)
    ?.trim();

  return (
    forwardedAddress ??
    request.headers.get("x-real-ip") ??
    FALLBACK_CLIENT_KEY
  );
}

function removeExpiredRateLimitEntries(now: number): void {
  for (const [key, entry] of rateLimitEntries) {
    if (entry.resetAt <= now) rateLimitEntries.delete(key);
  }
}

function removeOldestRateLimitEntry(): void {
  let oldestKey: string | null = null;
  let oldestResetAt = Number.POSITIVE_INFINITY;

  for (const [key, entry] of rateLimitEntries) {
    if (entry.resetAt < oldestResetAt) {
      oldestKey = key;
      oldestResetAt = entry.resetAt;
    }
  }

  if (oldestKey) rateLimitEntries.delete(oldestKey);
}

function consumeRateLimit(clientKey: string): number | null {
  const now = Date.now();
  removeExpiredRateLimitEntries(now);

  const currentEntry = rateLimitEntries.get(clientKey);
  if (!currentEntry) {
    if (rateLimitEntries.size >= AI_PALETTE_CONFIG.rateLimitMaxEntries) {
      removeOldestRateLimitEntry();
    }

    rateLimitEntries.set(clientKey, {
      count: INITIAL_REQUEST_COUNT,
      resetAt: now + AI_PALETTE_CONFIG.rateLimitWindowMs,
    });
    return null;
  }

  if (currentEntry.count >= AI_PALETTE_CONFIG.rateLimitMaxRequests) {
    return Math.ceil(
      (currentEntry.resetAt - now) / MILLISECONDS_PER_SECOND
    );
  }

  currentEntry.count += REQUEST_COUNT_INCREMENT;
  return null;
}

function getOpenRouterApiKey(): string | null {
  return process.env.OPENROUTER_API_KEY?.trim() || null;
}

function getModelId(): string {
  return process.env.AI_PALETTE_MODEL?.trim() || AI_PALETTE_CONFIG.defaultModel;
}

function getModel(apiKey: string) {
  const openrouter = createOpenRouter({
    apiKey,
    compatibility: "strict",
  });

  return openrouter.chat(getModelId(), {
    provider: { require_parameters: true },
  });
}

async function parseBoundedJsonRequest(request: NextRequest): Promise<unknown> {
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader
    ? Number(contentLengthHeader)
    : Number.NaN;
  if (
    Number.isFinite(contentLength) &&
    contentLength > AI_PALETTE_CONFIG.maxRequestBytes
  ) {
    throw new RequestBodyTooLargeError();
  }

  if (!request.body) return JSON.parse("");

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = EMPTY_BYTE_COUNT;
  let body = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    receivedBytes += value.byteLength;
    if (receivedBytes > AI_PALETTE_CONFIG.maxRequestBytes) {
      await reader.cancel();
      throw new RequestBodyTooLargeError();
    }
    body += decoder.decode(value, { stream: true });
  }

  body += decoder.decode();
  return JSON.parse(body);
}

function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function getErrorStatusCode(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  if (typeof statusCode === "number") return statusCode;
  return getErrorStatusCode((error as { cause?: unknown }).cause);
}

function isAuthenticationError(error: unknown): boolean {
  const statusCode = getErrorStatusCode(error);
  return (
    LoadAPIKeyError.isInstance(error) ||
    statusCode === HTTP_STATUS.unauthorized ||
    statusCode === HTTP_STATUS.forbidden
  );
}

function isRateLimitError(error: unknown): boolean {
  return getErrorStatusCode(error) === HTTP_STATUS.tooManyRequests;
}

function isTimeoutError(error: unknown): boolean {
  const errorName = getErrorName(error);
  const statusCode = getErrorStatusCode(error);
  return (
    errorName === AI_ERROR_NAME.abort ||
    errorName === AI_ERROR_NAME.timeoutDom ||
    statusCode === HTTP_STATUS.requestTimeout ||
    statusCode === HTTP_STATUS.gatewayTimeout
  );
}

function normalizeColor(color: AiPaletteColor): AiPaletteColor {
  return {
    hex: color.hex.toUpperCase(),
    name: color.name?.trim() ?? "",
  };
}

function buildSystemPrompt(): string {
  return `You convert a user's natural-language request into one palette command.

Rules:
- Use replace_colors for a simple request that changes one described existing color to one replacement color. sourceIndexes are zero-based indexes into currentPalette. Include every matching slot and change nothing else.
- Use set_palette for a new palette, a gradient/ramp, reordering, multiple different replacements, or any broader edit.
- Always return the complete pattern settings. Preserve current pattern settings unless the user asks to change layout or direction.
- Use colorPattern "fade" when creating any gradient, ramp, or directional transition. Preserve other existing colorPattern values unless the user explicitly requests a different arrangement.
- Preserve all unspecified colors, their order, and their names exactly.
- Hex colors must be uppercase six-digit values beginning with #.
- If a new palette's color count is unspecified, generate exactly ${AI_PALETTE_CONFIG.defaultGeneratedColorCount} useful colors.
- "Left to right" means ordered palette colors from left to right with colorPattern "fade", orientation "horizontal", isReversed false, and isRotated false.
- "Right to left" uses that same setup with the palette ordered from right to left.
- "Top to bottom" means ordered palette colors from top to bottom with colorPattern "fade", orientation "vertical", isReversed false, and isRotated false.
- "Bottom to top" uses that same setup with the palette ordered from bottom to top.
- Requests unrelated to palette colors or their layout must preserve the current palette and pattern via set_palette.`;
}

function resolveCommand(
  command: z.infer<typeof commandSchema>,
  currentPalette: AiPaletteColor[]
): AiPaletteResponse {
  if (command.type === "set_palette") {
    return {
      operation: command.type,
      palette: command.palette.map(normalizeColor),
      pattern: command.pattern,
      replacements: [],
    };
  }

  const validSourceIndexes = new Set(
    command.sourceIndexes.filter((index) => index < currentPalette.length)
  );

  if (!validSourceIndexes.size) {
    throw new RangeError("Generated replacement indexes are out of range.");
  }

  const replacement = normalizeColor(command.replacement);
  return {
    operation: command.type,
    palette: currentPalette.map((color, index) =>
      validSourceIndexes.has(index) ? replacement : normalizeColor(color)
    ),
    pattern: command.pattern,
    replacements: Array.from(validSourceIndexes).map((index) => ({
      sourceHex: currentPalette[index].hex.toUpperCase(),
      replacement,
    })),
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ✨ PALETTE GENERATION                                               ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export async function POST(request: NextRequest) {
  const openRouterApiKey = getOpenRouterApiKey();
  if (!openRouterApiKey) {
    return NextResponse.json(
      { error: "AI palette editing is not configured yet." },
      {
        status: HTTP_STATUS.serviceUnavailable,
        headers: CACHE_CONTROL_HEADERS,
      }
    );
  }

  const retryAfterSeconds = consumeRateLimit(getClientKey(request));
  if (retryAfterSeconds !== null) {
    return NextResponse.json(
      { error: "Too many palette requests. Try again shortly." },
      {
        status: HTTP_STATUS.tooManyRequests,
        headers: {
          ...CACHE_CONTROL_HEADERS,
          "Retry-After": String(retryAfterSeconds),
        },
      }
    );
  }

  let requestBody: unknown;
  try {
    requestBody = await parseBoundedJsonRequest(request);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { error: "Palette request is too large." },
        {
          status: HTTP_STATUS.payloadTooLarge,
          headers: CACHE_CONTROL_HEADERS,
        }
      );
    }
    return NextResponse.json(
      { error: "Invalid JSON request." },
      {
        status: HTTP_STATUS.badRequest,
        headers: CACHE_CONTROL_HEADERS,
      }
    );
  }

  const parsedRequest = requestSchema.safeParse(requestBody);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "Invalid palette prompt request." },
      {
        status: HTTP_STATUS.badRequest,
        headers: CACHE_CONTROL_HEADERS,
      }
    );
  }

  try {
    const { output } = await generateText({
      model: getModel(openRouterApiKey),
      system: buildSystemPrompt(),
      prompt: JSON.stringify(parsedRequest.data),
      output: Output.object({
        name: "palette_command",
        description: "A validated command that edits the current palette.",
        schema: outputSchema,
      }),
      maxOutputTokens: AI_PALETTE_CONFIG.maxOutputTokens,
      abortSignal: AbortSignal.timeout(AI_PALETTE_CONFIG.requestTimeoutMs),
    });

    const response = resolveCommand(
      output.command,
      parsedRequest.data.currentPalette
    );

    return NextResponse.json(response, { headers: CACHE_CONTROL_HEADERS });
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json(
        { error: "The palette request could not be applied." },
        {
          status: HTTP_STATUS.unprocessableContent,
          headers: CACHE_CONTROL_HEADERS,
        }
      );
    }

    if (NoObjectGeneratedError.isInstance(error)) {
      return NextResponse.json(
        { error: "The AI could not interpret that palette request." },
        {
          status: HTTP_STATUS.unprocessableContent,
          headers: CACHE_CONTROL_HEADERS,
        }
      );
    }

    if (isAuthenticationError(error)) {
      return NextResponse.json(
        { error: "AI palette editing is not configured yet." },
        {
          status: HTTP_STATUS.serviceUnavailable,
          headers: CACHE_CONTROL_HEADERS,
        }
      );
    }

    if (getErrorStatusCode(error) === HTTP_STATUS.paymentRequired) {
      return NextResponse.json(
        { error: "AI palette editing needs OpenRouter credits." },
        {
          status: HTTP_STATUS.serviceUnavailable,
          headers: CACHE_CONTROL_HEADERS,
        }
      );
    }

    if (isRateLimitError(error)) {
      return NextResponse.json(
        { error: "The AI service is busy. Try again shortly." },
        {
          status: HTTP_STATUS.tooManyRequests,
          headers: CACHE_CONTROL_HEADERS,
        }
      );
    }

    if (isTimeoutError(error)) {
      return NextResponse.json(
        { error: "Palette generation timed out. Please try again." },
        {
          status: HTTP_STATUS.gatewayTimeout,
          headers: CACHE_CONTROL_HEADERS,
        }
      );
    }

    const upstreamStatusCode = getErrorStatusCode(error);
    const responseStatus =
      upstreamStatusCode !== null &&
      upstreamStatusCode >= HTTP_STATUS.internalServerError
        ? HTTP_STATUS.badGateway
        : HTTP_STATUS.internalServerError;
    console.error("AI palette request failed.", {
      name: getErrorName(error),
      statusCode: upstreamStatusCode,
    });
    return NextResponse.json(
      { error: "Palette generation failed. Please try again." },
      {
        status: responseStatus,
        headers: CACHE_CONTROL_HEADERS,
      }
    );
  }
}
