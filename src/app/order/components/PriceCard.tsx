"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import { cn } from "@/lib/utils";

export function PriceCard() {
  const { dimensions, pricing } = useCustomStore();

  const { width, height } = dimensions;

  const formatPrice = (amount: number) => {
    return (
      <motion.span
        key={amount}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "font-medium",
          amount === 0 ? "text-green-600 dark:text-green-400" : ""
        )}
      >
        ${amount?.toFixed(2)}
      </motion.span>
    );
  };

  return (
    <Card className="h-1/3 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Price
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Base Price
            </span>
            {formatPrice(pricing.basePrice)}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Custom Order Fee
            </span>
            {formatPrice(pricing.customFee)}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Shipping
            </span>
            {formatPrice(pricing.shipping.total)}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Tax (10%)
            </span>
            {formatPrice(pricing.tax)}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Price</span>
            <motion.div
              key={pricing.total}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "text-lg font-bold",
                width && height
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-400 dark:text-gray-600"
              )}
            >
              ${pricing.total.toFixed(2)}
            </motion.div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
