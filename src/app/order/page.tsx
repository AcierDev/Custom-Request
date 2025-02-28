"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function Custom() {
  const searchParams = useSearchParams();
  const loadFromShareableData = useCustomStore(
    (state) => state.loadFromShareableData
  );

  useEffect(() => {
    // Check if there's a share parameter in the URL
    const shareData = searchParams.get("share");
    if (shareData) {
      const success = loadFromShareableData(shareData);
      if (success) {
        toast.success("Design loaded successfully!");
      } else {
        toast.error(
          "Failed to load the shared design. The link may be invalid or expired."
        );
      }
    }
  }, [searchParams, loadFromShareableData]);

  return (
    <div className="w-full h-screen">
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
