"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type TutorialStep = {
  id: string;
  title: string;
  description: string;
  selector: string;
  position: "top" | "right" | "bottom" | "left";
};

const tutorialSteps: TutorialStep[] = [
  {
    id: "design-selector",
    title: "Choose Your Design",
    description: "Browse different designs to find one that suits your style.",
    selector: ".design-card",
    position: "left",
  },
  {
    id: "size-selector",
    title: "Select Size",
    description: "Choose the dimensions that fit your space.",
    selector: ".size-card",
    position: "left",
  },
  {
    id: "style-selector",
    title: "Pick a Style",
    description: "Change the overall style of your wooden art piece.",
    selector: ".style-card",
    position: "left",
  },
  {
    id: "pattern-controls",
    title: "Pattern Options",
    description: "Customize the pattern orientation and style.",
    selector: ".pattern-controls",
    position: "left",
  },
  {
    id: "color-info",
    title: "Explore Colors",
    description: "Click on any part of the design to see color information.",
    selector: ".canvas-container",
    position: "bottom",
  },
  {
    id: "save-button",
    title: "Save Your Design",
    description:
      "Don't forget to save your creation when you're happy with it.",
    selector: ".save-button",
    position: "bottom",
  },
];

export function DesignTutorial() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasTutorialBeenShown, setHasTutorialBeenShown] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Check if tutorial has been shown before
    const tutorialCompleted = localStorage.getItem("designTutorialCompleted");

    if (tutorialCompleted !== "true") {
      // Wait a bit before showing the tutorial to let the page load fully
      const timer = setTimeout(() => {
        setIsVisible(true);
        setHasTutorialBeenShown(true);
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      setHasTutorialBeenShown(true);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // Find the element to highlight
    const currentStep = tutorialSteps[currentStepIndex];
    const targetElement = document.querySelector(currentStep.selector);

    if (targetElement) {
      // Calculate position based on the element's position and the tooltip position
      const rect = targetElement.getBoundingClientRect();
      let x = 0;
      let y = 0;

      switch (currentStep.position) {
        case "top":
          x = rect.left + rect.width / 2;
          y = rect.top - 10;
          break;
        case "right":
          x = rect.right + 10;
          y = rect.top + rect.height / 2;
          break;
        case "bottom":
          x = rect.left + rect.width / 2;
          y = rect.bottom + 10;
          break;
        case "left":
          x = rect.left - 10;
          y = rect.top + rect.height / 2;
          break;
      }

      setTooltipPosition({ x, y });

      // Add highlight class to the element
      targetElement.classList.add("tutorial-highlight");

      return () => {
        // Remove highlight when effect cleanup runs
        targetElement.classList.remove("tutorial-highlight");
      };
    }
  }, [isVisible, currentStepIndex]);

  const nextStep = () => {
    if (currentStepIndex < tutorialSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      completeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const completeTutorial = () => {
    localStorage.setItem("designTutorialCompleted", "true");
    setIsVisible(false);
  };

  // Button to restart the tutorial
  const TutorialButton = () => {
    if (!hasTutorialBeenShown) return null;

    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-40 rounded-full bg-background/80 backdrop-blur-sm shadow-md"
      >
        <HelpCircle className="h-5 w-5" />
        <span className="sr-only">Show tutorial</span>
      </Button>
    );
  };

  // Calculate position classes based on the step's position
  const getPositionClasses = (position: TutorialStep["position"]) => {
    switch (position) {
      case "top":
        return "bottom-full mb-2 transform -translate-x-1/2";
      case "right":
        return "left-full ml-2 transform -translate-y-1/2";
      case "bottom":
        return "top-full mt-2 transform -translate-x-1/2";
      case "left":
        return "right-full mr-2 transform -translate-y-1/2";
      default:
        return "";
    }
  };

  if (!hasTutorialBeenShown) return null;

  const currentStep = tutorialSteps[currentStepIndex];

  return (
    <>
      <TutorialButton />

      <AnimatePresence>
        {isVisible && (
          <div className="fixed inset-0 z-50 pointer-events-none">
            {/* Semi-transparent overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 pointer-events-auto"
              onClick={completeTutorial}
            />

            {/* Tooltip */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                position: "absolute",
                left: tooltipPosition.x,
                top: tooltipPosition.y,
              }}
              className={`w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 pointer-events-auto ${getPositionClasses(
                currentStep.position
              )}`}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={completeTutorial}
                className="absolute top-2 right-2 h-6 w-6 rounded-full"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Close tutorial</span>
              </Button>

              <div className="mb-3">
                <h3 className="font-medium mb-1">{currentStep.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {currentStep.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-muted-foreground">
                  {currentStepIndex + 1} of {tutorialSteps.length}
                </div>

                <div className="flex gap-2">
                  {currentStepIndex > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={prevStep}
                      className="h-8 px-2 text-xs"
                    >
                      Back
                    </Button>
                  )}

                  <Button
                    onClick={nextStep}
                    size="sm"
                    className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {currentStepIndex === tutorialSteps.length - 1
                      ? "Finish"
                      : "Next"}
                    {currentStepIndex !== tutorialSteps.length - 1 && (
                      <ArrowRight className="ml-1 h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add global styles for highlighted elements */}
      <style jsx global>{`
        .tutorial-highlight {
          position: relative;
          z-index: 45;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          border-radius: 0.375rem;
        }
      `}</style>
    </>
  );
}
