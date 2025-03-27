"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useCustomStore } from "@/store/customStore";
import { ItemDesigns } from "@/typings/types";

type TipCategory = "design" | "color" | "pattern" | "size" | "general";

// Define a string type that includes keys of the store
type StoreKey = keyof ReturnType<typeof useCustomStore>;

export type Tip = {
  id: string;
  title: string;
  content: string;
  category: TipCategory;
  contexts: StoreKey[];
};

const tips: Tip[] = [
  {
    id: "design-tip-1",
    title: "Choosing the Right Design",
    content:
      "Select a design that complements your space. Geometric patterns work well in modern spaces, while organic designs suit natural aesthetics.",
    category: "design",
    contexts: ["selectedDesign"],
  },
  {
    id: "color-tip-1",
    title: "Color Harmony",
    content:
      "Try using complementary colors (opposite on the color wheel) for a vibrant look, or analogous colors (next to each other) for a harmonious feel.",
    category: "color",
    contexts: ["customPalette"],
  },
  {
    id: "pattern-tip-1",
    title: "Pattern Orientation",
    content:
      "Vertical patterns can make a space feel taller, while horizontal patterns can make it feel wider. Consider your room's dimensions.",
    category: "pattern",
    contexts: ["orientation", "colorPattern"],
  },
  {
    id: "size-tip-1",
    title: "Sizing Your Piece",
    content:
      "For a focal point, choose a larger size. For accent pieces, smaller sizes work well. Always measure your wall space first.",
    category: "size",
    contexts: ["dimensions"],
  },
  {
    id: "general-tip-1",
    title: "Save Your Creations",
    content:
      "Don't forget to save your designs as you work. You can revisit and edit them later or create variations.",
    category: "general",
    contexts: ["savedDesigns"],
  },
];

export function DesignTips() {
  const [isVisible, setIsVisible] = useState(true);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [dismissedTips, setDismissedTips] = useState<string[]>([]);
  const [relevantTips, setRelevantTips] = useState<Tip[]>([]);
  const store = useCustomStore();

  useEffect(() => {
    // Load dismissed tips from localStorage
    const savedDismissedTips = localStorage.getItem("dismissedTips");
    if (savedDismissedTips) {
      setDismissedTips(JSON.parse(savedDismissedTips));
    }
  }, []);

  useEffect(() => {
    // Filter tips based on current context and not dismissed
    const contextRelevantTips = tips.filter(
      (tip) =>
        !dismissedTips.includes(tip.id) &&
        tip.contexts.some((context) => !!store[context])
    );
    setRelevantTips(contextRelevantTips);

    // Reset the index if we have new relevant tips
    if (contextRelevantTips.length > 0) {
      setCurrentTipIndex(0);
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [
    store.selectedDesign,
    store.customPalette,
    store.colorPattern,
    store.orientation,
    store.dimensions,
    dismissedTips,
  ]);

  const currentTip = relevantTips[currentTipIndex];

  const dismissTip = () => {
    if (currentTip) {
      const newDismissedTips = [...dismissedTips, currentTip.id];
      setDismissedTips(newDismissedTips);
      localStorage.setItem("dismissedTips", JSON.stringify(newDismissedTips));
    }
  };

  const nextTip = () => {
    if (currentTipIndex < relevantTips.length - 1) {
      setCurrentTipIndex(currentTipIndex + 1);
    } else {
      setCurrentTipIndex(0);
    }
  };

  const prevTip = () => {
    if (currentTipIndex > 0) {
      setCurrentTipIndex(currentTipIndex - 1);
    } else {
      setCurrentTipIndex(relevantTips.length - 1);
    }
  };

  if (!isVisible || relevantTips.length === 0 || !currentTip) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed top-20 left-72 z-50 max-w-sm"
      >
        <Card className="dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 rounded-full h-6 w-6"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Close</span>
          </Button>

          <CardContent className="pt-6 pb-2">
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium">{currentTip.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {currentTip.content}
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between pt-0 pb-4">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={prevTip}
                disabled={relevantTips.length <= 1}
                className="h-7 w-7 rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous tip</span>
              </Button>

              <div className="text-xs text-muted-foreground">
                {currentTipIndex + 1} / {relevantTips.length}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={nextTip}
                disabled={relevantTips.length <= 1}
                className="h-7 w-7 rounded-full"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next tip</span>
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={dismissTip}
              className="text-xs h-7 rounded-full text-muted-foreground"
            >
              Don't show again
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
