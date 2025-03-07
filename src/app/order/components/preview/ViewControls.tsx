"use client";

import { motion } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Ruler, Grid, Info, Paperclip } from "lucide-react";

interface ViewControlsProps {
  className?: string;
}

export function ViewControls({ className = "" }: ViewControlsProps) {
  const {
    viewSettings,
    setShowRuler,
    setShowWoodGrain,
    setShowColorInfo,
    setShowHanger,
  } = useCustomStore();
  const { showRuler, showWoodGrain, showColorInfo, showHanger } = viewSettings;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="p-3 space-y-4">
          <Label className="text-sm text-gray-700 dark:text-gray-300">
            View Options
          </Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Show Ruler
                </span>
              </div>
              <Switch
                checked={showRuler}
                onCheckedChange={setShowRuler}
                className="data-[state=checked]:bg-purple-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Show Wood Grain
                </span>
              </div>
              <Switch
                checked={showWoodGrain}
                onCheckedChange={setShowWoodGrain}
                className="data-[state=checked]:bg-purple-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Show Hanger
                </span>
              </div>
              <Switch
                checked={showHanger}
                onCheckedChange={setShowHanger}
                className="data-[state=checked]:bg-purple-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Show Color Info
                </span>
              </div>
              <Switch
                checked={showColorInfo}
                onCheckedChange={setShowColorInfo}
                className="data-[state=checked]:bg-purple-600"
              />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
