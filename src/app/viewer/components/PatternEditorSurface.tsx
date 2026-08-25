"use client";

import type { ReactNode } from "react";
import { ChevronDown, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { ViewerControlSurface } from "@/components/preview/ViewerControlSurface";

interface PatternEditorSurfaceProps {
  active: boolean;
  collapsed: boolean;
  contentId: string;
  onCollapseToggle: () => void;
  className?: string;
  children: ReactNode;
}

const PATTERN_EDITOR_HEADER_CLASS =
  "flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3.5";
const PATTERN_EDITOR_COLLAPSE_BUTTON_CLASS =
  "grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-slate-400 outline-none transition-colors hover:border-white/[0.18] hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-amber-100/60";

export function PatternEditorSurface({
  active,
  collapsed,
  contentId,
  onCollapseToggle,
  className,
  children,
}: PatternEditorSurfaceProps) {
  return (
    <ViewerControlSurface ariaLabel="Pattern editor" className={className}>
      <div className={PATTERN_EDITOR_HEADER_CLASS}>
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.1] bg-white/[0.055] text-amber-100 shadow-inner shadow-white/[0.03]"
          >
            <Palette className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-[-0.015em] text-white">
                Pattern editor
              </h2>
              <span
                aria-live="polite"
                aria-label={active ? "Editing" : "Ready"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold",
                  active
                    ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                    : "border-white/[0.08] bg-white/[0.035] text-slate-500",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    active ? "bg-emerald-300" : "bg-slate-600",
                  )}
                />
                {active ? "Editing" : "Ready"}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[0.67rem] text-slate-500">
              Paint, turn, and refine individual squares
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label={collapsed ? "Expand pattern editor" : "Collapse pattern editor"}
          aria-expanded={!collapsed}
          aria-controls={contentId}
          onClick={onCollapseToggle}
          className={PATTERN_EDITOR_COLLAPSE_BUTTON_CLASS}
        >
          <ChevronDown
            aria-hidden
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "-rotate-90",
            )}
          />
        </button>
      </div>
      {!collapsed && <div id={contentId}>{children}</div>}
    </ViewerControlSurface>
  );
}
