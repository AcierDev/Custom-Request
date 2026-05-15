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

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  return (
    <Card className="glass-surface shadow-lg">
      <CardHeader className="pb-1.5 pt-2.5 px-3">
        <CardTitle className="text-sm font-medium">Lighting</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-0">
        <div className="relative">
          {/* Single travelling selection outline, layered above the
              buttons so it never slides behind an intermediate row. */}
          <motion.div
            aria-hidden
            className="absolute inset-x-0 top-0 h-10 rounded-md border-2 border-indigo-400/70 ring-1 ring-indigo-400/30 bg-indigo-500/5 pointer-events-none z-10"
            animate={{ y: selectedIndex * 44 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
          <div className="flex flex-col gap-1">
            {options.map((option) => {
              const Icon = option.icon;
              const isSelected = value === option.value;

              return (
                <Button
                  key={option.value}
                  variant="outline"
                  size="sm"
                  className="group justify-start h-10 py-0 px-2"
                  onClick={() => onChange(option.value)}
                  title={option.description}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div
                      className={cn(
                        "p-1 rounded-full shrink-0",
                        isSelected
                          ? "bg-indigo-500/20 text-indigo-200"
                          : "bg-gray-800 text-gray-400"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="font-medium text-sm leading-tight">
                        {option.label}
                      </div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
