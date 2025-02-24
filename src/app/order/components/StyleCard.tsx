"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useCustomStore, StyleType } from "@/store/customStore";
import { Grid, Hexagon, LayoutGrid } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const styles: {
  value: StyleType;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    value: "geometric",
    label: "Geometric",
    icon: <Hexagon className="w-4 h-4" />,
    description: "Modern geometric patterns with dynamic depth and shadows",
  },
  {
    value: "tiled",
    label: "Tiled",
    icon: <Grid className="w-4 h-4" />,
    description: "Classic tiled arrangement with varying heights",
  },
  {
    value: "striped",
    label: "Striped",
    icon: <LayoutGrid className="w-4 h-4" />,
    description: "Clean, linear patterns with smooth transitions",
  },
];

interface StyleCardProps {
  compact?: boolean;
}

export function StyleCard({ compact = false }: StyleCardProps) {
  const { style, setStyle } = useCustomStore();

  if (compact) {
    return (
      <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardContent className="p-3">
          <div className="space-y-2">
            <Label className="text-sm text-gray-700 dark:text-gray-300">
              Style
            </Label>
            <RadioGroup
              value={style}
              onValueChange={(value: StyleType) => setStyle(value)}
              className="grid grid-cols-3 gap-1.5"
            >
              {styles.map(({ value, label, icon }) => (
                <Label
                  key={value}
                  className="cursor-pointer"
                  htmlFor={`mini-style-${value}`}
                >
                  <div
                    className={`flex flex-col items-center justify-center p-2 rounded-md text-xs transition-colors ${
                      style === value
                        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    <RadioGroupItem
                      value={value}
                      id={`mini-style-${value}`}
                      className="sr-only"
                    />
                    {icon}
                    <span className="mt-1">{label}</span>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-1/2 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Style
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={style}
          onValueChange={(value: StyleType) => setStyle(value)}
          className="flex flex-col gap-3"
        >
          {styles.map(({ value, label, icon, description }) => (
            <Label
              key={value}
              className="cursor-pointer"
              htmlFor={`style-${value}`}
            >
              <motion.div
                initial={false}
                animate={{
                  backgroundColor:
                    style === value ? "rgba(139, 92, 246, 0.1)" : "transparent",
                }}
                className={`flex items-start space-x-4 rounded-lg border p-4 transition-colors ${
                  style === value
                    ? "border-purple-500 dark:border-purple-400"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <RadioGroupItem
                  value={value}
                  id={`style-${value}`}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center">
                    {icon}
                    <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {description}
                  </p>
                </div>
              </motion.div>
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
