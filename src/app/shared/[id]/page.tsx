"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  Share,
  Calendar,
  Eye,
  Copy,
  Check,
} from "lucide-react";
import { GeometricPattern } from "../../order/components/preview/GeometricPattern";
import { TiledPattern } from "../../order/components/preview/TiledPattern";
import {
  GeometricLighting,
  TiledLighting,
  StripedLighting,
} from "../../order/components/preview/LightingSetups";
import { ViewControls } from "../../order/components/preview/ViewControls";
import { ColorInfoHint } from "../../order/components/preview/ColorInfoHint";
import { Ruler3D } from "../../order/components/preview/Ruler3D";
import { ItemDesigns } from "@/typings/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SharedDesignData {
  shareId: string;
  designData: any;
  createdAt: string;
  accessCount: number;
}

export default function SharedDesignPage() {
  const params = useParams();
  const shareId = params.id as string;
  const [sharedDesign, setSharedDesign] = useState<SharedDesignData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showUIControls, setShowUIControls] = useState(true);

  const {
    dimensions,
    selectedDesign,
    shippingSpeed,
    colorPattern,
    orientation,
    isReversed,
    customPalette,
    isRotated,
    style,
    currentColors,
    loadFromDatabaseData,
  } = useCustomStore();

  useEffect(() => {
    const fetchSharedDesign = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/shared-designs?id=${shareId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError(
              "This shared design could not be found. It may have expired or been removed."
            );
          } else {
            setError("Failed to load the shared design. Please try again.");
          }
          return;
        }

        const data: SharedDesignData = await response.json();
        setSharedDesign(data);

        // Load the design data directly into the store
        const success = loadFromDatabaseData(data.designData);
        if (!success) {
          setError("Failed to load the design configuration.");
        }
      } catch (err) {
        console.error("Error fetching shared design:", err);
        setError("Failed to load the shared design. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (shareId) {
      fetchSharedDesign();
    }
  }, [shareId, loadFromDatabaseData]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading shared design...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="max-w-md mx-4 p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Design Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!sharedDesign) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-40 p-6">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button
              variant="outline"
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
            >
              {copied ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        </div>
      </div>

      {/* Design Info Card */}
      <div className="absolute top-20 left-6 z-40 max-w-sm">
        <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Share className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Shared Design
              </h3>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>Created {formatDate(sharedDesign.createdAt)}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Eye className="w-4 h-4" />
                <span>{sharedDesign.accessCount} views</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Design:
                </span>
                <Badge variant="secondary">{selectedDesign}</Badge>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Size:
                </span>
                <Badge variant="outline">
                  {dimensions.width}" × {dimensions.height}"
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Style:
                </span>
                <Badge variant="outline">{style}</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 3D Canvas */}
      <div className="w-full h-screen">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          className="bg-transparent"
        >
          {/* Lighting setup based on pattern style */}
          {style === "geometric" && <GeometricLighting />}
          {style === "tiled" && <TiledLighting />}
          {style === "striped" && <StripedLighting />}

          {/* Pattern components */}
          {style === "geometric" && <GeometricPattern />}
          {style === "tiled" && <TiledPattern />}

          <Ruler3D width={dimensions.width} height={dimensions.height} />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
        </Canvas>
      </div>

      {/* View controls overlay (outside Canvas) */}
      {showUIControls && (
        <div className="absolute top-20 right-6 z-40">
          <ViewControls />
        </div>
      )}

      {/* Color Info Hint */}
      <ColorInfoHint />

      {/* UI Controls Toggle */}
      <div className="absolute top-6 right-6 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUIControls(!showUIControls)}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
        >
          {showUIControls ? "Hide UI" : "Show UI"}
        </Button>
      </div>
    </div>
  );
}
