"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCustomStore } from "@/store/customStore";
import { ShoppingCart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export function OrderButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, isGuest } = useAuth();

  // Get the necessary state from the custom store
  const dimensions = useCustomStore((state) => state.dimensions);
  const selectedDesign = useCustomStore((state) => state.selectedDesign);
  const shippingSpeed = useCustomStore((state) => state.shippingSpeed);
  const colorPattern = useCustomStore((state) => state.colorPattern);
  const orientation = useCustomStore((state) => state.orientation);
  const customPalette = useCustomStore((state) => state.customPalette);
  const pricing = useCustomStore((state) => state.pricing);
  const isReversed = useCustomStore((state) => state.isReversed);
  const patternStyle = useCustomStore((state) => state.patternStyle);
  const style = useCustomStore((state) => state.style);

  // Get the createDraftOrder function from the store
  const createDraftOrder = useCustomStore((state) => state.createDraftOrder);
  const saveToDatabase = useCustomStore((state) => state.saveToDatabase);
  const saveToLocalStorage = useCustomStore(
    (state) => state.saveToLocalStorage
  );

  const handleCreateOrder = async () => {
    // If user is not logged in, redirect to login
    if (!user && !isGuest) {
      toast.error("Please log in to place an order");
      router.push("/login?redirect=/order");
      return;
    }

    setIsLoading(true);

    try {
      // Save the current design state before creating the order
      if (isGuest) {
        // For guest users, save to local storage
        saveToLocalStorage();
      } else {
        // For authenticated users, save to database
        await saveToDatabase();
      }

      // Create the draft order using the store function
      const result = await createDraftOrder();

      if (!result.success) {
        throw new Error(result.error || "Failed to create order");
      }

      // Success! Show a toast notification
      toast.success("Order created successfully!");

      // Redirect to the Shopify checkout page if available, otherwise to orders page
      if (result.checkoutUrl) {
        // Use window.open to open in a new tab
        window.open(result.checkoutUrl, "_blank");
        // Stay on the current page
        setIsLoading(false);
      } else {
        // If no checkout URL is available, show a different message
        toast.info(
          "Your order has been created. You'll receive an invoice by email shortly."
        );
        // Optionally redirect to an orders page if you have one
        // router.push("/orders");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create order"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCreateOrder}
      className="w-full bg-gradient-to-r from-green-500 to-emerald-700 hover:from-green-600 hover:to-emerald-800 text-white font-medium py-3 rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
      size="lg"
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Creating Order...</span>
        </>
      ) : (
        <>
          <ShoppingCart className="h-5 w-5" />
          <span>Place Order</span>
        </>
      )}
    </Button>
  );
}
