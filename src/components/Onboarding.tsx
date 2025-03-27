"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  X,
  Palette,
  SquareStack,
  Truck,
  Paintbrush,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";

type OnboardingStep = {
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
  accent: string;
};

const onboardingSteps: OnboardingStep[] = [
  {
    title: "Welcome to Everwood",
    description:
      "Design beautiful, custom wooden art pieces tailored to your space and style.",
    icon: <Palette className="h-6 w-6" />,
    image: "/onboarding/welcome.jpg",
    accent: "from-blue-600 to-violet-600",
  },
  {
    title: "Choose Your Design",
    description:
      "Browse our collection of designs or create your own custom masterpiece.",
    icon: <SquareStack className="h-6 w-6" />,
    image: "/onboarding/designs.jpg",
    accent: "from-emerald-600 to-teal-600",
  },
  {
    title: "Customize Colors",
    description:
      "Select from pre-made palettes or create your own unique color combinations.",
    icon: <Paintbrush className="h-6 w-6" />,
    image: "/onboarding/colors.jpg",
    accent: "from-amber-600 to-orange-600",
  },
  {
    title: "Preview in 3D",
    description:
      "See your creation from every angle with our interactive 3D preview.",
    icon: <SquareStack className="h-6 w-6" />,
    image: "/onboarding/preview.jpg",
    accent: "from-purple-600 to-pink-600",
  },
  {
    title: "Share & Order",
    description:
      "Share your design with friends or place an order to bring it to life.",
    icon: <Share2 className="h-6 w-6" />,
    image: "/onboarding/share.jpg",
    accent: "from-red-600 to-pink-600",
  },
];

export function Onboarding() {
  const [isVisible, setIsVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user has already seen onboarding
    const onboardingCompleted = localStorage.getItem("onboardingCompleted");
    if (onboardingCompleted === "true") {
      setHasSeenOnboarding(true);
      setIsVisible(false);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = () => {
    console.log("Completing onboarding");

    // First mark onboarding as completed
    localStorage.setItem("onboardingCompleted", "true");
    setIsVisible(false);

    // Set a flag in sessionStorage to indicate that user is coming from onboarding
    sessionStorage.setItem("fromOnboarding", "true");

    // Remove initial render flag to prevent welcome page from redirecting immediately
    sessionStorage.removeItem("welcome_initial_render");
    console.log("Set fromOnboarding flag in sessionStorage");

    // Add a small delay to ensure all state is updated before navigation
    setTimeout(() => {
      console.log("Redirecting to welcome page directly");
      // Use direct navigation for most reliable redirection
      window.location.href = "/welcome";
    }, 300);
  };

  const skipOnboarding = () => {
    console.log("Skipping onboarding");

    // First mark onboarding as completed
    localStorage.setItem("onboardingCompleted", "true");
    setIsVisible(false);

    // Set a flag in sessionStorage to indicate that user is coming from onboarding
    sessionStorage.setItem("fromOnboarding", "true");

    // Remove initial render flag to prevent welcome page from redirecting immediately
    sessionStorage.removeItem("welcome_initial_render");
    console.log("Set fromOnboarding flag in sessionStorage");

    // Add a small delay to ensure all state is updated before navigation
    setTimeout(() => {
      console.log("Redirecting to welcome page directly");
      // Use direct navigation for most reliable redirection
      window.location.href = "/welcome";
    }, 300);
  };

  if (hasSeenOnboarding) return null;

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
                  onClick={skipOnboarding}
                  className="rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="relative h-64 md:h-auto overflow-hidden">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${onboardingSteps[currentStep].accent} opacity-60 mix-blend-multiply`}
                  />
                  <Image
                    src={onboardingSteps[currentStep].image}
                    alt={onboardingSteps[currentStep].title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {onboardingSteps.map((_, index) => (
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
                      className={`w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${onboardingSteps[currentStep].accent} text-white`}
                    >
                      {onboardingSteps[currentStep].icon}
                    </div>
                    <CardTitle className="text-2xl">
                      {onboardingSteps[currentStep].title}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {onboardingSteps[currentStep].description}
                    </CardDescription>
                  </div>

                  <div className="flex items-center justify-between mt-8">
                    <Button
                      variant="ghost"
                      onClick={skipOnboarding}
                      className="text-muted-foreground"
                    >
                      Skip
                    </Button>
                    <Button
                      onClick={handleNext}
                      className={`bg-gradient-to-r ${onboardingSteps[currentStep].accent} text-white font-medium flex items-center gap-2`}
                    >
                      {currentStep === onboardingSteps.length - 1
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
