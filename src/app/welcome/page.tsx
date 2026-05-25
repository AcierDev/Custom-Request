"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Palette,
  Truck,
  Paintbrush,
  ArrowRight,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function WelcomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log("Welcome page mounted at:", new Date().toISOString());

    // Check if user is coming from onboarding
    const fromOnboarding = sessionStorage.getItem("fromOnboarding");
    console.log("fromOnboarding flag:", fromOnboarding);

    // Debug user auth state
    const user = localStorage.getItem("everwood_user");
    const isGuest = localStorage.getItem("everwood_guest_mode");
    const onboardingCompleted = localStorage.getItem("onboardingCompleted");

    console.log("User Authentication Debug in welcome page:");
    console.log("- User data:", user ? "exists" : "none");
    console.log("- Guest mode:", isGuest === "true" ? "true" : "false");
    console.log(
      "- Onboarding completed:",
      onboardingCompleted === "true" ? "true" : "false"
    );

    // Clear ALL potential redirect flags to ensure clean state
    sessionStorage.removeItem("redirect_pending");
    sessionStorage.removeItem("redirect_in_progress");
    sessionStorage.removeItem("google_redirect_in_progress");
    sessionStorage.removeItem("signin_initiated");

    // If coming from onboarding, clear those flags too
    if (fromOnboarding === "true") {
      console.log("Coming from onboarding, clearing flags");
      sessionStorage.removeItem("fromOnboarding");
      sessionStorage.removeItem("welcome_initial_render");
    }
  }, []);

  if (!mounted) return null;

  const features = [
    {
      title: "Color Studio",
      description: "Create and save custom color palettes for your projects.",
      icon: <Palette className="h-8 w-8" />,
      color: "bg-gradient-to-br from-blue-500 to-indigo-600",
      link: "/palette",
    },
    {
      title: "Custom Designer",
      description: "Design your own unique wooden art piece from scratch.",
      icon: <Paintbrush className="h-8 w-8" />,
      color: "bg-gradient-to-br from-sky-500 to-blue-600",
      link: "/viewer",
    },
    {
      title: "Order Center",
      description: "Review and place orders for your custom creations.",
      icon: <Truck className="h-8 w-8" />,
      color: "bg-gradient-to-br from-emerald-500 to-teal-600",
      link: "/viewer",
    },
    {
      title: "Profile & Favorites",
      description: "Manage your account and favorite designs.",
      icon: <Heart className="h-8 w-8" />,
      color: "bg-gradient-to-br from-indigo-500 to-violet-600",
      link: "/profile",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Wavy background blobs with Apple-like design */}
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
          className="absolute -top-[30%] -left-[20%] w-[80%] h-[80%] rounded-full bg-gradient-to-br from-blue-600/30 via-indigo-700/25 to-sky-700/20 blur-3xl"
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
          className="absolute top-[10%] right-[0%] w-[70%] h-[70%] rounded-full bg-gradient-to-bl from-sky-600/20 via-blue-700/15 to-indigo-800/20 blur-3xl"
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
          className="absolute bottom-[0%] left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-indigo-600/20 via-blue-700/15 to-sky-700/20 blur-3xl"
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
          className="absolute bottom-[0%] right-[0%] w-[55%] h-[55%] rounded-full bg-gradient-to-tl from-emerald-600/15 via-teal-700/10 to-sky-700/15 blur-3xl"
        />
      </div>

      {/* Subtle mesh grid overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />

      {/* Subtle noise texture */}
      <div className="absolute inset-0 bg-noise-pattern opacity-[0.02] mix-blend-overlay pointer-events-none" />

      {/* Content with backdrop blur for better readability */}
      <div className="relative min-h-screen z-10 backdrop-blur-[2px]">
        <div className="container mx-auto max-w-6xl px-4 py-8 sm:py-12 lg:py-16">
          <header className="mb-8 text-center sm:mb-12 lg:mb-16">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="mb-4 text-3xl font-bold tracking-tight text-white sm:mb-6 sm:text-5xl">
                Welcome to Everwood
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-400 sm:text-xl">
                Get started creating beautiful wooden art pieces customized to
                your style and space.
              </p>
            </motion.div>
          </header>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.1,
                  duration: 0.6,
                  ease: "easeOut",
                }}
              >
                <Link href={feature.link} className="block h-full">
                  <Card className="h-full rounded-2xl glass-surface overflow-hidden hover:border-blue-400/30 hover:shadow-blue-500/10 transition-all duration-300 group">
                    <CardHeader>
                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center ${feature.color} text-white mb-4 shadow-md shadow-blue-900/30 transition-all duration-300 group-hover:scale-110 group-hover:shadow-blue-500/30`}
                      >
                        <motion.div
                          animate={{ rotate: [0, 5, 0, -5, 0] }}
                          transition={{
                            repeat: Infinity,
                            duration: 6,
                            repeatType: "loop",
                            ease: "easeInOut",
                          }}
                        >
                          {feature.icon}
                        </motion.div>
                      </div>
                      <CardTitle className="text-xl flex items-center justify-between text-white group-hover:text-blue-300 transition-colors duration-300">
                        {feature.title}
                        <ArrowRight className="h-5 w-5 opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                      </CardTitle>
                      <CardDescription className="text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 text-center sm:mt-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.7 }}
            >
              <Button
                onClick={() => router.push("/viewer")}
                size="lg"
                className="relative overflow-hidden bg-blue-600 px-6 py-5 text-base text-white shadow-xl shadow-blue-600/30 ring-1 ring-blue-400/40 transition-all duration-300 hover:bg-blue-500 hover:shadow-blue-500/40 sm:px-10 sm:py-6 sm:text-lg"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-400/10 to-sky-400/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></span>
                <span className="relative z-10 flex items-center">
                  Start Designing Now
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      repeatType: "loop",
                    }}
                    className="ml-2 inline-flex"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </motion.span>
                </span>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
