"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Paintbrush, ArrowRight } from "lucide-react";
import { useCustomStore } from "@/store/customStore";
import Link from "next/link";
import { ItemDesigns } from "@/typings/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  createDesignBackground,
  DESIGN_PILL_FULL,
  DESIGN_PILL_INTERACTIVE,
  DESIGN_PILL_SELECTED_RING,
} from "@/lib/design-pills";

interface DesignCardProps {
  className?: string;
  compact?: boolean;
  /** Render only the trigger/popover without the surrounding glass Card. */
  bare?: boolean;
}

const EmptyCustomPaletteInfo = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm rounded-lg">
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="p-2 bg-blue-500/10 dark:bg-blue-900/30 rounded-full">
          <Paintbrush className="w-5 h-5 text-blue-300" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-white">
            Create Your Custom Design
          </h3>
          <p className="text-xs text-slate-400 max-w-[200px]">
            Visit the Design page to create your custom color palette
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="bg-blue-600 hover:bg-blue-500 ring-1 ring-blue-400/40 text-white"
        >
          <Link href="/viewer">
            Go to Viewer
            <ArrowRight className="w-3 h-3 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export function DesignCard({
  className = "",
  compact = false,
  bare = false,
}: DesignCardProps) {
  const { selectedDesign, setSelectedDesign } = useCustomStore();
  const [isOpen, setIsOpen] = useState(false);

  if (compact) {
    const inner = (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`${DESIGN_PILL_FULL} ${DESIGN_PILL_INTERACTIVE} w-auto !h-7 leading-none`}
                style={{ background: createDesignBackground(selectedDesign) }}
              >
                <span className="truncate leading-none">{selectedDesign}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={8}
              className="w-72 p-3 bg-gray-900 border border-white/10"
            >
              <div className="flex flex-wrap gap-1.5">
                {Object.values(ItemDesigns).map((design) => {
                  const isActive = selectedDesign === design;
                  return (
                    <button
                      key={design}
                      type="button"
                      onClick={() => {
                        setSelectedDesign(design);
                        setIsOpen(false);
                      }}
                      className={`${DESIGN_PILL_FULL} ${DESIGN_PILL_INTERACTIVE} ${
                        isActive ? DESIGN_PILL_SELECTED_RING : ""
                      }`}
                      style={{ background: createDesignBackground(design) }}
                    >
                      <span className="truncate leading-none">{design}</span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
    );

    if (bare) {
      return inner;
    }

    return (
      <Card className={`glass-surface rounded-[0.7rem] shadow-lg ${className}`}>
        <CardContent className="py-3 px-4">{inner}</CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`h-1/3 glass-surface rounded-[0.7rem] relative group ${className}`}
    >
      <CardContent className="relative h-full">
        <EmptyCustomPaletteInfo />
      </CardContent>
    </Card>
  );
}
