"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sun, Sunset, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

type TimeOfDay = "morning" | "afternoon" | "night";

interface LightingControlsProps {
  value: TimeOfDay;
  onChange: (value: TimeOfDay) => void;
}

export function LightingControls({ value, onChange }: LightingControlsProps) {
  const options = [
    {
      value: "morning" as TimeOfDay,
      label: "Morning",
      icon: Sun,
      description: "Bright, clear light from the east",
    },
    {
      value: "afternoon" as TimeOfDay,
      label: "Afternoon",
      icon: Sunset,
      description: "Warm, golden light from above",
    },
    {
      value: "night" as TimeOfDay,
      label: "Night",
      icon: Moon,
      description: "Soft, diffused evening light",
    },
  ];

  return (
    <Card className="w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-medium">Lighting</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <div className="flex flex-col gap-2">
          {options.map((option) => {
            const Icon = option.icon;
            const isSelected = value === option.value;

            return (
              <Button
                key={option.value}
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start h-auto py-2 px-3 relative",
                  isSelected && "border-purple-500 dark:border-purple-400"
                )}
                onClick={() => onChange(option.value)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "p-1.5 rounded-full",
                      isSelected
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                      {option.description}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <motion.div
                    layoutId="lighting-selection-indicator"
                    className="absolute inset-0 border-2 border-purple-500 dark:border-purple-400 rounded-md"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
