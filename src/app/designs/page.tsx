"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderIcon, Upload, Lightbulb } from "lucide-react";
import Link from "next/link";
import { DesignList } from "./components/DesignList";
import { CurrentDesignCard } from "./components/CurrentDesignCard";
import { OfficialDesigns } from "./components/OfficialDesigns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomStore } from "@/store/customStore";
import { ImportCard } from "./components/DesignList/ImportCard";
import { toast } from "sonner";

export default function DesignsPage() {
  const [refreshCounter, setRefreshCounter] = useState(0);
  const { activeTab, setActiveTab, savedDesigns } = useCustomStore();

  const handleDesignSaved = () => {
    // Increment refresh counter to force re-render of DesignList
    setRefreshCounter((prev) => prev + 1);
  };

  // Use the activeTab as the default, otherwise "saved"
  // This maintains the user's last selected tab
  const defaultTab = activeTab === "official" ? "official" : "saved";

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <motion.h1
            className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Designs Library
          </motion.h1>
          <Link href="/design">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Designer
            </Button>
          </Link>
        </div>

        <motion.p
          className="text-gray-600 dark:text-gray-400 max-w-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Create and manage your custom designs or browse our curated collection
          for inspiration. All designs include optimized colors, dimensions,
          patterns and styles.
        </motion.p>

        {/* Tabs for switching between saved and official designs */}
        <Tabs
          defaultValue={defaultTab}
          className="w-full"
          onValueChange={(value) => {
            if (value === "official" || value === "saved") {
              setActiveTab(value);
            }
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="saved" className="text-sm">
                My Saved Designs
              </TabsTrigger>
              <TabsTrigger value="official" className="text-sm group">
                <div className="relative flex items-center gap-1.5">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-indigo-400/20 to-blue-400/10 rounded-sm opacity-0 group-hover:opacity-100 -z-10"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{
                      opacity: [0.1, 0.8, 0.1],
                      scale: [0.98, 1.02, 0.98],
                      background: [
                        "linear-gradient(90deg, rgba(96,165,250,0.1) 0%, rgba(99,102,241,0.2) 20%, rgba(96,165,250,0.1) 40%)",
                        "linear-gradient(90deg, rgba(96,165,250,0.1) 60%, rgba(99,102,241,0.2) 80%, rgba(96,165,250,0.1) 100%)",
                        "linear-gradient(90deg, rgba(96,165,250,0.1) 0%, rgba(99,102,241,0.2) 20%, rgba(96,165,250,0.1) 40%)",
                      ],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                      repeatType: "loop",
                      ease: "easeInOut",
                    }}
                  />
                  <motion.span
                    className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300"
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    Official Designs
                  </motion.span>
                  {activeTab !== "official" && (
                    <motion.div
                      className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center"
                      initial={{ opacity: 0.7 }}
                      animate={{
                        opacity: [0.7, 1, 0.7],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        repeatType: "loop",
                        ease: "easeInOut",
                      }}
                    >
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"></span>
                    </motion.div>
                  )}
                </div>
              </TabsTrigger>
            </TabsList>

            {/* Integrated inspiration/creation button based on active tab */}
            {activeTab === "saved" ? (
              <Button
                onClick={() => setActiveTab("official")}
                className="hidden md:flex items-center gap-1.5 text-xs bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                size="sm"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                Get Inspired
              </Button>
            ) : (
              <Link href="/design">
                <Button
                  className="hidden md:flex items-center gap-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  size="sm"
                >
                  <FolderIcon className="h-3.5 w-3.5" />
                  Create Design
                </Button>
              </Link>
            )}
          </div>

          <TabsContent value="saved" className="space-y-4">
            {/* Optional mobile version of the inspiration button */}
            <div className="flex md:hidden justify-end mb-2">
              <Button
                onClick={() => setActiveTab("official")}
                className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                size="sm"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                Get Inspired
              </Button>
            </div>

            {/* Current Design Card */}
            <CurrentDesignCard onSave={handleDesignSaved} />

            {/* Saved Design List */}
            <motion.div
              key={refreshCounter} // Force re-render when new design is saved
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              {savedDesigns.length > 0 ? (
                <DesignList />
              ) : (
                <div className="mt-8 flex flex-col items-center justify-center text-center">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
                    <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center bg-white/50 dark:bg-gray-800/20 hover:bg-white dark:hover:bg-gray-800/30 transition-colors">
                      <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                        <FolderIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-2">
                        No Saved Designs
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                        Create and save designs from the Designer to see them
                        here
                      </p>
                      <Link href="/design">
                        <Button variant="outline" size="sm">
                          Go to Designer
                        </Button>
                      </Link>
                    </div>

                    <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white/50 dark:bg-gray-800/20 hover:bg-white dark:hover:bg-gray-800/30 transition-colors">
                      <div className="p-6 flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                          <Upload className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-2">
                          Import Design
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 text-center">
                          Import designs from file or URL
                        </p>
                      </div>
                      <div className="px-4 pb-4 w-full">
                        <ImportCard
                          onImport={() => {
                            // Handle import logic if needed
                            toast.info(
                              "Import functionality would be triggered here"
                            );
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Small inspiration hint */}
                  <div className="mt-8 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 justify-center">
                    <Lightbulb className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    <span>Need inspiration?</span>
                    <button
                      onClick={() => setActiveTab("official")}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Browse official designs
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="official">
            {/* Optional mobile version of the creation button */}
            <div className="flex md:hidden justify-end mb-2">
              <Link href="/design">
                <Button
                  className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  size="sm"
                >
                  <FolderIcon className="h-3.5 w-3.5" />
                  Create Design
                </Button>
              </Link>
            </div>

            {/* Official Designs */}
            <OfficialDesigns />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
