"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import { getDimensionsDetails } from "@/typings/constants";
import { Ruler, Grid, Scale } from "lucide-react";

export function DimensionsCard() {
  const { selectedSize } = useCustomStore();
  const details = getDimensionsDetails(selectedSize);

  const DetailRow = ({
    label,
    value,
    icon,
  }: {
    label: string;
    value: string;
    icon: React.ReactNode;
  }) => (
    <motion.div
      key={value}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between py-1.5"
    >
      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
        {value}
      </span>
    </motion.div>
  );

  return (
    <Card className="h-1/3 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Dimensions & Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {details ? (
          <motion.div
            key={selectedSize}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <DetailRow
              label="Dimensions (inches)"
              value={`${details.inches.width}" × ${details.inches.height}"`}
              icon={<Ruler className="w-4 h-4" />}
            />
            <DetailRow
              label="Dimensions (feet)"
              value={`${details.feet.width.toFixed(
                1
              )}' × ${details.feet.height.toFixed(1)}'`}
              icon={<Ruler className="w-4 h-4" />}
            />
            <DetailRow
              label="Blocks"
              value={`${details.blocks.width} × ${details.blocks.height} (${details.blocks.total} total)`}
              icon={<Grid className="w-4 h-4" />}
            />
            <DetailRow
              label="Area"
              value={`${details.area.squareFeet.toFixed(1)} sq ft`}
              icon={<Grid className="w-4 h-4" />}
            />
            <DetailRow
              label="Weight"
              value={`${details.weight.pounds.toFixed(
                1
              )} lbs (${details.weight.kilograms.toFixed(1)} kg)`}
              icon={<Scale className="w-4 h-4" />}
            />
          </motion.div>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Select a size to view details
          </div>
        )}
      </CardContent>
    </Card>
  );
}
