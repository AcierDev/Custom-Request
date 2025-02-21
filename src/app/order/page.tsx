import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DesignCard } from "@/app/order/components/DesignCard";
import { SizeCard } from "@/app/order/components/SizeCard";
import { PriceCard } from "@/app/order/components/PriceCard";
import { ShippingCard } from "@/app/order/components/ShippingCard";
import { DimensionsCard } from "@/app/order/components/DimensionsCard";
import { ShippingDurationCard } from "@/app/order/components/ShippingDurationCard";
import { PreviewCard } from "@/app/order/components/PreviewCard";
import { DesignDetailsCard } from "@/app/order/components/DesignDetailsCard";

export default function Custom() {
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
          <DesignDetailsCard />
          <PreviewCard />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 w-1/4">
          <DimensionsCard />
          <ShippingDurationCard />
          <PriceCard />
        </div>
      </div>
    </div>
  );
}
