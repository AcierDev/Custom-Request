"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SharedMobilePanel = "about" | "view";
export type SharedMobilePanelActionLayout = "row" | "rail";

const PANEL_LABEL: Record<SharedMobilePanel, string> = {
  about: "Details",
  view: "Edit",
};
const PANEL_ACTIONS_CLASS = "grid gap-2";
const PANEL_ACTION_LAYOUT_CLASS: Record<
  SharedMobilePanelActionLayout,
  string
> = {
  row: "grid-cols-2",
  rail: "grid-cols-1",
};
const PANEL_ACTION_BUTTON_CLASS =
  "h-11 w-full rounded-full glass-surface px-4 text-sm text-slate-200 hover:bg-gray-900/50";
const PANEL_HEADER_CLASS =
  "flex items-center justify-between border-b border-white/10 px-3 py-2.5";
const PANEL_CLOSE_BUTTON_CLASS =
  "h-8 w-8 rounded-full text-slate-300 hover:bg-white/10 hover:text-white";

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
        Details
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onOpen("view")}
        className={PANEL_ACTION_BUTTON_CLASS}
      >
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

  return (
    <div className={PANEL_HEADER_CLASS}>
      <h2 className="px-1 text-sm font-medium text-white">{label}</h2>
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
