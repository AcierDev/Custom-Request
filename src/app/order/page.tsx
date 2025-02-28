"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DesignCard } from "@/app/order/components/DesignCard";
import { SizeCard } from "@/app/order/components/SizeCard";
import { PriceCard } from "@/app/order/components/PriceCard";
import { ShippingCard } from "@/app/order/components/ShippingCard";
import { DimensionsCard } from "@/app/order/components/DimensionsCard";
import { ShippingDurationCard } from "@/app/order/components/ShippingDurationCard";
import { PreviewCard } from "@/app/order/components/PreviewCard";
import { StyleCard } from "@/app/order/components/StyleCard";
import { ShareCard } from "@/app/order/components/ShareCard";
import { useCustomStore } from "@/store/customStore";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Create a separate component that uses useSearchParams
function OrderContent() {
  const searchParams = useSearchParams();
  const loadFromShareableData = useCustomStore(
    (state) => state.loadFromShareableData
  );
  const [isSharedDesign, setIsSharedDesign] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if there's a share parameter in the URL (either regular or short format)
    const regularShareData = searchParams.get("share");
    const shortShareData = searchParams.get("s");

    // Process whichever parameter is present
    if (regularShareData || shortShareData) {
      let shareData;

      // If we have the short format, construct the parameter with the "s=" prefix
      if (shortShareData) {
        shareData = `s=${shortShareData}`;
      } else {
        // Otherwise use the regular format with "share=" prefix
        shareData = `share=${regularShareData}`;
      }

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
    }
  }, [searchParams, loadFromShareableData]);

  return (
    <div className="w-full h-screen relative">
      {/* Shared Design Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
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

      <div className="w-full h-full dark:bg-gray-900 flex justify-between p-8">
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
          <ShippingDurationCard />
          <PriceCard />
          <ShareCard />
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function OrderLoading() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 border-4 border-t-purple-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600 dark:text-gray-400">
          Loading your design...
        </p>
      </div>
    </div>
  );
}

export default function Custom() {
  return (
    <Suspense fallback={<OrderLoading />}>
      <OrderContent />
    </Suspense>
  );
}
