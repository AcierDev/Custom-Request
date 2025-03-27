"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OnboardingButtonProps {
  onShowOnboarding: () => void;
}

export function OnboardingButton({ onShowOnboarding }: OnboardingButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              // Clear the onboarding completed flag and refresh
              localStorage.removeItem("paletteOnboardingCompleted");
              onShowOnboarding();
            }}
          >
            <HelpCircle className="h-5 w-5" />
            <span className="sr-only">Show palette help</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Show palette tutorial</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
