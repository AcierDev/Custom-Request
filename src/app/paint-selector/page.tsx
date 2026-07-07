"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  ArrowLeft,
  Palette,
  Plus,
  Check,
  Copy,
  Eye,
  Filter,
  Download,
  Shuffle,
  Heart,
  HeartOff,
  Sparkles,
  X,
  Maximize2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PaintColor {
  name: string;
  hex: string;
  brand: string;
  distance?: number;
  /** false = discontinued / fan-deck-only — never shown as buyable. */
  available?: boolean;
}

type Brand = "Behr" | "Sherwin-Williams" | "Valspar" | "PPG" | "Benjamin Moore";
type SortBy = "name" | "brand" | "hue" | "lightness";

export default function PaintSelectorPage() {
  const router = useRouter();
  const { customPalette, addCustomColor, removeCustomColor } = useCustomStore();

  // State for paint colors
  const [allColors, setAllColors] = useState<PaintColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<Brand | "all">("all");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("similar");
  const [similarToHex, setSimilarToHex] = useState("");
  const [showSimilarColors, setShowSimilarColors] = useState(false);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState<{
    originalColor: string;
    similarColor: PaintColor;
  } | null>(null);

  const colorsPerPage = 50;

  // Load paint colors from JSON files
  useEffect(() => {
    const loadPaintColors = async () => {
      try {
        const [
          behrResponse,
          sherwinResponse,
          valsparResponse,
          ppgResponse,
          benjaminMooreResponse,
        ] = await Promise.all([
          fetch("/paints/behr/colors.json"),
          fetch("/paints/sherwin/colors.json"),
          fetch("/paints/valspar/colors.json"),
          fetch("/paints/ppg/colors.json"),
          fetch("/paints/benjamin_moore/colors.json"),
        ]);

        const [
          behrColors,
          sherwinColors,
          valsparColors,
          ppgColors,
          benjaminMooreColors,
        ] = await Promise.all([
          behrResponse.json(),
          sherwinResponse.json(),
          valsparResponse.json(),
          ppgResponse.json(),
          benjaminMooreResponse.json(),
        ]);

        const combinedColors = (
          [
            ...behrColors,
            ...sherwinColors,
            ...valsparColors,
            ...ppgColors,
            ...benjaminMooreColors,
          ] as PaintColor[]
        )
          // Drop discontinued / fan-deck-only colors so browse, similar-
          // color search, and the comparison dialog never present an
          // unbuyable color as purchasable (mirrors the palette grounding
          // filter). 220 SW + 1 Valspar are available:false.
          .filter((c) => c.available !== false);

        setAllColors(combinedColors);
        setLoading(false);
      } catch (error) {
        console.error("Error loading paint colors:", error);
        toast.error("Failed to load paint colors");
        setLoading(false);
      }
    };

    loadPaintColors();
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem("paintSelectorFavorites");
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem(
      "paintSelectorFavorites",
      JSON.stringify([...favorites])
    );
  }, [favorites]);

  // Helper function to get color luminance
  const getLuminance = (hex: string): number => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  };

  // Helper function to get color hue
  const getHue = (hex: string): number => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    if (diff === 0) return 0;

    let hue = 0;
    if (max === r) hue = ((g - b) / diff) % 6;
    else if (max === g) hue = (b - r) / diff + 2;
    else hue = (r - g) / diff + 4;

    return hue * 60;
  };


  // Color distance calculation using Delta E (CIE76)
  const hexToLab = (hex: string): [number, number, number] => {
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    // Convert RGB to XYZ
    const toXYZ = (c: number) => {
      c = c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
      return c * 100;
    };

    const x = toXYZ(r) * 0.4124 + toXYZ(g) * 0.3576 + toXYZ(b) * 0.1805;
    const y = toXYZ(r) * 0.2126 + toXYZ(g) * 0.7152 + toXYZ(b) * 0.0722;
    const z = toXYZ(r) * 0.0193 + toXYZ(g) * 0.1192 + toXYZ(b) * 0.9505;

    // Convert XYZ to LAB
    const xn = 95.047;
    const yn = 100.0;
    const zn = 108.883;

    const fx =
      x / xn > 0.008856 ? Math.pow(x / xn, 1 / 3) : (7.787 * x) / xn + 16 / 116;
    const fy =
      y / yn > 0.008856 ? Math.pow(y / yn, 1 / 3) : (7.787 * y) / yn + 16 / 116;
    const fz =
      z / zn > 0.008856 ? Math.pow(z / zn, 1 / 3) : (7.787 * z) / zn + 16 / 116;

    const L = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const b_lab = 200 * (fy - fz);

    return [L, a, b_lab];
  };

  // Calculate color distance using Delta E
  const calculateColorDistance = (hex1: string, hex2: string): number => {
    const [L1, a1, b1] = hexToLab(hex1);
    const [L2, a2, b2] = hexToLab(hex2);

    const deltaL = L1 - L2;
    const deltaA = a1 - a2;
    const deltaB = b1 - b2;

    return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
  };

  // Find similar colors to a given hex
  const findSimilarColors = (
    targetHex: string,
    maxDistance: number = 15
  ): PaintColor[] => {
    if (!targetHex || targetHex.length !== 7 || !targetHex.startsWith("#")) {
      return [];
    }

    return allColors
      .map((color) => ({
        ...color,
        distance: calculateColorDistance(targetHex, color.hex),
      }))
      .filter((color) => color.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 50); // Limit to top 50 similar colors
  };

  const isValidHex = (hex: string): boolean => {
    const normalized = hex.startsWith("#") ? hex : `#${hex}`;
    return /^#[0-9A-F]{6}$/i.test(normalized);
  };

  // Simple search function - searches by color name only
  const searchColors = (colors: PaintColor[], term: string): PaintColor[] => {
    if (!term.trim()) return colors;

    const searchTerm = term.toLowerCase().trim();

    const results = colors.filter((color) => {
      const colorNameLower = color.name.toLowerCase();
      const matches = colorNameLower.includes(searchTerm);
      return matches;
    });
    return results;
  };

  // Filter and sort colors
  const filteredAndSortedColors = useMemo(() => {
    let filtered = allColors;

    // Filter by search term using enhanced search
    if (searchTerm) {
      filtered = searchColors(filtered, searchTerm);
    }

    // Filter by brand
    if (selectedBrand !== "all") {
      filtered = filtered.filter((color) => color.brand === selectedBrand);
    }

    // Sort colors
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "brand":
          return a.brand.localeCompare(b.brand);
        case "hue":
          return getHue(a.hex) - getHue(b.hex);
        case "lightness":
          return getLuminance(b.hex) - getLuminance(a.hex);
        default:
          return 0;
      }
    });
    return filtered;
  }, [allColors, searchTerm, selectedBrand, sortBy]);

  // Get current page colors
  const currentColors = (() => {
    const sliced = filteredAndSortedColors.slice(
      (currentPage - 1) * colorsPerPage,
      currentPage * colorsPerPage
    );
    return sliced;
  })();

  const totalPages = Math.ceil(filteredAndSortedColors.length / colorsPerPage);

  // Get favorite colors
  const favoriteColors = allColors.filter((color) => favorites.has(color.hex));

  // Toggle color selection
  const toggleColorSelection = (hex: string) => {
    const newSelected = new Set(selectedColors);
    if (newSelected.has(hex)) {
      newSelected.delete(hex);
    } else {
      newSelected.add(hex);
    }
    setSelectedColors(newSelected);
  };

  // Toggle favorite
  const toggleFavorite = (hex: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(hex)) {
      newFavorites.delete(hex);
    } else {
      newFavorites.add(hex);
    }
    setFavorites(newFavorites);
  };

  // Add selected colors to palette
  const addSelectedToPalette = () => {
    selectedColors.forEach((hex) => {
      const color = allColors.find((c) => c.hex === hex);
      if (color) {
        addCustomColor(color.hex);
      }
    });

    toast.success(`Added ${selectedColors.size} colors to palette`);
    setSelectedColors(new Set());
  };

  // Copy color to clipboard
  const copyColorToClipboard = (hex: string) => {
    navigator.clipboard.writeText(hex);
    toast.success(`Copied ${hex} to clipboard`);
  };

  // Random color selection
  const selectRandomColors = (count: number = 5) => {
    const shuffled = [...filteredAndSortedColors].sort(
      () => 0.5 - Math.random()
    );
    const randomColors = shuffled.slice(0, count);
    setSelectedColors(new Set(randomColors.map((c) => c.hex)));
  };

  // Handle search input changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };


  // Open comparison dialog
  const openComparisonDialog = (
    originalColor: string,
    similarColor: PaintColor
  ) => {
    setComparisonData({ originalColor, similarColor });
    setComparisonDialogOpen(true);
  };

  // Similar color card component
  const SimilarColorCard = ({
    color,
    originalColor,
    isSelected,
    isFavorite,
  }: {
    color: PaintColor;
    originalColor: string;
    isSelected: boolean;
    isFavorite: boolean;
  }) => {
    const isInPalette = customPalette.some((c) => c.hex === color.hex);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all bg-gray-900",
          isSelected
            ? "border-blue-500 shadow-lg"
            : "border-white/10 hover:border-gray-300 dark:hover:border-gray-600"
        )}
        onClick={() => openComparisonDialog(originalColor, color)}
      >
        {/* Searched Color Section (Top 25%) */}
        <div className="h-24 relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: originalColor }}
          />
          <div className="absolute top-0 left-0 right-0  text-white text-xs px-2 py-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">Searched</span>
            </div>
          </div>
        </div>

        {/* Horizontal Divider */}
        <div className="h-0.5 bg-gray-300 dark:bg-gray-600" />

        {/* Similar Color Section (Bottom 75%) */}
        <div className="h-24 relative">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: color.hex }}
          />

          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}

          {/* Distance badge */}
          {color.distance !== undefined && (
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              Δ{color.distance.toFixed(1)}
            </div>
          )}

          {/* Favorite button */}
          <button
            className={cn(
              "absolute top-2 right-8 w-6 h-6 rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
              isFavorite ? "bg-red-500 text-white" : "bg-white/80 text-gray-700"
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(color.hex);
            }}
          >
            {isFavorite ? (
              <Heart className="w-3 h-3" />
            ) : (
              <HeartOff className="w-3 h-3" />
            )}
          </button>

          {/* Expand icon */}
          <div className="absolute bottom-2 right-2 w-6 h-6 bg-gray-900/70 backdrop-blur-md rounded flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <Maximize2 className="w-3 h-3 text-slate-300" />
          </div>

          {/* Action buttons */}
          <div className="absolute bottom-2 left-2 right-8 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="flex-1 h-6 bg-gray-900/70 backdrop-blur-md rounded text-xs flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyColorToClipboard(color.hex);
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy hex code</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="flex-1 h-6 bg-gray-900/70 backdrop-blur-md rounded text-xs flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleColorSelection(color.hex);
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Select color</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "flex-1 h-6 rounded text-xs flex items-center justify-center transition-colors",
                      isInPalette
                        ? "bg-green-500 text-white"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isInPalette) {
                        const colorIndex = customPalette.findIndex(
                          (c) => c.hex === color.hex
                        );
                        if (colorIndex !== -1) {
                          removeCustomColor(colorIndex);
                          toast.success("Removed from palette");
                        }
                      } else {
                        addCustomColor(color.hex);
                        toast.success("Added to palette");
                      }
                    }}
                  >
                    {isInPalette ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isInPalette ? "Remove from palette" : "Add to palette"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Color info */}
        <div className="p-2 bg-gray-900 border-t">
          <div className="text-xs text-slate-400 mb-1">
            Found Color
          </div>
          <p className="text-xs font-medium text-white truncate">
            {color.name}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-slate-400">
              {color.hex.toUpperCase()}
            </p>
            <Badge variant="secondary" className="text-xs">
              {color.brand}
            </Badge>
          </div>
        </div>
      </motion.div>
    );
  };

  // Regular color card component
  const ColorCard = ({
    color,
    isSelected,
    isFavorite,
  }: {
    color: PaintColor;
    isSelected: boolean;
    isFavorite: boolean;
  }) => {
    const isInPalette = customPalette.some((c) => c.hex === color.hex);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
          isSelected
            ? "border-blue-500 shadow-lg"
            : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
        )}
        onClick={() => toggleColorSelection(color.hex)}
      >
        <div
          className="aspect-square w-full"
          style={{ backgroundColor: color.hex }}
        >
          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}

          {/* Favorite button */}
          <button
            className={cn(
              "absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity",
              isFavorite ? "bg-red-500 text-white" : "bg-white/80 text-gray-700"
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(color.hex);
            }}
          >
            {isFavorite ? (
              <Heart className="w-3 h-3" />
            ) : (
              <HeartOff className="w-3 h-3" />
            )}
          </button>

          {/* Action buttons */}
          <div className="absolute bottom-2 left-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="flex-1 h-6 bg-gray-900/70 backdrop-blur-md rounded text-xs flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyColorToClipboard(color.hex);
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy hex code</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "flex-1 h-6 rounded text-xs flex items-center justify-center transition-colors",
                      isInPalette
                        ? "bg-green-500 text-white"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isInPalette) {
                        const colorIndex = customPalette.findIndex(
                          (c) => c.hex === color.hex
                        );
                        if (colorIndex !== -1) {
                          removeCustomColor(colorIndex);
                          toast.success("Removed from palette");
                        }
                      } else {
                        addCustomColor(color.hex);
                        toast.success("Added to palette");
                      }
                    }}
                  >
                    {isInPalette ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isInPalette ? "Remove from palette" : "Add to palette"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Color info */}
        <div className="p-2 bg-gray-900 border-t">
          <p className="text-xs font-medium text-white truncate">
            {color.name}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-slate-400">
              {color.hex.toUpperCase()}
            </p>
            <Badge variant="secondary" className="text-xs">
              {color.brand}
            </Badge>
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white">
            Loading Paint Colors...
          </h2>
          <p className="text-slate-400 mt-2">
            Loading thousands of colors from major paint brands
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Paint Color Selector
              </h1>
              <p className="mt-1 text-sm text-slate-400 sm:text-base">
                Browse and select from thousands of paint colors
              </p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {selectedColors.size > 0 && (
              <Button
                onClick={addSelectedToPalette}
                className="bg-gradient-to-r bg-blue-600 hover:bg-blue-500 ring-1 ring-blue-400/40 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add {selectedColors.size} to Palette
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push("/palette")}
              className="flex items-center gap-2"
            >
              <Palette className="w-4 h-4" />
              View Palette ({customPalette.length})
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-3 sm:max-w-md">
            <TabsTrigger value="similar" className="px-2 text-xs sm:text-sm">
              Similar
            </TabsTrigger>
            <TabsTrigger value="browse" className="px-2 text-xs sm:text-sm">
              Browse
            </TabsTrigger>
            <TabsTrigger value="favorites" className="px-2 text-xs sm:text-sm">
              Favorites ({favorites.size})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Search & Filter</CardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  Search by color name
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                    <Input
                      placeholder="Search by color name..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 pr-8"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setCurrentPage(1);
                        }}
                        className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600 z-10"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <Select
                    value={selectedBrand}
                    onValueChange={(value: Brand | "all") => {
                      setSelectedBrand(value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      <SelectItem value="Behr">Behr</SelectItem>
                      <SelectItem value="Benjamin Moore">
                        Benjamin Moore
                      </SelectItem>
                      <SelectItem value="PPG">PPG</SelectItem>
                      <SelectItem value="Sherwin-Williams">
                        Sherwin-Williams
                      </SelectItem>
                      <SelectItem value="Valspar">Valspar</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={sortBy}
                    onValueChange={(value: SortBy) => setSortBy(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="brand">Brand</SelectItem>
                      <SelectItem value="hue">Hue</SelectItem>
                      <SelectItem value="lightness">Lightness</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => selectRandomColors(5)}
                    className="flex items-center gap-2"
                  >
                    <Shuffle className="w-4 h-4" />
                    Random 5
                  </Button>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-400">
                    Showing {currentColors.length} of{" "}
                    {filteredAndSortedColors.length} colors
                    {searchTerm && (
                      <span className="ml-2 text-blue-600 dark:text-blue-400">
                        for "{searchTerm}"
                      </span>
                    )}
                  </p>
                  {selectedColors.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedColors(new Set())}
                    >
                      Clear Selection
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Color Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              <AnimatePresence initial={false}>
                {currentColors.map((color, index) => {
                  return (
                    <ColorCard
                      key={`browse-${color.hex}-${color.name}-${color.brand}`}
                      color={color}
                      isSelected={selectedColors.has(color.hex)}
                      isFavorite={favorites.has(color.hex)}
                    />
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-6">
            {favoriteColors.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Favorites Yet
                </h3>
                <p className="text-slate-400 mb-4">
                  Start browsing colors and click the heart icon to save your
                  favorites
                </p>
                <Button
                  onClick={() => setActiveTab("browse")}
                  className="bg-gradient-to-r bg-blue-600 hover:bg-blue-500 ring-1 ring-blue-400/40 text-white"
                >
                  Browse Colors
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {favoriteColors.map((color) => (
                  <ColorCard
                    key={`favorite-${color.hex}-${color.name}-${color.brand}`}
                    color={color}
                    isSelected={selectedColors.has(color.hex)}
                    isFavorite={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="similar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Find Similar Colors</CardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  Enter a hex color code to find similar paint colors
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="#3B82F6 or 3B82F6"
                      value={similarToHex}
                      onChange={(e) => {
                        setSimilarToHex(e.target.value);
                        setShowSimilarColors(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && isValidHex(similarToHex)) {
                          const normalized = similarToHex.startsWith("#")
                            ? similarToHex
                            : `#${similarToHex}`;
                          setSimilarToHex(normalized);
                          setShowSimilarColors(true);
                        }
                      }}
                      className="font-mono"
                    />
                    {similarToHex && isValidHex(similarToHex) && (
                      <div
                        className="absolute right-2 top-2 w-6 h-6 rounded border border-white/10"
                        style={{
                          backgroundColor: similarToHex.startsWith("#")
                            ? similarToHex
                            : `#${similarToHex}`,
                        }}
                      />
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      if (isValidHex(similarToHex)) {
                        const normalized = similarToHex.startsWith("#")
                          ? similarToHex
                          : `#${similarToHex}`;
                        setSimilarToHex(normalized);
                        setShowSimilarColors(true);
                      } else {
                        toast.error(
                          "Please enter a valid hex color code (e.g., #3B82F6)"
                        );
                      }
                    }}
                    disabled={!isValidHex(similarToHex)}
                    className="bg-gradient-to-r bg-blue-600 hover:bg-blue-500 ring-1 ring-blue-400/40 text-white sm:w-auto"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Find Similar
                  </Button>
                  {similarToHex && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setSimilarToHex("");
                        setShowSimilarColors(false);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Quick hex examples */}
                <div className="mt-4">
                  <p className="text-sm text-slate-400 mb-2">
                    Try these examples:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { hex: "#3B82F6", name: "Blue" },
                      { hex: "#EF4444", name: "Red" },
                      { hex: "#10B981", name: "Green" },
                      { hex: "#F59E0B", name: "Orange" },
                      { hex: "#8B5CF6", name: "Purple" },
                      { hex: "#06B6D4", name: "Cyan" },
                    ].map((example) => (
                      <Button
                        key={example.hex}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSimilarToHex(example.hex);
                          setShowSimilarColors(true);
                        }}
                        className="flex items-center gap-2"
                      >
                        <div
                          className="w-4 h-4 rounded border border-white/10"
                          style={{ backgroundColor: example.hex }}
                        />
                        <span className="font-mono text-xs">{example.hex}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Find similar to palette colors */}
                {customPalette.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <p className="text-sm text-slate-400 mb-2">
                      Find similar colors to your palette:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {customPalette.slice(0, 8).map((paletteColor) => (
                        <Button
                          key={paletteColor.hex}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSimilarToHex(paletteColor.hex);
                            setShowSimilarColors(true);
                          }}
                          className="flex items-center gap-2"
                        >
                          <div
                            className="w-4 h-4 rounded border border-white/10"
                            style={{ backgroundColor: paletteColor.hex }}
                          />
                          <span className="font-mono text-xs">
                            {paletteColor.hex}
                          </span>
                        </Button>
                      ))}
                      {customPalette.length > 8 && (
                        <span className="text-xs text-gray-500 self-center">
                          +{customPalette.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {showSimilarColors && isValidHex(similarToHex) && (
              <div>
                {(() => {
                  const similarColors = findSimilarColors(similarToHex);
                  return similarColors.length === 0 ? (
                    <div className="text-center py-12">
                      <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">
                        No Similar Colors Found
                      </h3>
                      <p className="text-slate-400 mb-4">
                        Try adjusting your search or try a different hex color
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded border border-white/10"
                            style={{ backgroundColor: similarToHex }}
                          />
                          <div>
                            <h3 className="font-semibold text-white">
                              Colors similar to {similarToHex}
                            </h3>
                            <p className="text-sm text-slate-400">
                              Found {similarColors.length} similar colors
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const colorHexes = similarColors.map((c) => c.hex);
                            setSelectedColors(new Set(colorHexes));
                            toast.success(
                              `Selected ${colorHexes.length} similar colors`
                            );
                          }}
                          className="flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Select All
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {similarColors.map((color) => (
                          <SimilarColorCard
                            key={`similar-${color.hex}-${color.name}-${color.brand}-${similarToHex}`}
                            color={color}
                            originalColor={similarToHex}
                            isSelected={selectedColors.has(color.hex)}
                            isFavorite={favorites.has(color.hex)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Color Comparison Dialog */}
      <Dialog
        open={comparisonDialogOpen}
        onOpenChange={setComparisonDialogOpen}
      >
        <DialogContent className="max-h-[88dvh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto p-0 sm:w-full">
          {comparisonData && (
            <>
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="text-xl font-semibold">
                  Color Comparison
                </DialogTitle>
                <DialogDescription>
                  Compare your searched color with the similar paint color found
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 pt-4">
                {/* Large Color Comparison */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Original Color */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-white">
                      Searched Color
                    </div>
                    <div className="relative rounded-lg overflow-hidden border-2 border-white/10">
                      <div
                        className="h-32 w-full"
                        style={{
                          backgroundColor: comparisonData.originalColor,
                        }}
                      />
                      <div className="p-3 bg-gray-900">
                        <p className="font-mono text-sm text-white">
                          {comparisonData.originalColor.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Similar Color */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-white">
                      Similar Paint Color
                    </div>
                    <div className="relative rounded-lg overflow-hidden border-2 border-white/10">
                      <div
                        className="h-32 w-full"
                        style={{
                          backgroundColor: comparisonData.similarColor.hex,
                        }}
                      />
                      <div className="p-3 bg-gray-900">
                        <p className="font-medium text-sm text-white mb-1">
                          {comparisonData.similarColor.name}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-sm text-slate-400">
                            {comparisonData.similarColor.hex.toUpperCase()}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {comparisonData.similarColor.brand}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Side-by-side comparison */}
                <div className="mb-6">
                  <div className="text-sm font-medium text-white mb-3">
                    Side-by-Side Comparison
                  </div>
                  <div className="relative rounded-lg overflow-hidden border-2 border-white/10">
                    <div className="h-24 flex">
                      <div
                        className="flex-1"
                        style={{
                          backgroundColor: comparisonData.originalColor,
                        }}
                      />
                      <div
                        className="flex-1"
                        style={{
                          backgroundColor: comparisonData.similarColor.hex,
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-1 bg-gray-900 p-3 text-xs sm:flex-row sm:justify-between">
                      <span className="text-slate-400">
                        Searched: {comparisonData.originalColor.toUpperCase()}
                      </span>
                      <span className="text-slate-400">
                        Found: {comparisonData.similarColor.hex.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Color Information */}
                <div className="space-y-4">
                  <div className="text-sm font-medium text-white">
                    Color Details
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-400">
                          Color Distance:
                        </span>
                        <span className="text-xs font-mono">
                          Δ{comparisonData.similarColor.distance?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-400">
                          Brand:
                        </span>
                        <span className="text-xs">
                          {comparisonData.similarColor.brand}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-400">
                          Paint Name:
                        </span>
                        <span className="text-xs truncate ml-2">
                          {comparisonData.similarColor.name}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row">
                  <Button
                    onClick={() => {
                      copyColorToClipboard(comparisonData.similarColor.hex);
                    }}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Hex
                  </Button>
                  <Button
                    onClick={() => {
                      toggleFavorite(comparisonData.similarColor.hex);
                      toast.success(
                        favorites.has(comparisonData.similarColor.hex)
                          ? "Removed from favorites"
                          : "Added to favorites"
                      );
                    }}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {favorites.has(comparisonData.similarColor.hex) ? (
                      <Heart className="w-4 h-4 text-red-500" />
                    ) : (
                      <HeartOff className="w-4 h-4" />
                    )}
                    {favorites.has(comparisonData.similarColor.hex)
                      ? "Remove Favorite"
                      : "Add Favorite"}
                  </Button>
                  <Button
                    onClick={() => {
                      addCustomColor(comparisonData.similarColor.hex);
                      toast.success("Added to palette");
                      setComparisonDialogOpen(false);
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r bg-blue-600 hover:bg-blue-500 ring-1 ring-blue-400/40 text-white"
                  >
                    <Plus className="w-4 h-4" />
                    Add to Palette
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
