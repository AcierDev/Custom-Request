"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import {
  Edit,
  Trash2,
  Download,
  Eye,
  ShoppingCart,
  FolderIcon,
  Share2,
  Lock,
  Unlock,
  Mail,
  MessageSquare,
  Twitter,
  Facebook,
  Copy,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PaletteCardProps } from "./types";
import { PalettePreview } from "./PalettePreview";
import { toast } from "sonner";
import { useCustomStore } from "@/store/customStore";

export const PaletteCard = ({
  palette,
  onEdit,
  onDelete,
  onVisualize,
  onOrder,
  isEditing,
  onMove,
  inFolder = false,
  selectionMode = false,
  isSelected = false,
  onToggleSelected,
}: PaletteCardProps) => {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyTrycolors, setCopyTrycolors] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedColorIndex, setCopiedColorIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"export" | "share">("export");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(palette.name);
  const { togglePalettePublic, updatePalette } = useCustomStore();

  // Reset editing state when palette changes
  useEffect(() => {
    setEditingName(palette.name);
    setIsEditingName(false);
  }, [palette.id, palette.name]);

  const handleExportPalette = () => {
    setShowExportDialog(true);
  };

  const handleCopyToClipboard = () => {
    const exportData = JSON.stringify(
      palette.colors.map((color) => ({
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
    const trycolorsData = palette.colors
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
        name: palette.name,
        created: new Date().toISOString(),
        colors: palette.colors.map((color) => ({
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
    link.download = `${palette.name
      .replace(/\s+/g, "-")
      .toLowerCase()}.palette`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setShowExportDialog(false);
    toast.success("Palette downloaded successfully!");
  };

  const exportRef = useRef<HTMLDivElement>(null);

  const handleDownloadImage = async () => {
    if (!exportRef.current) return;

    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 2, // Higher resolution
        backgroundColor: null,
        logging: false,
      });

      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `${palette.name.replace(/\s+/g, "-").toLowerCase()}.png`;
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

  const handleCopyPaletteId = () => {
    navigator.clipboard.writeText(palette.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleTogglePublic = () => {
    togglePalettePublic(palette.id);
    toast.success(`Palette is now ${palette.isPublic ? "private" : "public"}`);
  };

  const handleCopyColor = (
    hex: string,
    index: number,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    event.preventDefault();
    navigator.clipboard.writeText(hex);
    setCopiedColorIndex(index);
    toast.success(`Copied ${hex} to clipboard`);
    setTimeout(() => setCopiedColorIndex(null), 1500);
  };

  const handleNameEdit = () => {
    setIsEditingName(true);
    setEditingName(palette.name);
  };

  const handleNameSave = () => {
    if (editingName.trim() && editingName.trim() !== palette.name) {
      updatePalette(palette.id, { name: editingName.trim() });
      toast.success("Palette name updated");
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setEditingName(palette.name);
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      handleNameCancel();
    }
  };

  // Generate sharing links
  const getShareUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/palette?id=${palette.id}`;
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getEmailShareLink = () => {
    const subject = encodeURIComponent(
      `Check out my "${palette.name}" color palette`
    );
    const body = encodeURIComponent(
      `I've shared a color palette with you: "${palette.name}"\n\n` +
        `Click here to import it: ${getShareUrl()}\n\n` +
        `The palette contains ${palette.colors.length} colors.`
    );
    return `mailto:?subject=${subject}&body=${body}`;
  };

  const getWhatsAppShareLink = () => {
    const text = encodeURIComponent(
      `Check out my "${
        palette.name
      }" color palette! Import it here: ${getShareUrl()}`
    );
    return `https://wa.me/?text=${text}`;
  };

  const getSmsShareLink = () => {
    const text = encodeURIComponent(
      `Check out my "${
        palette.name
      }" color palette! Import it here: ${getShareUrl()}`
    );
    return `sms:?&body=${text}`;
  };

  const getTwitterShareLink = () => {
    const text = encodeURIComponent(
      `Check out my "${palette.name}" color palette! #colors #design`
    );
    const url = encodeURIComponent(getShareUrl());
    return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  };

  const getFacebookShareLink = () => {
    const url = encodeURIComponent(getShareUrl());
    return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <Card
        onClick={() => {
          if (!selectionMode) return;
          onToggleSelected?.(palette.id);
        }}
        className={`overflow-hidden border h-full flex flex-col ${
          selectionMode
            ? isSelected
              ? "border-purple-500 dark:border-purple-400 border-2 shadow-md"
              : "border-gray-200 dark:border-gray-800"
            : isEditing
            ? "border-purple-400 dark:border-purple-600 border-2"
            : "border-gray-200 dark:border-gray-800"
        } bg-white dark:bg-gray-900 hover:shadow-md transition-shadow ${
          selectionMode ? "cursor-pointer" : ""
        }`}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              {selectionMode && (
                <button
                  type="button"
                  className="mr-2 text-purple-600 dark:text-purple-400"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleSelected?.(palette.id);
                  }}
                  aria-label={
                    isSelected ? "Deselect palette" : "Select palette"
                  }
                >
                  {isSelected ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
              )}
              {isEditingName ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleNameSave}
                    className="flex-1 bg-transparent border-b border-purple-400 focus:outline-none focus:border-purple-600 text-lg font-semibold text-gray-900 dark:text-gray-100"
                    autoFocus
                    maxLength={100}
                  />
                </div>
              ) : (
                <div
                  className={`flex items-center transition-colors group ${
                    selectionMode
                      ? ""
                      : "cursor-pointer hover:text-purple-600 dark:hover:text-purple-400"
                  }`}
                  onClick={(e) => {
                    if (selectionMode) return;
                    e.stopPropagation();
                    handleNameEdit();
                  }}
                  title="Click to edit name"
                >
                  {palette.name}
                  <Edit className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
              {isEditing && (
                <span className="ml-2 text-xs font-normal text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                  Editing
                </span>
              )}
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(palette.createdAt).toLocaleDateString()} •{" "}
            {palette.colors.length} colors
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 flex-1 flex flex-col">
          <PalettePreview colors={palette.colors} />

          <div className="mt-3 grid grid-cols-5 gap-1 min-h-[104px] flex-1 relative">
            {/* Show only the first 10 colors (2 rows) */}
            {palette.colors.slice(0, 10).map((color, index) => (
              <TooltipProvider
                key={`${color.hex}-${index}`}
                delayDuration={300}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      className="w-full aspect-square rounded-md cursor-pointer border border-gray-200 dark:border-gray-800 relative group"
                      style={{ backgroundColor: color.hex }}
                      whileHover={{ scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      onClick={(e) => handleCopyColor(color.hex, index, e)}
                    >
                      {/* Copy icon overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 rounded-md">
                        <Copy className="h-3 w-3 text-white drop-shadow-sm" />
                      </div>

                      {/* Copied feedback */}
                      {copiedColorIndex === index && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute inset-0 flex items-center justify-center bg-green-500/80 text-white text-xs font-medium rounded-md"
                        >
                          ✓
                        </motion.div>
                      )}
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p>{color.name || color.hex}</p>
                    <p className="text-gray-500 dark:text-gray-400">
                      {color.hex}
                    </p>
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                      Click to copy
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}

            {/* Add placeholder color squares to fill up to two rows if needed */}
            {Array.from({
              length: Math.max(0, 10 - Math.min(palette.colors.length, 10)),
            }).map((_, index) => (
              <div
                key={`placeholder-${index}`}
                className="w-full aspect-square rounded-md  bg-gray-50 dark:bg-gray-800/20"
              />
            ))}

            {/* Show indicator if there are more colors */}
            {palette.colors.length > 10 && (
              <div className="absolute -bottom-1 right-4 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs px-2 py-0.5 rounded-full">
                +{palette.colors.length - 10} more
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-3 pt-0 flex justify-between">
          {selectionMode ? (
            <div className="w-full text-xs text-gray-600 dark:text-gray-400">
              {isSelected ? "Selected" : "Click to select"}
            </div>
          ) : (
            <>
              <div className="flex gap-1">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
                        onClick={() => onEdit(palette.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Edit palette</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
                        onClick={handleExportPalette}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Export palette</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                        onClick={() => {
                          setActiveTab("share");
                          setShowExportDialog(true);
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Share palette</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onDelete(palette.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Delete palette</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Add Move to Folder option */}
                {onMove && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onMove();
                          }}
                        >
                          <FolderIcon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Move to folder</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              <div className="flex gap-2">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-medium text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={() => onVisualize(palette)}
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
                        onClick={() => onOrder(palette)}
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
            </>
          )}
        </CardFooter>
      </Card>

      {/* Export Dialog */}
      {!selectionMode && showExportDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {activeTab === "export" ? "Export" : "Share"} "{palette.name}"
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {palette.colors.length} colors in this palette
              </p>
            </div>

            <div className="p-5 space-y-5">
              {/* Format tabs */}
              <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === "export"
                      ? "text-gray-900 dark:text-gray-100 border-b-2 border-purple-500 dark:border-purple-400"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                  onClick={() => setActiveTab("export")}
                >
                  Export Options
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === "share"
                      ? "text-gray-900 dark:text-gray-100 border-b-2 border-purple-500 dark:border-purple-400"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                  onClick={() => setActiveTab("share")}
                >
                  Share
                </button>
              </div>

              {activeTab === "export" ? (
                <>
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
                          palette.colors.map((color) => ({
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
                        {palette.colors
                          .map(
                            (color) =>
                              `${color.hex}, ${color.name || color.hex}`
                          )
                          .join("\n")}
                      </pre>
                    </div>
                  </div>



                  {/* Image Download */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
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
                </>
              ) : (
                <>
                  {/* Palette ID sharing */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                        Palette ID
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyPaletteId}
                        className="h-7 text-xs px-3 border-purple-200 dark:border-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                      >
                        {copiedId ? "Copied!" : "Copy ID"}
                      </Button>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-auto">
                      <p className="text-xs text-gray-800 dark:text-gray-300 font-mono break-all">
                        {palette.id}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Share this ID with others to let them import your exact
                      palette.
                    </p>
                  </div>

                  {/* Share Link */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                        Share Link
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyShareLink}
                        className="h-7 text-xs px-3 border-blue-200 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        {copiedLink ? "Copied!" : "Copy Link"}
                      </Button>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-auto">
                      <p className="text-xs text-gray-800 dark:text-gray-300 break-all">
                        {getShareUrl()}
                      </p>
                    </div>
                  </div>

                  {/* Share on Social */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md space-y-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                      <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                      Share via
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <a
                        href={getEmailShareLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 transition-colors"
                        onClick={(e) => {
                          if (!palette.isPublic) {
                            e.preventDefault();
                            toast.error("Make palette public first to share");
                          }
                        }}
                      >
                        <Mail className="h-4 w-4" />
                        <span>Email</span>
                      </a>

                      <a
                        href={getSmsShareLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 transition-colors"
                        onClick={(e) => {
                          if (!palette.isPublic) {
                            e.preventDefault();
                            toast.error("Make palette public first to share");
                          }
                        }}
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>SMS</span>
                      </a>

                      <a
                        href={getWhatsAppShareLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 p-2 bg-[#25D366] hover:bg-[#128C7E] rounded-md text-sm text-white transition-colors"
                        onClick={(e) => {
                          if (!palette.isPublic) {
                            e.preventDefault();
                            toast.error("Make palette public first to share");
                          }
                        }}
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        <span>WhatsApp</span>
                      </a>

                      <a
                        href={getTwitterShareLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 p-2 bg-[#1DA1F2] hover:bg-[#0c85d0] rounded-md text-sm text-white transition-colors"
                        onClick={(e) => {
                          if (!palette.isPublic) {
                            e.preventDefault();
                            toast.error("Make palette public first to share");
                          }
                        }}
                      >
                        <Twitter className="h-4 w-4" />
                        <span>Twitter</span>
                      </a>

                      <a
                        href={getFacebookShareLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 p-2 bg-[#1877F2] hover:bg-[#0b5fcc] rounded-md text-sm text-white transition-colors"
                        onClick={(e) => {
                          if (!palette.isPublic) {
                            e.preventDefault();
                            toast.error("Make palette public first to share");
                          }
                        }}
                      >
                        <Facebook className="h-4 w-4" />
                        <span>Facebook</span>
                      </a>
                    </div>

                    {!palette.isPublic && (
                      <p className="text-xs text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md border border-amber-100 dark:border-amber-900/30">
                        Make this palette public to enable sharing via links
                      </p>
                    )}
                  </div>

                  {/* Visibility Toggle */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                          <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                          Visibility
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {palette.isPublic
                            ? "Anyone with the ID can import this palette"
                            : "Only you can see this palette"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTogglePublic}
                        className={`h-8 text-xs px-3 flex items-center gap-1 ${
                          palette.isPublic
                            ? "text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/30"
                            : "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/30"
                        }`}
                      >
                        {palette.isPublic ? (
                          <>
                            <Unlock className="h-3.5 w-3.5 mr-1" />
                            Public
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5 mr-1" />
                            Private
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportDialog(false)}
              >
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Hidden Export Template */}
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
            {palette.colors.map((color) => (
              <div
                key={color.hex}
                className="h-full flex-1"
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>

        </div>
      </div>
    </motion.div>
  );
};
