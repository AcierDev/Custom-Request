"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Laptop, X } from "lucide-react";
import { Button } from "./ui/button";

export function MobileWarning() {
  const [isMobile, setIsMobile] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024); // Consider devices below 1024px as mobile
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  if (!isMobile || isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <Card className="relative max-w-md w-full dark:bg-gray-800/90 border-2 border-purple-500/50">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardContent className="pt-6 px-4 pb-4">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Laptop className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Best Viewed on Desktop
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Our brand new website is optimized for desktop viewing. For the
                best experience, please visit us on a computer. Mobile
                optimization is coming soon!
              </p>
              <Button
                onClick={() => setIsDismissed(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
              >
                Continue Anyway
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
