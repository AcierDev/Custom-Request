"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useCustomStore,
  type CustomColor,
  type PatternColorOverrides,
  type PatternDirectionOverrides,
  type PatternHiddenOverrides,
  type SquareDirection,
  type ViewerPaletteVersion,
} from "@/store/customStore";
import {
  generateColorMap,
  getColorEntries,
  getPatternSquareKey,
} from "@/components/preview/patternUtils";
import { ItemDesigns } from "@/typings/types";
import { cn } from "@/lib/utils";
import { normalizePaletteBlendPercent } from "@/lib/paletteBlend";

const PREVIEW_GRID_WIDTH = 24;
const PREVIEW_GRID_HEIGHT = 12;
const PREVIEW_TILE_SIZE_PX = 6;
const PREVIEW_TILE_DEPTH_PX = 1;
const PREVIEW_ROTATE_X_DEGREES = 54;
const PREVIEW_ROTATE_Z_DEGREES = -8;
const PREVIEW_HIGHLIGHT_MIX_PERCENT = 72;
const PREVIEW_SIDE_MIX_PERCENT = 58;
const PREVIEW_CENTER_TRANSLATE_PERCENT = 50;
const PREVIEW_HIDDEN_TILE_OPACITY = 0;
const ARRAY_START_INDEX = 0;
const ARRAY_INDEX_OFFSET = 1;
const DEFAULT_COLOR_INDEX = 0;
const DEFAULT_EXTRA_PERCENT = 0;
const CURRENT_VIEWER_COLOR_ID_PREFIX = "viewer-current";
const PREVIEW_SOUTH_DIRECTION_INDEX = 2;
const PREVIEW_WEST_DIRECTION_INDEX = 3;
const SCROLL_EDGE_TOLERANCE_PX = 1;
const PREVIEW_GRADIENT_DIRECTIONS = [
  "to bottom",
  "to left",
  "to top",
  "to right",
] as const;
const PREVIEW_DIRECTION_COUNT = PREVIEW_GRADIENT_DIRECTIONS.length;
const PREVIEW_DIRECTION_INDEX: Record<SquareDirection, number> = {
  north: ARRAY_START_INDEX,
  east: ARRAY_INDEX_OFFSET,
  south: PREVIEW_SOUTH_DIRECTION_INDEX,
  west: PREVIEW_WEST_DIRECTION_INDEX,
};
const PREVIEW_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
};

interface ViewerVersionSignatureSource {
  colors: readonly CustomColor[];
  colorPattern: ViewerPaletteVersion["colorPattern"];
  orientation: ViewerPaletteVersion["orientation"];
  isReversed: boolean;
  isRotated: boolean;
  scatterEase: number;
  scatterWidth: number;
  scatterAmount: number;
  paletteBlend: number;
  activeCustomMode: ViewerPaletteVersion["activeCustomMode"];
  drawnPatternGrid: ViewerPaletteVersion["drawnPatternGrid"];
  drawnPatternGridSize: ViewerPaletteVersion["drawnPatternGridSize"];
  patternOverride: PatternColorOverrides;
  patternDirectionOverride: PatternDirectionOverrides;
  patternHiddenOverride: PatternHiddenOverrides;
}

const sortedRecordEntries = <Value,>(record: Record<string, Value>) =>
  Object.entries(record).sort(([leftKey], [rightKey]) =>
    leftKey.localeCompare(rightKey),
  );

const viewerVersionSignature = (
  version: ViewerVersionSignatureSource,
): string =>
  JSON.stringify({
    colors: version.colors.map(({ hex, name, extraPercent }) => [
      hex.toLowerCase(),
      name ?? "",
      extraPercent ?? DEFAULT_EXTRA_PERCENT,
    ]),
    colorPattern: version.colorPattern,
    orientation: version.orientation,
    isReversed: version.isReversed,
    isRotated: version.isRotated,
    scatterEase: version.scatterEase,
    scatterWidth: version.scatterWidth,
    scatterAmount: version.scatterAmount,
    paletteBlend: normalizePaletteBlendPercent(version.paletteBlend),
    activeCustomMode: version.activeCustomMode,
    drawnPatternGrid: version.drawnPatternGrid,
    drawnPatternGridSize: version.drawnPatternGridSize,
    patternOverride: sortedRecordEntries(version.patternOverride),
    patternDirectionOverride: sortedRecordEntries(
      version.patternDirectionOverride,
    ),
    patternHiddenOverride: sortedRecordEntries(version.patternHiddenOverride),
  });

const formatVersionDate = (createdAt: string): string => {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, PREVIEW_DATE_FORMAT);
};

const tileGradient = (hex: string, direction: number): string => {
  const cssDirection =
    PREVIEW_GRADIENT_DIRECTIONS[direction % PREVIEW_DIRECTION_COUNT];
  return `linear-gradient(${cssDirection}, color-mix(in srgb, ${hex} ${PREVIEW_HIGHLIGHT_MIX_PERCENT}%, white), ${hex})`;
};

function VersionPreview3D({ version }: { version: ViewerPaletteVersion }) {
  const tiles = useMemo(() => {
    if (!version.colors.length) return [];

    const colorEntries = version.colors.map((color, index) => [
      String(index),
      { hex: color.hex, name: color.name },
    ]) as [string, { hex: string; name?: string }][];
    const colorMap = generateColorMap(
      PREVIEW_GRID_WIDTH,
      PREVIEW_GRID_HEIGHT,
      colorEntries,
      version.orientation,
      version.colorPattern,
      version.isReversed,
      version.isRotated,
      ItemDesigns.Custom,
      version.colors.length,
      version.scatterEase,
      version.scatterWidth,
      version.scatterAmount,
      version.colors.map(
        (color) => color.extraPercent ?? DEFAULT_EXTRA_PERCENT,
      ),
      version.paletteBlend,
    );

    return Array.from(
      { length: PREVIEW_GRID_WIDTH * PREVIEW_GRID_HEIGHT },
      (_, tileIndex) => {
        const x = tileIndex % PREVIEW_GRID_WIDTH;
        const y = Math.floor(tileIndex / PREVIEW_GRID_WIDTH);
        const patternKey = getPatternSquareKey(x, y);
        const generatedColorIndex = colorMap[x]?.[y] ?? DEFAULT_COLOR_INDEX;
        const colorIndex =
          version.patternOverride[patternKey] ?? generatedColorIndex;
        const directionOverride = version.patternDirectionOverride[patternKey];
        return {
          color:
            version.colors[colorIndex]?.hex ??
            version.colors[ARRAY_START_INDEX].hex,
          direction:
            directionOverride === undefined
              ? (x + y) % PREVIEW_DIRECTION_COUNT
              : PREVIEW_DIRECTION_INDEX[directionOverride],
          hidden: version.patternHiddenOverride[patternKey] === true,
        };
      },
    );
  }, [version]);

  return (
    <div
      aria-hidden
      className="relative h-12 overflow-hidden rounded border border-white/10 bg-[radial-gradient(circle_at_50%_35%,rgba(129,140,248,0.14),transparent_58%),rgba(2,6,23,0.72)] [perspective:360px]"
    >
      <div
        className="absolute left-1/2 top-1/2 grid gap-px [transform-style:preserve-3d]"
        style={{
          gridTemplateColumns: `repeat(${PREVIEW_GRID_WIDTH}, ${PREVIEW_TILE_SIZE_PX}px)`,
          transform: `translate(-${PREVIEW_CENTER_TRANSLATE_PERCENT}%, -${PREVIEW_CENTER_TRANSLATE_PERCENT}%) rotateX(${PREVIEW_ROTATE_X_DEGREES}deg) rotateZ(${PREVIEW_ROTATE_Z_DEGREES}deg)`,
        }}
      >
        {tiles.map(({ color, direction, hidden }, tileIndex) => (
          <span
            key={tileIndex}
            className="block rounded-[1px]"
            style={{
              width: PREVIEW_TILE_SIZE_PX,
              height: PREVIEW_TILE_SIZE_PX,
              background: tileGradient(color, direction),
              boxShadow: `0 ${PREVIEW_TILE_DEPTH_PX}px 0 color-mix(in srgb, ${color} ${PREVIEW_SIDE_MIX_PERCENT}%, black)`,
              opacity: hidden ? PREVIEW_HIDDEN_TILE_OPACITY : undefined,
              transform: `translateZ(${PREVIEW_TILE_DEPTH_PX}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

const VersionButton = memo(function VersionButton({
  version,
  active,
  onSelectVersion,
}: {
  version: ViewerPaletteVersion;
  active: boolean;
  onSelectVersion: (viewerVersionId: string) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelectVersion(version.id)}
      className={cn(
        "w-full shrink-0 rounded-md border p-1.5 text-left transition-colors",
        active
          ? "border-indigo-400/70 bg-indigo-500/15 ring-1 ring-indigo-400/35"
          : "border-white/10 bg-gray-900/40 hover:border-white/25 hover:bg-gray-900/60",
      )}
    >
      <VersionPreview3D version={version} />
      <div className="mt-1 flex items-center justify-between gap-1">
        <span className="truncate text-[0.68rem] font-medium text-slate-100">
          {version.label}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[0.6rem] text-slate-500">
            {formatVersionDate(version.createdAt)}
          </span>
          {active && <Check className="h-3 w-3 text-indigo-300" />}
        </div>
      </div>
    </button>
  );
});

export function PaletteVersionSwitcher() {
  const [selectedViewerVersionId, setSelectedViewerVersionId] = useState<
    string | null
  >(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const editingPaletteId = useCustomStore((state) => state.editingPaletteId);
  const selectedDesign = useCustomStore((state) => state.selectedDesign);
  const palette = useCustomStore((state) =>
    state.savedPalettes.find(
      (savedPalette) => savedPalette.id === editingPaletteId,
    ),
  );
  const standaloneViewerVersions = useCustomStore(
    (state) => state.viewerVersions,
  );
  const customPalette = useCustomStore((state) => state.customPalette);
  const colorPattern = useCustomStore((state) => state.colorPattern);
  const orientation = useCustomStore((state) => state.orientation);
  const isReversed = useCustomStore((state) => state.isReversed);
  const isRotated = useCustomStore((state) => state.isRotated);
  const scatterEase = useCustomStore((state) => state.scatterEase);
  const scatterWidth = useCustomStore((state) => state.scatterWidth);
  const scatterAmount = useCustomStore((state) => state.scatterAmount);
  const paletteBlend = useCustomStore((state) => state.paletteBlend);
  const activeCustomMode = useCustomStore((state) => state.activeCustomMode);
  const drawnPatternGrid = useCustomStore((state) => state.drawnPatternGrid);
  const drawnPatternGridSize = useCustomStore(
    (state) => state.drawnPatternGridSize,
  );
  const patternOverride = useCustomStore((state) => state.patternOverride);
  const patternDirectionOverride = useCustomStore(
    (state) => state.patternDirectionOverride,
  );
  const patternHiddenOverride = useCustomStore(
    (state) => state.patternHiddenOverride,
  );
  const saveViewerVersion = useCustomStore((state) => state.saveViewerVersion);
  const applyViewerVersion = useCustomStore(
    (state) => state.applyViewerVersion,
  );
  const paletteVersion = useMemo(() => {
    const versions = palette?.versions ?? [];
    return (
      versions.find((version) => version.id === palette?.currentVersionId) ??
      versions[versions.length - ARRAY_INDEX_OFFSET]
    );
  }, [palette]);
  const viewerVersions =
    palette && paletteVersion
      ? (paletteVersion.viewerVersions ?? [])
      : standaloneViewerVersions;
  const currentViewerColors = useMemo<CustomColor[]>(
    () =>
      selectedDesign === ItemDesigns.Custom
        ? customPalette
        : getColorEntries(selectedDesign, customPalette).map(
            ([colorKey, color]) => ({
              id: `${CURRENT_VIEWER_COLOR_ID_PREFIX}-${selectedDesign}-${colorKey}`,
              hex: color.hex,
              name: color.name,
            }),
          ),
    [customPalette, selectedDesign],
  );
  const versionContextLabel =
    palette && paletteVersion
      ? `${palette.name} · based on ${paletteVersion.label ?? "palette version"}`
      : selectedDesign === ItemDesigns.Custom
        ? "Current custom palette"
        : selectedDesign;

  const currentSignature = useMemo(
    () =>
      viewerVersionSignature({
        colors: currentViewerColors,
        colorPattern,
        orientation,
        isReversed,
        isRotated,
        scatterEase,
        scatterWidth,
        scatterAmount,
        paletteBlend,
        activeCustomMode,
        drawnPatternGrid,
        drawnPatternGridSize,
        patternOverride,
        patternDirectionOverride,
        patternHiddenOverride,
      }),
    [
      activeCustomMode,
      colorPattern,
      currentViewerColors,
      drawnPatternGrid,
      drawnPatternGridSize,
      isReversed,
      isRotated,
      orientation,
      patternDirectionOverride,
      patternHiddenOverride,
      patternOverride,
      scatterAmount,
      scatterEase,
      scatterWidth,
      paletteBlend,
    ],
  );
  const activeViewerVersionId = useMemo(() => {
    const matchingVersions = viewerVersions.filter(
      (version) => viewerVersionSignature(version) === currentSignature,
    );
    return (
      matchingVersions.find((version) => version.id === selectedViewerVersionId)
        ?.id ??
      matchingVersions[matchingVersions.length - ARRAY_INDEX_OFFSET]?.id ??
      null
    );
  }, [currentSignature, selectedViewerVersionId, viewerVersions]);

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const maximumScrollTop = container.scrollHeight - container.clientHeight;
    setCanScrollUp(container.scrollTop > SCROLL_EDGE_TOLERANCE_PX);
    setCanScrollDown(
      container.scrollTop < maximumScrollTop - SCROLL_EDGE_TOLERANCE_PX,
    );
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    updateScrollState();
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [updateScrollState, viewerVersions.length]);

  const handleSaveCurrent = useCallback(() => {
    const viewerVersionId = saveViewerVersion(
      palette?.id ?? null,
      paletteVersion?.id ?? null,
    );
    if (!viewerVersionId) {
      toast.error("Could not save this viewer version.");
      return;
    }
    setSelectedViewerVersionId(viewerVersionId);
    toast.success("Saved the current viewer version.");
  }, [palette, paletteVersion, saveViewerVersion]);

  const handleVersionSelect = useCallback(
    (viewerVersionId: string) => {
      setSelectedViewerVersionId(viewerVersionId);
      applyViewerVersion(
        palette?.id ?? null,
        paletteVersion?.id ?? null,
        viewerVersionId,
      );
    },
    [applyViewerVersion, palette, paletteVersion],
  );

  const scrollVersions = useCallback((direction: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const firstVersionHeight =
      container.firstElementChild?.getBoundingClientRect().height ??
      container.clientHeight;
    const rowGap =
      Number.parseFloat(getComputedStyle(container).rowGap) ||
      ARRAY_START_INDEX;
    container.scrollBy({
      top: direction * (firstVersionHeight + rowGap),
      behavior: "smooth",
    });
  }, []);

  return (
    <Card className="glass-surface group/viewer-versions w-72 rounded-[0.7rem] shadow-lg">
      <div className="p-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-200">
              Viewer versions
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleSaveCurrent}
            disabled={activeViewerVersionId !== null}
            className="h-6 shrink-0 gap-1 px-1.5 text-[0.65rem]"
          >
            <Save className="h-2.5 w-2.5" />
            Save
          </Button>
        </div>

        {viewerVersions.length === ARRAY_START_INDEX ? (
          <div className="rounded-md border border-dashed border-white/10 px-2 py-2 text-center text-[0.68rem] text-gray-500">
            Save the current viewer design to create its first version.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.6rem] text-gray-500">
                {activeViewerVersionId ? "Saved version" : "Modified"}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Previous viewer version"
                  onClick={() => scrollVersions(-ARRAY_INDEX_OFFSET)}
                  disabled={!canScrollUp}
                  className="h-5 w-5"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Next viewer version"
                  onClick={() => scrollVersions(ARRAY_INDEX_OFFSET)}
                  disabled={!canScrollDown}
                  className="h-5 w-5"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div
              ref={scrollContainerRef}
              role="group"
              aria-label={`${versionContextLabel} viewer versions`}
              onScroll={updateScrollState}
              className="flex max-h-24 touch-pan-y flex-col gap-1.5 overflow-y-auto overscroll-y-contain pr-1 group-hover/viewer-versions:max-h-none group-focus-within/viewer-versions:max-h-none"
            >
              {viewerVersions.map((version) => (
                <VersionButton
                  key={version.id}
                  version={version}
                  active={version.id === activeViewerVersionId}
                  onSelectVersion={handleVersionSelect}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
