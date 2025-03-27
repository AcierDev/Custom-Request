"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  X,
  Palette,
  PaintBucket,
  Brush,
  Sparkles,
  Save,
  Copy,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { useCustomStore } from "@/store/customStore";

type OnboardingStep = {
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
  accent: string;
};

const paletteOnboardingSteps: OnboardingStep[] = [
  {
    title: "Welcome to Color Palette Studio",
    description:
      "Craft beautiful color palettes for your custom wood art pieces.",
    icon: <Palette className="h-6 w-6" />,
    image: "/onboarding/colors.jpg",
    accent: "from-purple-600 to-pink-600",
  },
  {
    title: "Create Custom Palettes",
    description:
      "Use the color picker to add colors that match your design vision.",
    icon: <PaintBucket className="h-6 w-6" />,
    image: "/onboarding/palette-create.jpg",
    accent: "from-blue-600 to-violet-600",
  },
  {
    title: "Edit Colors",
    description:
      "Fine-tune your colors by adjusting hex values or using names for reference.",
    icon: <Brush className="h-6 w-6" />,
    image: "/onboarding/palette-edit.jpg",
    accent: "from-emerald-600 to-teal-600",
  },
  {
    title: "Save & Organize",
    description: "Save your palettes and organize them for future projects.",
    icon: <Save className="h-6 w-6" />,
    image: "/onboarding/palette-save.jpg",
    accent: "from-amber-600 to-orange-600",
  },
  {
    title: "Browse Official Collections",
    description: "Explore our curated collection of palettes for inspiration.",
    icon: <Sparkles className="h-6 w-6" />,
    image: "/onboarding/palette-official.jpg",
    accent: "from-red-600 to-pink-600",
  },
];

interface PaletteOnboardingProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export function PaletteOnboarding({
  forceShow = false,
  onClose,
}: PaletteOnboardingProps) {
  const [isVisible, setIsVisible] = useState(forceShow);
  const [currentStep, setCurrentStep] = useState(0);
  const { setActiveTab } = useCustomStore();

  useEffect(() => {
    // If forceShow is true, always show the onboarding
    if (forceShow) {
      setIsVisible(true);
      return;
    }

    // Otherwise, check if user has already seen palette onboarding
    const paletteOnboardingCompleted = localStorage.getItem(
      "paletteOnboardingCompleted"
    );
    if (paletteOnboardingCompleted === "true") {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, [forceShow]);

  const handleNext = () => {
    if (currentStep < paletteOnboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completePaletteOnboarding();
    }
  };

  const completePaletteOnboarding = () => {
    // Mark palette onboarding as completed
    localStorage.setItem("paletteOnboardingCompleted", "true");
    setIsVisible(false);

    if (onClose) {
      onClose();
    }
  };

  const skipPaletteOnboarding = () => {
    // Mark palette onboarding as completed
    localStorage.setItem("paletteOnboardingCompleted", "true");
    setIsVisible(false);

    if (onClose) {
      onClose();
    }
  };

  // Show the appropriate tab based on the current step
  useEffect(() => {
    if (isVisible) {
      if (currentStep <= 2) {
        setActiveTab("create");
      } else if (currentStep === 3) {
        setActiveTab("saved");
      } else if (currentStep === 4) {
        setActiveTab("official");
      }
    }
  }, [currentStep, isVisible, setActiveTab]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="w-full max-w-4xl"
          >
            <Card className="border-muted/30 shadow-xl overflow-hidden relative bg-background">
              <div className="absolute top-4 right-4 z-50">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipPaletteOnboarding}
                  className="rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="relative h-64 md:h-auto overflow-hidden">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${paletteOnboardingSteps[currentStep].accent} opacity-60 mix-blend-multiply`}
                  />
                  <Image
                    src={paletteOnboardingSteps[currentStep].image}
                    alt={paletteOnboardingSteps[currentStep].title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {paletteOnboardingSteps.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentStep(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentStep
                              ? "bg-white w-6"
                              : "bg-white/50"
                          }`}
                          aria-label={`Go to step ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${paletteOnboardingSteps[currentStep].accent} text-white`}
                    >
                      {paletteOnboardingSteps[currentStep].icon}
                    </div>
                    <h3 className="text-2xl font-bold">
                      {paletteOnboardingSteps[currentStep].title}
                    </h3>
                    <p className="text-muted-foreground text-base">
                      {paletteOnboardingSteps[currentStep].description}
                    </p>
                  </div>

                  {currentStep === 0 && (
                    <div className="mt-6 bg-muted p-4 rounded-lg border border-muted-foreground/20">
                      <div className="flex gap-2 items-center text-sm font-medium">
                        <RotateCw className="h-4 w-4 text-muted-foreground" />
                        <span>Features you'll discover</span>
                      </div>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li className="flex items-center gap-2">
                          <PaintBucket className="h-3 w-3 text-primary" /> Color
                          selection
                        </li>
                        <li className="flex items-center gap-2">
                          <Copy className="h-3 w-3 text-primary" /> Palette
                          management
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="h-3 w-3 text-primary" /> Official
                          collections
                        </li>
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-8">
                    <Button
                      variant="ghost"
                      onClick={skipPaletteOnboarding}
                      className="text-muted-foreground"
                    >
                      Skip
                    </Button>
                    <Button
                      onClick={handleNext}
                      className={`bg-gradient-to-r ${paletteOnboardingSteps[currentStep].accent} text-white font-medium flex items-center gap-2`}
                    >
                      {currentStep === paletteOnboardingSteps.length - 1
                        ? "Get Started"
                        : "Next"}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
