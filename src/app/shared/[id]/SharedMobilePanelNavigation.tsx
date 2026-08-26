"use client";

import { Info, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  VIEWER_GLASS_ACTION_CLASS,
  VIEWER_GLASS_HEADER_CLASS,
} from "@/components/preview/viewerGlass";

export type SharedMobilePanel = "about" | "view";
export type SharedMobilePanelActionLayout = "row" | "rail";

const PANEL_LABEL: Record<SharedMobilePanel, string> = {
  about: "Details",
  view: "Edit",
};
const PANEL_DESCRIPTION: Record<SharedMobilePanel, string> = {
  about: "Artwork, palette, and sharing information",
  view: "Adjust size, pattern, lighting, and wall color",
};
const PANEL_ICON = {
  about: Info,
  view: SlidersHorizontal,
} as const;
const PANEL_ACTIONS_CLASS = "grid gap-2";
const PANEL_ACTION_LAYOUT_CLASS: Record<
  SharedMobilePanelActionLayout,
  string
> = {
  row: "grid-cols-2",
  rail: "grid-cols-1",
};
const PANEL_ACTION_BUTTON_CLASS =
  `h-11 w-full rounded-full px-4 text-sm ${VIEWER_GLASS_ACTION_CLASS}`;
const PANEL_CLOSE_BUTTON_CLASS =
  "h-9 w-9 rounded-full border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.09] hover:text-white";

export function SharedMobilePanelActions({
  layout = "row",
  onOpen,
}: {
  layout?: SharedMobilePanelActionLayout;
  onOpen: (panel: SharedMobilePanel) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Shared viewer panels"
      className={cn(PANEL_ACTIONS_CLASS, PANEL_ACTION_LAYOUT_CLASS[layout])}
    >
      <Button
        type="button"
        variant="ghost"
        onClick={() => onOpen("about")}
        className={PANEL_ACTION_BUTTON_CLASS}
      >
        <Info className="h-4 w-4 text-slate-400" />
        Details
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onOpen("view")}
        className={PANEL_ACTION_BUTTON_CLASS}
      >
        <SlidersHorizontal className="h-4 w-4 text-amber-100" />
        Edit
      </Button>
    </div>
  );
}

export function SharedMobilePanelHeader({
  panel,
  onClose,
}: {
  panel: SharedMobilePanel;
  onClose: () => void;
}) {
  const label = PANEL_LABEL[panel];
  const description = PANEL_DESCRIPTION[panel];
  const Icon = PANEL_ICON[panel];

  return (
    <div className={VIEWER_GLASS_HEADER_CLASS}>
      <span
        aria-hidden
        data-sheet-handle="true"
        className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-white/20"
      />
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/[0.09] bg-white/[0.05] text-amber-100"
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-[-0.01em] text-white">
            {label}
          </h2>
          <p className="mt-0.5 text-[0.68rem] leading-4 text-slate-500">
            {description}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Close ${label}`}
        className={PANEL_CLOSE_BUTTON_CLASS}
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
