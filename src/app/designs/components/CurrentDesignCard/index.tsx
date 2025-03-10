"use client";

import { useState, useRef } from "react";
import { useCustomStore } from "@/store/customStore";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Plus } from "lucide-react";
import { DesignPreview } from "../DesignPreview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";

interface CurrentDesignCardProps {
  onSave: () => void;
}

export const CurrentDesignCard = ({ onSave }: CurrentDesignCardProps) => {
  const { saveDesign } = useCustomStore();
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [designName, setDesignName] = useState("");
  const [redirectAfterSave, setRedirectAfterSave] = useState(false);
  const router = useRouter();

  const handleSaveDesign = () => {
    if (designName.trim()) {
      const designId = saveDesign(designName);
      setDesignName("");
      setIsSaveDialogOpen(false);
      onSave(); // Notify parent that a save occurred

      if (redirectAfterSave) {
        // Apply the design we just saved and navigate to the design page
        router.push("/design");
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4 }}
      className="mb-8"
    >
      <Card className="overflow-hidden border-2 border-dashed border-blue-200 dark:border-blue-800 bg-gradient-to-b from-blue-50/80 to-white/80 dark:from-blue-950/40 dark:to-gray-900/40 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-xl text-blue-600 dark:text-blue-400">
            <Plus className="h-5 w-5" />
            Save Current Design
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {/* Preview */}
            <div className="w-full md:w-1/2 h-48 rounded-md overflow-hidden border border-gray-200 dark:border-gray-800">
              <DesignPreview />
            </div>

            {/* Info */}
            <div className="w-full md:w-1/2 space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Save your current design configuration to revisit or order
                later. All settings including colors, dimensions, pattern style
                and orientation will be saved.
              </p>

              <Dialog
                open={isSaveDialogOpen}
                onOpenChange={setIsSaveDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
                    <Save className="mr-2 h-4 w-4" />
                    Save Current Design
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Save Design</DialogTitle>
                    <DialogDescription>
                      Give your design a name to save it to your collection
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Input
                      id="design-name"
                      placeholder="My Custom Design"
                      value={designName}
                      onChange={(e) => setDesignName(e.target.value)}
                    />

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="redirect"
                        checked={redirectAfterSave}
                        onCheckedChange={(checked) =>
                          setRedirectAfterSave(checked === true)
                        }
                      />
                      <label
                        htmlFor="redirect"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Edit design after saving
                      </label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                      onClick={handleSaveDesign}
                      disabled={!designName.trim()}
                    >
                      Save Design
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
