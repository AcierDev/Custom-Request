"use client";

import { Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShareDesignButtonProps {
  isMobile: boolean;
  onClick: () => void;
}

const SHARE_DESIGN_LABEL = "Share Design";
const SHARE_DESIGN_BUTTON_CLASS =
  "rounded-full bg-indigo-600 text-white ring-1 ring-indigo-400/40 hover:bg-indigo-500";
const MOBILE_SHARE_DESIGN_BUTTON_CLASS =
  "h-9 w-9 shrink-0 rounded-full";

export function ShareDesignButton({
  isMobile,
  onClick,
}: ShareDesignButtonProps) {
  return (
    <Button
      size={isMobile ? "icon" : "default"}
      aria-label={SHARE_DESIGN_LABEL}
      title={SHARE_DESIGN_LABEL}
      className={cn(
        SHARE_DESIGN_BUTTON_CLASS,
        isMobile && MOBILE_SHARE_DESIGN_BUTTON_CLASS,
      )}
      onClick={onClick}
    >
      <Share className="h-4 w-4 shrink-0" />
      {!isMobile && SHARE_DESIGN_LABEL}
    </Button>
  );
}
