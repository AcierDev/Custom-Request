"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PreviewCard } from "../order/components/PreviewCard";
import { useCustomStore } from "@/store/customStore";
import { ColorStrip } from "@/app/design/components/ColorStrip";
import { PaletteDesigner } from "@/app/design/components/PaletteDesigner";

export default function Colors() {
  const { currentColors, customPalette } = useCustomStore();

  return (
    <div className="w-full h-screen">
      <div className="w-full h-full dark:bg-gray-900 p-8 flex flex-col gap-8">
        {/* Top section - Color palette designer */}
        <Card className="w-full flex-1 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Palette Designer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PaletteDesigner />
          </CardContent>
        </Card>

        {/* Bottom section - Three columns */}
        <div className="flex gap-8 flex-1">
          {/* Left column - Primary Colors */}
          <Card className="w-1/5 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Info 1
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Center column - Preview and Color Strip */}
          <div className="w-3/5 flex flex-col gap-4">
            <div className="flex-1">
              <PreviewCard />
            </div>
            {customPalette.length > 0 ? (
              <ColorStrip
                colors={Object.fromEntries(
                  customPalette.map((color, index) => [
                    index.toString(),
                    { hex: color.hex, name: color.name },
                  ])
                )}
                position="top"
              />
            ) : currentColors ? (
              <ColorStrip colors={currentColors} position="top" />
            ) : null}
          </div>

          {/* Right column - Secondary Colors */}
          <Card className="w-1/5 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Info 2
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
