import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DesignCard } from "@/app/custom/components/DesignCard";
import { SizeCard } from "@/app/custom/components/SizeCard";
import { PriceCard } from "@/app/custom/components/PriceCard";
import { ShippingCard } from "@/app/custom/components/ShippingCard";
import { DimensionsCard } from "@/app/custom/components/DimensionsCard";
import { ShippingDurationCard } from "@/app/custom/components/ShippingDurationCard";

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
          <Card className="h-1/2 dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Card 4</CardTitle>
            </CardHeader>
          </Card>

          <Card className="h-1/2 dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Card 5</CardTitle>
            </CardHeader>
          </Card>
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
