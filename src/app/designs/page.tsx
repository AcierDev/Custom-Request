"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DesignList } from "./components/DesignList";
import { CurrentDesignCard } from "./components/CurrentDesignCard";

export default function DesignsPage() {
  const [refreshCounter, setRefreshCounter] = useState(0);

  const handleDesignSaved = () => {
    // Increment refresh counter to force re-render of DesignList
    setRefreshCounter((prev) => prev + 1);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <motion.h1
            className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Saved Designs
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
          Save your complete designs including colors, dimensions, patterns and
          styles. Create multiple variations and come back to them anytime.
        </motion.p>

        {/* Current Design Card */}
        <CurrentDesignCard onSave={handleDesignSaved} />

        {/* Design List */}
        <motion.div
          key={refreshCounter} // Force re-render when new design is saved
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4 }}
        >
          <DesignList />
        </motion.div>
      </div>
    </div>
  );
}
