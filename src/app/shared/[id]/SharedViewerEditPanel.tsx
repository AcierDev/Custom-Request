"use client";

import {
  Blend,
  PaintBucket,
  ScanLine,
  SlidersHorizontal,
  SunMedium,
} from "lucide-react";
import { SizeCard } from "@/components/cards/SizeCard";
import { LightingControls } from "@/components/preview/LightingControls";
import { PaintColorPicker } from "@/components/preview/PaintColorPicker";
import { PatternControls } from "@/components/preview/PatternControls";
import type { TimeOfDay } from "@/components/preview/RotatableLighting";
import {
  ViewerControlHeader,
  ViewerControlSection,
  ViewerControlSurface,
} from "@/components/preview/ViewerControlSurface";
import { WallColorPicker } from "@/components/preview/WallColorPicker";

interface SharedViewerEditPanelProps {
  timeOfDay: TimeOfDay;
  onTimeOfDayChange: (value: TimeOfDay) => void;
  wallColor: string;
  onWallColorChange: (value: string) => void;
  compactHeader?: boolean;
}

export function SharedViewerEditPanel({
  timeOfDay,
  onTimeOfDayChange,
  wallColor,
  onWallColorChange,
  compactHeader = false,
}: SharedViewerEditPanelProps) {
  return (
    <ViewerControlSurface
      ariaLabel="Edit view"
      compact={compactHeader}
      className={compactHeader ? "border-0 bg-transparent shadow-none" : undefined}
    >
      <div data-compact={String(compactHeader)}>
        {!compactHeader && (
          <ViewerControlHeader
            title="Edit view"
            description="Shape the artwork and the room around it"
            icon={SlidersHorizontal}
          />
        )}

        <ViewerControlSection
          title="Size"
          description="Preview the artwork at another scale"
          icon={ScanLine}
          compact={compactHeader}
        >
          <SizeCard compact bare labelMode="physical" />
        </ViewerControlSection>

        <ViewerControlSection
          title="Pattern"
          description="Arrange color flow and orientation"
          icon={Blend}
          compact={compactHeader}
          collapsible
        >
          <PatternControls embedded />
        </ViewerControlSection>

        <ViewerControlSection
          title="Lighting"
          description="Compare warm daylight and evening light"
          icon={SunMedium}
          compact={compactHeader}
        >
          <LightingControls
            embedded
            value={timeOfDay}
            onChange={onTimeOfDayChange}
          />
        </ViewerControlSection>

        <ViewerControlSection
          title="Wall color"
          description="Try a tone or find a named paint"
          icon={PaintBucket}
          compact={compactHeader}
          collapsible
        >
          <WallColorPicker value={wallColor} onChange={onWallColorChange} />
          <div className="my-3 h-px bg-white/[0.07]" />
          <PaintColorPicker value={wallColor} onChange={onWallColorChange} />
        </ViewerControlSection>
      </div>
    </ViewerControlSurface>
  );
}
