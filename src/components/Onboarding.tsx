"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  X,
  Palette,
  SquareStack,
  Paintbrush,
  Share2,
  Circle,
  Square,
  Triangle,
  Layers,
  Hexagon,
  Box,
  Home,
  Maximize,
  Rotate3d,
  Share,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

// Updated type definition without the image property
type OnboardingStep = {
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  animationComponent: React.ReactNode;
};

// Animation components for each step
const WelcomeAnimation = () => (
  <div className="relative h-full w-full flex items-center justify-center">
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex items-center justify-center"
    >
      <div className="relative">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.1, 1] }}
          transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
          className="absolute inset-0 bg-blue-200/30 rounded-full blur-xl"
          style={{ width: 260, height: 260, top: -130, left: -130 }}
        />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="relative z-10"
        >
          <Home className="h-24 w-24 text-white" />
        </motion.div>

        <motion.div
          animate={{
            rotate: 360,
            y: [0, -10, 0],
          }}
          transition={{
            rotate: { repeat: Infinity, duration: 20, ease: "linear" },
            y: { repeat: Infinity, duration: 3, ease: "easeInOut" },
          }}
          className="absolute -right-16 top-4"
        >
          <Palette className="h-12 w-12 text-white/80" />
        </motion.div>

        <motion.div
          animate={{
            rotate: -360,
            x: [0, 10, 0],
          }}
          transition={{
            rotate: { repeat: Infinity, duration: 25, ease: "linear" },
            x: { repeat: Infinity, duration: 4, ease: "easeInOut" },
          }}
          className="absolute -left-16 bottom-0"
        >
          <Circle className="h-10 w-10 text-white/80" />
        </motion.div>
      </div>
    </motion.div>
  </div>
);

const DesignsAnimation = () => (
  <div className="relative h-full w-full flex items-center justify-center">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex items-center justify-center"
    >
      <div className="relative grid grid-cols-2 gap-8">
        {[Square, Circle, Triangle, Hexagon].map((ShapeIcon, index) => (
          <motion.div
            key={index}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 * index, duration: 0.5 }}
            className="flex items-center justify-center"
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                y: [0, -5, 0],
              }}
              transition={{
                y: {
                  repeat: Infinity,
                  duration: 2 + index * 0.5,
                  ease: "easeInOut",
                  delay: index * 0.2,
                },
              }}
              className="bg-white/20 backdrop-blur-sm p-4 rounded-xl shadow-lg"
            >
              <ShapeIcon className="h-12 w-12 text-white" />
            </motion.div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  </div>
);

const ColorsAnimation = () => (
  <div className="relative h-full w-full flex items-center justify-center">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex items-center justify-center"
    >
      <div className="grid grid-cols-3 gap-6">
        {[
          "bg-amber-400",
          "bg-emerald-500",
          "bg-blue-400",
          "bg-purple-500",
          "bg-rose-500",
          "bg-indigo-500",
        ].map((color, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className="relative"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 2 + index * 0.3,
                ease: "easeInOut",
                delay: index * 0.2,
              }}
              className={`${color} w-14 h-14 rounded-full shadow-lg`}
            />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
              className="absolute inset-0 bg-white/30 rounded-full blur-md -z-10"
              style={{ transform: "scale(1.3)" }}
            />
          </motion.div>
        ))}
      </div>

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        className="absolute top-6 right-6"
      >
        <Paintbrush className="h-10 w-10 text-white/70" />
      </motion.div>
    </motion.div>
  </div>
);

const PreviewAnimation = () => (
  <div className="relative h-full w-full flex items-center justify-center">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex items-center justify-center"
    >
      <div className="relative">
        <motion.div
          initial={{ rotateY: 0 }}
          animate={{ rotateY: 360 }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          className="perspective-700"
          style={{ transformStyle: "preserve-3d" }}
        >
          <Box className="h-24 w-24 text-white" />
        </motion.div>

        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{
            rotate: { repeat: Infinity, duration: 20, ease: "linear" },
            scale: { repeat: Infinity, duration: 4, ease: "easeInOut" },
          }}
          className="absolute -right-16 -top-12"
        >
          <Rotate3d className="h-10 w-10 text-white/80" />
        </motion.div>

        <motion.div
          animate={{
            rotate: -360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            rotate: { repeat: Infinity, duration: 25, ease: "linear" },
            scale: { repeat: Infinity, duration: 5, ease: "easeInOut" },
          }}
          className="absolute -left-16 -bottom-12"
        >
          <Maximize className="h-10 w-10 text-white/80" />
        </motion.div>
      </div>
    </motion.div>
  </div>
);

const ShareAnimation = () => (
  <div className="relative h-full w-full flex items-center justify-center">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex items-center justify-center"
    >
      <div className="relative">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="bg-white/20 backdrop-blur-sm p-6 rounded-xl shadow-lg"
        >
          <Layers className="h-24 w-24 text-white" />
        </motion.div>

        {[1, 2, 3].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
            animate={{
              scale: [0, 1, 0],
              x: [0, ((i % 2 === 0 ? 80 : -80) * (i + 1)) / 2],
              y: [0, i === 1 ? -80 : 40],
              opacity: [0, 1, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
              delay: i * 1,
              times: [0, 0.5, 1],
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <Share className="h-10 w-10 text-white/90" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  </div>
);

const onboardingSteps: OnboardingStep[] = [
  {
    title: "Welcome to Everwood",
    description:
      "Design beautiful, custom wooden art pieces tailored to your space and style.",
    icon: <Palette className="h-6 w-6" />,
    accent: "from-blue-600 to-violet-600",
    animationComponent: <WelcomeAnimation />,
  },
  {
    title: "Choose Your Design",
    description:
      "Browse our collection of designs or create your own custom masterpiece.",
    icon: <SquareStack className="h-6 w-6" />,
    accent: "from-emerald-600 to-teal-600",
    animationComponent: <DesignsAnimation />,
  },
  {
    title: "Customize Colors",
    description:
      "Select from pre-made palettes or create your own unique color combinations.",
    icon: <Paintbrush className="h-6 w-6" />,
    accent: "from-amber-600 to-orange-600",
    animationComponent: <ColorsAnimation />,
  },
  {
    title: "Preview in 3D",
    description:
      "See your creation from every angle with our interactive 3D preview.",
    icon: <SquareStack className="h-6 w-6" />,
    accent: "from-purple-600 to-pink-600",
    animationComponent: <PreviewAnimation />,
  },
  {
    title: "Share & Order",
    description:
      "Share your design with friends or place an order to bring it to life.",
    icon: <Share2 className="h-6 w-6" />,
    accent: "from-red-600 to-pink-600",
    animationComponent: <ShareAnimation />,
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        >
          {/* Animated background blobs */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Primary large gradient blob */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0.8 }}
              animate={{
                scale: [0.8, 1.1, 0.9],
                opacity: [0.8, 0.9, 0.8],
                x: ["-5%", "0%", "-3%"],
                y: ["-5%", "2%", "-8%"],
              }}
              transition={{
                repeat: Infinity,
                duration: 20,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
              className="absolute -top-[30%] -left-[20%] w-[80%] h-[80%] rounded-full bg-gradient-to-br from-blue-400/30 via-indigo-500/20 to-violet-500/30 blur-3xl"
            />

            {/* Secondary gradient blob */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0.7 }}
              animate={{
                scale: [0.9, 1.2, 0.8],
                opacity: [0.7, 0.8, 0.7],
                x: ["10%", "5%", "15%"],
                y: ["10%", "15%", "5%"],
              }}
              transition={{
                repeat: Infinity,
                duration: 25,
                repeatType: "reverse",
                ease: "easeInOut",
                delay: 2,
              }}
              className="absolute top-[10%] right-[0%] w-[70%] h-[70%] rounded-full bg-gradient-to-bl from-cyan-400/20 via-sky-500/15 to-blue-600/20 blur-3xl"
            />

            {/* Accent blob for color variation */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0.6 }}
              animate={{
                scale: [0.7, 1, 0.6],
                opacity: [0.6, 0.7, 0.5],
                x: ["-10%", "-5%", "-15%"],
                y: ["60%", "65%", "55%"],
              }}
              transition={{
                repeat: Infinity,
                duration: 18,
                repeatType: "reverse",
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute bottom-[0%] left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-purple-400/20 via-fuchsia-500/15 to-pink-500/20 blur-3xl"
            />

            {/* Bottom right accent blob */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0.7 }}
              animate={{
                scale: [0.8, 1.1, 0.7],
                opacity: [0.7, 0.8, 0.6],
                x: ["5%", "0%", "10%"],
                y: ["-5%", "0%", "-10%"],
              }}
              transition={{
                repeat: Infinity,
                duration: 22,
                repeatType: "reverse",
                ease: "easeInOut",
                delay: 3,
              }}
              className="absolute bottom-[0%] right-[0%] w-[55%] h-[55%] rounded-full bg-gradient-to-tl from-amber-400/20 via-orange-500/15 to-rose-500/20 blur-3xl"
            />
          </div>

          {/* Subtle mesh grid overlay */}
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />

          {/* Subtle noise texture */}
          <div className="absolute inset-0 bg-noise-pattern opacity-[0.02] mix-blend-overlay pointer-events-none" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="w-full max-w-4xl relative z-10"
          >
            <Card className="border-muted/30 shadow-xl overflow-hidden relative bg-background/95 backdrop-blur-md">
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
                    className={`absolute inset-0 bg-gradient-to-br ${onboardingSteps[currentStep].accent} opacity-80`}
                  />

                  {/* Animation Container - replacing the Image component */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="w-full h-full flex items-center justify-center p-4"
                    >
                      {onboardingSteps[currentStep].animationComponent}
                    </motion.div>
                  </AnimatePresence>

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
