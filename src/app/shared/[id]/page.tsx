"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useCustomStore } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  ArrowLeft,
  Share,
  Calendar,
  Eye,
  EyeOff,
  Copy,
  Check,
  SlidersHorizontal,
  X,
  Ruler,
  Palette,
  Sparkles,
} from "lucide-react";
import { GeometricPattern } from "@/components/preview/GeometricPattern";
// Tiled option hidden from UI — preserved for potential re-enable.
// import { TiledPattern } from "@/components/preview/TiledPattern";
import {
  GeometricLighting,
  // TiledLighting,
  StripedLighting,
} from "@/components/preview/LightingSetups";
import { ViewControls } from "@/components/preview/ViewControls";
import { ColorInfoHint } from "@/components/preview/ColorInfoHint";
import { Ruler3D } from "@/components/preview/Ruler3D";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useIsMobile } from "@/hooks/useIsMobile";

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
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  const {
    dimensions,
    selectedDesign,
    style,
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

  // Keyboard shortcut to toggle UI (matches main viewer).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "h" || e.key === "H") {
        setShowUIControls((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close the mobile sheet when the user hides UI or leaves mobile.
  useEffect(() => {
    if (!isMobile || !showUIControls) {
      setMobileSheetOpen(false);
    }
  }, [isMobile, showUIControls]);

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

  //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
  //║ 🎨 BACKDROP — shared by loading/error/main states                    ║
  //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

  const backdrop = (
    <div
      aria-hidden
      className="absolute inset-0 -z-10 pointer-events-none bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(circle_at_85%_80%,rgba(99,102,241,0.16),transparent_55%),linear-gradient(to_bottom,rgb(2_6_23),rgb(15_23_42))]"
    />
  );

  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        {backdrop}
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-300 mx-auto mb-4" />
          <p className="text-sm text-slate-300">Loading shared design…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4">
        {backdrop}
        <Card className="glass-surface rounded-[0.7rem] shadow-lg max-w-md w-full p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 ring-1 ring-rose-400/30">
            <svg
              className="h-6 w-6 text-rose-300"
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
          <h2 className="heading-section mb-2">Design Not Found</h2>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <Link href="/">
            <Button className="bg-indigo-600 hover:bg-indigo-500 ring-1 ring-indigo-400/40 text-white">
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
    <div className="relative h-dvh w-full overflow-hidden">
      {backdrop}

      {/* ╔═══╗ ═══════════════════════════════════════════════════════ ╔═══╗
          ║ 🎬 CANVAS — untouched renderer setup                        ║
          ╚═══╝ ═══════════════════════════════════════════════════════ ╚═══╝ */}
      <div className="fixed inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          className="bg-transparent"
        >
          {style === "geometric" && <GeometricLighting />}
          {/* {style === "tiled" && <TiledLighting />} */}
          {style === "striped" && <StripedLighting />}

          {style === "geometric" && <GeometricPattern />}
          {/* {style === "tiled" && <TiledPattern />} */}

          <Ruler3D width={dimensions.width} height={dimensions.height} />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
        </Canvas>
      </div>

      {/* ╔═══╗ ═══════════════════════════════════════════════════════ ╔═══╗
          ║ 📌 TOP HEADER — back link + title                            ║
          ╚═══╝ ═══════════════════════════════════════════════════════ ╚═══╝ */}
      <AnimatePresence>
        {showUIControls && (
          <motion.div
            key="top-header"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "absolute z-40 flex items-center gap-3 select-none",
              isMobile ? "top-3 left-3" : "top-4 left-4"
            )}
          >
            <Link href="/">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-9 h-9 glass-surface hover:bg-gray-900/50 hover:border-white/30 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-gray-300" />
              </Button>
            </Link>
            <h1 className="heading-section">Shared Design</h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ╔═══╗ ═══════════════════════════════════════════════════════ ╔═══╗
          ║ 📄 DESIGN INFO — desktop card on the left                    ║
          ╚═══╝ ═══════════════════════════════════════════════════════ ╚═══╝ */}
      {showUIControls && !isMobile && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="absolute top-20 left-4 z-40 w-72"
        >
          <DesignInfoCard
            selectedDesign={selectedDesign as string}
            width={dimensions.width}
            height={dimensions.height}
            style={style as string}
            createdAt={formatDate(sharedDesign.createdAt)}
            accessCount={sharedDesign.accessCount}
          />
        </motion.div>
      )}

      {/* ╔═══╗ ═══════════════════════════════════════════════════════ ╔═══╗
          ║ ⚙️ VIEW CONTROLS — desktop stack on the right                ║
          ╚═══╝ ═══════════════════════════════════════════════════════ ╚═══╝ */}
      {showUIControls && !isMobile && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="absolute top-20 right-4 z-40 w-72"
        >
          <ViewControls />
        </motion.div>
      )}

      {/* Color info hint (already styled to match) */}
      {showUIControls && <ColorInfoHint />}

      {/* ╔═══╗ ═══════════════════════════════════════════════════════ ╔═══╗
          ║ 📱 MOBILE — floating Options button + bottom sheet           ║
          ╚═══╝ ═══════════════════════════════════════════════════════ ╚═══╝ */}
      {showUIControls && isMobile && (
        <>
          <Button
            type="button"
            className="fixed right-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 rounded-full bg-indigo-600 px-4 shadow-2xl ring-1 ring-indigo-300/40 hover:bg-indigo-500"
            onClick={() => setMobileSheetOpen(true)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Details
          </Button>

          <AnimatePresence>
            {mobileSheetOpen && (
              <>
                <motion.button
                  aria-label="Close details"
                  className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[1px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileSheetOpen(false)}
                />
                <motion.div
                  className="fixed inset-x-2 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 max-h-[72dvh] overflow-hidden rounded-2xl border border-white/15 bg-slate-950/70 shadow-2xl backdrop-blur-xl"
                  initial={{ y: "105%", opacity: 0.8 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "105%", opacity: 0.8 }}
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                >
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-xl">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                      <Share className="h-4 w-4 text-indigo-300" />
                      Design Details
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
                      onClick={() => setMobileSheetOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="max-h-[calc(72dvh-3.5rem)] overflow-y-auto p-3 space-y-3 no-scrollbar">
                    <DesignInfoCard
                      selectedDesign={selectedDesign as string}
                      width={dimensions.width}
                      height={dimensions.height}
                      style={style as string}
                      createdAt={formatDate(sharedDesign.createdAt)}
                      accessCount={sharedDesign.accessCount}
                    />
                    <ViewControls />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ╔═══╗ ═══════════════════════════════════════════════════════ ╔═══╗
          ║ 🎛️ ACTION BUTTONS — bottom-right on desktop, top-right mobile║
          ╚═══╝ ═══════════════════════════════════════════════════════ ╚═══╝ */}
      <div
        className={cn(
          "z-50 flex items-center gap-3 select-none",
          isMobile
            ? "fixed top-3 right-3 justify-end gap-2"
            : "absolute bottom-6 right-6"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-9 h-9 glass-surface hover:bg-gray-900/50 hover:border-white/30 transition-colors"
          onClick={() => setShowUIControls(!showUIControls)}
          aria-label={showUIControls ? "Hide UI" : "Show UI"}
        >
          {showUIControls ? (
            <EyeOff className="w-4 h-4 text-gray-300" />
          ) : (
            <Eye className="w-4 h-4 text-gray-300" />
          )}
        </Button>

        {showUIControls && (
          <Button
            size={isMobile ? "icon" : "default"}
            onClick={handleCopyLink}
            className={cn(
              "bg-indigo-600 hover:bg-indigo-500 ring-1 ring-indigo-400/40 text-white",
              isMobile && "h-9 w-9 rounded-full"
            )}
          >
            {copied ? (
              <Check className={cn("w-4 h-4", !isMobile && "mr-2")} />
            ) : (
              <Copy className={cn("w-4 h-4", !isMobile && "mr-2")} />
            )}
            {!isMobile && (copied ? "Copied!" : "Copy Link")}
          </Button>
        )}
      </div>
    </div>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧾 DESIGN INFO CARD                                                   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

interface DesignInfoCardProps {
  selectedDesign: string;
  width: number;
  height: number;
  style: string;
  createdAt: string;
  accessCount: number;
}

function DesignInfoCard({
  selectedDesign,
  width,
  height,
  style,
  createdAt,
  accessCount,
}: DesignInfoCardProps) {
  return (
    <Card className="glass-surface rounded-[0.7rem] shadow-lg">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/15 ring-1 ring-indigo-400/30">
            <Share className="w-3.5 h-3.5 text-indigo-300" />
          </div>
          <div className="text-sm font-semibold text-white">
            Design Details
          </div>
        </div>

        <div className="space-y-2">
          <InfoRow
            icon={<Palette className="w-3.5 h-3.5 text-indigo-300" />}
            label="Design"
            value={titleCase(selectedDesign)}
          />
          <InfoRow
            icon={<Ruler className="w-3.5 h-3.5 text-indigo-300" />}
            label="Size"
            value={`${width}" × ${height}"`}
          />
          <InfoRow
            icon={<Sparkles className="w-3.5 h-3.5 text-indigo-300" />}
            label="Style"
            value={titleCase(style)}
          />
        </div>

        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{createdAt}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>
              {accessCount} {accessCount === 1 ? "view" : "views"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-gray-900/40 px-3 py-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium text-white truncate">{value}</div>
    </div>
  );
}

function titleCase(value: string | undefined | null): string {
  if (!value) return "—";
  return value
    .toString()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
