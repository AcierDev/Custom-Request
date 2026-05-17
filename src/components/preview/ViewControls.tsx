"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ChevronDown,
  Ruler,
  Grid,
  Info,
  Paperclip,
  SplitSquareVertical,
  TreePine,
  Sparkles,
} from "lucide-react";
import { WOOD_STYLES } from "./woodStyles";

interface ViewControlsProps {
  className?: string;
}

export function ViewControls({ className = "" }: ViewControlsProps) {
  const {
    viewSettings,
    setShowRuler,
    setShowWoodGrain,
    setWoodStyle,
    setMetallic,
    setShowColorInfo,
    setShowHanger,
    setShowSplitPanel,
  } = useCustomStore();
  const {
    showRuler,
    showWoodGrain,
    woodStyle,
    metallic,
    showColorInfo,
    showHanger,
    showSplitPanel,
  } = viewSettings;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      <Card className="glass-surface shadow-lg">
        <div className="p-3 space-y-4">
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="flex w-full items-center justify-between"
            aria-expanded={isExpanded}
          >
            <Label className="text-sm text-slate-300 cursor-pointer">
              View Options
            </Label>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key="view-options-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">
                  Show Ruler
                </span>
              </div>
              <Switch
                checked={showRuler}
                onCheckedChange={setShowRuler}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">
                  Show Wood Grain
                </span>
              </div>
              <Switch
                checked={showWoodGrain}
                onCheckedChange={setShowWoodGrain}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TreePine className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">Wood Style</span>
              </div>
              <select
                value={woodStyle}
                onChange={(e) => setWoodStyle(e.target.value)}
                disabled={!showWoodGrain}
                className="max-w-[10rem] truncate rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-200 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40"
              >
                {WOOD_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">Metallic</span>
              </div>
              <Switch
                checked={metallic}
                onCheckedChange={setMetallic}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">
                  Show Hanger
                </span>
              </div>
              <Switch
                checked={showHanger}
                onCheckedChange={setShowHanger}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">
                  Show Color Info
                </span>
              </div>
              <Switch
                checked={showColorInfo}
                onCheckedChange={setShowColorInfo}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SplitSquareVertical className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">
                  Split Panel View
                </span>
              </div>
              <Switch
                checked={showSplitPanel}
                onCheckedChange={setShowSplitPanel}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}
