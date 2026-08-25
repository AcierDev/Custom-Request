"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  Grid,
  Image,
  Info,
  Paperclip,
  Ruler,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useCustomStore } from "@/store/customStore";
import { ViewerControlSurface } from "./ViewerControlSurface";

interface ViewControlsProps {
  className?: string;
}

interface ViewOptionRowProps {
  label: string;
  Icon: LucideIcon;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const VIEW_OPTIONS_CONTENT_ID = "viewer-view-options";
const VIEW_OPTION_ROW_CLASS =
  "flex min-h-11 items-center justify-between gap-3 rounded-xl border border-transparent px-2.5 transition-colors hover:border-white/[0.07] hover:bg-white/[0.035]";

function ViewOptionRow({
  label,
  Icon,
  checked,
  onCheckedChange,
}: ViewOptionRowProps) {
  return (
    <div className={VIEW_OPTION_ROW_CLASS}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition-colors",
            checked
              ? "border-white/20 bg-white/[0.1] text-white"
              : "border-white/[0.07] bg-white/[0.035] text-slate-500",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="truncate text-xs font-medium text-slate-300">
          {label}
        </span>
      </div>
      <Switch
        aria-label={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="data-[state=checked]:bg-white data-[state=unchecked]:bg-white/10 data-[state=checked]:[&>span]:bg-slate-950"
      />
    </div>
  );
}

export function ViewControls({ className = "" }: ViewControlsProps) {
  const showRuler = useCustomStore((state) => state.viewSettings.showRuler);
  const showWoodGrain = useCustomStore(
    (state) => state.viewSettings.showWoodGrain,
  );
  const metallic = useCustomStore((state) => state.viewSettings.metallic);
  const showColorInfo = useCustomStore(
    (state) => state.viewSettings.showColorInfo,
  );
  const showHanger = useCustomStore((state) => state.viewSettings.showHanger);
  const showRoom = useCustomStore((state) => state.viewSettings.showRoom);
  const setShowRuler = useCustomStore((state) => state.setShowRuler);
  const setShowWoodGrain = useCustomStore((state) => state.setShowWoodGrain);
  const setMetallic = useCustomStore((state) => state.setMetallic);
  const setShowColorInfo = useCustomStore((state) => state.setShowColorInfo);
  const setShowHanger = useCustomStore((state) => state.setShowHanger);
  const setShowRoom = useCustomStore((state) => state.setShowRoom);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <ViewerControlSurface ariaLabel="View options" className={className}>
      <button
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-expanded={isExpanded}
        aria-controls={VIEW_OPTIONS_CONTENT_ID}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-100/60"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/[0.09] bg-white/[0.05] text-amber-100"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">
              View options
            </span>
            <span className="mt-0.5 block text-[0.65rem] text-slate-500">
              Room, material, and guides
            </span>
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform",
            isExpanded && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={VIEW_OPTIONS_CONTENT_ID}
            key="view-options-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/[0.07]"
          >
            <div className="space-y-0.5 p-2">
              <ViewOptionRow label="Show ruler" Icon={Ruler} checked={showRuler} onCheckedChange={setShowRuler} />
              <ViewOptionRow label="Wood grain" Icon={Grid} checked={showWoodGrain} onCheckedChange={setShowWoodGrain} />
              <ViewOptionRow label="Metallic finish" Icon={Sparkles} checked={metallic} onCheckedChange={setMetallic} />
              <ViewOptionRow label="Show hanger" Icon={Paperclip} checked={showHanger} onCheckedChange={setShowHanger} />
              <ViewOptionRow label="Color information" Icon={Info} checked={showColorInfo} onCheckedChange={setShowColorInfo} />
              <ViewOptionRow label="Room view" Icon={Image} checked={showRoom} onCheckedChange={setShowRoom} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ViewerControlSurface>
  );
}
