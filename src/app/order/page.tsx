"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DesignCard } from "@/app/order/components/DesignCard";
import { SizeCard } from "@/app/order/components/SizeCard";
import { PriceCard } from "@/app/order/components/PriceCard";
import { ShippingCard } from "@/app/order/components/ShippingCard";
import { DimensionsCard } from "@/app/order/components/DimensionsCard";
import { PreviewCard } from "@/app/order/components/PreviewCard";
import { StyleCard } from "@/app/order/components/StyleCard";
import { ShareCard } from "@/app/order/components/ShareCard";
import { OrderCard } from "@/app/order/components/OrderCard";
import { useCustomStore } from "@/store/customStore";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { Suspense } from "react";

// Create a separate component that uses useSearchParams
function OrderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loadFromShareableData = useCustomStore(
    (state) => state.loadFromShareableData
  );
  const [isSharedDesign, setIsSharedDesign] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authLoading, isGuest } = useAuth();

  useEffect(() => {
    // If authentication is still loading, wait for it
    if (authLoading) return;

    // If user is not authenticated and not in guest mode, they will be redirected by the auth context
    if (!user && !isGuest) return;

    // Check if there's a share parameter in the URL (either regular or short format)
    const regularShareData = searchParams.get("share");
    const shortShareData = searchParams.get("s");

    if (regularShareData || shortShareData) {
      // Process whichever parameter is present
      let shareData;

      // If we have the short format, construct the parameter with the "s=" prefix
      if (shortShareData) {
        shareData = `s=${shortShareData}`;
      } else {
        // Otherwise use the regular format with "share=" prefix
        shareData = `share=${regularShareData}`;
      }

      try {
        const success = loadFromShareableData(shareData);

        if (success) {
          setIsSharedDesign(true);
          setShowBanner(true);
          toast.success("Design loaded successfully!");
        } else {
          toast.error(
            "Failed to load the shared design. The link may be invalid or expired."
          );
        }
      } catch (error) {
        console.error("Error loading shared design:", error);
        toast.error("An error occurred while loading the design.");
      }
    }

    // Design is loaded (or failed to load), but we're done loading
    setIsLoading(false);
  }, [searchParams, loadFromShareableData, user, isGuest, authLoading, router]);

  if (isLoading || authLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-gray-600 dark:text-gray-400">
            {authLoading ? "Authenticating..." : "Loading your design..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative">
      {/* Shared Design Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
            className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-4 z-50"
          >
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                <span>
                  You're viewing a shared design. Feel free to customize it or
                  create your own!
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBanner(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`w-full h-full dark:bg-gray-900 flex justify-between p-8 ${
          isGuest || showBanner ? "pt-20" : ""
        }`}
      >
        {/* Left column */}
        <div className="flex flex-col gap-4 w-1/4">
          <DesignCard />
          <SizeCard />
          <ShippingCard />
        </div>

        {/* Middle column */}
        <div className="flex flex-col gap-4 w-2/5 h-full">
          <StyleCard />
          <PreviewCard />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 w-1/4">
          <DimensionsCard />
          <PriceCard />
          <ShareCard />
          <OrderCard />
        </div>
      </div>
    </div>
  );
}

export default function Custom() {
  const [isMounted, setIsMounted] = useState(false);

  // Handle hydration mismatch by only rendering after component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-gray-600 dark:text-gray-400">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="w-full h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <OrderContent />
    </Suspense>
  );
}
