"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  calculateSquareLayout,
  getColorEntries,
  isExactMiniSize,
} from "@/components/preview/patternUtils";
import { useCustomStore } from "@/store/customStore";
import { ItemDesigns, type Dimensions } from "@/typings/types";
import {
  canGenerateWavePattern,
  generateOrientedWavePatternOverrides,
  generateWavePatternOverrides,
  regenerateActiveWavePatternForGridSizeChange,
  STANDARD_WAVE_PATTERN_ORIENTATION,
  transformCurrentWavePatternOverrides,
  WAVE_PATTERN_CONFIG,
  WAVE_PATTERN_TRANSFORMS,
  type WavePatternGridSize,
  type WavePatternOrientation,
  type WavePatternTransform,
} from "@/lib/wavePattern";

const LAYOUT_PROBE_SQUARE_SIZE = 1;
const LAYOUT_PROBE_SQUARE_SPACING = 1;

interface WavePatternGridSource {
  dimensions: Dimensions;
  useMini: boolean;
  hasDrawnPattern: boolean;
  drawnPatternGridSize: WavePatternGridSize | null;
}

export const getWavePatternGridSize = ({
  dimensions,
  useMini,
  hasDrawnPattern,
  drawnPatternGridSize,
}: WavePatternGridSource): WavePatternGridSize => {
  if (hasDrawnPattern && drawnPatternGridSize) {
    return { ...drawnPatternGridSize };
  }

  const modelSize = dimensions;
  const layout = calculateSquareLayout(
    modelSize.width,
    modelSize.height,
    LAYOUT_PROBE_SQUARE_SIZE,
    LAYOUT_PROBE_SQUARE_SPACING,
    useMini,
    isExactMiniSize(modelSize.width, modelSize.height),
  );
  return {
    width: layout.adjustedModelWidth,
    height: layout.adjustedModelHeight,
  };
};

interface WavePatternOptionViewProps {
  canApplyWave: boolean;
  onApplyWave: () => void;
  onFlipWave: () => void;
  onMirrorWave: () => void;
  cornerColorAmountPercent: number;
  onCornerColorAmountChange: (amount: number) => void;
}

export function WavePatternOptionView({
  canApplyWave,
  onApplyWave,
  onFlipWave,
  onMirrorWave,
  cornerColorAmountPercent,
  onCornerColorAmountChange,
}: WavePatternOptionViewProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-indigo-400/20 bg-indigo-500/10">
            <Waves className="h-4 w-4 text-indigo-300" />
          </span>
          <p className="text-xs font-medium text-slate-300">Wave pattern</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 border-indigo-400/25 bg-indigo-500/10 px-2 text-xs text-indigo-200 hover:bg-indigo-500/20 hover:text-white"
            disabled={!canApplyWave}
            onClick={onApplyWave}
          >
            Apply wave
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 border-indigo-400/25 bg-indigo-500/10 px-2 text-xs text-indigo-200 hover:bg-indigo-500/20 hover:text-white"
            disabled={!canApplyWave}
            onClick={onFlipWave}
          >
            Flip
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 border-indigo-400/25 bg-indigo-500/10 px-2 text-xs text-indigo-200 hover:bg-indigo-500/20 hover:text-white"
            disabled={!canApplyWave}
            onClick={onMirrorWave}
          >
            Mirror
          </Button>
        </div>
      </div>
      <div className="space-y-1.5 pl-10">
        <div className="flex items-center justify-between gap-2 text-[0.7rem]">
          <span className="text-slate-400">Corner color amount</span>
          <span className="font-mono text-slate-300">
            {cornerColorAmountPercent}%
          </span>
        </div>
        <Slider
          aria-label="Corner color amount"
          min={WAVE_PATTERN_CONFIG.minimumCornerColorAmountPercent}
          max={WAVE_PATTERN_CONFIG.maximumCornerColorAmountPercent}
          step={WAVE_PATTERN_CONFIG.cornerColorAmountStepPercent}
          value={[cornerColorAmountPercent]}
          disabled={!canApplyWave}
          onValueChange={([amount]) => onCornerColorAmountChange(amount)}
        />
      </div>
    </div>
  );
}

export function WavePatternOption() {
  const selectedDesign = useCustomStore((state) => state.selectedDesign);
  const customPalette = useCustomStore((state) => state.customPalette);
  const dimensions = useCustomStore((state) => state.dimensions);
  const useMini = useCustomStore((state) => state.useMini);
  const activeCustomMode = useCustomStore((state) => state.activeCustomMode);
  const drawnPatternGrid = useCustomStore((state) => state.drawnPatternGrid);
  const drawnPatternGridSize = useCustomStore(
    (state) => state.drawnPatternGridSize,
  );
  const patternOverride = useCustomStore((state) => state.patternOverride);
  const setPatternOverride = useCustomStore(
    (state) => state.setPatternOverride,
  );
  const [cornerColorAmountPercent, setCornerColorAmountPercent] = useState<number>(
    WAVE_PATTERN_CONFIG.defaultCornerColorAmountPercent,
  );
  const [waveOrientation, setWaveOrientation] =
    useState<WavePatternOrientation>({
      ...STANDARD_WAVE_PATTERN_ORIENTATION,
    });

  const colorCount = useMemo(
    () => getColorEntries(selectedDesign, customPalette).length,
    [customPalette, selectedDesign],
  );
  const hasDrawnPattern =
    selectedDesign === ItemDesigns.Custom &&
    Boolean(drawnPatternGrid && drawnPatternGridSize) &&
    activeCustomMode === "pattern";
  const gridSize = useMemo(
    () =>
      getWavePatternGridSize({
        dimensions,
        useMini,
        hasDrawnPattern,
        drawnPatternGridSize,
      }),
    [dimensions, drawnPatternGridSize, hasDrawnPattern, useMini],
  );
  const canApplyWave = canGenerateWavePattern(gridSize, colorCount);
  const isWaveActiveRef = useRef(false);
  const previousGridSizeRef = useRef<WavePatternGridSize>(gridSize);

  useEffect(() => {
    isWaveActiveRef.current = false;
    setCornerColorAmountPercent(
      WAVE_PATTERN_CONFIG.defaultCornerColorAmountPercent,
    );
    setWaveOrientation({ ...STANDARD_WAVE_PATTERN_ORIENTATION });
  }, [customPalette, selectedDesign]);

  useEffect(() => {
    const previousGridSize = previousGridSizeRef.current;
    previousGridSizeRef.current = gridSize;
    const overrides = regenerateActiveWavePatternForGridSizeChange(
      previousGridSize,
      gridSize,
      isWaveActiveRef.current,
      colorCount,
      cornerColorAmountPercent,
      waveOrientation,
    );
    if (!overrides || !Object.keys(overrides).length) return;
    setPatternOverride(overrides);
  }, [
    colorCount,
    cornerColorAmountPercent,
    gridSize,
    setPatternOverride,
    waveOrientation,
  ]);

  const applyWave = useCallback(() => {
    const overrides = generateWavePatternOverrides(
      gridSize,
      colorCount,
      WAVE_PATTERN_TRANSFORMS.standard,
      cornerColorAmountPercent,
    );
    if (!Object.keys(overrides).length) return;
    isWaveActiveRef.current = true;
    setWaveOrientation({ ...STANDARD_WAVE_PATTERN_ORIENTATION });
    setPatternOverride(overrides);
  }, [colorCount, cornerColorAmountPercent, gridSize, setPatternOverride]);
  const transformWave = useCallback(
    (transform: WavePatternTransform) => {
      const overrides = transformCurrentWavePatternOverrides(
        gridSize,
        colorCount,
        patternOverride,
        transform,
        cornerColorAmountPercent,
      );
      if (!Object.keys(overrides).length) return;
      isWaveActiveRef.current = true;
      setWaveOrientation((currentOrientation) =>
        transform === WAVE_PATTERN_TRANSFORMS.flip
          ? {
              ...currentOrientation,
              isFlipped: !currentOrientation.isFlipped,
            }
          : {
              ...currentOrientation,
              isMirrored: !currentOrientation.isMirrored,
            },
      );
      setPatternOverride(overrides);
    },
    [
      colorCount,
      cornerColorAmountPercent,
      gridSize,
      patternOverride,
      setPatternOverride,
    ],
  );
  const flipWave = useCallback(
    () => transformWave(WAVE_PATTERN_TRANSFORMS.flip),
    [transformWave],
  );
  const mirrorWave = useCallback(
    () => transformWave(WAVE_PATTERN_TRANSFORMS.mirror),
    [transformWave],
  );
  const updateCornerColorAmount = useCallback(
    (amount: number) => {
      setCornerColorAmountPercent(amount);
      const overrides = generateOrientedWavePatternOverrides(
        gridSize,
        colorCount,
        amount,
        waveOrientation,
      );
      if (!Object.keys(overrides).length) return;
      isWaveActiveRef.current = true;
      setPatternOverride(overrides);
    },
    [colorCount, gridSize, setPatternOverride, waveOrientation],
  );

  return (
    <WavePatternOptionView
      canApplyWave={canApplyWave}
      onApplyWave={applyWave}
      onFlipWave={flipWave}
      onMirrorWave={mirrorWave}
      cornerColorAmountPercent={cornerColorAmountPercent}
      onCornerColorAmountChange={updateCornerColorAmount}
    />
  );
}
