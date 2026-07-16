"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Check, GitBranch } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  useCustomStore,
  type ColorPattern,
  type CustomColor,
  type PaletteVersion,
} from "@/store/customStore";
import { generateColorMap } from "@/components/preview/patternUtils";
import { ItemDesigns } from "@/typings/types";
import { cn } from "@/lib/utils";

const PREVIEW_GRID_WIDTH = 10;
const PREVIEW_GRID_HEIGHT = 6;
const PREVIEW_TILE_SIZE_PX = 9;
const PREVIEW_TILE_DEPTH_PX = 2;
const PREVIEW_ROTATE_X_DEGREES = 54;
const PREVIEW_ROTATE_Z_DEGREES = -8;
const PREVIEW_HIGHLIGHT_MIX_PERCENT = 72;
const PREVIEW_SIDE_MIX_PERCENT = 58;
const PREVIEW_CENTER_TRANSLATE_PERCENT = 50;
const MINIMUM_VERSION_COUNT = 2;
const ARRAY_START_INDEX = 0;
const ARRAY_INDEX_OFFSET = 1;
const DEFAULT_COLOR_INDEX = 0;
const DEFAULT_EXTRA_PERCENT = 0;
const PREVIEW_GRADIENT_DIRECTIONS = [
  "to bottom",
  "to left",
  "to top",
  "to right",
] as const;
const PREVIEW_DIRECTION_COUNT = PREVIEW_GRADIENT_DIRECTIONS.length;
const PREVIEW_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
};

interface VersionPreviewSettings {
  colorPattern: ColorPattern;
  orientation: "horizontal" | "vertical";
  isReversed: boolean;
  isRotated: boolean;
  scatterEase: number;
  scatterWidth: number;
  scatterAmount: number;
}

const colorSignature = (colors: readonly CustomColor[]): string =>
  JSON.stringify(
    colors.map(({ hex, name, extraPercent }) => [
      hex.toLowerCase(),
      name ?? "",
      extraPercent ?? DEFAULT_EXTRA_PERCENT,
    ])
  );

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

function VersionPreview3D({
  colors,
  settings,
}: {
  colors: readonly CustomColor[];
  settings: VersionPreviewSettings;
}) {
  const {
    colorPattern,
    orientation,
    isReversed,
    isRotated,
    scatterEase,
    scatterWidth,
    scatterAmount,
  } = settings;

  const tiles = useMemo(() => {
    if (!colors.length) return [];

    const colorEntries = colors.map((color, index) => [
      String(index),
      { hex: color.hex, name: color.name },
    ]) as [string, { hex: string; name?: string }][];
    const colorMap = generateColorMap(
      PREVIEW_GRID_WIDTH,
      PREVIEW_GRID_HEIGHT,
      colorEntries,
      orientation,
      colorPattern,
      isReversed,
      isRotated,
      ItemDesigns.Custom,
      colors.length,
      scatterEase,
      scatterWidth,
      scatterAmount,
      colors.map((color) => color.extraPercent ?? DEFAULT_EXTRA_PERCENT)
    );

    return Array.from(
      { length: PREVIEW_GRID_WIDTH * PREVIEW_GRID_HEIGHT },
      (_, tileIndex) => {
        const x = tileIndex % PREVIEW_GRID_WIDTH;
        const y = Math.floor(tileIndex / PREVIEW_GRID_WIDTH);
        const colorIndex = colorMap[x]?.[y] ?? DEFAULT_COLOR_INDEX;
        return {
          color: colors[colorIndex]?.hex ?? colors[ARRAY_START_INDEX].hex,
          direction: (x + y) % PREVIEW_DIRECTION_COUNT,
        };
      }
    );
  }, [
    colorPattern,
    colors,
    isReversed,
    isRotated,
    orientation,
    scatterAmount,
    scatterEase,
    scatterWidth,
  ]);

  return (
    <div
      aria-hidden
      className="relative h-20 overflow-hidden rounded-md border border-white/10 bg-[radial-gradient(circle_at_50%_35%,rgba(129,140,248,0.14),transparent_58%),rgba(2,6,23,0.72)] [perspective:360px]"
    >
      <div
        className="absolute left-1/2 top-1/2 grid gap-px [transform-style:preserve-3d]"
        style={{
          gridTemplateColumns: `repeat(${PREVIEW_GRID_WIDTH}, ${PREVIEW_TILE_SIZE_PX}px)`,
          transform: `translate(-${PREVIEW_CENTER_TRANSLATE_PERCENT}%, -${PREVIEW_CENTER_TRANSLATE_PERCENT}%) rotateX(${PREVIEW_ROTATE_X_DEGREES}deg) rotateZ(${PREVIEW_ROTATE_Z_DEGREES}deg)`,
        }}
      >
        {tiles.map(({ color, direction }, tileIndex) => (
          <span
            key={tileIndex}
            className="block rounded-[1px]"
            style={{
              width: PREVIEW_TILE_SIZE_PX,
              height: PREVIEW_TILE_SIZE_PX,
              background: tileGradient(color, direction),
              boxShadow: `0 ${PREVIEW_TILE_DEPTH_PX}px 0 color-mix(in srgb, ${color} ${PREVIEW_SIDE_MIX_PERCENT}%, black)`,
              transform: `translateZ(${PREVIEW_TILE_DEPTH_PX}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

const VersionButton = memo(function VersionButton({
  paletteId,
  version,
  active,
  settings,
  onSelectVersion,
}: {
  paletteId: string;
  version: PaletteVersion;
  active: boolean;
  settings: VersionPreviewSettings;
  onSelectVersion: (paletteId: string, versionId: string) => void;
}) {
  const label = version.label || "Untitled version";

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelectVersion(paletteId, version.id)}
      className={cn(
        "w-36 shrink-0 rounded-lg border p-2 text-left transition-colors",
        active
          ? "border-indigo-400/70 bg-indigo-500/15 ring-1 ring-indigo-400/35"
          : "border-white/10 bg-gray-900/40 hover:border-white/25 hover:bg-gray-900/60"
      )}
    >
      <VersionPreview3D colors={version.colors} settings={settings} />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-slate-100">
          {label}
        </span>
        {active && <Check className="h-3.5 w-3.5 shrink-0 text-indigo-300" />}
      </div>
      <div className="mt-0.5 flex items-center gap-1 text-[0.65rem] text-slate-500">
        {version.branchedFrom && <GitBranch className="h-3 w-3" />}
        <span className="truncate">
          {version.branchedFrom
            ? `from ${version.branchedFrom}`
            : formatVersionDate(version.createdAt)}
        </span>
      </div>
    </button>
  );
});

export function PaletteVersionSwitcher() {
  const [selectedVersion, setSelectedVersion] = useState<{
    paletteId: string;
    versionId: string;
  } | null>(null);
  const editingPaletteId = useCustomStore((state) => state.editingPaletteId);
  const palette = useCustomStore((state) =>
    state.savedPalettes.find(
      (savedPalette) => savedPalette.id === editingPaletteId
    )
  );
  const customPalette = useCustomStore((state) => state.customPalette);
  const colorPattern = useCustomStore((state) => state.colorPattern);
  const orientation = useCustomStore((state) => state.orientation);
  const isReversed = useCustomStore((state) => state.isReversed);
  const isRotated = useCustomStore((state) => state.isRotated);
  const scatterEase = useCustomStore((state) => state.scatterEase);
  const scatterWidth = useCustomStore((state) => state.scatterWidth);
  const scatterAmount = useCustomStore((state) => state.scatterAmount);
  const applyPaletteVersion = useCustomStore(
    (state) => state.applyPaletteVersion
  );
  const versions = palette?.versions ?? [];
  const previewSettings = useMemo<VersionPreviewSettings>(
    () => ({
      colorPattern,
      orientation,
      isReversed,
      isRotated,
      scatterEase,
      scatterWidth,
      scatterAmount,
    }),
    [
      colorPattern,
      isReversed,
      isRotated,
      orientation,
      scatterAmount,
      scatterEase,
      scatterWidth,
    ]
  );

  const activeVersionId = useMemo(() => {
    if (!palette) return null;
    const activeSignature = colorSignature(customPalette);
    const matches = versions.filter(
      (version) => colorSignature(version.colors) === activeSignature
    );
    const selectedMatch =
      selectedVersion?.paletteId === palette.id
        ? matches.find(
            (version) => version.id === selectedVersion.versionId
          )
        : null;
    return (
      selectedMatch?.id ??
      matches.find((version) => version.id === palette.currentVersionId)?.id ??
      matches[matches.length - ARRAY_INDEX_OFFSET]?.id ??
      null
    );
  }, [customPalette, palette, selectedVersion, versions]);
  const handleVersionSelect = useCallback(
    (paletteId: string, versionId: string) => {
      setSelectedVersion({ paletteId, versionId });
      applyPaletteVersion(paletteId, versionId);
    },
    [applyPaletteVersion]
  );

  if (!palette || versions.length < MINIMUM_VERSION_COUNT) return null;

  return (
    <Card className="glass-surface w-72 rounded-[0.7rem] shadow-lg">
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium text-gray-200">
              Palette versions
            </div>
            <div className="text-[0.7rem] text-gray-500">
              {palette.name} · choose a 3D preview
            </div>
          </div>
          {!activeVersionId && (
            <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[0.65rem] text-amber-200 ring-1 ring-amber-300/20">
              Modified
            </span>
          )}
        </div>
        <div
          role="group"
          aria-label={`${palette.name} versions`}
          className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
        >
          {versions.map((version) => (
            <VersionButton
              key={version.id}
              paletteId={palette.id}
              version={version}
              active={version.id === activeVersionId}
              settings={previewSettings}
              onSelectVersion={handleVersionSelect}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
