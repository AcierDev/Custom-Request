"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCustomStore,
  type CustomMode,
  type PatternCell,
} from "@/store/customStore";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { ItemDesigns } from "@/typings/types";
import {
  AI_PALETTE_COLOR_PATTERNS,
  AI_PALETTE_CONFIG,
  AI_PALETTE_ORIENTATIONS,
  AI_SQUARE_DIRECTIONS,
  HEX_COLOR_PATTERN,
  type AiPaletteColor,
  type AiPaletteColorPattern,
  type AiPaletteDimensions,
  type AiPalettePattern,
  type AiPaletteRequest,
  type AiPaletteResponse,
  type AiSquareEdit,
} from "@/lib/aiPalette";

interface AiPatternSourceState {
  selectedDesign: ItemDesigns;
  customPalette: readonly AiPaletteColor[];
  activeCustomMode: CustomMode;
  drawnPatternGrid: PatternCell[][] | null;
  colorPattern: string;
  orientation: AiPalettePattern["orientation"];
  isReversed: boolean;
  isRotated: boolean;
  dimensions: AiPaletteDimensions;
}

interface AiThreadMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tone?: "default" | "error";
}

const EMPTY_ITEM_COUNT = 0;
const SINGULAR_ITEM_COUNT = 1;
const AI_PATTERN_PROMPT_ID = "ai-pattern-prompt";
const AI_PATTERN_PROMPT_DESCRIPTION_ID = "ai-pattern-prompt-description";
const AI_PATTERN_PROMPT_ERROR_ID = "ai-pattern-prompt-error";
const AI_EDIT_ERROR_MESSAGE = "Could not update the design. Please try again.";
const AI_EDIT_TIMEOUT_MESSAGE =
  "The AI request timed out. Please try again.";
const AI_EDIT_STALE_MESSAGE =
  "The design changed while AI was working. Submit the prompt again.";
const AI_SQUARE_RESET_TARGETS = ["directions", "visibility", "all"] as const;
const AI_SQUARE_DIRECTION_LABELS = {
  north: "up",
  east: "right",
  south: "down",
  west: "left",
} as const;

const getActivePalette = (
  state: AiPatternSourceState
): AiPaletteColor[] => {
  if (
    state.selectedDesign === ItemDesigns.Custom &&
    state.activeCustomMode === "pattern" &&
    state.drawnPatternGrid
  ) {
    const colorsByHex = new Map<string, AiPaletteColor>();
    state.drawnPatternGrid.forEach((row) => {
      row.forEach((cell) => {
        if (!cell.color) return;
        const hex = cell.color.trim().toUpperCase();
        if (!colorsByHex.has(hex)) {
          colorsByHex.set(hex, { hex, name: cell.colorName });
        }
      });
    });
    return Array.from(colorsByHex.values());
  }

  if (state.selectedDesign === ItemDesigns.Custom) {
    return state.customPalette.map(({ hex, name }) => ({ hex, name }));
  }

  return Object.values(DESIGN_COLORS[state.selectedDesign] ?? {}).map(
    ({ hex, name }) => ({ hex, name })
  );
};

const getActivePattern = (
  state: AiPatternSourceState
): AiPalettePattern => ({
  colorPattern: (
    AI_PALETTE_COLOR_PATTERNS as readonly string[]
  ).includes(state.colorPattern)
    ? (state.colorPattern as AiPaletteColorPattern)
    : AI_PALETTE_CONFIG.defaultColorPattern,
  orientation: state.orientation,
  isReversed: state.isReversed,
  isRotated: state.isRotated,
});

const createSourceFingerprint = (state: AiPatternSourceState): string =>
  JSON.stringify({
    selectedDesign: state.selectedDesign,
    activeCustomMode: state.activeCustomMode,
    palette: getActivePalette(state),
    pattern: getActivePattern(state),
    dimensions: state.dimensions,
    drawnPatternGrid:
      state.activeCustomMode === "pattern" ? state.drawnPatternGrid : null,
  });

const hasValidSourceColorIndexes = (
  sourceColorIndexes: unknown
): sourceColorIndexes is number[] =>
  Array.isArray(sourceColorIndexes) &&
  sourceColorIndexes.every(
    (index) =>
      Number.isInteger(index) &&
      index >= AI_PALETTE_CONFIG.minPaletteIndex &&
      index <= AI_PALETTE_CONFIG.maxPaletteIndex
  );

const isAiSquareEdit = (value: unknown): value is AiSquareEdit => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as {
    type?: unknown;
    direction?: unknown;
    hidden?: unknown;
    sourceColorIndexes?: unknown;
    target?: unknown;
  };

  if (candidate.type === "direction") {
    return (
      typeof candidate.direction === "string" &&
      (AI_SQUARE_DIRECTIONS as readonly string[]).includes(
        candidate.direction
      ) &&
      hasValidSourceColorIndexes(candidate.sourceColorIndexes)
    );
  }
  if (candidate.type === "visibility") {
    return (
      typeof candidate.hidden === "boolean" &&
      hasValidSourceColorIndexes(candidate.sourceColorIndexes)
    );
  }
  return (
    candidate.type === "reset" &&
    typeof candidate.target === "string" &&
    (AI_SQUARE_RESET_TARGETS as readonly string[]).includes(candidate.target)
  );
};

const isAiPaletteResponse = (value: unknown): value is AiPaletteResponse => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<AiPaletteResponse>;
  if (
    !Array.isArray(candidate.palette) ||
    !candidate.pattern ||
    !Array.isArray(candidate.replacements)
  ) {
    return false;
  }

  const supportedPatterns = AI_PALETTE_COLOR_PATTERNS as readonly string[];
  const supportedOrientations = AI_PALETTE_ORIENTATIONS as readonly string[];
  return (
    (candidate.operation === "replace_colors" ||
      candidate.operation === "set_palette" ||
      candidate.operation === "set_dimensions" ||
      candidate.operation === "edit_squares" ||
      candidate.operation === "ask_question") &&
    (candidate.operation !== "edit_squares" ||
      isAiSquareEdit(candidate.squareEdit)) &&
    (candidate.operation !== "ask_question" ||
      (typeof candidate.question === "string" &&
        candidate.question.trim().length >=
          AI_PALETTE_CONFIG.minPromptLength)) &&
    candidate.palette.length >= AI_PALETTE_CONFIG.minPaletteColors &&
    candidate.palette.length <= AI_PALETTE_CONFIG.maxPaletteColors &&
    candidate.palette.every(
      (color) =>
        color &&
        typeof color.hex === "string" &&
        HEX_COLOR_PATTERN.test(color.hex) &&
        (color.name === undefined || typeof color.name === "string")
    ) &&
    supportedPatterns.includes(candidate.pattern.colorPattern) &&
    supportedOrientations.includes(candidate.pattern.orientation) &&
    typeof candidate.pattern.isReversed === "boolean" &&
    typeof candidate.pattern.isRotated === "boolean" &&
    candidate.dimensions !== undefined &&
    Number.isInteger(candidate.dimensions.width) &&
    candidate.dimensions.width >= AI_PALETTE_CONFIG.minDimensionSquares &&
    candidate.dimensions.width <= AI_PALETTE_CONFIG.maxDimensionSquares &&
    Number.isInteger(candidate.dimensions.height) &&
    candidate.dimensions.height >= AI_PALETTE_CONFIG.minDimensionSquares &&
    candidate.dimensions.height <= AI_PALETTE_CONFIG.maxDimensionSquares &&
    candidate.replacements.every(
      (replacement) =>
        replacement &&
        typeof replacement.sourceHex === "string" &&
        HEX_COLOR_PATTERN.test(replacement.sourceHex) &&
        replacement.replacement &&
        typeof replacement.replacement.hex === "string" &&
        HEX_COLOR_PATTERN.test(replacement.replacement.hex) &&
        (replacement.replacement.name === undefined ||
          typeof replacement.replacement.name === "string")
    )
  );
};

const getAppliedMessage = (response: AiPaletteResponse): string => {
  if (response.operation === "set_dimensions") {
    return `Done — the size is now ${response.dimensions.width} × ${response.dimensions.height} squares.`;
  }
  if (response.operation === "edit_squares" && response.squareEdit) {
    const edit = response.squareEdit;
    if (edit.type === "direction") {
      const scope = edit.sourceColorIndexes.length ? "those squares" : "all squares";
      return `Done — ${scope} now face ${AI_SQUARE_DIRECTION_LABELS[edit.direction]}.`;
    }
    if (edit.type === "visibility") {
      return edit.hidden
        ? "Done — I hid the requested squares."
        : "Done — all hidden squares are visible again.";
    }
    return `Done — I reset ${edit.target === "all" ? "all square edits" : edit.target}.`;
  }
  if (response.operation === "replace_colors") {
    return "Done — I replaced the requested color.";
  }
  return "Done — I updated the palette and pattern.";
};

const getApiErrorMessage = (value: unknown): string => {
  if (!value || typeof value !== "object") return AI_EDIT_ERROR_MESSAGE;
  const error = (value as { error?: unknown }).error;
  return typeof error === "string" ? error : AI_EDIT_ERROR_MESSAGE;
};

export function AiPatternPrompt() {
  const customPalette = useCustomStore((state) => state.customPalette);
  const selectedDesign = useCustomStore((state) => state.selectedDesign);
  const colorPattern = useCustomStore((state) => state.colorPattern);
  const orientation = useCustomStore((state) => state.orientation);
  const isReversed = useCustomStore((state) => state.isReversed);
  const isRotated = useCustomStore((state) => state.isRotated);
  const activeCustomMode = useCustomStore((state) => state.activeCustomMode);
  const drawnPatternGrid = useCustomStore((state) => state.drawnPatternGrid);
  const dimensions = useCustomStore((state) => state.dimensions);
  const applyAiPalette = useCustomStore((state) => state.applyAiPalette);
  const [prompt, setPrompt] = useState("");
  const [threadMessages, setThreadMessages] = useState<AiThreadMessage[]>([]);
  const [clarificationContext, setClarificationContext] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestSequenceRef = useRef(EMPTY_ITEM_COUNT);
  const activeRequestRef = useRef<AbortController | null>(null);

  const sourceState = useMemo<AiPatternSourceState>(
    () => ({
      selectedDesign,
      customPalette,
      activeCustomMode,
      drawnPatternGrid,
      colorPattern,
      orientation,
      isReversed,
      isRotated,
      dimensions,
    }),
    [
      activeCustomMode,
      colorPattern,
      customPalette,
      dimensions,
      drawnPatternGrid,
      isReversed,
      isRotated,
      orientation,
      selectedDesign,
    ]
  );
  const activePalette = useMemo(
    () => getActivePalette(sourceState),
    [sourceState]
  );
  const activePattern = useMemo(
    () => getActivePattern(sourceState),
    [sourceState]
  );
  const sourceFingerprint = useMemo(
    () => createSourceFingerprint(sourceState),
    [sourceState]
  );
  const normalizedPrompt = prompt.trim();
  const canSubmit =
    !isSubmitting &&
    activePalette.length >= AI_PALETTE_CONFIG.minPaletteColors &&
    activePalette.length <= AI_PALETTE_CONFIG.maxPaletteColors &&
    normalizedPrompt.length >= AI_PALETTE_CONFIG.minPromptLength &&
    normalizedPrompt.length <= AI_PALETTE_CONFIG.maxPromptLength;

  useEffect(
    () => () => {
      requestSequenceRef.current += SINGULAR_ITEM_COUNT;
      activeRequestRef.current?.abort();
    },
    []
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const submittedPrompt = normalizedPrompt;
    activeRequestRef.current?.abort();
    requestSequenceRef.current += SINGULAR_ITEM_COUNT;
    const requestSequence = requestSequenceRef.current;
    const abortController = new AbortController();
    activeRequestRef.current = abortController;
    setIsSubmitting(true);
    setErrorMessage(null);
    setPrompt("");
    setThreadMessages((messages) => [
      ...messages,
      {
        id: nanoid(),
        role: "user",
        content: submittedPrompt,
      },
    ]);

    const requestBody: AiPaletteRequest = {
      prompt: submittedPrompt,
      currentPalette: activePalette,
      pattern: activePattern,
      dimensions,
      ...(clarificationContext ? { clarificationContext } : {}),
    };
    const timeoutId = setTimeout(
      () => abortController.abort(),
      AI_PALETTE_CONFIG.clientRequestTimeoutMs
    );

    try {
      const response = await fetch(AI_PALETTE_CONFIG.apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });
      const responseBody: unknown = await response.json().catch(() => null);

      if (requestSequence !== requestSequenceRef.current) return;
      if (!response.ok) throw new Error(getApiErrorMessage(responseBody));
      if (!isAiPaletteResponse(responseBody)) {
        throw new Error(AI_EDIT_ERROR_MESSAGE);
      }
      if (
        createSourceFingerprint(useCustomStore.getState()) !==
        sourceFingerprint
      ) {
        throw new Error(AI_EDIT_STALE_MESSAGE);
      }

      if (responseBody.operation === "ask_question") {
        const question = responseBody.question?.trim();
        if (!question) throw new Error(AI_EDIT_ERROR_MESSAGE);
        setClarificationContext(question);
        setThreadMessages((messages) => [
          ...messages,
          { id: nanoid(), role: "assistant", content: question },
        ]);
        return;
      }

      applyAiPalette(responseBody);
      setClarificationContext(null);
      setThreadMessages((messages) => [
        ...messages,
        {
          id: nanoid(),
          role: "assistant",
          content: getAppliedMessage(responseBody),
        },
      ]);
      toast.success(
        responseBody.operation === "set_dimensions"
          ? `Size updated to ${responseBody.dimensions.width} × ${responseBody.dimensions.height}`
          : "Design updated"
      );
    } catch (error) {
      if (requestSequence !== requestSequenceRef.current) return;
      const message =
        error instanceof Error && error.name === "AbortError"
          ? AI_EDIT_TIMEOUT_MESSAGE
          : error instanceof Error && error.message
            ? error.message
            : AI_EDIT_ERROR_MESSAGE;
      setErrorMessage(message);
      setThreadMessages((messages) => [
        ...messages,
        {
          id: nanoid(),
          role: "assistant",
          content: message,
          tone: "error",
        },
      ]);
    } finally {
      clearTimeout(timeoutId);
      if (requestSequence === requestSequenceRef.current) {
        activeRequestRef.current = null;
        setIsSubmitting(false);
      }
    }
  };

  return (
    <form
      autoComplete="off"
      className="space-y-2 rounded-lg border border-white/10 bg-gray-900/30 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <Label
        htmlFor={AI_PATTERN_PROMPT_ID}
        className="flex items-center gap-2 text-sm font-medium text-slate-100"
      >
        <Sparkles className="h-4 w-4 text-indigo-300" />
        AI design thread
      </Label>
      <div className="h-44 overflow-hidden rounded-md border border-white/10 bg-gray-950/35">
        <Conversation className="h-full">
          <ConversationContent className="gap-2 p-2">
            {threadMessages.length === EMPTY_ITEM_COUNT && !isSubmitting ? (
              <ConversationEmptyState
                icon={<Sparkles className="h-5 w-5" />}
                title="Describe an edit"
                description="I can update colors, squares, layout, and size."
                className="gap-2 p-4 [&_h3]:text-xs [&_p]:text-[0.7rem]"
              />
            ) : (
              threadMessages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent
                    className={
                      message.role === "user"
                        ? "!bg-indigo-500/20 !px-3 !py-2 text-slate-100"
                        : message.tone === "error"
                          ? "rounded-md bg-red-500/10 px-3 py-2 text-red-200"
                          : "rounded-md bg-white/5 px-3 py-2 text-slate-200"
                    }
                  >
                    <MessageResponse className="text-xs leading-relaxed">
                      {message.content}
                    </MessageResponse>
                  </MessageContent>
                </Message>
              ))
            )}
            {isSubmitting && (
              <Message from="assistant">
                <MessageContent className="rounded-md bg-white/5 px-3 py-2 text-slate-300">
                  <span className="flex items-center gap-2 text-xs">
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    Working…
                  </span>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton className="bottom-2 h-7 w-7" />
        </Conversation>
      </div>
      <div className="flex gap-2">
        <Input
          id={AI_PATTERN_PROMPT_ID}
          autoComplete="off"
          value={prompt}
          maxLength={AI_PALETTE_CONFIG.maxPromptLength}
          disabled={isSubmitting}
          placeholder={
            clarificationContext
              ? "Reply to the question…"
              : "Ask for a design change…"
          }
          aria-describedby={
            errorMessage
              ? `${AI_PATTERN_PROMPT_DESCRIPTION_ID} ${AI_PATTERN_PROMPT_ERROR_ID}`
              : AI_PATTERN_PROMPT_DESCRIPTION_ID
          }
          aria-invalid={Boolean(errorMessage)}
          className="min-w-0 border-white/15 bg-gray-900/50 text-slate-100 placeholder:text-slate-500"
          onChange={(event) => {
            setPrompt(event.target.value);
            if (errorMessage) setErrorMessage(null);
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!canSubmit}
          aria-label="Apply AI pattern edit"
          aria-busy={isSubmitting}
          className="shrink-0 bg-indigo-600 text-white hover:bg-indigo-500"
        >
          {isSubmitting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p id={AI_PATTERN_PROMPT_DESCRIPTION_ID} className="text-xs text-slate-500">
        Ask for colors, size, square direction, visibility, or layout.
      </p>
      {errorMessage && (
        <p
          id={AI_PATTERN_PROMPT_ERROR_ID}
          className="sr-only"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </form>
  );
}
