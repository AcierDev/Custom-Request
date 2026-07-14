"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCustomStore,
  type CustomColor,
  type CustomMode,
  type PatternCell,
} from "@/store/customStore";
import {
  LoaderCircle,
  Palette,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { ItemDesigns } from "@/typings/types";
import {
  AI_PALETTE_COLOR_PATTERNS,
  AI_PALETTE_CONFIG,
  AI_PALETTE_ORIENTATIONS,
  HEX_COLOR_PATTERN,
  type AiPaletteColor,
  type AiPaletteColorPattern,
  type AiPalettePattern,
  type AiPaletteRequest,
  type AiPaletteResponse,
} from "@/lib/aiPalette";

interface PaletteColorEditorProps {
  className?: string;
  onClose?: () => void;
}

interface AiPaletteSourceState {
  selectedDesign: ItemDesigns;
  customPalette: readonly AiPaletteColor[];
  activeCustomMode: CustomMode;
  drawnPatternGrid: PatternCell[][] | null;
  colorPattern: string;
  orientation: AiPalettePattern["orientation"];
  isReversed: boolean;
  isRotated: boolean;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 PALETTE COLOR EDITOR                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const DEFAULT_NEW_COLOR = "#8a8a8a";
const EMPTY_ITEM_COUNT = 0;
const SINGULAR_ITEM_COUNT = 1;
const PALETTE_POSITION_OFFSET = 1;
const AI_PALETTE_ERROR_MESSAGE =
  "Could not update the palette. Please try again.";
const AI_PALETTE_TIMEOUT_MESSAGE =
  "The AI request timed out. Please try again.";
const AI_PALETTE_STALE_MESSAGE =
  "The design changed while AI was working. Submit the prompt again.";

const getActiveAiPalette = (
  state: AiPaletteSourceState
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

const getActiveAiPattern = (
  state: AiPaletteSourceState
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

const createAiSourceFingerprint = (state: AiPaletteSourceState): string =>
  JSON.stringify({
    selectedDesign: state.selectedDesign,
    activeCustomMode: state.activeCustomMode,
    palette: getActiveAiPalette(state),
    pattern: getActiveAiPattern(state),
    drawnPatternGrid:
      state.activeCustomMode === "pattern" ? state.drawnPatternGrid : null,
  });

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
      candidate.operation === "set_palette") &&
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

const getApiErrorMessage = (value: unknown): string => {
  if (!value || typeof value !== "object") return AI_PALETTE_ERROR_MESSAGE;
  const error = (value as { error?: unknown }).error;
  return typeof error === "string" ? error : AI_PALETTE_ERROR_MESSAGE;
};

export function PaletteColorEditor({
  className,
  onClose,
}: PaletteColorEditorProps) {
  const customPalette = useCustomStore((s) => s.customPalette);
  const selectedDesign = useCustomStore((s) => s.selectedDesign);
  const colorPattern = useCustomStore((s) => s.colorPattern);
  const orientation = useCustomStore((s) => s.orientation);
  const isReversed = useCustomStore((s) => s.isReversed);
  const isRotated = useCustomStore((s) => s.isRotated);
  const activeCustomMode = useCustomStore((s) => s.activeCustomMode);
  const drawnPatternGrid = useCustomStore((s) => s.drawnPatternGrid);
  const setCustomPalette = useCustomStore((s) => s.setCustomPalette);
  const applyAiPalette = useCustomStore((s) => s.applyAiPalette);
  const addCustomColor = useCustomStore((s) => s.addCustomColor);
  const removeCustomColor = useCustomStore((s) => s.removeCustomColor);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiSubmitting, setIsAiSubmitting] = useState(false);
  const aiRequestSequenceRef = useRef(EMPTY_ITEM_COUNT);
  const activeAiRequestRef = useRef<AbortController | null>(null);

  const aiSourceState = useMemo<AiPaletteSourceState>(
    () => ({
      selectedDesign,
      customPalette,
      activeCustomMode,
      drawnPatternGrid,
      colorPattern,
      orientation,
      isReversed,
      isRotated,
    }),
    [
      activeCustomMode,
      colorPattern,
      customPalette,
      drawnPatternGrid,
      isReversed,
      isRotated,
      orientation,
      selectedDesign,
    ]
  );
  const activePalette = useMemo(
    () => getActiveAiPalette(aiSourceState),
    [aiSourceState]
  );
  const activeAiPattern = useMemo(
    () => getActiveAiPattern(aiSourceState),
    [aiSourceState]
  );
  const aiSourceFingerprint = useMemo(
    () => createAiSourceFingerprint(aiSourceState),
    [aiSourceState]
  );
  const normalizedAiPrompt = aiPrompt.trim();
  const canSubmitAiPrompt =
    !isAiSubmitting &&
    normalizedAiPrompt.length >= AI_PALETTE_CONFIG.minPromptLength &&
    normalizedAiPrompt.length <= AI_PALETTE_CONFIG.maxPromptLength;

  useEffect(
    () => () => {
      aiRequestSequenceRef.current += SINGULAR_ITEM_COUNT;
      activeAiRequestRef.current?.abort();
    },
    []
  );

  const handleHexChange = useCallback(
    (index: number, hex: string) => {
      const next: CustomColor[] = customPalette.map((color, i) =>
        i === index ? { ...color, hex } : color
      );
      setCustomPalette(next);
    },
    [customPalette, setCustomPalette]
  );

  const handleNameChange = useCallback(
    (index: number, name: string) => {
      const next: CustomColor[] = customPalette.map((color, i) =>
        i === index ? { ...color, name } : color
      );
      setCustomPalette(next);
    },
    [customPalette, setCustomPalette]
  );

  const handleAiPromptSubmit = useCallback(async () => {
    if (!canSubmitAiPrompt) return;

    activeAiRequestRef.current?.abort();
    aiRequestSequenceRef.current += SINGULAR_ITEM_COUNT;
    const requestSequence = aiRequestSequenceRef.current;
    const abortController = new AbortController();
    activeAiRequestRef.current = abortController;
    setIsAiSubmitting(true);
    setAiError(null);

    const requestBody: AiPaletteRequest = {
      prompt: normalizedAiPrompt,
      currentPalette: activePalette,
      pattern: activeAiPattern,
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

      if (requestSequence !== aiRequestSequenceRef.current) return;
      if (!response.ok) throw new Error(getApiErrorMessage(responseBody));
      if (!isAiPaletteResponse(responseBody)) {
        throw new Error(AI_PALETTE_ERROR_MESSAGE);
      }
      if (
        createAiSourceFingerprint(useCustomStore.getState()) !==
        aiSourceFingerprint
      ) {
        throw new Error(AI_PALETTE_STALE_MESSAGE);
      }

      applyAiPalette(responseBody);
      setAiPrompt("");
      toast.success("Palette updated");
    } catch (error) {
      if (requestSequence !== aiRequestSequenceRef.current) return;
      const message =
        error instanceof Error && error.name === "AbortError"
          ? AI_PALETTE_TIMEOUT_MESSAGE
          : error instanceof Error && error.message
          ? error.message
          : AI_PALETTE_ERROR_MESSAGE;
      setAiError(message);
    } finally {
      clearTimeout(timeoutId);
      if (requestSequence === aiRequestSequenceRef.current) {
        activeAiRequestRef.current = null;
        setIsAiSubmitting(false);
      }
    }
  }, [
    activeAiPattern,
    activePalette,
    applyAiPalette,
    aiSourceFingerprint,
    canSubmitAiPrompt,
    normalizedAiPrompt,
  ]);

  const handleClose = useCallback(() => {
    aiRequestSequenceRef.current += SINGULAR_ITEM_COUNT;
    activeAiRequestRef.current?.abort();
    activeAiRequestRef.current = null;
    setIsAiSubmitting(false);
    onClose?.();
  }, [onClose]);

  return (
    <Card
      className={cn("glass-surface rounded-[0.7rem] shadow-xl", className)}
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/60 px-4 py-3 backdrop-blur-xl rounded-t-[0.7rem]">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
            <Palette className="h-4 w-4 text-indigo-300" />
            Palette Editor
          </div>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={handleClose}
              aria-label="Close palette editor"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* AI palette prompt */}
        <form
          className="space-y-2 border-b border-white/10 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleAiPromptSubmit();
          }}
        >
          <Label
            htmlFor="ai-palette-prompt"
            className="flex items-center gap-2 text-sm font-medium text-slate-100"
          >
            <Sparkles className="h-4 w-4 text-indigo-300" />
            Edit with AI
          </Label>
          <div className="flex gap-2">
            <Input
              id="ai-palette-prompt"
              value={aiPrompt}
              maxLength={AI_PALETTE_CONFIG.maxPromptLength}
              disabled={isAiSubmitting}
              placeholder="Replace orange with white"
              className="min-w-0 border-white/15 bg-gray-900/50 text-slate-100 placeholder:text-slate-500"
              onChange={(event) => {
                setAiPrompt(event.target.value);
                if (aiError) setAiError(null);
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!canSubmitAiPrompt}
              aria-label="Apply AI palette edit"
              aria-busy={isAiSubmitting}
              className="shrink-0 bg-indigo-600 text-white hover:bg-indigo-500"
            >
              {isAiSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Try “make a white-to-blue palette from left to right.”
          </p>
          {aiError && (
            <p className="text-xs text-red-300" role="alert">
              {aiError}
            </p>
          )}
        </form>

        {/* Color list */}
        <div className="p-3 space-y-2">
          {customPalette.length === 0 ? (
            <p className="px-1 py-4 text-center text-sm text-gray-400">
              No colors yet. Add one to start your palette.
            </p>
          ) : (
            customPalette.map((color, index) => (
              <div
                key={color.id}
                className="flex items-center gap-2 rounded-md border border-white/10 bg-gray-900/40 px-2 py-2"
              >
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) => handleHexChange(index, e.target.value)}
                  aria-label={`Color ${index + PALETTE_POSITION_OFFSET}`}
                  className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-white/15 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={color.name ?? ""}
                  placeholder={`Color ${index + PALETTE_POSITION_OFFSET}`}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-white/10 bg-gray-900/60 px-2 py-1 text-sm text-gray-200 placeholder:text-gray-500 focus:border-indigo-400/60 focus:outline-none"
                />
                <span className="shrink-0 font-mono text-xs uppercase text-gray-400">
                  {color.hex}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-md text-gray-400 hover:bg-red-900/30 hover:text-red-300"
                  onClick={() => removeCustomColor(index)}
                  aria-label={`Remove color ${index + PALETTE_POSITION_OFFSET}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Add color */}
        <div className="border-t border-white/10 p-3">
          <Button
            type="button"
            variant="outline"
            className="w-full border-white/15 bg-gray-900/40 text-gray-200 hover:bg-gray-900/60 hover:text-white"
            onClick={() => addCustomColor(DEFAULT_NEW_COLOR)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Color
          </Button>
        </div>
      </div>
    </Card>
  );
}
