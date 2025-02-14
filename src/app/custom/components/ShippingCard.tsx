"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useCustomStore, ShippingSpeed } from "@/store/customStore";
import { Truck, Zap, Timer } from "lucide-react";

interface ShippingOption {
  id: ShippingSpeed;
  title: string;
  description: string;
  price: string;
  icon: React.ReactNode;
  productionTime: string;
  shippingTime: string;
}

const shippingOptions: ShippingOption[] = [
  {
    id: "standard",
    title: "Standard",
    description: "Free Shipping",
    price: "$0",
    icon: <Truck className="w-4 h-4" />,
    productionTime: "30 days",
    shippingTime: "2-5 days",
  },
  {
    id: "expedited",
    title: "Expedited",
    description: "Faster Production",
    price: "+$75",
    icon: <Timer className="w-4 h-4" />,
    productionTime: "7 days",
    shippingTime: "2-5 days",
  },
  {
    id: "rushed",
    title: "Rushed",
    description: "Priority Production",
    price: "+$150",
    icon: <Zap className="w-4 h-4" />,
    productionTime: "1-3 days",
    shippingTime: "2-5 days",
  },
];

export function ShippingCard() {
  const { shippingSpeed, setShippingSpeed } = useCustomStore();

  return (
    <Card className="h-1/3 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Shipping
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <RadioGroup
          value={shippingSpeed}
          onValueChange={(value: ShippingSpeed) => setShippingSpeed(value)}
          className="flex flex-col gap-1.5"
        >
          {shippingOptions.map((option) => (
            <Label
              key={option.id}
              htmlFor={option.id}
              className="cursor-pointer"
            >
              <motion.div
                initial={false}
                animate={{
                  backgroundColor:
                    shippingSpeed === option.id
                      ? "rgba(139, 92, 246, 0.1)"
                      : "transparent",
                }}
                className={`flex items-start space-x-2 rounded-lg border p-4 transition-colors ${
                  shippingSpeed === option.id
                    ? "border-purple-500 dark:border-purple-400"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <RadioGroupItem
                  value={option.id}
                  id={option.id}
                  className="mt-1"
                />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {option.title}
                      </span>
                      {option.icon}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        option.id === "standard"
                          ? "text-green-600 dark:text-green-400"
                          : "text-purple-600 dark:text-purple-400"
                      }`}
                    >
                      {option.price}
                    </span>
                  </div>
                  <div className="text-[11px] leading-tight text-gray-500 dark:text-gray-400">
                    Production: {option.productionTime}
                    <span className="mx-1">•</span>
                    Shipping: {option.shippingTime}
                  </div>
                </div>
              </motion.div>
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
