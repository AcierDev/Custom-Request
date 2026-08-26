"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { VIEWER_GLASS_SURFACE_CLASS } from "./viewerGlass";

const VIEWER_CONTROL_SURFACE_COMPACT_CLASS = "rounded-[1.15rem]";
const VIEWER_CONTROL_HIGHLIGHT_CLASS =
  "pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent";
const VIEWER_CONTROL_SHEEN_CLASS =
  "pointer-events-none absolute -left-14 -top-20 h-44 w-44 rounded-full bg-sky-100/[0.11] blur-3xl";
const VIEWER_CONTROL_HEADER_CLASS =
  "flex items-start justify-between gap-3 border-b border-white/[0.08] px-4 py-4";
const VIEWER_CONTROL_HEADER_COMPACT_CLASS = "px-3.5 py-3";
const VIEWER_CONTROL_ICON_CLASS =
  "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-amber-100 shadow-inner shadow-white/[0.03]";
const VIEWER_CONTROL_SECTION_CLASS =
  "border-b border-white/[0.07] px-4 py-4 last:border-b-0";
const VIEWER_CONTROL_SECTION_COMPACT_CLASS = "px-3.5 py-3.5";
const VIEWER_CONTROL_DISCLOSURE_SUMMARY_CLASS =
  "flex min-h-11 cursor-pointer list-none items-start justify-between gap-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-100/60 [&::-webkit-details-marker]:hidden";
const VIEWER_CONTROL_DISCLOSURE_CHEVRON_CLASS =
  "mt-1 h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180";
const VIEWER_CONTROL_OPTION_BASE_CLASS =
  "group relative inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:ring-amber-100/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]";
const VIEWER_CONTROL_OPTION_IDLE_CLASS =
  "border-white/[0.09] bg-white/[0.035] text-slate-400 hover:border-white/[0.18] hover:bg-white/[0.07] hover:text-slate-100";
const VIEWER_CONTROL_OPTION_SELECTED_CLASS =
  "border-white/70 bg-white text-slate-950 shadow-[0_8px_24px_rgba(0,0,0,0.22)]";
const VIEWER_CONTROL_OPTION_DANGER_CLASS =
  "border-rose-300/55 bg-rose-400/15 text-rose-100 shadow-[0_8px_24px_rgba(76,5,25,0.2)]";
const VIEWER_VALUE_BADGE_CLASS =
  "inline-flex min-h-6 items-center rounded-full border border-white/[0.09] bg-black/25 px-2 py-0.5 font-mono text-[0.68rem] font-medium tabular-nums tracking-tight text-slate-200 shadow-inner shadow-black/20";

type ViewerControlSurfaceProps = React.PropsWithChildren<{
  ariaLabel?: string;
  className?: string;
  compact?: boolean;
}>;

type ViewerControlHeaderProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
};

type ViewerControlDisclosureProps = React.PropsWithChildren<
  ViewerControlHeaderProps & {
    defaultOpen?: boolean;
    contentClassName?: string;
  }
>;

type ViewerControlSectionProps = React.PropsWithChildren<{
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
  contentClassName?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}>;

type ViewerControlTileTone = "default" | "danger";

type ViewerControlTileProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  tone?: ViewerControlTileTone;
};

export function ViewerControlSurface({
  ariaLabel,
  children,
  className,
  compact = false,
}: ViewerControlSurfaceProps) {
  return (
    <section
      aria-label={ariaLabel}
      data-viewer-control-surface="true"
      data-liquid-glass="true"
      className={cn(
        VIEWER_GLASS_SURFACE_CLASS,
        compact && VIEWER_CONTROL_SURFACE_COMPACT_CLASS,
        className,
      )}
    >
      <span aria-hidden className={VIEWER_CONTROL_SHEEN_CLASS} />
      <span aria-hidden className={VIEWER_CONTROL_HIGHLIGHT_CLASS} />
      <div className="relative">{children}</div>
    </section>
  );
}

export function ViewerControlHeader({
  title,
  description,
  icon: Icon,
  action,
  compact = false,
  className,
}: ViewerControlHeaderProps) {
  return (
    <header
      className={cn(
        VIEWER_CONTROL_HEADER_CLASS,
        compact && VIEWER_CONTROL_HEADER_COMPACT_CLASS,
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span aria-hidden className={VIEWER_CONTROL_ICON_CLASS}>
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[0.92rem] font-semibold tracking-[-0.015em] text-white">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[0.69rem] leading-4 text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function ViewerControlDisclosure({
  title,
  description,
  icon: Icon,
  action,
  compact = false,
  className,
  contentClassName,
  defaultOpen = false,
  children,
}: ViewerControlDisclosureProps) {
  return (
    <details
      open={defaultOpen}
      data-viewer-control-disclosure="true"
      data-control-title={title}
      className="group"
    >
      <summary
        className={cn(
          VIEWER_CONTROL_HEADER_CLASS,
          VIEWER_CONTROL_DISCLOSURE_SUMMARY_CLASS,
          compact && VIEWER_CONTROL_HEADER_COMPACT_CLASS,
          className,
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span aria-hidden className={VIEWER_CONTROL_ICON_CLASS}>
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-[0.92rem] font-semibold tracking-[-0.015em] text-white">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-[0.69rem] leading-4 text-slate-500">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <ChevronDown
            aria-hidden
            className={VIEWER_CONTROL_DISCLOSURE_CHEVRON_CLASS}
          />
        </div>
      </summary>
      <div className={contentClassName}>{children}</div>
    </details>
  );
}

export function ViewerControlSection({
  title,
  description,
  icon: Icon,
  action,
  compact = false,
  className,
  contentClassName,
  collapsible = false,
  defaultOpen = false,
  children,
}: ViewerControlSectionProps) {
  const heading = (
    <div className="flex min-w-0 items-start gap-2.5">
      {Icon && (
        <span
          aria-hidden
          className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-slate-300 ring-1 ring-inset ring-white/[0.07]"
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      )}
      <div className="min-w-0">
        <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-300">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-[0.66rem] leading-4 text-slate-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <section
      className={cn(
        VIEWER_CONTROL_SECTION_CLASS,
        compact && VIEWER_CONTROL_SECTION_COMPACT_CLASS,
        className,
      )}
    >
      {collapsible ? (
        <details
          open={defaultOpen}
          data-viewer-control-disclosure="true"
          data-control-title={title}
          className="group"
        >
          <summary className={VIEWER_CONTROL_DISCLOSURE_SUMMARY_CLASS}>
            {heading}
            <div className="flex shrink-0 items-center gap-2">
              {action}
              <ChevronDown
                aria-hidden
                className={VIEWER_CONTROL_DISCLOSURE_CHEVRON_CLASS}
              />
            </div>
          </summary>
          <div className={cn("mt-3", contentClassName)}>{children}</div>
        </details>
      ) : (
        <>
          <div className="mb-3 flex items-start justify-between gap-3">
            {heading}
            {action && <div className="shrink-0">{action}</div>}
          </div>
          <div className={contentClassName}>{children}</div>
        </>
      )}
    </section>
  );
}

export function ViewerValueBadge({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <output aria-label={label} className={cn(VIEWER_VALUE_BADGE_CLASS, className)}>
      {value}
    </output>
  );
}

export function viewerControlOptionClass(
  selected: boolean,
  tone: ViewerControlTileTone = "default",
): string {
  if (!selected) {
    return cn(VIEWER_CONTROL_OPTION_BASE_CLASS, VIEWER_CONTROL_OPTION_IDLE_CLASS);
  }

  return cn(
    VIEWER_CONTROL_OPTION_BASE_CLASS,
    tone === "danger"
      ? VIEWER_CONTROL_OPTION_DANGER_CLASS
      : VIEWER_CONTROL_OPTION_SELECTED_CLASS,
  );
}

export const ViewerControlTile = React.forwardRef<
  HTMLButtonElement,
  ViewerControlTileProps
>(function ViewerControlTile(
  { selected, tone = "default", className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      data-selected={selected === undefined ? undefined : String(selected)}
      className={cn(
        viewerControlOptionClass(Boolean(selected), tone),
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
