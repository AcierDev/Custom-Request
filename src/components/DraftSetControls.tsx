"use client";

import { useState } from "react";
import { useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import { Plus, Layers } from "lucide-react";
import { toast } from "sonner";
import { DraftSetSheet } from "./DraftSetSheet";
import { Badge } from "@/components/ui/badge";

interface DraftSetControlsProps {
  compact?: boolean;
}

export function DraftSetControls({ compact = false }: DraftSetControlsProps) {
  const {
    draftSet,
    addToDraftSet,
    getShareableStateSnapshot,
    dimensions,
    style,
  } = useCustomStore();

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleAddToSet = () => {
    const snapshot = getShareableStateSnapshot();
    const label = `Design ${draftSet.length + 1} - ${dimensions.width}x${
      dimensions.height
    } ${style}`;

    addToDraftSet({
      label,
      designData: snapshot,
    });

    toast.success("Added to draft set");
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size={compact ? "icon" : "default"}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm relative"
          onClick={() => setIsSheetOpen(true)}
          title="View Design Set"
        >
          <Layers className={`w-4 h-4 ${compact ? "" : "mr-2"}`} />
          {!compact && <span>View Set</span>}
          {draftSet.length > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] border border-border shadow-sm"
            >
              {draftSet.length}
            </Badge>
          )}
        </Button>

        <Button
          variant="secondary"
          size={compact ? "icon" : "default"}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-input shadow-sm hover:bg-accent hover:text-accent-foreground"
          onClick={handleAddToSet}
          title="Add current design to set"
        >
          <Plus className={`w-4 h-4 ${compact ? "" : "mr-2"}`} />
          {!compact && <span>Add to Set</span>}
        </Button>
      </div>

      <DraftSetSheet isOpen={isSheetOpen} onOpenChange={setIsSheetOpen} />
    </>
  );
}
