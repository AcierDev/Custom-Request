"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Palette, X } from "lucide-react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { useCustomStore } from "@/store/customStore";
import { ItemDesigns } from "@/typings/types";

export function EmptyPaletteWarning() {
  const { customPalette, selectedDesign } = useCustomStore();
  const [isDismissed, setIsDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Check if user has dismissed this warning in the current session
    const sessionDismissed = sessionStorage.getItem("paletteWarningDismissed");
    if (sessionDismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  // Show warning when custom design is selected but palette is empty
  const shouldShowWarning =
    selectedDesign === ItemDesigns.Custom && customPalette.length === 0;

  const handleDismiss = () => {
    setIsDismissed(true);
    // Store dismissal in session storage
    sessionStorage.setItem("paletteWarningDismissed", "true");
  };

  // Don't render anything during SSR
  if (!mounted) return null;

  // Don't show if there's no need or it's been dismissed
  if (!shouldShowWarning || isDismissed) return null;

  const handleNavigateToPalette = () => {
    router.push("/palette");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            damping: 15,
            stiffness: 200,
            delay: 0.1,
          }}
        >
          <Card className="relative max-w-md w-full dark:bg-gray-800/90 border-2 border-purple-500/50 shadow-xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
            <CardContent className="pt-6 px-4 pb-4">
              <div className="flex flex-col items-center text-center space-y-4">
                <motion.div
                  className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30"
                  initial={{ rotate: -10 }}
                  animate={{ rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <Palette className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </motion.div>
                <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  No Color Palette Selected
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  You need to create or select a color palette before you can
                  preview your design. Head over to the palette page to choose
                  your colors and bring your design to life!
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleNavigateToPalette}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                  >
                    Create Palette
                  </Button>
                  <Button variant="outline" onClick={handleDismiss}>
                    Continue Anyway
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
