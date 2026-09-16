"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { nanoid } from "nanoid";
import { useCustomStore, type CustomColor } from "@/store/customStore";
import { PaletteManager } from "./components/PaletteManager";
import { PaletteList } from "./components/PaletteList";
import { ExistingPalettePicker } from "./components/ExistingPalettePicker";
import { OfficialPalettes } from "./components/OfficialPalettes";
import { ImageColorExtractor } from "./components/ImageColorExtractor";
import {
  DEFAULT_MIX_SOURCE,
  PaintMatchMixControls,
  type MixSource,
} from "./components/PaintMatchMixControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Save,
  Palette,
  Check,
  BookOpen,
  FolderIcon,
  Upload,
  Lightbulb,
  Loader2,
  Image as ImageIcon,
  BadgeCheck,
  Undo2,
  Redo2,
  Anchor,
  Hash,
  GitBranch,
  Printer,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { ImportCard } from "./components/PaletteList/ImportCard";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ANY_PAINT_BRAND,
  BRAND_OPTIONS,
  type BrandOption,
  type PaintColor,
  VERIFIED_BRANDS,
  VERIFIED_PAINT_COLORS,
  LOWES_MATCHES,
  LOWES_WITH_FALLBACK,
  configuredPaintMixAnchors,
  purchaseLabel,
} from "@/lib/paint";
import {
  DEFAULT_PAINT_MATCH_BRAND,
  LAB_LIGHTNESS_INDEX,
  findClosestPaintMatches,
  findGroundedPaintMatches,
  getGroundablePaintColors,
  getLowesFallbackPaintColors,
  paintPoolLabel,
  paintMatchPercent,
  paintSourceHexOf,
  paintSourceNameOf,
  type PaintLab,
  type PaintMatch,
  type ResolvedPaintLightnessMode,
} from "@/lib/paintMatch";
import { deltaE2000, hexToLab } from "@/lib/paintMixSimulator";
import { findBestPaintMix, type PaintMixRecipe } from "@/lib/paintMixOptimizer";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 BUTTON THEME                                                       ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// One shared shape + polish so every action button reads as a single
// family. Variants differ only by color, never by shape/shadow.
const BTN_BASE =
  "flex items-center gap-1.5 rounded-[10px] ring-1 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_3px_rgba(0,0,0,0.25)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_48%)] transition-all";

const BTN_PRIMARY = `${BTN_BASE} bg-blue-600 hover:bg-blue-500 ring-blue-400/40`;
const BTN_INSPIRE = `${BTN_BASE} bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 ring-indigo-400/40`;
const BTN_IMPORT = `${BTN_BASE} bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 ring-emerald-400/40`;
const BTN_SECONDARY =
  "flex items-center gap-1.5 rounded-[10px] ring-1 ring-purple-400/40 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 transition-all";
const PALETTE_PAGE_BACKGROUND =
  "min-h-[calc(100%+4rem)] -mb-16 w-full bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-3 sm:p-4 md:p-8";

// The palette studio stretches close to the viewport edges on desktop so
// the vertical color strips have room for their labels; only ultrawide
// monitors reach this cap.
const STUDIO_MAX_WIDTH_PX = 2400;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎯 PAINT MATCH                                                        ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const MATCH_LIST_START_INDEX = 0;
const PRIMARY_PAINT_MATCH_INDEX = 0;
const BACKUP_PAINT_MATCH_INDEX = 1;
const PAINT_MATCH_COUNT_WITH_BACKUP = 2;
const PAINT_MATCH_CANDIDATE_COUNT = 12;

// Remember which studio tab the user was on so a refresh returns to it
// instead of snapping back to the "official" default.
const ACTIVE_TAB_STORAGE_KEY = "palette-active-tab";
const PALETTE_TABS = ["create", "saved", "official", "extract"] as const;
type PaletteTab = (typeof PALETTE_TABS)[number];
const isPaletteTab = (v: unknown): v is PaletteTab =>
  typeof v === "string" && (PALETTE_TABS as readonly string[]).includes(v);
// A recipe of one paint is just "buy the can" — no mixing to show.
const SINGLE_COMPONENT_COUNT = 1;
// When mixing to get closer, which paints the recipe may draw from:
//  - "palette": only paints the palette itself resolves to, plus the
//    configured Tricorn Black and untinted-white anchors.
//  - "black-white": the nearest paint for this swatch, adjusted only with
//    configured Tricorn Black and untinted white.
//  - "purchase": any nearby purchasable paint, even ones not in the
//    palette — buys the closest possible match at the cost of extra cans.
// Independent keeps today's nearest-match behavior. The other modes keep
// every swatch on the same side of its source lightness so a gradient cannot
// split into one unexpectedly lighter paint and one unexpectedly darker one.
type PaintLightnessMode = "independent" | "auto" | "lighter" | "darker";
const DEFAULT_PAINT_LIGHTNESS_MODE: PaintLightnessMode = "auto";
// Digitally-mixed palette colors (a `mix` blend of two swatches) aren't a
// can the user buys, so by default their nearest-can approximation is NOT
// offered as a "palette" mix ingredient. Opt in to let blends contribute.
const DEFAULT_USE_MIXED_COLORS = false;
// One grounding request: which color pool, whether to also compute mix
// recipes, their source, and whether blended swatches may be ingredients.
type GroundSelection = {
  brand: BrandOption;
  mix: boolean;
  mixSource: MixSource;
  useMixedColors: boolean;
  lightnessMode: PaintLightnessMode;
};
// Let React paint the grounding spinner between colors (the spectral mix
// search is heavy enough to drop a frame per color otherwise).
const YIELD_DELAY_MS = 0;
const VERIFIED_BRAND_BADGE_LABEL = "Verified";
const PAINT_MATCH_HELP_TEXT =
  "All verified colors preserve verified source paints. Lowe's choices translate every color into the Lowe's pool. Quality is shown as ΔE 2000.";

const paintMatchKey = (match: PaintMatch) => purchaseLabel(match.paintColor);
const paintBrandPickerLabel = (brand: BrandOption) => paintPoolLabel(brand);

function VerifiedBrandBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
      <BadgeCheck className="h-3 w-3 text-emerald-300" />
      {VERIFIED_BRAND_BADGE_LABEL}
    </span>
  );
}

function PaintBrandOptionLabel({ brand }: { brand: BrandOption }) {
  // "Lowe's matches" pools Valspar + HGTV Home, both orderable, so it
  // earns the same "Verified" trust badge as the single verified brands.
  const verified =
    brand === VERIFIED_PAINT_COLORS ||
    brand === LOWES_MATCHES ||
    VERIFIED_BRANDS.has(brand);
  return (
    <span className="inline-flex items-center gap-2">
      <span>{paintBrandPickerLabel(brand)}</span>
      {verified && <VerifiedBrandBadge />}
    </span>
  );
}

// Auto-save names used when "Create Palette" rescues unsaved editor work
// before clearing it: a still-open palette keeps its own name, an unnamed
// draft gets a dated default so it's findable on the Saved tab.
const NEW_PALETTE_NAME_PREFIX = "Palette";
const UNTITLED_PALETTE_NAME = "Untitled";

export default function PalettePage() {
  const {
    customPalette,
    savePalette,
    activeTab,
    setActiveTab,
    editingPaletteId,
    resetPaletteEditor,
    savedPalettes,
    undoPaletteAction,
    redoPaletteAction,
    paletteHistory,
    paletteHistoryIndex,
    setCustomPalette,
    setHistoryPaletteId,
    setEditingPaletteId,
  } = useCustomStore();

  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [paletteName, setPaletteName] = useState("");
  const paletteNameInputRef = useRef<HTMLInputElement>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  // "Save Palette" dialog: create a brand-new palette, or attach this
  // in-progress palette to an existing one as its next version.
  const [saveMode, setSaveMode] = useState<"new" | "existing">("new");
  const [connectTargetId, setConnectTargetId] = useState("");
  const [connectSearchQuery, setConnectSearchQuery] = useState("");
  const connectSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSaveDialogOpen && saveMode === "existing") {
      connectSearchInputRef.current?.focus();
    }
  }, [isSaveDialogOpen, saveMode]);

  // On load, return to whichever tab the user last had open (persisted
  // per-browser). Only a genuinely fresh start — no remembered tab and no
  // work in progress — falls back to the "official" inspiration tab.
  const activeTabPersistArmed = useRef(false);
  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)
        : null;
    if (isPaletteTab(stored)) {
      setActiveTab(stored);
    } else if (customPalette.length === 0 && !editingPaletteId) {
      setActiveTab("official");
    }
    activeTabPersistArmed.current = true;
  }, []);

  // Remember the current tab (after the initial restore) so the next
  // refresh reopens it. Captures programmatic tab changes too.
  useEffect(() => {
    if (!activeTabPersistArmed.current) return;
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  // Paint color grounding
  const [allPaintColors, setAllPaintColors] = useState<PaintColor[]>([]);
  const [paintColorsLoaded, setPaintColorsLoaded] = useState(false);
  // Start with Lowe's-orderable matches and surface another brand when
  // Lowe's scores poorly. Choosing "Any brand" broadens the primary pool.
  const [groundBrand, setGroundBrand] = useState<BrandOption>(
    DEFAULT_PAINT_MATCH_BRAND
  );
  // Keep neighboring swatches from snapping in opposite lightness
  // directions. Auto chooses the lower-error shared direction per pass.
  const [paintLightnessMode, setPaintLightnessMode] =
    useState<PaintLightnessMode>(DEFAULT_PAINT_LIGHTNESS_MODE);
  // Default off: just buy the single nearest can. When on, also compute a
  // 2–3 paint mix recipe that lands even closer to each source color (the
  // heavier spectral search). Off keeps grounding fast + one-can-simple.
  const DEFAULT_MIX_TO_MATCH = false;
  const [mixToMatch, setMixToMatch] = useState(DEFAULT_MIX_TO_MATCH);
  // Only meaningful when mixToMatch is on: restrict mix ingredients to the
  // palette's own paints (+ white/black) or let it buy any nearby paint.
  const [mixSource, setMixSource] = useState<MixSource>(DEFAULT_MIX_SOURCE);
  // Only meaningful in "palette" mix mode: whether digitally-mixed swatches
  // may contribute their nearest can as an ingredient. Off by default so a
  // blend (already made from its two parents) never becomes a paint to mix
  // from.
  const [useMixedColors, setUseMixedColors] = useState(
    DEFAULT_USE_MIXED_COLORS
  );
  // True while a (re-)grounding pass runs — the mix optimizer is heavy,
  // so the convert button shows a spinner and controls lock.
  const [isGrounding, setIsGrounding] = useState(false);
  // Serialize grounding passes: a selection change mid-run is parked
  // here and replayed when the in-flight pass finishes, so the last
  // selection always wins without overlapping setState races.
  const groundingInFlightRef = useRef(false);
  const pendingGroundRef = useRef<GroundSelection | null>(null);
  // The color pool the palette is actually grounded to. Lets an
  // auto re-ground that lands on an empty pool snap the controls back, so
  // the dropdown never claims a brand the palette isn't grounded to.
  const lastGroundedSelectionRef = useRef<GroundSelection | null>(null);
  // Set when we revert the controls programmatically, so the resulting
  // brand change doesn't fire a redundant re-ground.
  const suppressReGroundRef = useRef(false);

  // 4×6 label print options — what to tell the paint counter. Printed in
  // the header so every color on the sheet is ordered at one sheen/size.
  const PAINT_SHEENS = [
    "Flat",
    "Matte",
    "Eggshell",
    "Satin",
    "Semi-Gloss",
    "High-Gloss",
  ] as const;
  const PAINT_SIZES = [
    "Sample (8 oz)",
    "Quart",
    "Gallon",
    "5 Gallon",
  ] as const;
  const DEFAULT_PRINT_SHEEN: (typeof PAINT_SHEENS)[number] = "Semi-Gloss";
  const PROGRAMMATIC_FOCUS_TAB_INDEX = -1;
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printSheen, setPrintSheen] =
    useState<(typeof PAINT_SHEENS)[number]>(DEFAULT_PRINT_SHEEN);
  const [printSize, setPrintSize] =
    useState<(typeof PAINT_SIZES)[number]>("Sample (8 oz)");
  const printDialogTitleRef = useRef<HTMLHeadingElement>(null);
  const isPalettePaintConverted =
    customPalette.length > 0 &&
    customPalette.every((color) => typeof color.paintMatch === "number");

  useEffect(() => {
     const loadPaintColors = async () => {
      try {
        const [
          behrResponse,
          sherwinResponse,
          valsparResponse,
          ppgResponse,
          benjaminMooreResponse,
          hgtvHomeResponse,
        ] = await Promise.all([
          fetch("/paints/behr/colors.json"),
          fetch("/paints/sherwin/colors.json"),
          fetch("/paints/valspar/colors.json"),
          fetch("/paints/ppg/colors.json"),
          fetch("/paints/benjamin_moore/colors.json"),
          // HGTV Home by Sherwin-Williams — the second Lowe's-exclusive
          // line, so "Lowe's matches" can draw from the whole Lowe's wall.
          fetch("/paints/hgtv_home/colors.json"),
        ]);

        const [
          behrColors,
          sherwinColors,
          valsparColors,
          ppgColors,
          benjaminMooreColors,
          hgtvHomeColors,
        ] = await Promise.all([
          behrResponse.json(),
          sherwinResponse.json(),
          valsparResponse.json(),
          ppgResponse.json(),
          benjaminMooreResponse.json(),
          hgtvHomeResponse.json(),
        ]);

        const combinedColors = [
          ...behrColors,
          ...sherwinColors,
          ...valsparColors,
          ...ppgColors,
          ...benjaminMooreColors,
          ...hgtvHomeColors,
        ];

        setAllPaintColors(combinedColors);
        setPaintColorsLoaded(true);
      } catch (error) {
        console.error("Error loading paint colors:", error);
      }
    };

    loadPaintColors();
  }, []);

  const resolvePaintLightnessMode = (
    requestedMode: PaintLightnessMode,
    palette: CustomColor[],
    paintLabs: PaintLab[]
  ): ResolvedPaintLightnessMode => {
    if (requestedMode !== "auto") return requestedMode;

    const totalDistance = (mode: "lighter" | "darker") =>
      palette.reduce((sum, color) => {
        const match = findClosestPaintMatches(
          paintSourceHexOf(color),
          paintLabs,
          PAINT_MATCH_COUNT_WITH_BACKUP,
          mode,
          paintSourceNameOf(color)
        )[PRIMARY_PAINT_MATCH_INDEX];
        return sum + (match?.distance ?? Number.POSITIVE_INFINITY);
      }, 0);

    return totalDistance("lighter") <= totalDistance("darker")
      ? "lighter"
      : "darker";
  };

  // Ground every palette color to the chosen brand pool. Idempotent:
  // always works from each color's source hex, so it can be re-run when
  // the color pool changes. Reads the live palette from the store so the
  // selection-change effect never grounds a stale copy.
  const runGrounding = async (selection: GroundSelection) => {
    const {
      brand,
      mix,
      mixSource: mixSrc,
      useMixedColors: useMixed,
      lightnessMode,
    } = selection;
    // A pass is already running — park this request and let the running
    // pass replay it when it finishes, so the last selection wins.
    if (groundingInFlightRef.current) {
      pendingGroundRef.current = selection;
      return;
    }

    const palette = useCustomStore.getState().customPalette;
    if (palette.length === 0) {
      toast.error("Palette is empty");
      return;
    }
    if (!paintColorsLoaded || allPaintColors.length === 0) {
      toast.error("Paint colors not loaded yet. Please wait a moment.");
      return;
    }

    // Only match colors the chosen store actually sells, and never
    // ground onto a discontinued color (available === false). Records
    // without an `available` flag (brands whose importer isn't built
    // yet) are kept so those brands still work.
    const pool = getGroundablePaintColors(allPaintColors, brand);
    if (pool.length === 0) {
      toast.error(
        `No purchasable ${paintPoolLabel(brand)} colors yet. Try "All colors".`,
      );
      // If the palette is already grounded, snap the controls back to the
      // brand it's actually grounded to so the dropdown doesn't lie.
      const lastGood = lastGroundedSelectionRef.current;
      if (lastGood && lastGood.brand !== brand) {
        suppressReGroundRef.current = true;
        setGroundBrand(lastGood.brand);
      }
      return;
    }

    groundingInFlightRef.current = true;
    setIsGrounding(true);
    try {
      // Convert every paint to LAB once up front instead of re-deriving
      // it for every palette color (was O(palette × paints) conversions).
      const paintLabs = pool.map((paintColor) => ({
        paintColor,
        lab: hexToLab(paintColor.hex),
      }));
      const fallbackPaintLabs =
        brand === LOWES_WITH_FALLBACK
          ? getLowesFallbackPaintColors(allPaintColors)
              .map((paintColor) => ({
                paintColor,
                lab: hexToLab(paintColor.hex),
              }))
          : [];
      const resolvedLightnessMode = resolvePaintLightnessMode(
        lightnessMode,
        palette,
        paintLabs
      );

      // Keep pool extremes as a fallback only. Normal recipes use the
      // physical anchors configured for this studio: SW 6258 Tricorn Black
      // and plain untinted white.
      const sortedByLightness = [...paintLabs].sort(
        (a, b) => a.lab[LAB_LIGHTNESS_INDEX] - b.lab[LAB_LIGHTNESS_INDEX]
      );
      const poolExtremeAnchors = [
        sortedByLightness[MATCH_LIST_START_INDEX].paintColor,
        sortedByLightness[sortedByLightness.length - 1].paintColor,
      ];
      const mixAnchors = configuredPaintMixAnchors(
        allPaintColors,
        poolExtremeAnchors,
      );

      // "Palette only" mix mode: the real paints the whole palette resolves
      // to (each color's single nearest can), deduped. These are the only
      // ingredients a recipe may draw from — so mixing never asks the user
      // to buy another color — plus the configured Tricorn/white anchors,
      // which stay available no matter what.
      //
      // Skip digitally-mixed colors (a `mix` blend of two other swatches)
      // unless the user opts in: a blend isn't a can they buy — its two
      // parents already supply the real paints — so by default its nearest-
      // can approximation isn't offered as an ingredient for mixing others.
      const palettePaintPool: PaintColor[] = [];
      if (mix && mixSrc === "palette") {
        const seenPalettePaint = new Set<string>();
        for (const customColor of palette) {
          if (customColor.mix && !useMixed) continue;
          const nearest = findClosestPaintMatches(
            paintSourceHexOf(customColor),
            paintLabs,
            PAINT_MATCH_COUNT_WITH_BACKUP,
            resolvedLightnessMode,
            paintSourceNameOf(customColor)
          )[PRIMARY_PAINT_MATCH_INDEX];
          if (!nearest) continue;
          const key = paintMatchKey(nearest);
          if (seenPalettePaint.has(key)) continue;
          seenPalettePaint.add(key);
          palettePaintPool.push(nearest.paintColor);
        }
      }

      const groundedColors: CustomColor[] = [];
      for (const customColor of palette) {
        const sourceHex = paintSourceHexOf(customColor);
        const matchSelection = findGroundedPaintMatches(
          customColor,
          paintLabs,
          fallbackPaintLabs,
          brand,
          PAINT_MATCH_CANDIDATE_COUNT,
          resolvedLightnessMode,
        );
        // Ground to the nearest paint allowed by the shared lightness rule.
        // Independent mode keeps the original smallest-ΔE behavior.
        const { matches, primaryMatch, backupMatch, lowesMatchIsPoor } =
          matchSelection;
        if (!primaryMatch) {
          groundedColors.push(customColor);
          continue;
        }

        // The closest ACHIEVABLE color: a 2–3 paint recipe (in integer
        // parts) that lands nearer the source than the single can. Only
        // computed when the user opts into mixing; otherwise we just buy
        // the nearest can. Kept only when it beats a single component.
        let paintMixRecipe: PaintMixRecipe | undefined;
        if (mix) {
          // "palette" mode mixes only from paints the palette already uses;
          // "black-white" starts with this swatch's nearest paint and may
          // adjust it only with Tricorn Black/untinted white; "purchase" mode
          // is free to buy any nearby paint.
          const sourceLab = hexToLab(sourceHex);
          let mixCandidates: PaintColor[];
          if (mixSrc === "palette") {
            mixCandidates = [...palettePaintPool].sort(
              (a, b) =>
                deltaE2000(sourceLab, hexToLab(a.hex)) -
                deltaE2000(sourceLab, hexToLab(b.hex))
            );
          } else if (mixSrc === "black-white") {
            mixCandidates = [primaryMatch.paintColor];
          } else {
            mixCandidates = matches.map((match) => match.paintColor);
          }
          const mixRecipe = findBestPaintMix(sourceHex, {
            candidates: mixCandidates,
            anchors: mixAnchors,
          });
          paintMixRecipe =
            mixRecipe && mixRecipe.components.length > SINGLE_COMPONENT_COUNT
              ? mixRecipe
              : undefined;
        }

        // Name carries the real purchase identifier — the manufacturer
        // code ("SW 6258 — Tricorn Black") when we have it, so it can be
        // searched/ordered at the counter, not just an ambiguous name.
        groundedColors.push({
          ...customColor,
          hex: primaryMatch.paintColor.hex,
          name: purchaseLabel(primaryMatch.paintColor),
          paintMatch: paintMatchPercent(primaryMatch.distance),
          paintMatchDeltaE: primaryMatch.distance,
          paintSourceHex: sourceHex,
          paintSourceName: paintSourceNameOf(customColor),
          paintBackup: backupMatch
            ? purchaseLabel(backupMatch.paintColor)
            : undefined,
          paintBackupMatch: backupMatch
            ? paintMatchPercent(backupMatch.distance)
            : undefined,
          paintBackupDeltaE: backupMatch?.distance,
          paintLowesWarning: lowesMatchIsPoor || undefined,
          paintMixRecipe,
        });
        // Yield so the spinner can paint between colors — the spectral
        // mix search is heavy enough to jank the frame otherwise.
        await new Promise((resolve) => setTimeout(resolve, YIELD_DELAY_MS));
      }

      setCustomPalette(groundedColors);
      lastGroundedSelectionRef.current = selection;
      const where = ` (${paintPoolLabel(brand)})`;
      const lightnessNote =
        resolvedLightnessMode === "independent"
          ? ""
          : ` · all ${resolvedLightnessMode}`;
      toast.success(
        `Grounded ${groundedColors.length} colors to paint matches${where}${lightnessNote}`
      );
    } finally {
      groundingInFlightRef.current = false;
      setIsGrounding(false);
    }

    // Replay the most recent selection change that arrived mid-run.
    const pending = pendingGroundRef.current;
    if (pending) {
      pendingGroundRef.current = null;
      void runGrounding(pending);
    }
  };

  const currentGroundSelection = (): GroundSelection => ({
    brand: groundBrand,
    mix: mixToMatch,
    mixSource,
    useMixedColors,
    lightnessMode: paintLightnessMode,
  });

  const groundPalette = () => {
    void runGrounding(currentGroundSelection());
  };

  // Re-ground automatically when the color pool, lightness, or mixing options
  // change while the palette is already converted — without this,
  // the controls silently do nothing after the first conversion (the source
  // of stale matches after changing the selected pool).
  const skipInitialReGroundRef = useRef(true);
  useEffect(() => {
    if (skipInitialReGroundRef.current) {
      skipInitialReGroundRef.current = false;
      return;
    }
    // Skip the change we triggered ourselves to revert an empty-pool pick.
    if (suppressReGroundRef.current) {
      suppressReGroundRef.current = false;
      return;
    }
    if (!isPalettePaintConverted) return;
    void runGrounding(currentGroundSelection());
    // runGrounding reads the live palette from the store and is stable
    // enough for this filter-change trigger; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    groundBrand,
    paintLightnessMode,
    mixToMatch,
    mixSource,
    useMixedColors,
  ]);

  const convertPaintPaletteToHex = () => {
    const restoredColors = customPalette.map((color) => {
      const {
        name: _paintName,
        paintMatch: _paintMatch,
        paintMatchDeltaE: _paintMatchDeltaE,
        paintBackup: _paintBackup,
        paintBackupMatch: _paintBackupMatch,
        paintBackupDeltaE: _paintBackupDeltaE,
        paintLowesWarning: _paintLowesWarning,
        paintMixRecipe: _paintMixRecipe,
        paintSourceHex,
        paintSourceName,
        ...rest
      } = color;
      void _paintName;
      void _paintMatch;
      void _paintMatchDeltaE;
      void _paintBackup;
      void _paintBackupMatch;
      void _paintBackupDeltaE;
      void _paintLowesWarning;
      void _paintMixRecipe;

      return {
        ...rest,
        hex: paintSourceHex ?? color.hex,
        ...(paintSourceName !== undefined ? { name: paintSourceName } : {}),
      };
    });

    setCustomPalette(restoredColors);
    toast.success("Converted palette back to hex");
  };

  //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
  //║ 🖨️ 4×6 PAINT LABEL PRINTOUT                                          ║
  //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

  // Standard 4"×6" label/photo stock — what you take to the paint counter.
  const LABEL_W_IN = 4;
  const LABEL_H_IN = 6;

  // Opens a print-ready window sized to a single 4×6 label listing every
  // palette color: swatch + purchase label (brand/code/name), so the
  // counter can tint straight from the printout.
  const printPaintLabels = () => {
    if (customPalette.length === 0) {
      toast.error("Palette is empty");
      return;
    }

    const esc = (s: string) =>
      s.replace(/[&<>"]/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)
      );

    const compactPaintLabel = (label: string) =>
      label
        .split(" — ")
        .map((part) => part.trim())
        .filter(Boolean)
        .join(" · ");
    const printPaintLabs = getGroundablePaintColors(
      allPaintColors,
      groundBrand,
    ).map((paintColor) => ({
      paintColor,
      lab: hexToLab(paintColor.hex),
    }));

    const rows = customPalette
      .map((c, i) => {
        // After "Convert to paint" the name is "Brand — code — name".
        // Keep the full purchase details on one bold line for the counter.
        const raw = c.name && c.name.trim() ? c.name.trim() : "";
        const primaryLabel = compactPaintLabel(raw || `Color ${i + 1}`);
        const printBackupMatch = c.paintBackup
          ? {
              label: c.paintBackup,
              deltaE: c.paintBackupDeltaE,
              legacyMatch: c.paintBackupMatch,
            }
          : c.paintLowesWarning
            ? null
            : (() => {
              const backupMatch = findClosestPaintMatches(
                c.hex,
                printPaintLabs,
                PAINT_MATCH_COUNT_WITH_BACKUP
              )[BACKUP_PAINT_MATCH_INDEX];
              return backupMatch
                ? {
                    label: purchaseLabel(backupMatch.paintColor),
                    deltaE: backupMatch.distance,
                    legacyMatch: undefined,
                  }
                : null;
              })();
        // Only the "Backup:" tag is struck through (marks it as the
        // fallback); the code + name + match stay clean so they're still
        // readable at the counter.
        const backupDetails = printBackupMatch
          ? `${compactPaintLabel(printBackupMatch.label)}${
              typeof printBackupMatch.deltaE === "number"
                ? ` (${paintMatchPercent(printBackupMatch.deltaE)}% match)`
                : typeof printBackupMatch.legacyMatch === "number"
                  ? ` (${printBackupMatch.legacyMatch}% match)`
                : ""
            }`
          : "";
        return `<li class="row">
          <span class="num">${i + 1}.</span>
          <span class="meta">
            <span class="name">${esc(primaryLabel)}</span>
            ${
              backupDetails
                ? `<span class="backup"><span class="${
                    c.paintLowesWarning ? "alternative-tag" : "backup-tag"
                  }">${
                    c.paintLowesWarning ? "Closest other brand:" : "Backup:"
                  }</span> ${esc(
                    backupDetails
                  )}</span>`
                : ""
            }
          </span>
        </li>`;
      })
      .join("");

    const html = `<!doctype html><html><head><meta charset="utf-8">
      <title>Paint shopping list</title>
      <style>
        @page { size: ${LABEL_W_IN}in ${LABEL_H_IN}in; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body { width: ${LABEL_W_IN}in; height: ${LABEL_H_IN}in;
          font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif;
          color: #000; padding: 0.22in; }
        h1 { font-size: 13pt; margin: 0 0 2pt; }
        .sub { font-size: 8pt; color: #000; margin: 0 0 8pt; }
        ul { list-style: none; margin: 0; padding: 0; }
        .row { display: flex; align-items: baseline; gap: 6pt;
          padding: 4pt 0; border-bottom: 0.75pt solid #000; }
        .num { font-size: 9pt; font-weight: 700; flex: none;
          min-width: 16pt; font-variant-numeric: tabular-nums; }
        .meta { display: flex; flex-direction: column; min-width: 0; }
        .name { font-size: 10pt; font-weight: 700; line-height: 1.25;
          word-break: break-word; }
        .backup { font-size: 7pt; color: #000; line-height: 1.2; }
        .backup-tag { text-decoration: line-through;
          text-decoration-thickness: 0.15pt; }
        .alternative-tag { font-weight: 700; }
        .order { font-size: 9.5pt; font-weight: 700; margin: 0 0 8pt;
          padding: 4pt 6pt; border: 1pt solid #000; border-radius: 3pt; }
      </style></head>
      <body>
        <h1>Paint shopping list</h1>
        <p class="sub">${customPalette.length} colors &middot; ${esc(
          new Date().toLocaleDateString()
        )}</p>
        <p class="order">Sheen: ${esc(printSheen)} &nbsp;|&nbsp; Size: ${esc(
          printSize
        )}</p>
        <ul>${rows}</ul>
      </body></html>`;

    // Print from a hidden in-page iframe instead of opening a window —
    // no pop-up/tab, the print dialog fires over the current page.
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.onload = () => {
      const win = frame.contentWindow;
      if (!win) return;
      win.focus();
      win.print();
      // Leave the frame long enough for the print dialog to read it.
      setTimeout(() => frame.remove(), 1000);
    };
    document.body.appendChild(frame);
    frame.srcdoc = html;
    setIsPrintDialogOpen(false);
  };

  // For import functionality
  const searchParams = useSearchParams();
  const router = useRouter();
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Manual import dialog (file / JSON / ID)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importDialogError, setImportDialogError] = useState("");
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [importById, setImportById] = useState(false);
  const [importIdValue, setImportIdValue] = useState("");

  // Use activeTab if set, otherwise default to 'official' to focus on inspiration first
  const defaultTab =
    activeTab === "create" ||
    activeTab === "saved" ||
    activeTab === "official" ||
    activeTab === "extract"
      ? activeTab
      : "official";

  // Handle import from URL parameters
  useEffect(() => {
    const paletteId = searchParams?.get("id");

    if (paletteId) {
      setImportLoading(true);
      setShowImportDialog(true);

      // Import palette logic
      async function importPalette() {
        try {
          // First check if the palette exists in the user's own saved palettes
          const localPalette = savedPalettes.find(
            (palette) => palette.id === paletteId
          );

          if (localPalette) {
            useCustomStore.setState({
              customPalette: localPalette.colors.map((color) => ({
                id: nanoid(),
                hex: color.hex,
                name: color.name || "",
              })),
              selectedColors: [],
            });

            setImportLoading(false);

            // Switch to the Create tab programmatically
            setActiveTab("create");

            // Clear the URL parameter
            router.replace("/palette", { scroll: false });

            toast.success(`Imported "${localPalette.name}" successfully!`);
            setTimeout(() => setShowImportDialog(false), 1500);
            return;
          }

          // If not found locally, try to fetch from the API
          const response = await fetch(`/api/palettes/${paletteId}`);

          if (!response.ok) {
            if (response.status === 404) {
              setImportError("Palette not found. Check the ID and try again.");
            } else if (response.status === 403) {
              setImportError("This palette is not shared publicly.");
            } else {
              setImportError("Failed to import palette. Please try again.");
            }
            setImportLoading(false);
            return;
          }

          const data = await response.json();

          if (
            !data.palette ||
            !data.palette.colors ||
            data.palette.colors.length === 0
          ) {
            setImportError("Invalid palette data received.");
            setImportLoading(false);
            return;
          }

          // Set the palette in the editor
          useCustomStore.setState({
            customPalette: data.palette.colors.map(
              (color: { hex: string; name?: string }) => ({
                id: nanoid(),
                hex: color.hex,
                name: color.name || "",
              })
            ),
            selectedColors: [],
          });

          // Switch to the Create tab
          setActiveTab("create");

          // Clear the URL parameter
          router.replace("/palette", { scroll: false });

          setImportLoading(false);
          toast.success(`Imported "${data.palette.name}" successfully!`);
          setTimeout(() => setShowImportDialog(false), 1500);
        } catch (error) {
          console.error("Error importing palette:", error);
          setImportError(
            "An unexpected error occurred. Please try again later."
          );
          setImportLoading(false);
        }
      }

      importPalette();
    }
  }, [searchParams, savedPalettes, setActiveTab, router]);

  // Warn before leaving/refreshing when there's an in-progress palette
  useEffect(() => {
    if (customPalette.length === 0) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () =>
      window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [customPalette.length]);

  // Add keyboard shortcut handlers
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only apply keyboard shortcuts when on the create tab
      if (activeTab !== "create") return;

      // Handle Ctrl+Z / Command+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const success = undoPaletteAction();
        if (success) {
          toast.info("Undo successful", {
            duration: 1500,
            position: "bottom-right",
          });
        }
      }

      // Handle Ctrl+Shift+Z / Command+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        const success = redoPaletteAction();
        if (success) {
          toast.info("Redo successful", {
            duration: 1500,
            position: "bottom-right",
          });
        }
      }
    }

    // Add event listener
    window.addEventListener("keydown", handleKeyDown);

    // Clean up
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeTab, undoPaletteAction, redoPaletteAction]);

  // Whether the open palette differs from its last saved version. Used to
  // block "Save Version" when nothing changed (saving would only stack an
  // identical version). Compares the editable color fields, ignoring the
  // volatile per-color `id` that loading may regenerate.
  const colorsSignature = (colors: CustomColor[]) =>
    JSON.stringify(
      colors.map(({ id, ...rest }) => rest)
    );
  const editingBasePalette = editingPaletteId
    ? savedPalettes.find((p) => p.id === editingPaletteId)
    : undefined;
  const hasUnsavedChanges =
    !editingBasePalette ||
    colorsSignature(customPalette) !==
      colorsSignature(editingBasePalette.colors);

  const handleSavePalette = () => {
    if (editingPaletteId) {
      // A palette is already open: save it under its existing name as
      // the next version. Stay in the editor so the user can keep
      // iterating — saving again just stacks another version.
      const existing = savedPalettes.find((p) => p.id === editingPaletteId);
      savePalette(existing?.name ?? paletteName ?? "Untitled");

      const versionNum = (existing?.versions?.length ?? 1) + 1;
      setSaveSuccess(true);
      toast.success(`Saved "${existing?.name ?? "palette"}" as version ${versionNum}`);
      setTimeout(() => setSaveSuccess(false), 1500);
    } else if (saveMode === "existing" && connectTargetId) {
      // Attach this in-progress palette to an existing one as its next
      // version. savePalette() keys off editingPaletteId, so connecting
      // first makes the save stack a version instead of forking a new
      // palette. Stay in the editor like the normal edit flow.
      const target = savedPalettes.find((p) => p.id === connectTargetId);
      setEditingPaletteId(connectTargetId);
      savePalette(target?.name ?? "Untitled");

      const versionNum = (target?.versions?.length ?? 1) + 1;
      setIsSaveDialogOpen(false);
      setSaveSuccess(true);
      toast.success(
        `Connected to "${target?.name ?? "palette"}" — saved as version ${versionNum}`
      );
      setTimeout(() => setSaveSuccess(false), 1500);
    } else {
      // Create the palette and keep it open so subsequent saves append
      // versions without making the user reload it from Saved Palettes.
      savePalette(paletteName);
      setIsSaveDialogOpen(false);
      toast.success(`Saved "${paletteName}"`);
    }
  };

  const handleConnectSearchQueryChange = (query: string) => {
    setConnectSearchQuery(query);
    setConnectTargetId("");
  };

  // "Create Palette" from the Saved tab = start a brand-new palette. Never
  // silently drop whatever is in the editor: save it first (an open palette
  // stacks a new version; an unsaved draft gets a dated auto-name), then
  // clear the editor and jump to the Custom tab with a blank canvas.
  const handleCreatePalette = () => {
    if (customPalette.length > 0 && hasUnsavedChanges) {
      const name = editingPaletteId
        ? savedPalettes.find((p) => p.id === editingPaletteId)?.name ??
          UNTITLED_PALETTE_NAME
        : `${NEW_PALETTE_NAME_PREFIX} ${new Date().toLocaleDateString()}`;
      savePalette(name);
      toast.success(`Saved "${name}" before starting a new palette`);
    }
    resetPaletteEditor();
    setActiveTab("create");
  };

  // Set initial palette name when editing
  useEffect(() => {
    if (editingPaletteId) {
      const palette = useCustomStore
        .getState()
        .savedPalettes.find((p) => p.id === editingPaletteId);
      if (palette) {
        setPaletteName(palette.name);
      }
    } else {
      // Reset palette name when not editing
      setPaletteName("");
    }
  }, [editingPaletteId]);

  // Manual import helpers (shared across tabs)
  const openImportDialog = () => {
    setIsImportDialogOpen(true);
    setImportText("");
    setImportDialogError("");
    setImportById(false);
    setImportIdValue("");
  };

  const parseTryColorsFormat = (text: string) => {
    try {
      const lines = text.split("\n");
      const colors: { hex: string; name: string }[] = [];

      let inPaletteDetails = false;

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine === "— Palette details:") {
          inPaletteDetails = true;
          continue;
        }

        if (inPaletteDetails) {
          const colorMatch = trimmedLine.match(
            /^(.+?)\s*\(#([0-9A-F]{6})\):/i
          );
          if (colorMatch) {
            const name = colorMatch[1].trim();
            const hex = `#${colorMatch[2].toUpperCase()}`;
            colors.push({ hex, name });
          }
        }
      }

      if (colors.length > 0) {
        return colors;
      }

      const fallbackColors: { hex: string; name: string }[] = [];
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.includes("#") && !trimmedLine.startsWith("—")) {
          const hexMatches = trimmedLine.match(/#([0-9A-F]{6})/gi);
          if (hexMatches) {
            for (const hex of hexMatches) {
              const formattedHex = hex.toUpperCase();
              if (
                !fallbackColors.some((color) => color.hex === formattedHex)
              ) {
                fallbackColors.push({
                  hex: formattedHex,
                  name: formattedHex,
                });
              }
            }
          }
        }
      }

      return fallbackColors.length > 0 ? fallbackColors : null;
    } catch (error) {
      console.error("Error parsing TryColors format:", error);
      return null;
    }
  };

  const handleImportPalette = () => {
    try {
      let importData: any;

      try {
        importData = JSON.parse(importText);
      } catch {
        const tryColorsPalette = parseTryColorsFormat(importText);
        if (tryColorsPalette) {
          importData = { colors: tryColorsPalette };
        } else {
          setImportDialogError(
            "Invalid format. Please provide valid JSON or TryColors format."
          );
          return;
        }
      }

      const colorsArray = Array.isArray(importData)
        ? importData
        : importData.colors;

      if (!colorsArray || !Array.isArray(colorsArray)) {
        setImportDialogError(
          "Invalid palette format. Expected an array of colors or an object with a colors array."
        );
        return;
      }

      const validColors = colorsArray.filter((color: any) => {
        if (!color.hex) return false;
        return /^#([0-9A-F]{3}){1,2}$/i.test(color.hex);
      });

      if (validColors.length === 0) {
        setImportDialogError("No valid colors found in the imported data.");
        return;
      }

      const paletteName =
        importData.name ||
        `Imported Palette ${new Date().toLocaleDateString()}`;

      useCustomStore.setState({
        customPalette: validColors.map((color: any) => ({
          id: nanoid(),
          hex: color.hex,
          name: color.name || "",
        })),
        selectedColors: [],
      });

      setIsImportDialogOpen(false);
      setImportText("");
      setImportDialogError("");
      toast.success(`Imported ${validColors.length} colors successfully!`);
      setActiveTab("create");
    } catch (error) {
      setImportDialogError(
        "An error occurred while importing the palette. Please try again."
      );
      console.error("Import error:", error);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileContent = event.target?.result as string;
        setImportText(fileContent);
        setImportDialogError("");
      } catch (error) {
        setImportDialogError("Failed to read the file.");
        console.error("File read error:", error);
      }
    };
    reader.readAsText(file);
  };

  const handleImportById = async (id: string) => {
    try {
      setIsImportLoading(true);

      // Check if the palette exists in the user's own saved palettes
      const localPalette = savedPalettes.find((palette) => palette.id === id);

      if (localPalette) {
        useCustomStore.setState({
          customPalette: localPalette.colors.map((color) => ({
            id: nanoid(),
            hex: color.hex,
            name: color.name || "",
          })),
          selectedColors: [],
        });

        setActiveTab("create");
        toast.success(
          `Imported "${localPalette.name}" from your palettes!`
        );
        return;
      }

      // If not found locally, try to fetch from the API
      const response = await fetch(`/api/palettes/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Palette not found. Check the ID and try again.");
        } else if (response.status === 403) {
          toast.error("This palette is not shared publicly.");
        } else {
          toast.error("Failed to import palette. Please try again.");
        }
        return;
      }

      const data = await response.json();

      if (!data.palette || !data.palette.colors || data.palette.colors.length === 0) {
        toast.error("Invalid palette data received.");
        return;
      }

      useCustomStore.setState({
        customPalette: data.palette.colors.map(
          (color: { hex: string; name?: string }) => ({
            id: nanoid(),
            hex: color.hex,
            name: color.name || "",
          })
        ),
        selectedColors: [],
      });

      setActiveTab("create");
      toast.success(`Imported "${data.palette.name}" successfully!`);
    } catch (error) {
      console.error("Error importing palette by ID:", error);
      toast.error("Failed to import palette. Please try again.");
    } finally {
      setIsImportLoading(false);
    }
  };

  const handleImportIdFromDialog = async () => {
    if (!importIdValue.trim()) return;
    await handleImportById(importIdValue.trim());
    setImportIdValue("");
    setIsImportDialogOpen(false);
  };

  const handleImport = () => {
    openImportDialog();
  };

  const handleUndoAction = () => {
    const success = undoPaletteAction();
    if (success) {
      toast.info("Undo successful", {
        duration: 1500,
        position: "bottom-right",
      });
    }
  };

  const handleRedoAction = () => {
    const success = redoPaletteAction();
    if (success) {
      toast.info("Redo successful", {
        duration: 1500,
        position: "bottom-right",
      });
    }
  };

  return (
    <div className={PALETTE_PAGE_BACKGROUND}>
      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {importLoading
                ? "Importing Palette..."
                : importError
                ? "Import Failed"
                : "Palette Imported!"}
            </DialogTitle>
            <DialogDescription>
              {importLoading
                ? "Please wait while we import your palette..."
                : importError
                ? importError
                : "Your palette has been successfully imported and is ready to use."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center py-6">
            {importLoading ? (
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-16 h-16 text-blue-300 animate-spin" />
                <p className="text-sm text-slate-400">
                  Loading palette data...
                </p>
              </div>
            ) : importError ? (
              <Button
                onClick={() => setShowImportDialog(false)}
                className="bg-gray-200 dark:bg-gray-700 text-slate-200 hover:bg-gray-300 dark:hover:bg-gray-600 px-8 py-2"
              >
                Close
              </Button>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-sky-500 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Import Dialog (file / JSON / ID) */}
      {isImportDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg border-2 border-white/10 bg-gray-900 p-4 shadow-2xl sm:p-6"
          >
            <h3 className="text-xl font-bold text-white mb-2">
              Import Palette
            </h3>

            {/* Tab navigation */}
            <div className="flex mb-4 border-b border-white/10">
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  !importById
                    ? "border-b-2 border-blue-500 text-white"
                    : "text-slate-400"
                }`}
                onClick={() => setImportById(false)}
              >
                File/JSON
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  importById
                    ? "border-b-2 border-blue-500 text-white"
                    : "text-slate-400"
                }`}
                onClick={() => setImportById(true)}
              >
                Import by ID
              </button>
            </div>

            <div className="space-y-4">
              {importById ? (
                <div className="space-y-4">
                  <p className="text-slate-400">
                    Enter a palette ID that was shared with you to import it
                    directly.
                  </p>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                      Palette ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={importIdValue}
                        onChange={(e) => setImportIdValue(e.target.value)}
                        placeholder="Enter palette ID"
                        className="min-w-0 flex-1 rounded-md border border-white/10 bg-gray-900 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-xs text-slate-400">
                      IDs are unique identifiers for shared palettes.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-slate-400">
                    Paste JSON data or upload a palette file (.evpal or .json or
                    .palette)
                  </p>

                  <div className="space-y-2">
                    <textarea
                      className="h-40 w-full rounded-md border border-white/10 bg-gray-800/40 p-3 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder='Paste JSON here, e.g. [{"hex":"#ff0000","name":"Red"},{"hex":"#00ff00","name":"Green"}] or TryColors format'
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                    />
                    {importDialogError && (
                      <p className="text-sm text-red-500">{importDialogError}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="dropzone-file"
                      className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-gray-800/40 border-white/10 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-slate-400" />
                        <p className="mb-1 text-sm text-slate-400">
                          <span className="font-semibold">Click to upload</span>{" "}
                          or drag and drop
                        </p>
                        <p className="text-xs text-slate-400">
                          JSON or EVPAL or Palette files
                        </p>
                      </div>
                      <input
                        id="dropzone-file"
                        type="file"
                        className="hidden"
                        accept=".json,.palette,.evpal"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(false)}
                className="sm:order-1"
              >
                Cancel
              </Button>
              <Button
                onClick={
                  importById ? handleImportIdFromDialog : handleImportPalette
                }
                disabled={
                  importById
                    ? !importIdValue.trim()
                    : !importText.trim() || isImportLoading
                }
                className={`${BTN_PRIMARY} sm:order-2`}
              >
                {isImportLoading ? "Importing..." : "Import Palette"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <div
        style={{ maxWidth: STUDIO_MAX_WIDTH_PX }}
        className="mx-auto flex h-full w-full min-h-0 flex-col gap-6"
      >

        {/* Main Content */}
        <Tabs
          defaultValue={defaultTab}
          className="flex min-h-0 w-full flex-1 flex-col"
          value={activeTab}
          onValueChange={(value) => {
            // The Create tab is just where the in-progress palette lives.
            // Navigating to it should always return the user to their work
            // intact — never reset or prompt on tab navigation.
            setActiveTab(value as "create" | "saved" | "official" | "extract");
          }}
        >
          <div className="mb-6 flex shrink-0 items-center justify-between">
            <TabsList className="grid w-full grid-cols-4 sm:max-w-md">
              <TabsTrigger
                value="create"
                className="px-2 text-xs data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-200 sm:text-sm"
              >
                <div className="flex items-center gap-2">
                  <span>Custom</span>
                </div>
              </TabsTrigger>

              <TabsTrigger
                value="saved"
                className="px-2 text-xs data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-200 sm:text-sm"
              >
                <div className="flex items-center gap-2">
                  <Palette className="hidden h-4 w-4 sm:block" />
                  <span>Saved</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="official"
                className="group px-2 text-xs data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-200 sm:text-sm"
              >
                <div className="flex items-center gap-2 relative">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-sky-500/20 to-blue-500/10 rounded-sm opacity-0 group-hover:opacity-100 -z-10"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{
                      opacity: [0.1, 0.8, 0.1],
                      scale: [0.98, 1.02, 0.98],
                      background: [
                        "linear-gradient(90deg, rgba(192,132,252,0.1) 0%, rgba(244,114,182,0.2) 20%, rgba(192,132,252,0.1) 40%)",
                        "linear-gradient(90deg, rgba(192,132,252,0.1) 60%, rgba(244,114,182,0.2) 80%, rgba(192,132,252,0.1) 100%)",
                        "linear-gradient(90deg, rgba(192,132,252,0.1) 0%, rgba(244,114,182,0.2) 20%, rgba(192,132,252,0.1) 40%)",
                      ],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                      repeatType: "loop",
                      ease: "easeInOut",
                    }}
                  />
                  <BookOpen className="hidden h-4 w-4 transition-colors duration-300 group-hover:text-blue-400 dark:group-hover:text-blue-300 sm:block" />
                  <motion.span
                    className="group-hover:text-blue-400 dark:group-hover:text-blue-300 transition-colors duration-300"
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    Official
                  </motion.span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="extract"
                className="px-2 text-xs data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-200 sm:text-sm"
              >
                <div className="flex items-center gap-2">
                  <ImageIcon className="hidden h-4 w-4 sm:block" />
                  <span>Photo</span>
                </div>
              </TabsTrigger>
            </TabsList>

            {/* Integrated inspiration/creation/import buttons based on active tab */}
            {activeTab === "create" ? (
              <div className="hidden md:flex gap-2">
                <Button
                  onClick={() => setActiveTab("official")}
                  className={`${BTN_INSPIRE} text-xs`}
                  size="sm"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  Get Inspired
                </Button>
                <Button
                  onClick={handleImport}
                  className={`${BTN_IMPORT} text-xs`}
                  size="sm"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Import
                </Button>
              </div>
            ) : activeTab === "saved" ? (
              <div className="hidden md:flex gap-2">
                <Button
                  onClick={() => setActiveTab("official")}
                  className={`${BTN_INSPIRE} text-xs`}
                  size="sm"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  Get Inspired
                </Button>
                <Button
                  onClick={handleCreatePalette}
                  className={`${BTN_PRIMARY} text-xs`}
                  size="sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Palette
                </Button>
                <Button
                  onClick={handleImport}
                  className={`${BTN_IMPORT} text-xs`}
                  size="sm"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Import
                </Button>
              </div>
            ) : activeTab === "extract" ? (
              <div className="hidden md:flex gap-2">
                <Button
                  onClick={() => setActiveTab("create")}
                  className={`${BTN_PRIMARY} text-xs`}
                  size="sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Palette
                </Button>
                <Button
                  onClick={() => setActiveTab("official")}
                  className={`${BTN_INSPIRE} text-xs`}
                  size="sm"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  Get Inspired
                </Button>
                <Button
                  onClick={handleImport}
                  className={`${BTN_IMPORT} text-xs`}
                  size="sm"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Import
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex gap-2">
                <Button
                  onClick={() => setActiveTab("create")}
                  className={`${BTN_PRIMARY} text-xs`}
                  size="sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Palette
                </Button>
                <Button
                  onClick={handleImport}
                  className={`${BTN_IMPORT} text-xs`}
                  size="sm"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Import
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="create" className="mt-0 min-h-0 flex-1">
            {/* Optional mobile inspiration button */}
            <div className="flex md:hidden justify-end mb-2 gap-2">
              <Button
                onClick={() => setActiveTab("extract")}
                className={`${BTN_PRIMARY} text-xs`}
                size="sm"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Photo
              </Button>
              <Button
                onClick={() => setActiveTab("official")}
                className={`${BTN_INSPIRE} text-xs`}
                size="sm"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                Inspire
              </Button>
              <Button
                onClick={handleImport}
                className={`${BTN_IMPORT} text-xs`}
                size="sm"
              >
                <Upload className="h-3.5 w-3.5" />
                Import
              </Button>
            </div>

            {customPalette.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-4 rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-950/40 via-gray-900 to-gray-900 p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_8px_rgba(0,0,0,0.25)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-blue-600/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.10)]">
                      <Anchor className="h-4 w-4 text-white" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Match to real paint
                      </h3>
                      <p className="mt-0.5 max-w-md text-xs text-slate-400">
                        {PAINT_MATCH_HELP_TEXT}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={groundBrand}
                      disabled={!paintColorsLoaded || isGrounding}
                      onValueChange={(value) =>
                        setGroundBrand(value as BrandOption)
                      }
                    >
                      <SelectTrigger
                        aria-label="Ground to which paint brand"
                        className="h-9 w-full sm:w-auto sm:min-w-56 rounded-[10px] border-white/10 bg-gray-900/80 text-slate-200 focus:ring-blue-500 [&>span]:flex [&>span]:items-center [&>span]:gap-2 [&>span]:line-clamp-none"
                        title="Lowe's choices translate source colors into the Lowe's paint pool"
                      >
                        <SelectValue
                          placeholder={paintPoolLabel(ANY_PAINT_BRAND)}
                        />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-gray-950 text-slate-100">
                        {BRAND_OPTIONS.map((brand) => (
                          <SelectItem
                            key={brand}
                            value={brand}
                            textValue={paintBrandPickerLabel(brand)}
                            className="focus:bg-blue-500/15 focus:text-white"
                          >
                            <PaintBrandOptionLabel brand={brand} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={paintLightnessMode}
                      disabled={!paintColorsLoaded || isGrounding}
                      onValueChange={(value) =>
                        setPaintLightnessMode(value as PaintLightnessMode)
                      }
                    >
                      <SelectTrigger
                        aria-label="How paint matches may shift in lightness"
                        className="h-9 w-auto min-w-56 rounded-[10px] border-white/10 bg-gray-900/80 text-slate-200 focus:ring-blue-500"
                        title="Keep blended colors from matching in opposite lighter/darker directions"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-gray-950 text-slate-100">
                        <SelectItem value="independent">
                          Lightness: independent
                        </SelectItem>
                        <SelectItem value="auto">
                          Lightness: same direction (auto)
                        </SelectItem>
                        <SelectItem value="lighter">
                          Lightness: all lighter
                        </SelectItem>
                        <SelectItem value="darker">
                          Lightness: all darker
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <PaintMatchMixControls
                      mixToMatch={mixToMatch}
                      mixSource={mixSource}
                      useMixedColors={useMixedColors}
                      disabled={!paintColorsLoaded || isGrounding}
                      onMixToMatchChange={setMixToMatch}
                      onMixSourceChange={setMixSource}
                      onUseMixedColorsChange={setUseMixedColors}
                    />
                    {isGrounding ? (
                      <Button
                        className={BTN_PRIMARY}
                        disabled
                        title="Matching colors to paint…"
                      >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Matching…
                      </Button>
                    ) : isPalettePaintConverted ? (
                      <Button
                        onClick={convertPaintPaletteToHex}
                        className={BTN_PRIMARY}
                        title="Restore the original hex colors"
                      >
                        <Hash className="w-4 h-4" />
                        Convert to hex
                      </Button>
                    ) : (
                      <Button
                        onClick={groundPalette}
                        className={BTN_PRIMARY}
                        disabled={!paintColorsLoaded}
                        title="Convert palette colors to paint matches"
                      >
                        <Anchor className="w-4 h-4" />
                        Convert to paint
                      </Button>
                    )}
                    <Dialog
                      open={isPrintDialogOpen}
                      onOpenChange={setIsPrintDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          className={BTN_SECONDARY}
                          title="Print a 4×6 label of every color to take to the store"
                        >
                          <Printer className="w-4 h-4" />
                          Print 4×6 label
                        </Button>
                      </DialogTrigger>
                      <DialogContent
                        className="sm:max-w-md"
                        onOpenAutoFocus={(event) => {
                          event.preventDefault();
                          printDialogTitleRef.current?.focus();
                        }}
                      >
                        <DialogHeader>
                          <DialogTitle
                            ref={printDialogTitleRef}
                            tabIndex={PROGRAMMATIC_FOCUS_TAB_INDEX}
                          >
                            Print paint label
                          </DialogTitle>
                          <DialogDescription>
                            Pick the sheen and can size to print on the 4×6
                            label for all {customPalette.length} colors.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                          <div className="space-y-2">
                            <Label htmlFor="print-sheen">Sheen</Label>
                            <select
                              id="print-sheen"
                              value={printSheen}
                              onChange={(e) =>
                                setPrintSheen(
                                  e.target
                                    .value as (typeof PAINT_SHEENS)[number]
                                )
                              }
                              className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200"
                            >
                              {PAINT_SHEENS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="print-size">Can size</Label>
                            <select
                              id="print-size"
                              value={printSize}
                              onChange={(e) =>
                                setPrintSize(
                                  e.target
                                    .value as (typeof PAINT_SIZES)[number]
                                )
                              }
                              className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200"
                            >
                              {PAINT_SIZES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsPrintDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            className={BTN_PRIMARY}
                            onClick={printPaintLabels}
                          >
                            <Printer className="w-4 h-4" />
                            Print
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </motion.section>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="bg-gray-900 border border-white/10 rounded-2xl shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-bold text-white">
                    {editingPaletteId
                      ? `Edit Palette: ${paletteName}`
                      : "Palette Designer"}
                  </CardTitle>
                  <CardDescription>
                    {editingPaletteId
                      ? "Edit your existing palette"
                      : "Create and customize your color palette"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PaletteManager />
                </CardContent>
                <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <div className="flex items-center gap-2">
                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleUndoAction}
                        disabled={paletteHistoryIndex <= 0}
                        title="Undo (Ctrl/⌘+Z)"
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleRedoAction}
                        disabled={
                          paletteHistoryIndex >= paletteHistory.length - 1
                        }
                        title="Redo (Ctrl/⌘+Shift+Z)"
                      >
                        <Redo2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                    <span className="text-xs text-slate-400 ml-1 hidden sm:inline-block">
                      Keyboard shortcuts: Ctrl/⌘+Z (Undo), Ctrl/⌘+Shift+Z
                      (Redo)
                    </span>
                  </div>
                  {editingPaletteId ? (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      <span className="text-sm text-slate-400 tabular-nums">
                        {customPalette.length}{" "}
                        {customPalette.length === 1 ? "color" : "colors"}
                      </span>
                      {saveSuccess && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-green-600 dark:text-green-400 flex items-center gap-1"
                        >
                          <Check className="h-4 w-4" />
                          <span>New version saved!</span>
                        </motion.div>
                      )}
                      {editingPaletteId && (
                        <Button
                          className={BTN_SECONDARY}
                          onClick={() =>
                            setHistoryPaletteId(editingPaletteId)
                          }
                        >
                          <GitBranch className="mr-2 h-4 w-4" />
                          Version History
                        </Button>
                      )}
                      <Button
                        className={BTN_PRIMARY}
                        disabled={
                          customPalette.length === 0 ||
                          saveSuccess ||
                          !hasUnsavedChanges
                        }
                        onClick={handleSavePalette}
                        title={
                          !hasUnsavedChanges
                            ? "No changes to save since the last version"
                            : undefined
                        }
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save Version
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      <span className="text-sm text-slate-400 tabular-nums">
                        {customPalette.length}{" "}
                        {customPalette.length === 1 ? "color" : "colors"}
                      </span>
                      <Dialog
                        open={isSaveDialogOpen}
                        onOpenChange={(open) => {
                          setIsSaveDialogOpen(open);
                          if (open) {
                            // Always start on "new"; the user explicitly
                            // opts in to connecting to an existing palette.
                            setSaveMode("new");
                            setConnectTargetId("");
                            setConnectSearchQuery("");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                        <Button
                          className={BTN_PRIMARY}
                          disabled={customPalette.length === 0}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Save Palette
                        </Button>
                      </DialogTrigger>
                      <DialogContent
                        className="sm:max-w-md"
                        onOpenAutoFocus={(event) => {
                          event.preventDefault();
                          paletteNameInputRef.current?.focus();
                        }}
                      >
                        <DialogHeader>
                          <DialogTitle>Save Palette</DialogTitle>
                          <DialogDescription>
                            Save as a new palette, or connect it to an
                            existing one as its next version.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          {/* Mode toggle */}
                          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-800/60 p-1">
                            <button
                              type="button"
                              onClick={() => setSaveMode("new")}
                              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                saveMode === "new"
                                  ? "bg-blue-600 text-white"
                                  : "text-slate-300 hover:text-white"
                              }`}
                            >
                              New palette
                            </button>
                            <button
                              type="button"
                              onClick={() => setSaveMode("existing")}
                              disabled={savedPalettes.length === 0}
                              title={
                                savedPalettes.length === 0
                                  ? "You have no saved palettes yet"
                                  : undefined
                              }
                              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                saveMode === "existing"
                                  ? "bg-blue-600 text-white"
                                  : "text-slate-300 hover:text-white"
                              }`}
                            >
                              Add to existing
                            </button>
                          </div>

                          {saveMode === "new" ? (
                            <div className="space-y-2">
                              <Label htmlFor="palette-name">
                                Palette Name
                              </Label>
                              <Input
                                ref={paletteNameInputRef}
                                id="palette-name"
                                placeholder="My Awesome Palette"
                                value={paletteName}
                                onChange={(e) =>
                                  setPaletteName(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Enter" &&
                                    paletteName.trim()
                                  ) {
                                    e.preventDefault();
                                    handleSavePalette();
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <ExistingPalettePicker
                                palettes={savedPalettes}
                                query={connectSearchQuery}
                                selectedId={connectTargetId}
                                searchInputRef={connectSearchInputRef}
                                onQueryChange={
                                  handleConnectSearchQueryChange
                                }
                                onSelect={setConnectTargetId}
                              />
                              <p className="text-xs text-slate-400">
                                Saves these colors as the next version of
                                the chosen palette.
                              </p>
                            </div>
                          )}

                          <div className="flex h-8 w-full rounded-md overflow-hidden">
                            {customPalette.map((color, index) => (
                              <div
                                key={color.id || `${color.hex}-${index}`}
                                className="flex-1 h-full"
                                style={{ backgroundColor: color.hex }}
                                title={color.name || color.hex}
                              />
                            ))}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsSaveDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            className={BTN_PRIMARY}
                            onClick={handleSavePalette}
                            disabled={
                              saveMode === "new"
                                ? !paletteName.trim()
                                : !connectTargetId
                            }
                          >
                            {saveMode === "new"
                              ? "Save Palette"
                              : "Save as New Version"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="extract" className="mt-0 min-h-0 flex-1">
            <div className="flex md:hidden justify-end mb-2">
              <Button
                onClick={() => setActiveTab("create")}
                className={`${BTN_PRIMARY} text-xs mr-2`}
                size="sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Create
              </Button>
              <Button
                onClick={() => setActiveTab("official")}
                className={`${BTN_INSPIRE} text-xs`}
                size="sm"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                Inspire
              </Button>
              <Button
                onClick={handleImport}
                className={`${BTN_IMPORT} text-xs ml-2`}
                size="sm"
              >
                <Upload className="h-3.5 w-3.5" />
                Import
              </Button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              <ImageColorExtractor />
            </motion.div>
          </TabsContent>

          <TabsContent value="saved" className="mt-0 min-h-0 flex-1">
            {/* Mobile action buttons */}
            <div className="flex md:hidden justify-end gap-2 mb-2">
              <Button
                onClick={handleCreatePalette}
                className={`${BTN_PRIMARY} text-xs`}
                size="sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Create
              </Button>
              <Button
                onClick={() => setActiveTab("extract")}
                className={`${BTN_PRIMARY} text-xs`}
                size="sm"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Photo
              </Button>
              <Button
                onClick={() => setActiveTab("official")}
                className={`${BTN_INSPIRE} text-xs`}
                size="sm"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                Inspire
              </Button>
              <Button
                onClick={handleImport}
                className={`${BTN_IMPORT} text-xs`}
                size="sm"
              >
                <Upload className="h-3.5 w-3.5" />
                Import
              </Button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              {savedPalettes.length > 0 ? (
                <PaletteList
                  onOpenImport={handleImport}
                  onImportById={handleImportById}
                />
              ) : (
                <div className="mt-10 flex flex-col items-center justify-center text-center">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
                    <div className="border border-dashed border-white/10 rounded-lg p-6 flex flex-col items-center justify-center bg-white/50 dark:bg-gray-800/20 hover:bg-white dark:hover:bg-gray-800/30 transition-colors">
                      <div className="w-16 h-16 rounded-full bg-blue-500/10 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                        <FolderIcon className="h-8 w-8 text-blue-300" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-2">
                        No Saved Palettes
                      </h3>
                      <p className="text-slate-400 text-sm mb-4">
                        Create and save your custom color palettes to see them
                        here
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCreatePalette}
                      >
                        Create New Palette
                      </Button>
                    </div>

                    <div className="border border-dashed border-white/10 rounded-lg overflow-hidden bg-white/50 dark:bg-gray-800/20 hover:bg-white dark:hover:bg-gray-800/30 transition-colors">
                      <div className="p-6 flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                          <Upload className="h-8 w-8 text-blue-300" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-2">
                          Import Palette
                        </h3>
                        <p className="text-slate-400 text-sm mb-4 text-center">
                          Import color palettes from file or JSON
                        </p>
                      </div>
                      <div className="px-4 pb-4 w-full">
                        <ImportCard
                          onImport={handleImport}
                          onIdImport={handleImportById}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Small inspiration hint */}
                  <div className="mt-8 text-sm text-slate-400 flex items-center gap-2 justify-center">
                    <Lightbulb className="h-4 w-4 text-blue-300" />
                    <span>Need inspiration?</span>
                    <button
                      onClick={() => setActiveTab("official")}
                      className="text-blue-300 hover:underline font-medium"
                    >
                      Browse official palettes
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="official" className="mt-0 min-h-0 flex-1">
            {/* Mobile creation button */}
            <div className="flex md:hidden justify-end gap-2 mb-2">
              <Button
                onClick={() => setActiveTab("create")}
                className={`${BTN_PRIMARY} text-xs`}
                size="sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Create
              </Button>
              <Button
                onClick={() => setActiveTab("extract")}
                className={`${BTN_PRIMARY} text-xs`}
                size="sm"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Photo
              </Button>
              <Button
                onClick={handleImport}
                className={`${BTN_IMPORT} text-xs`}
                size="sm"
              >
                <Upload className="h-3.5 w-3.5" />
                Import
              </Button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              <OfficialPalettes />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
