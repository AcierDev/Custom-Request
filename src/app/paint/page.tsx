"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { PrinterIcon } from "lucide-react";
import {
  COASTAL_COLORS,
  AMBER_COLORS,
  FOREST_COLORS,
  ABYSS_COLORS,
  AUTUMN_COLORS,
  WINTER_COLORS,
  LAWYER_COLORS,
} from "@/typings/color-maps";
import { ItemDesigns } from "@/typings/types";

// Helper function to determine text color based on background color
const getContrastColor = (hexColor: string): string => {
  // Remove the hash if it exists
  const hex = hexColor.replace("#", "");

  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance - using the formula for relative luminance
  // See: https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-tests
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light colors and white for dark colors
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
};

// Define the paint color type
type PaintColor = {
  id: number;
  name: string;
  isBase: boolean;
  mixRatio?: string;
  baseColors?: string[];
  colorCode: string;
};

// Define the design type
type Design = {
  id: string;
  name: string;
  description: string;
  colors: PaintColor[];
};

// Convert color data from color-maps.ts to our PaintColor format
const mapCoastalColors = (): PaintColor[] => {
  return [
    {
      id: 1,
      name: "Toasty Fireplace",
      isBase: true,
      colorCode: COASTAL_COLORS[1].hex,
    },
    {
      id: 2,
      name: "Toasty Fireplace + Cosy Chair",
      isBase: false,
      mixRatio: "1:1",
      baseColors: ["Toasty Fireplace", "Cosy Chair"],
      colorCode: COASTAL_COLORS[2].hex,
    },
    {
      id: 3,
      name: "Cosy Chair",
      isBase: true,
      colorCode: COASTAL_COLORS[3].hex,
    },
    {
      id: 4,
      name: "Cosy Chair + Ballroom Dancing",
      isBase: false,
      mixRatio: "1:1",
      baseColors: ["Cosy Chair", "Ballroom Dancing"],
      colorCode: COASTAL_COLORS[4].hex,
    },
    {
      id: 5,
      name: "Ballroom Dancing",
      isBase: true,
      colorCode: COASTAL_COLORS[5].hex,
    },
    {
      id: 6,
      name: "Ballroom Dancing + Academy Gray",
      isBase: false,
      mixRatio: "2:1",
      baseColors: ["Ballroom Dancing", "Academy Gray"],
      colorCode: COASTAL_COLORS[6].hex,
    },
    {
      id: 7,
      name: "Academy Gray + Ballroom Dancing",
      isBase: false,
      mixRatio: "5:3",
      baseColors: ["Academy Gray", "Ballroom Dancing"],
      colorCode: COASTAL_COLORS[7].hex,
    },
    {
      id: 8,
      name: "Academy Gray",
      isBase: true,
      colorCode: COASTAL_COLORS[8].hex,
    },
    {
      id: 10,
      name: "Academy Gray + Peaceful Slumber",
      isBase: false,
      mixRatio: "3:5",
      baseColors: ["Academy Gray", "Peaceful Slumber"],
      colorCode: COASTAL_COLORS[11].hex,
    },
    {
      id: 11,
      name: "Peaceful Slumber",
      isBase: true,
      colorCode: COASTAL_COLORS[12].hex,
    },
    {
      id: 12,
      name: "Peaceful Slumber + Midnight Bayou",
      isBase: false,
      mixRatio: "5:3",
      baseColors: ["Peaceful Slumber", "Midnight Bayou"],
      colorCode: COASTAL_COLORS[13].hex,
    },
    {
      id: 13,
      name: "Midnight Bayou + Peaceful Slumber",
      isBase: false,
      mixRatio: "5:3",
      baseColors: ["Midnight Bayou", "Peaceful Slumber"],
      colorCode: COASTAL_COLORS[14].hex,
    },
    {
      id: 14,
      name: "Midnight Bayou",
      isBase: true,
      colorCode: COASTAL_COLORS[15].hex,
    },
    {
      id: 15,
      name: "Indigo Streamer + Midnight Bayou",
      isBase: false,
      mixRatio: "1:1",
      baseColors: ["Indigo Streamer", "Midnight Bayou"],
      colorCode: COASTAL_COLORS[15].hex,
    },
    {
      id: 16,
      name: "Indigo Streamer",
      isBase: true,
      colorCode: COASTAL_COLORS[16].hex,
    },
  ];
};

const mapAmberColors = (): PaintColor[] => {
  return [
    {
      id: 1,
      name: "French Roast",
      isBase: true,
      colorCode: AMBER_COLORS[1].hex,
    },
    {
      id: 2,
      name: "French Roast + Reynard",
      isBase: false,
      mixRatio: "94:33",
      baseColors: ["French Roast", "Reynard"],
      colorCode: AMBER_COLORS[2].hex,
    },
    {
      id: 3,
      name: "French Roast + Reynard",
      isBase: false,
      mixRatio: "1:1",
      baseColors: ["French Roast", "Reynard"],
      colorCode: AMBER_COLORS[3].hex,
    },
    {
      id: 4,
      name: "Reynard + French Roast",
      isBase: false,
      mixRatio: "82:31",
      baseColors: ["Reynard", "French Roast"],
      colorCode: AMBER_COLORS[4].hex,
    },
    { id: 5, name: "Reynard", isBase: true, colorCode: AMBER_COLORS[5].hex },
    {
      id: 6,
      name: "Reynard + Network Grey",
      isBase: false,
      mixRatio: "75:31",
      baseColors: ["Reynard", "Network Grey"],
      colorCode: AMBER_COLORS[6].hex,
    },
    {
      id: 7,
      name: "Reynard + Network Grey",
      isBase: false,
      mixRatio: "45:59",
      baseColors: ["Reynard", "Network Grey"],
      colorCode: AMBER_COLORS[7].hex,
    },
    {
      id: 8,
      name: "Reynard + Grey",
      isBase: false,
      mixRatio: "32:84",
      baseColors: ["Reynard", "Grey"],
      colorCode: AMBER_COLORS[8].hex,
    },
    {
      id: 9,
      name: "Network Grey",
      isBase: true,
      colorCode: AMBER_COLORS[9].hex,
    },
    {
      id: 10,
      name: "Grey + White",
      isBase: false,
      mixRatio: "60:85",
      baseColors: ["Grey", "White"],
      colorCode: AMBER_COLORS[10].hex,
    },
    {
      id: 11,
      name: "Grey + White",
      isBase: false,
      mixRatio: "47:200",
      baseColors: ["Grey", "White"],
      colorCode: AMBER_COLORS[11].hex,
    },
    {
      id: 12,
      name: "Grey + White",
      isBase: false,
      mixRatio: "30:345",
      baseColors: ["Grey", "White"],
      colorCode: AMBER_COLORS[12].hex,
    },
    { id: 13, name: "White", isBase: true, colorCode: AMBER_COLORS[13].hex },
  ];
};

const mapForestColors = (): PaintColor[] => {
  return [
    { id: 1, name: "Black", isBase: true, colorCode: FOREST_COLORS[1].hex },
    {
      id: 2,
      name: "Black + French Roast",
      isBase: false,
      mixRatio: "1:1",
      baseColors: ["Black", "French Roast"],
      colorCode: FOREST_COLORS[2].hex,
    },
    {
      id: 3,
      name: "French Roast",
      isBase: true,
      colorCode: FOREST_COLORS[3].hex,
    },
    {
      id: 4,
      name: "French Roast + Forestwood",
      isBase: false,
      mixRatio: "2:1",
      baseColors: ["French Roast", "Forestwood"],
      colorCode: FOREST_COLORS[4].hex,
    },
    {
      id: 5,
      name: "French Roast + Forestwood",
      isBase: false,
      mixRatio: "1:2",
      baseColors: ["French Roast", "Forestwood"],
      colorCode: FOREST_COLORS[5].hex,
    },
    {
      id: 6,
      name: "Forestwood",
      isBase: true,
      colorCode: FOREST_COLORS[6].hex,
    },
    {
      id: 7,
      name: "Forestwood + Number Five",
      isBase: false,
      mixRatio: "1:1",
      baseColors: ["Forestwood", "Number Five"],
      colorCode: FOREST_COLORS[7].hex,
    },
    {
      id: 8,
      name: "Number Five",
      isBase: true,
      colorCode: FOREST_COLORS[8].hex,
    },
    {
      id: 9,
      name: "Number Five + Network Grey",
      isBase: false,
      mixRatio: "1:1",
      baseColors: ["Number Five", "Network Grey"],
      colorCode: FOREST_COLORS[9].hex,
    },
    {
      id: 10,
      name: "Network Grey",
      isBase: true,
      colorCode: FOREST_COLORS[10].hex,
    },
    {
      id: 11,
      name: "Grey + White (Amber #10)",
      isBase: false,
      mixRatio: "60:85",
      baseColors: ["Grey", "White"],
      colorCode: FOREST_COLORS[11].hex,
    },
    {
      id: 12,
      name: "Grey + White (Amber #11)",
      isBase: false,
      mixRatio: "47:200",
      baseColors: ["Grey", "White"],
      colorCode: FOREST_COLORS[12].hex,
    },
    {
      id: 13,
      name: "Grey + White (Amber #12)",
      isBase: false,
      mixRatio: "30:345",
      baseColors: ["Grey", "White"],
      colorCode: FOREST_COLORS[13].hex,
    },
    { id: 14, name: "White", isBase: true, colorCode: FOREST_COLORS[14].hex },
  ];
};

const mapAbyssColors = (): PaintColor[] => {
  return [
    {
      id: 1,
      name: "Viejo White",
      isBase: true,
      colorCode: ABYSS_COLORS[10].hex,
    },
    {
      id: 2,
      name: "Rivers Edge",
      isBase: true,
      colorCode: ABYSS_COLORS[9].hex,
    },
    {
      id: 3,
      name: "Rivers Edge + Peaceful Slumber",
      isBase: false,
      mixRatio: "2:1",
      baseColors: ["Rivers Edge", "Peaceful Slumber"],
      colorCode: ABYSS_COLORS[8].hex,
    },
    {
      id: 4,
      name: "Rivers Edge + Peaceful Slumber",
      isBase: false,
      mixRatio: "1:1",
      baseColors: ["Rivers Edge", "Peaceful Slumber"],
      colorCode: ABYSS_COLORS[7].hex,
    },
    {
      id: 5,
      name: "Rivers Edge + Peaceful Slumber",
      isBase: false,
      mixRatio: "1:2",
      baseColors: ["Rivers Edge", "Peaceful Slumber"],
      colorCode: ABYSS_COLORS[6].hex,
    },
    {
      id: 6,
      name: "Peaceful Slumber",
      isBase: true,
      colorCode: ABYSS_COLORS[5].hex,
    },
    {
      id: 7,
      name: "Peaceful Slumber + Indigo Streamer",
      isBase: false,
      mixRatio: "2:1",
      baseColors: ["Peaceful Slumber", "Indigo Streamer"],
      colorCode: ABYSS_COLORS[4].hex,
    },
    {
      id: 8,
      name: "Peaceful Slumber + Indigo Streamer",
      isBase: false,
      mixRatio: "1:1",
      baseColors: ["Peaceful Slumber", "Indigo Streamer"],
      colorCode: ABYSS_COLORS[3].hex,
    },
    {
      id: 9,
      name: "Peaceful Slumber + Indigo Streamer",
      isBase: false,
      mixRatio: "1:2",
      baseColors: ["Peaceful Slumber", "Indigo Streamer"],
      colorCode: ABYSS_COLORS[2].hex,
    },
    {
      id: 10,
      name: "Indigo Streamer",
      isBase: true,
      colorCode: ABYSS_COLORS[1].hex,
    },
  ];
};

const mapAutumnColors = (): PaintColor[] => {
  return [
    { id: 1, name: "Osage", isBase: true, colorCode: AUTUMN_COLORS[5].hex },
    { id: 2, name: "Navel", isBase: true, colorCode: AUTUMN_COLORS[4].hex },
    { id: 3, name: "Knockout", isBase: true, colorCode: AUTUMN_COLORS[3].hex },
    { id: 4, name: "Stop", isBase: true, colorCode: AUTUMN_COLORS[2].hex },
    {
      id: 5,
      name: "Heartthrob",
      isBase: true,
      colorCode: AUTUMN_COLORS[1].hex,
    },
  ];
};

const mapWinterColors = (): PaintColor[] => {
  return [
    {
      id: 1,
      name: "Minor Blue",
      isBase: true,
      colorCode: WINTER_COLORS[5].hex,
    },
    { id: 2, name: "Sky Fall", isBase: true, colorCode: WINTER_COLORS[4].hex },
    {
      id: 3,
      name: "Major Blue",
      isBase: true,
      colorCode: WINTER_COLORS[3].hex,
    },
    {
      id: 4,
      name: "Blue Plate",
      isBase: true,
      colorCode: WINTER_COLORS[2].hex,
    },
    { id: 5, name: "Jay Blue", isBase: true, colorCode: WINTER_COLORS[1].hex },
  ];
};

const mapTidalColors = (): PaintColor[] => {
  return [
    {
      id: 16,
      name: "Indigo Streamer",
      isBase: true,
      colorCode: LAWYER_COLORS[16].hex,
    },
    {
      id: 15,
      name: "Indigo Streamer + Midnight Bayou",
      isBase: false,
      mixRatio: "1:1",
      baseColors: ["Indigo Streamer", "Midnight Bayou"],
      colorCode: LAWYER_COLORS[15].hex,
    },
    {
      id: 14,
      name: "Midnight Bayou",
      isBase: true,
      colorCode: LAWYER_COLORS[14].hex,
    },
    {
      id: 13,
      name: "Midnight Bayou + Peaceful Slumber",
      isBase: false,
      mixRatio: "5:3",
      baseColors: ["Midnight Bayou", "Peaceful Slumber"],
      colorCode: LAWYER_COLORS[13].hex,
    },
    {
      id: 12,
      name: "Peaceful Slumber + Midnight Bayou",
      isBase: false,
      mixRatio: "5:3",
      baseColors: ["Peaceful Slumber", "Midnight Bayou"],
      colorCode: LAWYER_COLORS[12].hex,
    },
    {
      id: 11,
      name: "Peaceful Slumber",
      isBase: true,
      colorCode: LAWYER_COLORS[11].hex,
    },
    {
      id: 10,
      name: "Academy Gray + Peaceful Slumber",
      isBase: false,
      mixRatio: "3:5",
      baseColors: ["Academy Gray", "Peaceful Slumber"],
      colorCode: LAWYER_COLORS[10].hex,
    },
    {
      id: 8,
      name: "Academy Gray",
      isBase: true,
      colorCode: LAWYER_COLORS[3].hex,
    },
    { id: 3, name: "Software", isBase: true, colorCode: LAWYER_COLORS[2].hex },
    {
      id: 2,
      name: "Network Gray",
      isBase: true,
      colorCode: LAWYER_COLORS[1].hex,
    },
    { id: 1, name: "Gray Screen", isBase: true, colorCode: "#D9D9D9" }, // Not in LAWYER_COLORS, using a light gray
  ];
};

const CoastalDreamColors = mapCoastalColors();
const AmberColors = mapAmberColors();
const ForestColors = mapForestColors();
const AbyssColors = mapAbyssColors();
const AutumnColors = mapAutumnColors();
const WinterColors = mapWinterColors();
const TidalColors = mapTidalColors();

const designs: Design[] = [
  {
    id: "coastal-dream",
    name: ItemDesigns.Coastal,
    description:
      "Our main design featuring 16 colors with a coastal theme, ranging from warm browns to cool blues.",
    colors: CoastalDreamColors,
  },
  {
    id: "amber",
    name: ItemDesigns.Amber,
    description:
      "A warm palette of 13 colors featuring rich browns and neutral tones.",
    colors: AmberColors,
  },
  {
    id: "forest",
    name: ItemDesigns.Forest,
    description:
      "A natural palette of 14 colors inspired by forest landscapes.",
    colors: ForestColors,
  },
  {
    id: "abyss",
    name: ItemDesigns.Abyss,
    description: "A serene palette of 10 colors inspired by ocean depths.",
    colors: AbyssColors,
  },
  {
    id: "autumn",
    name: ItemDesigns.Autumn,
    description: "A vibrant palette of 5 base colors capturing autumn foliage.",
    colors: AutumnColors,
  },
  {
    id: "winter",
    name: ItemDesigns.Winter,
    description: "A cool palette of 5 base colors inspired by winter skies.",
    colors: WinterColors,
  },
  {
    id: "tidal",
    name: ItemDesigns.Tidal,
    description:
      "A palette of 12 colors derived from our Coastal Dream design with additional gray tones.",
    colors: TidalColors,
  },
];

// Find shared colors between designs
const findSharedColors = () => {
  const sharedColorMap = new Map<string, string[]>();

  designs.forEach((design) => {
    design.colors.forEach((color) => {
      if (!sharedColorMap.has(color.name)) {
        sharedColorMap.set(color.name, [design.id]);
      } else {
        const existingDesigns = sharedColorMap.get(color.name) || [];
        if (!existingDesigns.includes(design.id)) {
          existingDesigns.push(design.id);
          sharedColorMap.set(color.name, existingDesigns);
        }
      }
    });
  });

  // Filter to only colors that appear in multiple designs
  return new Map(
    [...sharedColorMap.entries()].filter(
      ([_, designIds]) => designIds.length > 1
    )
  );
};

export default function PaintPage() {
  const [activeDesign, setActiveDesign] = useState<string>("coastal-dream");
  const sharedColors = findSharedColors();

  // Function to handle printing the current design
  const handlePrint = () => {
    const activeDesignData = designs.find(
      (design) => design.id === activeDesign
    );
    if (!activeDesignData) return;

    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the design information.");
      return;
    }

    // Generate the print content with a more compact layout
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${activeDesignData.name} - Paint Information</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 10px;
            font-size: 12px;
          }
          h1 {
            font-size: 18px;
            margin-bottom: 5px;
            text-align: center;
          }
          p.description {
            margin: 0 0 10px 0;
            text-align: center;
            font-style: italic;
            font-size: 11px;
          }
          .colors-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .color-item {
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 8px;
            display: flex;
            align-items: center;
          }
          .color-swatch {
            width: 40px;
            height: 40px;
            border-radius: 4px;
            margin-right: 10px;
            position: relative;
            box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
          }
          .color-number {
            position: absolute;
            top: -6px;
            left: -6px;
            width: 18px;
            height: 18px;
            background-color: #333;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 10px;
          }
          .color-info {
            flex: 1;
            min-width: 0;
          }
          .color-info h3 {
            font-size: 12px;
            margin: 0 0 2px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .color-info p {
            font-size: 10px;
            margin: 0;
            color: #666;
            line-height: 1.3;
          }
          .badge {
            display: inline-block;
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 9px;
            margin-right: 3px;
          }
          .base-badge {
            background-color: #f0f0f0;
            border: 1px solid #ddd;
          }
          .mix-badge {
            background-color: #e6f7ff;
            border: 1px solid #bae7ff;
          }
          .color-code {
            font-family: monospace;
            font-size: 9px;
            color: #666;
            margin-top: 2px;
          }
          .footer {
            margin-top: 15px;
            text-align: center;
            font-size: 10px;
            color: #999;
          }
          @media print {
            body {
              padding: 0;
              margin: 0;
            }
            .no-print {
              display: none;
            }
            @page {
              margin: 0.5cm;
              size: portrait;
            }
          }
        </style>
      </head>
      <body>
        <h1>${activeDesignData.name} Paint Information</h1>
        <p class="description">${activeDesignData.description}</p>
        
        <div class="colors-grid">
          ${activeDesignData.colors
            .map((color) => {
              const textColor = getContrastColor(color.colorCode);
              return `
              <div class="color-item">
                <div class="color-swatch" style="background-color: ${
                  color.colorCode
                }">
                  <div class="color-number" style="background-color: ${
                    color.colorCode
                  }; color: ${textColor}">
                    ${color.id}
                  </div>
                </div>
                <div class="color-info">
                  <h3>${color.name}</h3>
                  <div>
                    <span class="badge ${
                      color.isBase ? "base-badge" : "mix-badge"
                    }">
                      ${color.isBase ? "Base" : "Mix"}
                    </span>
                    ${
                      !color.isBase && color.mixRatio
                        ? `
                      <span class="badge mix-badge">Ratio: ${color.mixRatio}</span>
                    `
                        : ""
                    }
                  </div>
                  ${
                    !color.isBase && color.baseColors
                      ? `
                    <p>${color.baseColors.join(" + ")}</p>
                  `
                      : ""
                  }
                  <div class="color-code">${color.colorCode}</div>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
        
        <div class="footer">
          Printed on ${new Date().toLocaleDateString()}
        </div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()">Print</button>
          <button onclick="window.close()">Close</button>
        </div>
      </body>
      </html>
    `;

    // Write to the new window and trigger print
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Focus the new window
    printWindow.focus();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  };

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Paint Collection
            </h1>
            <p className="text-muted-foreground mt-2">
              Explore our curated paint collections used across our different
              art designs.
            </p>
          </div>
          {activeDesign && (
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex items-center gap-2"
            >
              <PrinterIcon className="h-4 w-4" />
              <span>Print Current Design</span>
            </Button>
          )}
        </div>
      </motion.div>

      <Tabs defaultValue="designs" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="designs">Design Collections</TabsTrigger>
          <TabsTrigger value="shared">Shared Colors</TabsTrigger>
        </TabsList>

        <TabsContent value="designs" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
            {designs.map((design) => (
              <Card
                key={design.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  activeDesign === design.id
                    ? "ring-2 ring-primary"
                    : "hover:ring-1 hover:ring-primary/50"
                }`}
                onClick={() => setActiveDesign(design.id)}
              >
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">{design.name}</CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {design.colors.slice(0, 5).map((color) => (
                      <div
                        key={`${design.id}-preview-${color.id}`}
                        className="relative w-6 h-6 rounded-full"
                        style={{ backgroundColor: color.colorCode }}
                      >
                        <span
                          className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
                          style={{ color: getContrastColor(color.colorCode) }}
                        >
                          {color.id}
                        </span>
                      </div>
                    ))}
                    {design.colors.length > 5 && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-muted text-[10px] font-medium">
                        +{design.colors.length - 5}
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {designs.map(
            (design) =>
              design.id === activeDesign && (
                <motion.div
                  key={design.id}
                  initial="hidden"
                  animate="visible"
                  variants={containerVariants}
                  className="space-y-6"
                >
                  <motion.div variants={itemVariants}>
                    <h2 className="text-3xl font-bold">{design.name}</h2>
                    <p className="text-muted-foreground mt-1">
                      {design.description}
                    </p>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <h3 className="text-xl font-semibold mb-4">
                      Color Palette
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {design.colors.map((color) => (
                        <motion.div
                          key={`${design.id}-${color.id}`}
                          variants={itemVariants}
                          className="flex items-center space-x-4 p-4 rounded-lg border bg-card"
                        >
                          <div className="relative">
                            <div
                              className="w-16 h-16 rounded-md shadow-inner"
                              style={{ backgroundColor: color.colorCode }}
                            />
                            <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-md">
                              {color.id}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{color.name}</h4>
                              {color.isBase ? (
                                <Badge
                                  variant="outline"
                                  className="bg-primary/10"
                                >
                                  Base
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-secondary/10"
                                >
                                  Mix
                                </Badge>
                              )}
                              {sharedColors.has(color.name) &&
                                sharedColors.get(color.name)!.length > 1 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          variant="secondary"
                                          className="cursor-help"
                                        >
                                          Shared
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>
                                          Also used in:{" "}
                                          {sharedColors
                                            .get(color.name)!
                                            .filter((id) => id !== design.id)
                                            .map(
                                              (id) =>
                                                designs.find((d) => d.id === id)
                                                  ?.name
                                            )
                                            .join(", ")}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                            </div>
                            {!color.isBase && color.mixRatio && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Mix ratio: {color.mixRatio}
                                {color.baseColors && (
                                  <span className="block mt-1">
                                    {color.baseColors.join(" + ")}
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )
          )}
        </TabsContent>

        <TabsContent value="shared">
          <Card>
            <CardHeader>
              <CardTitle>Shared Colors Across Designs</CardTitle>
              <CardDescription>
                These colors are used in multiple design collections, showing
                the relationships between our different art pieces.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...sharedColors.entries()]
                  .filter(([_, designIds]) => designIds.length > 1)
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([colorName, designIds]) => {
                    // Find the color details from any design that uses it
                    const designWithColor = designs.find((d) =>
                      d.colors.some((c) => c.name === colorName)
                    );
                    const colorDetails = designWithColor?.colors.find(
                      (c) => c.name === colorName
                    );

                    if (!colorDetails) return null;

                    return (
                      <motion.div
                        key={colorName}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100 }}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-4 mb-3">
                          <div className="relative">
                            <div
                              className="w-12 h-12 rounded-md shadow-inner"
                              style={{
                                backgroundColor: colorDetails.colorCode,
                              }}
                            />
                            <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-md">
                              {colorDetails.id}
                            </div>
                          </div>
                          <div>
                            <h3 className="font-medium">{colorName}</h3>
                            <p className="text-sm text-muted-foreground">
                              Used in {designIds.length} designs
                            </p>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="flex flex-wrap gap-2 mt-2">
                          {designIds.map((designId) => {
                            const design = designs.find(
                              (d) => d.id === designId
                            );
                            return design ? (
                              <Badge
                                key={designId}
                                variant="outline"
                                className="bg-card hover:bg-accent transition-colors cursor-pointer"
                                onClick={() => {
                                  setActiveDesign(designId);
                                  document
                                    .querySelector('[value="designs"]')
                                    ?.dispatchEvent(
                                      new MouseEvent("click", { bubbles: true })
                                    );
                                }}
                              >
                                {design.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
