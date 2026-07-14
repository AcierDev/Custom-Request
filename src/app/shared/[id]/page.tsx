"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  ArrowRight,
  ImageOff,
  X,
  Info,
  Download,
} from "lucide-react";
import {
  useCustomStore,
  type ShareableState,
} from "@/store/customStore";
import { Button } from "@/components/ui/button";
import { GalleryArtScene } from "@/components/preview/GalleryArtScene";
import { LightingControls } from "@/components/preview/LightingControls";
import { PatternControls } from "@/components/preview/PatternControls";
import type { TimeOfDay } from "@/components/preview/RotatableLighting";
import { DEFAULT_WALL_COLOR } from "@/components/preview/wallColors";
import { WallColorPicker } from "@/components/preview/WallColorPicker";
import { PaintColorPicker } from "@/components/preview/PaintColorPicker";
import { SizeCard } from "@/components/cards/SizeCard";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { ItemDesigns } from "@/typings/types";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { sizeToInchLabel } from "@/lib/size-pills";
import { decompressJsonFromUrl } from "@/lib/urlUtils";
import { ARButton } from "@/components/ARButton";
import { useFourAngleImageDownload } from "@/hooks/useFourAngleImageDownload";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🔗 CONSTANTS                                                          ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Where "Design your own" sends a warm lead. The builder accepts no
// share-id pre-seed today, so we drop them at the front door rather than
// fabricate a link that wouldn't load this piece.
const BUILDER_URL = "https://custom.everwood.shop";
// Network requests that hang shouldn't strand the recipient on a loader.
const FETCH_TIMEOUT_MS = 10000;
const SHARED_IMAGE_EXPORT_FILENAME = "shared-art-four-angles.png";
const SHARED_ACTIONS_CLASS = "z-50 flex items-center gap-2";
const SHARED_ACTION_BUTTON_CLASS =
  "rounded-full glass-surface hover:bg-gray-900/50 hover:border-white/30 transition-colors";
const SHARED_ICON_BUTTON_CLASS = "h-9 w-9";
const SHARED_ACTION_ICON_CLASS = "h-4 w-4 text-gray-200";
// Only show the view count once it reads as real social proof, never
// "Viewed 1 time".
const VIEW_COUNT_THRESHOLD = 5;

type ErrorKind = "notfound" | "network";

interface SharedDesignData {
  shareId: string;
  designData: ShareableState;
  createdAt: string;
  accessCount: number;
}

interface PaletteColor {
  hex: string;
  name: string;
  weight: number;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🖼️ SHARED DESIGN PAGE                                                 ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export default function SharedDesignPage() {
  const params = useParams();
  const shareId = params.id as string;
  const isMobile = useIsMobile();

  const [sharedDesign, setSharedDesign] = useState<SharedDesignData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorKind | null>(null);
  const [copied, setCopied] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<"about" | "view">("about");
  const [placardOpen, setPlacardOpen] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const {
    isSavingImage,
    isImageCaptureReady,
    setCapture: setCaptureFourAngleImage,
    saveImage: handleSaveImage,
  } = useFourAngleImageDownload(SHARED_IMAGE_EXPORT_FILENAME);

  // Environment controls are LOCAL — never the store's persisted
  // viewSettings — so a recipient trying a wall color can't have it
  // autosaved into their own account (see autosave disable below).
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("afternoon");
  const [wallColor, setWallColor] = useState<string>(DEFAULT_WALL_COLOR);

  const dimensions = useCustomStore((s) => s.dimensions);
  const selectedDesign = useCustomStore((s) => s.selectedDesign);
  const customPalette = useCustomStore((s) => s.customPalette);
  const loadFromDatabaseData = useCustomStore((s) => s.loadFromDatabaseData);
  const setAutoSaveEnabled = useCustomStore((s) => s.setAutoSaveEnabled);

  // This is a read-only preview of SOMEONE ELSE'S design. Loading it into
  // the store would otherwise let the global 30s autosave overwrite the
  // recipient's own saved work. Pause autosave for the visit, then restore
  // whatever it was before (the user may have turned it off in /profile).
  useEffect(() => {
    const prev = useCustomStore.getState().autoSaveEnabled;
    setAutoSaveEnabled(false);
    return () => setAutoSaveEnabled(prev);
  }, [setAutoSaveEnabled]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Loads the shared design — from an inline ?d= payload (no DB round-trip,
  // used on dev / for signed-out visitors) or the shared-designs API. Takes
  // the caller's AbortController + an isActive guard so an unmount or a new
  // shareId cancels the in-flight request and never writes state late (which
  // would also double-increment the view count under React StrictMode).
  const runFetch = useCallback(
    async (controller: AbortController, isActive: () => boolean) => {
      setLoading(true);
      setError(null);

      // Inline preview (?d=...): the design is packed into the URL, so render
      // it with no database round-trip. This is how the shared viewer is
      // tested on dev and viewed by signed-out visitors when there is no DB.
      // Read the param by hand — the lz-string payload can contain "+", which
      // URLSearchParams would turn into a space and corrupt (matches how
      // loadFromShareableData parses its own short links).
      const inlineData =
        typeof window !== "undefined"
          ? window.location.search.match(/[?&]d=([^&]*)/)?.[1] ?? null
          : null;
      if (inlineData) {
        try {
          const designData = JSON.parse(
            decompressJsonFromUrl(inlineData)
          ) as ShareableState;
          if (!isActive()) return;
          if (loadFromDatabaseData(designData)) {
            setSharedDesign({
              shareId,
              designData,
              createdAt: new Date().toISOString(),
              accessCount: 0,
            });
          } else {
            setError("notfound");
          }
        } catch {
          if (isActive()) setError("notfound");
        } finally {
          if (isActive()) setLoading(false);
        }
        return;
      }

      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const response = await fetch(`/api/shared-designs?id=${shareId}`, {
          signal: controller.signal,
        });
        if (!isActive()) return;
        if (!response.ok) {
          setError(response.status === 404 ? "notfound" : "network");
          return;
        }
        const data: SharedDesignData = await response.json();
        if (!isActive()) return;
        if (loadFromDatabaseData(data.designData)) {
          setSharedDesign(data);
        } else {
          setError("notfound");
        }
      } catch {
        // The 10s timeout abort (still mounted → show the error) and the
        // unmount/navigation abort (isActive() false → stay silent) both
        // land here as an AbortError.
        if (isActive()) setError("network");
      } finally {
        clearTimeout(timeout);
        if (isActive()) setLoading(false);
      }
    },
    [shareId, loadFromDatabaseData]
  );

  useEffect(() => {
    if (!shareId) return;
    const controller = new AbortController();
    let active = true;
    runFetch(controller, () => active);
    return () => {
      active = false;
      controller.abort();
    };
  }, [shareId, runFetch]);

  // User-initiated retry from the error state (not tied to a mount).
  const retry = useCallback(() => {
    runFetch(new AbortController(), () => true);
  }, [runFetch]);

  // "h" toggles chrome, matching the main viewer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "h" || e.key === "H") setShowUI((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!isMobile || !showUI) setSheetOpen(false);
  }, [isMobile, showUI]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — silent */
    }
  }, []);

  const palette = useMemo(
    () => buildPalette(selectedDesign, customPalette),
    [selectedDesign, customPalette]
  );
  const pieceName = designName(selectedDesign);

  if (loading) return <LoadingState reducedMotion={reducedMotion} />;
  if (error) return <ErrorState kind={error} onRetry={retry} />;
  if (!sharedDesign) return null;

  const fadeUp = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="relative h-dvh w-full overflow-hidden select-none bg-[#b8b2a4]">
      {/* The gallery scene — the art hung in the furnished room. */}
      <div className="fixed inset-0 z-0">
        <GalleryArtScene
          timeOfDay={timeOfDay}
          wallColor={wallColor}
          showRoom
          showColorInfo={false}
          autoOrbit={!reducedMotion}
          isMobile={isMobile}
          className="w-full h-full"
          onCaptureReady={setCaptureFourAngleImage}
        />
      </div>

      {/* ── Brand lockup (top-left) ─────────────────────────────────── */}
      <AnimatePresence>
        {showUI && (
          <motion.div
            key="brand"
            {...fadeUp}
            exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "absolute z-40",
              isMobile ? "top-3 left-3" : "top-5 left-5"
            )}
          >
            <BrandPill />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Viewing controls (desktop, top-right) ───────────────────── */}
      <AnimatePresence>
        {showUI && !isMobile && (
          <motion.div
            key="viewing"
            initial={reducedMotion ? undefined : { opacity: 0, y: -10 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="absolute top-5 right-5 z-40 w-72 max-h-[calc(100dvh-2.5rem)] overflow-y-auto no-scrollbar"
          >
            <ViewingControls
              timeOfDay={timeOfDay}
              onTimeOfDay={setTimeOfDay}
              wallColor={wallColor}
              onWallColor={setWallColor}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Placard (desktop, lower-left) ───────────────────────────── */}
      <AnimatePresence>
        {showUI && !isMobile && (
          <motion.div
            key="placard"
            initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 12 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="absolute bottom-6 left-6 z-40 w-[20rem]"
          >
            <Placard
              name={pieceName}
              width={dimensions.width}
              height={dimensions.height}
              palette={palette}
              createdAt={sharedDesign.createdAt}
              accessCount={sharedDesign.accessCount}
              collapsible
              open={placardOpen}
              onToggle={() => setPlacardOpen((v) => !v)}
              reducedMotion={reducedMotion}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Conversion bar (bottom-center desktop / full-width mobile) ─ */}
      <AnimatePresence>
        {showUI && (
          <motion.div
            key="cta"
            initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 16 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className={cn(
              "z-50",
              isMobile
                ? "fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))]"
                : "absolute bottom-6 left-1/2 -translate-x-1/2"
            )}
          >
            <CtaBar
              isMobile={isMobile}
              copied={copied}
              onCopy={handleCopyLink}
              onDetails={() => {
                setSheetTab("about");
                setSheetOpen(true);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Image export + Hide-UI toggle ───────────────────────────── */}
      <div
        className={cn(
          SHARED_ACTIONS_CLASS,
          isMobile ? "fixed top-3 right-3" : "absolute bottom-6 right-6"
        )}
      >
        {showUI && (
          <Button
            type="button"
            variant="ghost"
            size={isMobile ? "icon" : "sm"}
            disabled={isSavingImage || !isImageCaptureReady}
            aria-busy={isSavingImage}
            aria-label="Save image"
            onClick={handleSaveImage}
            className={cn(
              SHARED_ACTION_BUTTON_CLASS,
              isMobile && SHARED_ICON_BUTTON_CLASS
            )}
          >
            <Download className={SHARED_ACTION_ICON_CLASS} />
            {!isMobile && (isSavingImage ? "Saving…" : "Save image")}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowUI((v) => !v)}
          aria-label={showUI ? "Hide interface" : "Show interface"}
          className={cn(
            SHARED_ACTION_BUTTON_CLASS,
            SHARED_ICON_BUTTON_CLASS
          )}
        >
          {showUI ? (
            <EyeOff className={SHARED_ACTION_ICON_CLASS} />
          ) : (
            <Eye className={SHARED_ACTION_ICON_CLASS} />
          )}
        </Button>
      </div>

      {/* ── Mobile detail sheet (About / View tabs) ─────────────────── */}
      <AnimatePresence>
        {sheetOpen && isMobile && (
          <>
            <motion.button
              aria-label="Close details"
              className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              className="fixed inset-x-2 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 max-h-[74dvh] overflow-hidden rounded-2xl border border-white/12 bg-[rgba(20,18,16,0.82)] shadow-2xl backdrop-blur-xl"
              initial={{ y: "105%" }}
              animate={{ y: 0 }}
              exit={{ y: "105%" }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
                <div className="flex gap-1 rounded-lg bg-black/30 p-1">
                  {(["about", "view"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setSheetTab(tab)}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                        sheetTab === tab
                          ? "bg-white/12 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
                  onClick={() => setSheetOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="max-h-[calc(74dvh-3.25rem)] overflow-y-auto p-4 no-scrollbar">
                {sheetTab === "about" ? (
                  <Placard
                    name={pieceName}
                    width={dimensions.width}
                    height={dimensions.height}
                    palette={palette}
                    createdAt={sharedDesign.createdAt}
                    accessCount={sharedDesign.accessCount}
                    bare
                    reducedMotion={reducedMotion}
                    footerAction={
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copied ? "Copied" : "Copy link"}
                      </button>
                    }
                  />
                ) : (
                  <ViewingControls
                    timeOfDay={timeOfDay}
                    onTimeOfDay={setTimeOfDay}
                    wallColor={wallColor}
                    onWallColor={setWallColor}
                  />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🏷️ BRAND PILL                                                        ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function BrandPill() {
  return (
    <a
      href={BUILDER_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2.5 rounded-full glass-surface px-3.5 py-2 shadow-lg transition-colors hover:border-white/30"
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-amber-300/90 to-amber-600/90 text-[11px] font-bold text-amber-950 shadow-inner">
        E
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-tight text-white">
          Everwood
        </span>
        <span className="block text-[10px] uppercase tracking-wider text-slate-400">
          Shared with you
        </span>
      </span>
    </a>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧾 PLACARD — museum wall label                                        ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function Placard({
  name,
  width,
  height,
  palette,
  createdAt,
  accessCount,
  collapsible = false,
  open = true,
  onToggle,
  bare = false,
  reducedMotion = false,
  footerAction,
}: {
  name: string;
  width: number;
  height: number;
  palette: PaletteColor[];
  createdAt: string;
  accessCount: number;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
  bare?: boolean;
  reducedMotion?: boolean;
  footerAction?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-[1.35rem] leading-tight text-white">
            {name}
          </h2>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
            {sizeLabel(width, height)}
          </p>
        </div>
        {collapsible && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse details"
            className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="my-3.5 h-px bg-white/10" />

      <PaletteStory palette={palette} reducedMotion={reducedMotion} />

      <div className="mt-3.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>{relativeDate(createdAt)}</span>
        {footerAction ? (
          footerAction
        ) : accessCount >= VIEW_COUNT_THRESHOLD ? (
          <span>{accessCount.toLocaleString()} views</span>
        ) : null}
      </div>
    </>
  );

  if (bare) return <div>{body}</div>;

  // The placard reads as a physical label resting near the wall — a warm,
  // low-blur glass tile, deliberately distinct from the app's cool indigo
  // builder panels.
  const tile =
    "rounded-2xl border border-white/10 bg-[rgba(22,19,16,0.6)] p-4 shadow-2xl backdrop-blur-md";

  if (collapsible && !open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(22,19,16,0.6)] px-4 py-2.5 shadow-2xl backdrop-blur-md transition-colors hover:border-white/25"
        )}
      >
        <Info className="h-4 w-4 text-slate-300" />
        <span className="text-sm font-medium text-white">{name}</span>
      </button>
    );
  }

  return <div className={tile}>{body}</div>;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 PALETTE STORY — proportional bar + named swatches                  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function PaletteStory({
  palette,
  reducedMotion = false,
}: {
  palette: PaletteColor[];
  reducedMotion?: boolean;
}) {
  if (palette.length === 0) return null;
  const total = palette.reduce((sum, c) => sum + c.weight, 0) || 1;

  return (
    <div className="space-y-2.5">
      {/* Proportional color bar — each color sized by its share. */}
      <div className="flex h-7 w-full overflow-hidden rounded-md ring-1 ring-black/30">
        {palette.map((c, i) => (
          <motion.div
            key={`${c.hex}-${i}`}
            title={`${c.name} · ${c.hex.toUpperCase()}`}
            initial={reducedMotion ? undefined : { flexGrow: 0 }}
            animate={{ flexGrow: c.weight }}
            transition={{ duration: 0.5, delay: i * 0.04, ease: "easeOut" }}
            style={{ flexGrow: c.weight, flexBasis: 0, backgroundColor: c.hex }}
          />
        ))}
      </div>

      {/* Named swatches — hover/tap reveals the hex. */}
      <div className="flex flex-wrap gap-1.5">
        {palette.map((c, i) => (
          <span
            key={`${c.hex}-chip-${i}`}
            title={c.hex.toUpperCase()}
            className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 py-0.5 pl-1 pr-2 transition-colors hover:border-white/25"
          >
            <span
              className="h-3.5 w-3.5 rounded-full ring-1 ring-black/30"
              style={{ backgroundColor: c.hex }}
            />
            <span className="text-[11px] text-slate-300">{c.name}</span>
          </span>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">
        {palette.length} solid hardwood tone{palette.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ VIEWING CONTROLS — lighting + wall color                          ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function ViewingControls({
  timeOfDay,
  onTimeOfDay,
  wallColor,
  onWallColor,
}: {
  timeOfDay: TimeOfDay;
  onTimeOfDay: (v: TimeOfDay) => void;
  wallColor: string;
  onWallColor: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="glass-surface rounded-[0.7rem] p-3 shadow-lg">
        <div className="mb-2 text-sm text-slate-300">See it at another size</div>
        <SizeCard compact bare inchLabels />
      </div>
      <PatternControls />
      <LightingControls value={timeOfDay} onChange={onTimeOfDay} />
      <div className="glass-surface rounded-[0.7rem] p-3 shadow-lg">
        <div className="mb-2 text-sm text-slate-300">Try it on your wall</div>
        <WallColorPicker value={wallColor} onChange={onWallColor} />
        <div className="my-3 h-px bg-white/10" />
        <PaintColorPicker value={wallColor} onChange={onWallColor} />
      </div>
    </div>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🚀 CTA BAR — the single, calm conversion door                        ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function CtaBar({
  isMobile,
  copied,
  onCopy,
  onDetails,
}: {
  isMobile: boolean;
  copied: boolean;
  onCopy: () => void;
  onDetails: () => void;
}) {
  const designOwn = (
    <a
      href={BUILDER_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 font-medium text-white shadow-lg shadow-indigo-900/30 ring-1 ring-indigo-400/40 transition-colors hover:bg-indigo-500",
        isMobile ? "h-11 flex-1 px-5 text-sm" : "h-10 px-5 text-sm"
      )}
    >
      Design your own
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </a>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col gap-2">
        {/* iOS-mobile-only (renders null elsewhere): hang this exact piece,
            life-size, on the viewer's own wall via AR Quick Look. */}
        <ARButton variant="shared" className="w-full" />
        <div className="flex items-center gap-2">
          {designOwn}
          <Button
            type="button"
            variant="ghost"
            onClick={onDetails}
            className="h-11 rounded-full glass-surface px-4 text-sm text-slate-200 hover:bg-gray-900/50"
          >
            Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center rounded-full glass-surface px-2 py-1.5 shadow-xl">
      <Button
        type="button"
        variant="ghost"
        onClick={onCopy}
        aria-label="Copy link"
        className={cn(
          "h-9 gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
          copied
            ? "text-emerald-300 hover:bg-emerald-400/10 hover:text-emerald-200"
            : "text-slate-300 hover:bg-white/10 hover:text-white"
        )}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        <span>{copied ? "Link copied" : "Copy link"}</span>
      </Button>
    </div>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⏳ LOADING — preparing the gallery                                    ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function LoadingState({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="relative grid h-dvh w-full place-items-center overflow-hidden bg-[#b8b2a4]">
      {/* Warm vignette so the first paint already reads as "a room". */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,250,240,0.35),transparent_60%),radial-gradient(circle_at_50%_100%,rgba(0,0,0,0.28),transparent_55%)]"
      />
      <div className="absolute top-5 left-5 z-10">
        <BrandPill />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-3">
        <motion.span
          className="h-2.5 w-2.5 rounded-full bg-stone-700"
          animate={reducedMotion ? undefined : { opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <p className="text-sm font-medium text-stone-700">
          Hanging the piece…
        </p>
      </div>
    </div>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚠️ ERROR — gracious, conversion-positive                             ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function ErrorState({
  kind,
  onRetry,
}: {
  kind: ErrorKind;
  onRetry: () => void;
}) {
  const notFound = kind === "notfound";
  return (
    <div className="relative grid h-dvh w-full place-items-center overflow-hidden bg-[#b8b2a4] px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,250,240,0.3),transparent_60%),radial-gradient(circle_at_50%_100%,rgba(0,0,0,0.3),transparent_55%)]"
      />
      <div className="absolute top-5 left-5 z-10">
        <BrandPill />
      </div>
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-[rgba(22,19,16,0.72)] p-6 text-center shadow-2xl backdrop-blur-md">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-white/5 ring-1 ring-white/10">
          <ImageOff className="h-6 w-6 text-slate-300" />
        </div>
        <h1 className="font-serif text-xl text-white">
          {notFound ? "This piece isn't available" : "We couldn't load this piece"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {notFound
            ? "The shared link may have expired or been removed."
            : "Check your connection and try again."}
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          {!notFound && (
            <Button
              onClick={onRetry}
              className="bg-white/10 text-white hover:bg-white/15"
            >
              Try again
            </Button>
          )}
          <a
            href={BUILDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex h-10 items-center justify-center gap-2 rounded-md bg-indigo-600 px-5 text-sm font-medium text-white ring-1 ring-indigo-400/40 transition-colors hover:bg-indigo-500"
          >
            Design your own
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧮 HELPERS                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function titleCase(value: string | undefined | null): string {
  if (!value) return "";
  return value
    .toString()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function designName(selectedDesign: string): string {
  if (!selectedDesign || selectedDesign === ItemDesigns.Custom)
    return "Custom Piece";
  return titleCase(selectedDesign);
}

/**
 * Real-world size label, always in inches. `dimensions` are SQUARE COUNTS
 * (3″ per square), shown height-first to match the catalog convention
 * (e.g. 16×10 squares → `30" × 48"`).
 */
function sizeLabel(width: number, height: number): string {
  return sizeToInchLabel(`${width} x ${height}`);
}

/** Build the placard palette for both custom palettes and official designs. */
function buildPalette(
  selectedDesign: string,
  customPalette: { hex: string; name?: string; extraPercent?: number }[]
): PaletteColor[] {
  if (selectedDesign === ItemDesigns.Custom && customPalette.length > 0) {
    return customPalette.map((c, i) => ({
      hex: c.hex,
      name: c.name?.trim() || `Color ${i + 1}`,
      // extraPercent skews a color's share of the piece; absent → equal.
      weight: 1 + Math.max(0, c.extraPercent ?? 0) / 100,
    }));
  }
  const map = DESIGN_COLORS[selectedDesign as ItemDesigns];
  if (map) {
    return Object.values(map).map((c) => ({
      hex: c.hex,
      name: c.name,
      weight: 1,
    }));
  }
  return [];
}

/** A friendly relative date for the provenance footer. */
function relativeDate(dateString: string): string {
  const then = new Date(dateString).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "Shared today";
  if (days === 1) return "Shared yesterday";
  if (days < 30) return `Shared ${days} days ago`;
  return `Shared ${new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })}`;
}
