"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCustomStore } from "@/store/customStore";
import { ItemDesigns } from "@/typings/types";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Copy,
  Eye,
  ShoppingCart,
  SlidersHorizontal,
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
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Group } from "three";
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { GeometricPattern } from "@/app/order/components/preview/GeometricPattern";
import { GeometricLighting } from "@/app/order/components/preview/LightingSetups";

// Define design categories
type DesignCategory =
  | "All"
  | "Blues"
  | "Earthy"
  | "Greens"
  | "Neutrals"
  | "Colorful";

// Map designs to categories (reusing the same categories from palettes for consistency)
const designCategories: Record<ItemDesigns, DesignCategory[]> = {
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

// Animation component that controls the limited rotation
function LimitedRotation({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<Group>(null);
  const [direction, setDirection] = useState(1);
  const rotationRef = useRef(0);

  useFrame(() => {
    if (!groupRef.current) return;

    // Update rotation
    rotationRef.current += 0.001 * direction;

    // Convert degrees to radians
    const maxRotation = THREE.MathUtils.degToRad(90);
    const minRotation = THREE.MathUtils.degToRad(0);

    // Check bounds and change direction
    if (rotationRef.current >= maxRotation) {
      rotationRef.current = maxRotation;
      setDirection(-1);
    } else if (rotationRef.current <= minRotation) {
      rotationRef.current = minRotation;
      setDirection(1);
    }

    // Apply rotation
    groupRef.current.rotation.y = rotationRef.current;
  });

  return <group ref={groupRef}>{children}</group>;
}

// Design Preview component
function DesignPreview({ design }: { design: ItemDesigns }) {
  const { viewSettings } = useCustomStore();
  const { showWoodGrain, showColorInfo } = viewSettings;

  // Define default design parameters
  const defaultDesign = {
    dimensions: { width: 22, height: 10 },
    selectedDesign: design,
    colorPattern: "fade",
    orientation: "horizontal",
    isReversed: false,
    customPalette: Object.values(DESIGN_COLORS[design]).map((color) => ({
      hex: color.hex,
      name: color.name,
    })),
    isRotated: false,
    style: "geometric",
    useMini: false,
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Prevent the click from bubbling up to parent elements
    e.stopPropagation();
  };

  return (
    <div
      className="w-full h-48 rounded-md overflow-hidden"
      onClick={handleCanvasClick}
    >
      <Canvas shadows className="w-full h-full">
        <PerspectiveCamera
          makeDefault
          position={[15, 15, 15]}
          fov={45}
          zoom={2.5}
        />

        {/* Lighting based on style */}
        <GeometricLighting />

        {/* Limited rotation wrapper around patterns */}
        <LimitedRotation>
          {/* Apply the design */}
          <group>
            <GeometricPattern
              showWoodGrain={showWoodGrain}
              showColorInfo={showColorInfo}
              customDesign={defaultDesign}
            />
          </group>
        </LimitedRotation>

        {/* Orbit controls for manual interaction, but without autoRotate */}
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}

// Official Design Card component
const OfficialDesignCard = ({
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
        <div className="h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
          <DesignPreview design={design} />
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
                <Copy className="h-3 w-3 mr-1" />
                Customize
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Customize Official Design</DialogTitle>
                <DialogDescription>
                  Create a custom design based on the {design} design. Your
                  customized version will be saved to your designs.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="mb-4">
                  <PalettePreview design={design} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This will create a copy of the official design that you can
                  modify. The original official design will remain unchanged.
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

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onVisualize(design)}
            >
              <Eye className="h-3 w-3 mr-1" />
              Visualize
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              onClick={() => onOrder(design)}
            >
              <ShoppingCart className="h-3 w-3 mr-1" />
              Order
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export function OfficialDesigns() {
  const router = useRouter();
  const {
    setSelectedDesign,
    setDimensions,
    setColorPattern,
    setOrientation,
    setIsReversed,
    setIsRotated,
    setStyle,
    setUseMini,
    setCustomPalette,
  } = useCustomStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<DesignCategory>("All");

  const handleVisualizeOfficialDesign = (design: ItemDesigns) => {
    // Set up the selected design with default configuration
    setSelectedDesign(design);
    setDimensions({ width: 22, height: 12 });
    setColorPattern("fade");
    setOrientation("horizontal");
    setIsReversed(false);
    setIsRotated(false);
    setStyle("geometric");
    setUseMini(false);

    // Navigate to the design page to visualize
    router.push("/design");

    toast.success(`Now visualizing ${design} design`);
  };

  const handleOrderOfficialDesign = (design: ItemDesigns) => {
    // Set up the selected design with default configuration
    setSelectedDesign(design);
    setDimensions({ width: 22, height: 12 });
    setColorPattern("fade");
    setOrientation("horizontal");
    setIsReversed(false);
    setIsRotated(false);
    setStyle("geometric");
    setUseMini(false);

    // Navigate to the order page
    router.push("/order");

    toast.success(`Setting up ${design} design for ordering`);
  };

  const handleCustomizeOfficialDesign = (design: ItemDesigns) => {
    // Setup the customization parameters
    setSelectedDesign(design);
    setDimensions({ width: 22, height: 12 });
    setColorPattern("fade");
    setOrientation("horizontal");
    setIsReversed(false);
    setIsRotated(false);
    setStyle("geometric");
    setUseMini(false);

    // Set the custom palette to match the colors of the selected design
    const designColors = Object.values(DESIGN_COLORS[design]).map((color) => ({
      hex: color.hex,
      name: color.name,
    }));
    setCustomPalette(designColors);

    // Navigate to the design page for customization
    router.push("/design");

    toast.success(`Created a custom copy of ${design} design`);
  };

  // Filter designs by search term and category
  const filteredDesigns = Object.values(ItemDesigns).filter((design) => {
    if (design === ItemDesigns.Custom) return false;

    const matchesSearch = design
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" ||
      designCategories[design].includes(selectedCategory);

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Official Designs
          </h2>

          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                type="text"
                placeholder="Search designs..."
                className="pl-8 h-9 bg-white dark:bg-gray-950"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="hidden md:block">
              <Tabs
                defaultValue="All"
                value={selectedCategory}
                onValueChange={(value) =>
                  setSelectedCategory(value as DesignCategory)
                }
                className="w-full"
              >
                <TabsList className="bg-gray-100 dark:bg-gray-800/50 grid grid-cols-6 h-8">
                  <TabsTrigger value="All" className="text-xs h-7">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="Blues" className="text-xs h-7">
                    Blues
                  </TabsTrigger>
                  <TabsTrigger value="Earthy" className="text-xs h-7">
                    Earthy
                  </TabsTrigger>
                  <TabsTrigger value="Greens" className="text-xs h-7">
                    Greens
                  </TabsTrigger>
                  <TabsTrigger value="Neutrals" className="text-xs h-7">
                    Neutrals
                  </TabsTrigger>
                  <TabsTrigger value="Colorful" className="text-xs h-7">
                    Colorful
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="md:hidden">
              <Button variant="outline" size="sm" className="gap-1 h-9 px-2.5">
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filter</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile category tabs (only visible on mobile) */}
        <div className="md:hidden">
          <Tabs
            defaultValue="All"
            value={selectedCategory}
            onValueChange={(value) =>
              setSelectedCategory(value as DesignCategory)
            }
            className="w-full"
          >
            <TabsList className="bg-gray-100 dark:bg-gray-800/50 grid grid-cols-3 h-8">
              <TabsTrigger value="All" className="text-xs h-7">
                All
              </TabsTrigger>
              <TabsTrigger value="Blues" className="text-xs h-7">
                Blues
              </TabsTrigger>
              <TabsTrigger value="Earthy" className="text-xs h-7">
                Earthy
              </TabsTrigger>
            </TabsList>
            <TabsList className="bg-gray-100 dark:bg-gray-800/50 grid grid-cols-3 h-8 mt-1">
              <TabsTrigger value="Greens" className="text-xs h-7">
                Greens
              </TabsTrigger>
              <TabsTrigger value="Neutrals" className="text-xs h-7">
                Neutrals
              </TabsTrigger>
              <TabsTrigger value="Colorful" className="text-xs h-7">
                Colorful
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <AnimatePresence>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDesigns.map((design) => (
              <OfficialDesignCard
                key={design}
                design={design}
                onVisualize={handleVisualizeOfficialDesign}
                onOrder={handleOrderOfficialDesign}
                onCustomize={handleCustomizeOfficialDesign}
              />
            ))}
          </div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
