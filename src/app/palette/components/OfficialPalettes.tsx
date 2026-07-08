"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import { ItemDesigns } from "@/typings/types";
import { DESIGN_COLORS, DESIGN_IMAGES } from "@/typings/color-maps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Palette,
  Copy,
  Eye,
  Download,
} from "lucide-react";
import {
  Card,
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { usePaletteLoadConfirm } from "@/hooks/usePaletteLoadConfirm";
import { PaletteLoadConfirmDialog } from "@/components/PaletteLoadConfirmDialog";

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
  onCustomize,
}: {
  design: ItemDesigns;
  onVisualize: (design: ItemDesigns) => void;
  onCustomize: (design: ItemDesigns) => void;
}) => {
  const colors = Object.values(DESIGN_COLORS[design]);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyTrycolors, setCopyTrycolors] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadImage = async () => {
    if (!exportRef.current) return;

    try {
      // Loaded on demand so the heavy html2canvas bundle isn't pulled into
      // (and parsed for) the palette route just to show the palette grid.
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(exportRef.current, {
        scale: 2, // Higher resolution
        backgroundColor: null,
        logging: false,
      });

      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `${design.replace(/\s+/g, "-").toLowerCase()}-official.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setShowExportDialog(false);
      toast.success("Image exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export image");
    }
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
      <Card
        onClick={() => onCustomize(design)}
        className="group cursor-pointer overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-900 hover:shadow-lg transition-all h-full flex flex-col"
      >
        <div className="h-28 w-full overflow-hidden bg-gray-800/60 relative">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${DESIGN_IMAGES[design]})`,
              opacity: 0.8,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 dark:from-gray-900/90 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-1.5">
            <PalettePreview design={design} />
          </div>
        </div>

        <CardHeader className="p-3 pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base font-semibold text-white truncate">
              {design}
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-400 flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="text-[10px] h-4 px-1.5 bg-blue-500/5 dark:bg-blue-900/20 text-blue-300 border-blue-500/30"
            >
              Official
            </Badge>
            <span>{colors.length} colors</span>
          </CardDescription>
        </CardHeader>

        <CardFooter
          onClick={(e) => e.stopPropagation()}
          className="p-3 flex justify-between border-t border-gray-100 dark:border-gray-800 mt-auto"
        >
          <div className="flex gap-1">
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-300 hover:text-green-600 dark:hover:text-green-400"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Export</p>
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
                  <div className="bg-gray-800/40/50 p-4 rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-white flex items-center">
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
                    <div className="p-3 bg-gray-900 rounded border border-white/10 overflow-auto max-h-24">
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
                  <div className="bg-gray-800/40/50 p-4 rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-white flex items-center">
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
                    <div className="p-3 bg-gray-900 rounded border border-white/10 overflow-auto max-h-24">
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

                  {/* Image Download */}
                  <div className="bg-gray-800/40/50 p-4 rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-white flex items-center">
                        <span className="inline-block w-3 h-3 bg-indigo-500 rounded-full mr-2"></span>
                        Image Export
                      </h4>
                      <Button
                        onClick={handleDownloadImage}
                        size="sm"
                        className="h-7 text-xs px-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white"
                      >
                        Download Image
                      </Button>
                    </div>
                  </div>

                  {/* File Download */}
                  <div className="bg-gray-800/40/50 p-4 rounded-md">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-white flex items-center">
                        <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                        File Download
                      </h4>
                      <Button
                        onClick={handleDownloadPalette}
                        size="sm"
                        className="h-7 text-xs px-3 bg-blue-600 hover:bg-blue-500 ring-1 ring-blue-400/40 text-white"
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

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs font-medium text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            onClick={() => onVisualize(design)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Viewer
          </Button>
        </CardFooter>
      </Card>
      
      {/* Hidden Export Template — only mounted while the export dialog is
          open. Rendering a hidden 1200px position:fixed layer for every card
          at once wastes compositing memory (OOM risk on iOS). */}
      {showExportDialog && (
        <div
          style={{
            position: "fixed",
            top: "-9999px",
            left: "-9999px",
            width: "1200px",
            height: "auto",
          }}
        >
          <div
            ref={exportRef}
            className="bg-white p-8 flex flex-col gap-4"
            style={{ width: "1200px" }}
          >
            {/* Colors Strip */}
            <div className="w-full h-64 rounded-xl overflow-hidden flex shadow-sm">
              {colors.map((color, index) => (
                <div
                  key={`${color.hex}-${index}`}
                  className="h-full flex-1"
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Main component
export function OfficialPalettes() {
  const { setSelectedDesign, loadOfficialPalette } = useCustomStore();
  const [searchQuery, setSearchQuery] = useState("");
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

  // Filter designs based on search query
  const filteredDesigns = officialDesigns.filter((design) =>
    design.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleVisualizeOfficialPalette = (design: ItemDesigns) => {
    setSelectedDesign(design);
    setAppliedDesign(design);

    // Navigate to design page
    router.push("/viewer");
  };

  const handleCustomizeOfficialPalette = (design: ItemDesigns) => {
    const designName = design.replace(/_/g, " ");

    requestPaletteLoad(
      { name: designName, type: "official", design: design },
      () => {
        loadOfficialPalette(design);
      }
    );
  };

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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search official palettes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-gray-800/40 border-white/10"
            />
          </div>
        </div>

      </div>

      {/* Official Palettes grid */}
      {filteredDesigns.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <AnimatePresence>
            {filteredDesigns.map((design) => (
              <OfficialPaletteCard
                key={design}
                design={design}
                onVisualize={handleVisualizeOfficialPalette}
                onCustomize={handleCustomizeOfficialPalette}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-800/60 mb-4">
            <Palette className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            No palettes found
          </h3>
          <p className="text-slate-400 max-w-md mx-auto">
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
