"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import { ItemDesigns } from "@/typings/types";
import { DESIGN_COLORS, DESIGN_IMAGES } from "@/typings/color-maps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Palette,
  Edit,
  Copy,
  Eye,
  ShoppingCart,
  Download,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { usePaletteLoadConfirm } from "@/hooks/usePaletteLoadConfirm";
import { PaletteLoadConfirmDialog } from "@/components/PaletteLoadConfirmDialog";

// Define palette categories
type PaletteCategory =
  | "All"
  | "Blues"
  | "Earthy"
  | "Greens"
  | "Neutrals"
  | "Colorful";

// Map designs to categories
const designCategories: Record<ItemDesigns, PaletteCategory[]> = {
  [ItemDesigns.Custom]: ["All"],
  [ItemDesigns.Coastal]: ["All", "Blues", "Neutrals"],
  [ItemDesigns.Tidal]: ["All", "Blues", "Neutrals"],
  [ItemDesigns.Oceanic_Harmony]: ["All", "Blues"],
  [ItemDesigns.Timberline]: ["All", "Earthy", "Neutrals"],
  [ItemDesigns.Amber]: ["All", "Earthy", "Neutrals"],
  [ItemDesigns.Sapphire]: ["All", "Blues", "Greens"],
  [ItemDesigns.Winter]: ["All", "Blues"],
  [ItemDesigns.Forest]: ["All", "Greens", "Earthy"],
  [ItemDesigns.Autumn]: ["All", "Earthy", "Colorful"],
  [ItemDesigns.Elemental]: ["All", "Neutrals", "Earthy"],
  [ItemDesigns.Abyss]: ["All", "Blues", "Neutrals"],
  [ItemDesigns.Spectrum]: ["All", "Blues", "Colorful"],
  [ItemDesigns.Aloe]: ["All", "Greens"],
  [ItemDesigns.Mirage]: ["All", "Neutrals", "Blues"],
};

// Color strip component to display a palette preview
const PalettePreview = ({ design }: { design: ItemDesigns }) => {
  const colors = Object.values(DESIGN_COLORS[design]);

  return (
    <div className="flex h-8 w-full rounded-md overflow-hidden shadow-sm">
      {colors.map((color, index) => (
        <div
          key={`${color.hex}-${index}`}
          className="flex-1 h-full"
          style={{ backgroundColor: color.hex }}
          title={color.name || color.hex}
        />
      ))}
    </div>
  );
};

// Official Palette Card component
const OfficialPaletteCard = ({
  design,
  onVisualize,
  onOrder,
  onCustomize,
}: {
  design: ItemDesigns;
  onVisualize: (design: ItemDesigns) => void;
  onOrder: (design: ItemDesigns) => void;
  onCustomize: (design: ItemDesigns) => void;
}) => {
  const colors = Object.values(DESIGN_COLORS[design]);
  const [isCustomizeDialogOpen, setIsCustomizeDialogOpen] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyTrycolors, setCopyTrycolors] = useState(false);

  const handleCopyToClipboard = () => {
    const exportData = JSON.stringify(
      colors.map((color) => ({
        hex: color.hex,
        name: color.name || "",
      })),
      null,
      2
    );
    navigator.clipboard.writeText(exportData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyTrycolorsFormat = () => {
    // Create Trycolors CSV format: #RRGGBB, Name
    const trycolorsData = colors
      .map((color) => `${color.hex}, ${color.name || color.hex}`)
      .join("\n");

    navigator.clipboard.writeText(trycolorsData);
    setCopyTrycolors(true);
    setTimeout(() => setCopyTrycolors(false), 2000);
  };

  const handleDownloadPalette = () => {
    const exportData = JSON.stringify(
      {
        version: "1.0.0",
        format: "palette",
        name: design,
        type: "official",
        created: new Date().toISOString(),
        colors: colors.map((color) => ({
          hex: color.hex,
          name: color.name || "",
        })),
      },
      null,
      2
    );
    // Create a Blob and download link
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${design
      .replace(/\s+/g, "-")
      .toLowerCase()}-official.palette`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setShowExportDialog(false);
    toast.success("Official palette downloaded successfully!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      layout
      whileHover={{ y: -5 }}
      className="h-full"
    >
      <Card className="overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-all h-full flex flex-col">
        <div className="h-40 w-full overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${DESIGN_IMAGES[design]})`,
              opacity: 0.8,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 dark:from-gray-900/90 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <PalettePreview design={design} />
          </div>
        </div>

        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {design}
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <span className="flex items-center">
              <Badge
                variant="outline"
                className="text-[10px] h-4 mr-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
              >
                Official
              </Badge>
              {colors.length} colors
            </span>
            <div className="flex gap-1">
              {designCategories[design]
                .filter((cat) => cat !== "All")
                .map((category) => (
                  <Badge
                    key={category}
                    variant="secondary"
                    className="text-[9px] h-4 bg-gray-100 dark:bg-gray-800"
                  >
                    {category}
                  </Badge>
                ))}
            </div>
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 pt-2 flex-grow">
          <div className="mt-1 grid grid-cols-5 gap-1">
            {colors.slice(0, 10).map((color, index) => (
              <TooltipProvider
                key={`${color.hex}-${index}`}
                delayDuration={300}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="w-full aspect-square rounded-md cursor-pointer border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow"
                      style={{ backgroundColor: color.hex }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p className="font-medium">{color.name || color.hex}</p>
                    <p className="text-gray-500 dark:text-gray-400">
                      {color.hex}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {colors.length > 10 && (
              <div className="w-full aspect-square rounded-md flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800">
                +{colors.length - 10}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="p-3 flex justify-between border-t border-gray-100 dark:border-gray-800 mt-auto">
          <div className="flex gap-1">
            <Dialog
              open={isCustomizeDialogOpen}
              onOpenChange={setIsCustomizeDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Customize
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Customize Official Palette</DialogTitle>
                  <DialogDescription>
                    Create a custom palette based on the {design} palette. Your
                    customized version will be available in the "Create Palette"
                    tab.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="mb-4">
                    <PalettePreview design={design} />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This will create a copy of the official palette that you can
                    modify. The original official palette will remain unchanged.
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCustomizeDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    onClick={() => {
                      onCustomize(design);
                      setIsCustomizeDialogOpen(false);
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Create Custom Copy
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Export
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Export palette data</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Export "{design}"</DialogTitle>
                  <DialogDescription>
                    {colors.length} colors in this official palette
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* JSON Format */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                        JSON Format
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyToClipboard}
                        className="h-7 text-xs px-3 border-blue-200 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        {copied ? "Copied!" : "Copy JSON"}
                      </Button>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-auto max-h-24">
                      <pre className="text-xs text-gray-800 dark:text-gray-300 whitespace-pre-wrap">
                        {JSON.stringify(
                          colors.map((color) => ({
                            hex: color.hex,
                            name: color.name || "",
                          })),
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>

                  {/* Trycolors Format */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                        Trycolors CSV
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyTrycolorsFormat}
                        className="h-7 text-xs px-3 border-green-200 dark:border-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        {copyTrycolors ? "Copied!" : "Copy CSV"}
                      </Button>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-auto max-h-24">
                      <pre className="text-xs text-gray-800 dark:text-gray-300 whitespace-pre-wrap">
                        {colors
                          .map(
                            (color) =>
                              `${color.hex}, ${color.name || color.hex}`
                          )
                          .join("\n")}
                      </pre>
                    </div>
                  </div>

                  {/* File Download */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                        File Download
                      </h4>
                      <Button
                        onClick={handleDownloadPalette}
                        size="sm"
                        className="h-7 text-xs px-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                      >
                        Download .palette
                      </Button>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowExportDialog(false)}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex gap-2">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={() => onVisualize(design)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Visualize
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Apply palette and preview</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/30 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    onClick={() => onOrder(design)}
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Order
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Apply palette and go to order</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

// Main component
export function OfficialPalettes() {
  const { setSelectedDesign, loadOfficialPalette } = useCustomStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<PaletteCategory>("All");
  const [appliedDesign, setAppliedDesign] = useState<ItemDesigns | null>(null);
  const router = useRouter();

  // Use the confirmation dialog hook
  const {
    isConfirmDialogOpen,
    paletteToLoad,
    requestPaletteLoad,
    handleConfirm,
    handleCancel,
  } = usePaletteLoadConfirm();

  // Get all designs except Custom
  const officialDesigns = Object.values(ItemDesigns).filter(
    (design) => design !== ItemDesigns.Custom
  );

  // Filter designs based on search query and category
  const filteredDesigns = officialDesigns.filter((design) => {
    const matchesSearch = design
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === "All" ||
      designCategories[design].includes(activeCategory);
    return matchesSearch && matchesCategory;
  });

  const handleVisualizeOfficialPalette = (design: ItemDesigns) => {
    setSelectedDesign(design);
    setAppliedDesign(design);

    // Navigate to preview page
    router.push("/preview");

    // Show success toast
    toast.success(`${design} palette applied for preview`, {
      description: "Navigating to the preview page.",
    });
  };

  const handleOrderOfficialPalette = (design: ItemDesigns) => {
    setSelectedDesign(design);
    setAppliedDesign(design);

    // Navigate to order page
    router.push("/order");

    // Show success toast
    toast.success(`${design} palette applied for ordering`, {
      description: "Navigating to the order page.",
    });
  };

  const handleCustomizeOfficialPalette = (design: ItemDesigns) => {
    const designName = design.replace(/_/g, " ");

    requestPaletteLoad(
      { name: designName, type: "official", design: design },
      () => {
        loadOfficialPalette(design);
        // Show success toast
        toast.success(`${designName} palette ready for customization!`, {
          description:
            "You can now edit this palette in the Create Palette tab.",
        });
      }
    );
  };

  // Get all available categories
  const categories: PaletteCategory[] = [
    "All",
    "Blues",
    "Earthy",
    "Greens",
    "Neutrals",
    "Colorful",
  ];

  // Clear applied design after showing success indicator
  useEffect(() => {
    if (appliedDesign) {
      const timer = setTimeout(() => {
        setAppliedDesign(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [appliedDesign]);

  return (
    <div className="space-y-6">
      {/* Search and filter */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Search official palettes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            />
          </div>
        </div>

        {/* Category tabs */}
        <Tabs
          defaultValue="All"
          value={activeCategory}
          onValueChange={(value) => setActiveCategory(value as PaletteCategory)}
          className="w-full"
        >
          <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            {categories.map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 text-sm px-3 py-1.5 rounded-md"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Official Palettes grid */}
      {filteredDesigns.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredDesigns.map((design) => (
              <OfficialPaletteCard
                key={design}
                design={design}
                onVisualize={handleVisualizeOfficialPalette}
                onOrder={handleOrderOfficialPalette}
                onCustomize={handleCustomizeOfficialPalette}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <Palette className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No palettes found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            No official palettes match your search criteria. Try adjusting your
            search terms or category filter.
          </p>
        </div>
      )}

      {/* Confirmation Dialog */}
      {paletteToLoad && (
        <PaletteLoadConfirmDialog
          isOpen={isConfirmDialogOpen}
          onClose={handleCancel}
          onConfirm={handleConfirm}
          paletteToLoad={paletteToLoad}
        />
      )}
    </div>
  );
}
