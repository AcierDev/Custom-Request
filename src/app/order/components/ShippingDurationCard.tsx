"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import { Calendar, Truck, Clock } from "lucide-react";
import { useState } from "react";
import { addBusinessDays, format } from "date-fns";

interface ShippingEstimate {
  production: string;
  shipping: string;
  delivery: Date;
}

const getShippingEstimates = (shippingSpeed: string): ShippingEstimate => {
  const today = new Date();
  const shippingDays = "2-5";

  switch (shippingSpeed) {
    case "rushed":
      return {
        production: "1-3 days",
        shipping: shippingDays,
        delivery: addBusinessDays(today, 8), // 3 days production + 5 days shipping
      };
    case "expedited":
      return {
        production: "7 days",
        shipping: shippingDays,
        delivery: addBusinessDays(today, 12), // 7 days production + 5 days shipping
      };
    default:
      return {
        production: "30 days",
        shipping: shippingDays,
        delivery: addBusinessDays(today, 35), // 30 days production + 5 days shipping
      };
  }
};

const DetailRow = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center justify-between py-1.5"
  >
    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
      {icon}
      <span>{label}</span>
    </div>
    <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
      {value}
    </span>
  </motion.div>
);

export function ShippingDurationCard() {
  const { shippingSpeed } = useCustomStore();
  const [zipCode, setZipCode] = useState("");
  const estimates = getShippingEstimates(shippingSpeed);

  return (
    <Card className="h-1/3 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Shipping Duration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="zipcode"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Enter Zip Code
          </label>
          <Input
            id="zipcode"
            type="text"
            placeholder="Enter zip code for accurate estimate"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            maxLength={5}
          />
        </div>

        <div className="space-y-2">
          <DetailRow
            label="Production Time"
            value={estimates.production}
            icon={<Clock className="w-4 h-4" />}
          />
          <DetailRow
            label="Transit Time"
            value={`${estimates.shipping} business days`}
            icon={<Truck className="w-4 h-4" />}
          />
          <DetailRow
            label="Estimated Delivery"
            value={format(estimates.delivery, "MMM d, yyyy")}
            icon={<Calendar className="w-4 h-4" />}
          />
        </div>

        {!zipCode && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            * Enter your zip code for a more accurate delivery estimate
          </p>
        )}
      </CardContent>
    </Card>
  );
}
