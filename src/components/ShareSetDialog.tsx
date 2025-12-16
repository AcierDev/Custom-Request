"use client";

import { useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Copy, ExternalLink, LinkIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import {
  useCustomStore,
  type SavedPalette,
  type ShareableState,
} from "@/store/customStore";

type ShareSetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  palettes: SavedPalette[];
  onShared?: (setUrl: string) => void;
};

type VariantToggles = {
  alsoReversed: boolean;
  alsoNotReversed: boolean;
};

function paletteToCustomPalette(
  palette: SavedPalette
): ShareableState["customPalette"] {
  return palette.colors.map((c) => ({
    id: nanoid(),
    hex: c.hex,
    name: c.name ?? "",
  }));
}

export function ShareSetDialog({
  open,
  onOpenChange,
  palettes,
  onShared,
}: ShareSetDialogProps) {
  const createSharedDesignSet = useCustomStore((s) => s.createSharedDesignSet);
  const getShareableStateSnapshot = useCustomStore(
    (s) => s.getShareableStateSnapshot
  );

  const [togglesByPaletteId, setTogglesByPaletteId] = useState<
    Record<string, VariantToggles>
  >({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [setUrl, setSetUrl] = useState<string>("");

  useEffect(() => {
    if (!open) return;

    setSetUrl("");
    setIsGenerating(false);

    setTogglesByPaletteId((prev) => {
      const next: Record<string, VariantToggles> = { ...prev };
      for (const p of palettes) {
        if (!next[p.id])
          next[p.id] = { alsoReversed: false, alsoNotReversed: false };
      }
      // Remove entries for palettes no longer selected
      for (const key of Object.keys(next)) {
        if (!palettes.some((p) => p.id === key)) delete next[key];
      }
      return next;
    });
  }, [open, palettes]);

  const computedDesigns = useMemo(() => {
    if (!open)
      return [] as Array<{ label?: string | null; designData: ShareableState }>;

    const base = getShareableStateSnapshot();

    const designs: Array<{
      label?: string | null;
      designData: ShareableState;
    }> = [];
    for (const palette of palettes) {
      const toggles = togglesByPaletteId[palette.id] ?? {
        alsoReversed: false,
        alsoNotReversed: false,
      };

      // Always include the "current config" variant.
      designs.push({
        label: palette.name,
        designData: {
          ...base,
          customPalette: paletteToCustomPalette(palette),
        },
      });

      // Optional additional variants, skipping duplicates of the base.
      if (toggles.alsoReversed && base.isReversed !== true) {
        designs.push({
          label: `${palette.name} (Reversed)`,
          designData: {
            ...base,
            isReversed: true,
            customPalette: paletteToCustomPalette(palette),
          },
        });
      }

      if (toggles.alsoNotReversed && base.isReversed !== false) {
        designs.push({
          label: `${palette.name} (Not reversed)`,
          designData: {
            ...base,
            isReversed: false,
            customPalette: paletteToCustomPalette(palette),
          },
        });
      }
    }

    return designs;
  }, [open, palettes, togglesByPaletteId, getShareableStateSnapshot]);

  const handleGenerate = async () => {
    if (palettes.length === 0) {
      toast.error("Select at least one palette.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await createSharedDesignSet(computedDesigns);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setSetUrl(result.setUrl);
      await navigator.clipboard.writeText(result.setUrl);
      toast.success("Copied set link to clipboard");
      onShared?.(result.setUrl);
    } catch (err) {
      console.error("Error generating set link:", err);
      toast.error("Failed to generate set link");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(setUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Share selected palettes as a set
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Each item in the set is a full design snapshot (palette + config).
            You can add variants like reversed/not reversed.
          </p>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-800">
            {palettes.map((p) => {
              const toggles = togglesByPaletteId[p.id] ?? {
                alsoReversed: false,
                alsoNotReversed: false,
              };

              return (
                <div key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {p.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {p.colors.length} colors
                      </div>
                    </div>

                    <div className="shrink-0 grid gap-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Switch
                          id={`also-reversed-${p.id}`}
                          checked={toggles.alsoReversed}
                          onCheckedChange={(checked) =>
                            setTogglesByPaletteId((prev) => ({
                              ...prev,
                              [p.id]: {
                                ...(prev[p.id] ?? {
                                  alsoReversed: false,
                                  alsoNotReversed: false,
                                }),
                                alsoReversed: checked,
                              },
                            }))
                          }
                        />
                        <Label
                          htmlFor={`also-reversed-${p.id}`}
                          className="text-sm text-gray-700 dark:text-gray-300"
                        >
                          Also include reversed
                        </Label>
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        <Switch
                          id={`also-not-reversed-${p.id}`}
                          checked={toggles.alsoNotReversed}
                          onCheckedChange={(checked) =>
                            setTogglesByPaletteId((prev) => ({
                              ...prev,
                              [p.id]: {
                                ...(prev[p.id] ?? {
                                  alsoReversed: false,
                                  alsoNotReversed: false,
                                }),
                                alsoNotReversed: checked,
                              },
                            }))
                          }
                        />
                        <Label
                          htmlFor={`also-not-reversed-${p.id}`}
                          className="text-sm text-gray-700 dark:text-gray-300"
                        >
                          Also include not reversed
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Will create{" "}
            <span className="font-medium">{computedDesigns.length}</span> item
            {computedDesigns.length === 1 ? "" : "s"} in this set.
          </div>

          {setUrl && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3"
            >
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Viewer link
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-all">
                {setUrl}
              </div>
              <div className="mt-2 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopy}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" /> Copy
                </Button>
                <Button
                  type="button"
                  onClick={() => window.open(setUrl, "_blank", "noopener")}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" /> Open
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleGenerate}
            disabled={isGenerating || palettes.length === 0}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4" />
                <span>{setUrl ? "Regenerate" : "Generate link"}</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
