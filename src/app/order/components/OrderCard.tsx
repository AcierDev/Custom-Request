"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderButton } from "./OrderButton";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";

export function OrderCard() {
  const [isVisible, setIsVisible] = useState(false);

  // Ensure the card becomes visible after mounting
  useEffect(() => {
    // Small delay to ensure proper rendering after hydration
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="order-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="overflow-hidden border-2 border-green-500/20 dark:border-green-500/10 shadow-lg dark:bg-gray-800/50">
            <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 pb-3">
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <ShoppingBag className="h-5 w-5" />
                <span>Ready to Order?</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your custom design is ready to be ordered. Click below to
                  proceed to checkout.
                </p>
                <div className="pt-2">
                  <OrderButton />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
