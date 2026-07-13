import { create } from "zustand";
import { ItemDesigns, Dimensions } from "@/typings/types";
import { calculatePrice, PriceBreakdown } from "@/lib/pricing";
import { blendHexColors } from "@/lib/colorUtils";
import {
  simulatePaintLikeMix,
  type HandMixSimulation,
} from "@/lib/paintMixSimulator";
import { type PaintMixRecipe } from "@/lib/paintMixOptimizer";
import { GRAMS_PER_SQUARE } from "@/app/palette/components/PaletteManager/paintEstimate";
import { DESIGN_COLORS } from "@/typings/color-maps";
import { createStore } from "zustand/vanilla";
import { createWithEqualityFn } from "zustand/traditional";
import {
  generateShareableUrl,
  extractStateFromUrl,
  generateShortShareableUrl,
  extractStateFromShortUrl,
} from "@/lib/urlUtils";
import { subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import { DEFAULT_WOOD_STYLE_ID } from "@/components/preview/woodStyles";
import { DEFAULT_WALL_COLOR } from "@/components/preview/wallColors";
import { nanoid } from "nanoid";

const DEFAULT_DEBOUNCE_DELAY_MS = 1_000;
const STORE_PERSISTENCE_DEBOUNCE_MS = 2_000;
const STORE_PERSISTENCE_INTERVAL_MS = 30_000;
const DEFAULT_SCATTER_EASE = 50;
const DEFAULT_SCATTER_WIDTH = 10;
const DEFAULT_SCATTER_AMOUNT = 50;
const DEFAULT_USE_MINI = false;

// Add debounce utility function
const debounce = <Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms = DEFAULT_DEBOUNCE_DELAY_MS
) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
};

export type ShippingSpeed = "standard" | "expedited" | "rushed";
export type ColorPattern =
  | "striped"
  | "gradient"
  | "checkerboard"
  | "random"
  | "fade"
  | "center-fade"
  | "scatter";

type Orientation = "horizontal" | "vertical";

export type ColorInfo = {
  hex: string;
  name: string;
};

export type ColorMap = Record<string, ColorInfo>;

export type CustomColor = {
  id: string;
  hex: string;
  name?: string;
  /** Extra proportion of squares for this color (e.g. 50 = +50%). Default 0. */
  extraPercent?: number;
  /**
   * Set by "Convert to paint": how close (0–100%) this swatch is to the
   * real paint color it was grounded onto, derived from the ΔE2000
   * distance. Cleared when the color is edited directly.
   */
  paintMatch?: number;
  /**
   * Set by "Convert to paint": the original swatch this color was grounded
   * from. Lets "Convert back to hex" restore the pre-paint hex/name.
   */
  paintSourceHex?: string;
  paintSourceName?: string;
  /**
   * Set by "Convert to paint": the second-closest paint match (a fallback
   * to suggest at the counter) and how close it is (0–100%).
   */
  paintBackup?: string;
  paintBackupMatch?: number;
  /**
   * Set by "Convert to paint": a 2–3 paint mixing recipe (integer parts)
   * that lands closer to the original swatch than the single nearest
   * paint. Only stored when mixing genuinely beats buying one can.
   */
  paintMixRecipe?: PaintMixRecipe;
  /**
   * If present, this is a *mixed* color: a blend sitting `t` of the way
   * between two other ("primary") colors in the palette, referenced by
   * id. When a primary's hex changes, mixed colors re-derive from it.
   * Absent → the color is primary (entered/picked directly).
   */
  mix?: { fromId: string; toId: string; t: number };
  /**
   * Paint-like hand-mix prediction for mixed colors. Compares the intended
   * swatch with a Kubelka-Munk-style pigment mix of the two parent colors.
   */
  handMix?: HandMixSimulation;
};

// Add a new type for custom modes
export type CustomMode = "palette" | "pattern";

export type SquareDirection = "north" | "east" | "south" | "west";
export type PatternColorOverrides = Record<string, number>;
export type PatternDirectionOverrides = Record<string, SquareDirection>;
export type PatternBrushShape =
  | "single"
  | "row"
  | "column"
  | "square"
  | "circle";
export type SizedPatternBrushShape = "square" | "circle";

export interface PatternBrushSettings {
  shape: PatternBrushShape;
  sizes: Record<SizedPatternBrushShape, number>;
}

export const PATTERN_BRUSH_SIZE_CONFIG = {
  min: 1,
  max: 31,
  step: 2,
  default: 3,
} as const;

export type PatternEditingMode =
  | { tool: "none" }
  | { tool: "color"; selectedColorIndex: number }
  | { tool: "direction"; selectedDirection: SquareDirection }
  | { tool: "eraser" };

// A single point-in-time snapshot of a design's colors. Versions are
// append-only: editing/saving or restoring a design adds a new version
// rather than mutating or removing existing ones, so design history is
// never lost.
export interface PaletteVersion {
  id: string;
  colors: CustomColor[];
  createdAt: string;
  label?: string;
  // The version this one descends from. Lets history form a tree:
  // restoring an older version branches off it instead of overwriting.
  parentId?: string;
  // Set only on a branch root (a version created by restoring an older
  // one). Holds the label of the version it branched from, for display.
  branchedFrom?: string;
}

// The finished piece's paint-estimate inputs, stored as the raw entered
// text (empty = unset) so loading a palette restores exactly what was
// typed and decimals survive editing. Parsed to numbers only for the
// estimate math. Lives on the palette so you don't re-enter it each time.
/** How the per-color paint mass is arrived at: derived from the square
 *  count (grams-per-square × squares ÷ colors) or entered directly as a
 *  total grams-per-color. */
export type PaintEstimateMode = "perSquare" | "perColor";

export interface PieceSize {
  /** Total squares in the finished piece. */
  squares: string;
  /** Grams of paint per square (used when mode is "perSquare"). */
  gramsPerSquare: string;
  /** Total grams of paint for one color (used when mode is "perColor"). */
  gramsPerColor: string;
  /** Which of the two inputs drives the estimate. */
  paintMode: PaintEstimateMode;
}

export const DEFAULT_PIECE_SIZE: PieceSize = {
  squares: "",
  gramsPerSquare: String(GRAMS_PER_SQUARE),
  gramsPerColor: "",
  paintMode: "perSquare",
};

export interface SavedPalette {
  id: string;
  name: string;
  colors: CustomColor[];
  createdAt: string;
  updatedAt?: string;
  folderId?: string;
  isPublic?: boolean;
  // Full version history. Optional for backward-compat with palettes
  // saved before versioning existed; backfilled on load.
  versions?: PaletteVersion[];
  // The version the palette's current colors reflect — i.e. the tip of
  // the active branch. The next save descends from this version.
  currentVersionId?: string;
  // Piece-size / paint-per-square inputs for this palette's paint
  // estimate. Optional: palettes saved before this feature have none.
  pieceSize?: PieceSize;
  patternOverride?: PatternColorOverrides;
  patternDirectionOverride?: PatternDirectionOverrides;
}

export type Folder = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
};

export type PatternType = "tiled" | "geometric";

export type StyleType = "geometric" | "tiled" | "striped";

// Add new types for hover state
export interface HoverInfo {
  /** Grid coordinates of the square (used for pattern editing & equality). */
  position: [number, number];
  /** Group-local 3D position of the square (the picked face plane), for
   *  anchoring overlays in space. Absent for legacy callers that only carry
   *  grid coords. The Z keeps the label pinned to the square's surface so it
   *  doesn't parallax-drift off the square at an orbit angle. */
  worldPosition?: [number, number, number];
  color: string;
  colorName?: string;
}

// Add PatternCell type definition here for the store
// This avoids needing to import it from the page component
export type PatternCell = {
  color: string | null;
  colorName?: string;
};

// Transient session state for the Photo tab's image color extractor. Kept
// in the store (not local component state) so a pasted/uploaded image and
// the colors derived from it survive tab switches and route changes within
// a session. Deliberately excluded from PersistentState — data URLs are
// large and only meaningful for the current session.
export interface ImageExtractorSession {
  image: string | null;
  // The image URL that `dominantColors` were extracted from, so returning
  // to the tab doesn't re-run extraction on an already-processed image.
  extractedFrom: string | null;
  dominantColors: string[];
  pickedColors: string[];
  selectedAutoColors: string[];
}

interface CustomState {
  dimensions: Dimensions;
  selectedDesign: ItemDesigns;
  shippingSpeed: ShippingSpeed;
  pricing: PriceBreakdown;
  colorPattern: ColorPattern;
  orientation: Orientation;
  currentColors: ColorMap | null;
  customPalette: CustomColor[];
  // Piece-size / paint-per-square inputs for the palette open in the
  // editor. Saved onto the palette so it persists across sessions.
  pieceSize: PieceSize;
  selectedColors: string[];
  isRotated: boolean;
  style: StyleType;
  useMini: boolean;
  isReversed: boolean;
  savedPalettes: SavedPalette[];
  paletteFolders: Folder[];
  folders: Folder[];
  activeTab: "create" | "saved" | "official" | "extract";
  editingPaletteId: string | null;
  // Transient UI: which saved palette's version history is open (in a
  // dialog). Not persisted — purely view state.
  historyPaletteId: string | null;
  // See ImageExtractorSession — transient, not persisted.
  imageExtractor: ImageExtractorSession;
  viewSettings: {
    showRuler: boolean;
    showWoodGrain: boolean;
    showColorInfo: boolean;
    showHanger: boolean;
    showSplitPanel: boolean;
    showFPS: boolean;
    showUIControls: boolean;
    showRoom: boolean;
    wallColor: string;
    woodStyle: string;
    metallic: boolean;
  };
  lastSaved: number;
  autoSaveEnabled: boolean;
  dataSyncVersion: number;
  scatterEase: number;
  scatterWidth: number;
  scatterAmount: number;

  // State for directly drawn patterns
  drawnPatternGrid: PatternCell[][] | null;
  drawnPatternGridSize: { width: number; height: number } | null;

  // New property to track which custom mode is active
  activeCustomMode: CustomMode;

  // Pattern override functionality for individual square editing
  patternOverride: PatternColorOverrides;
  patternDirectionOverride: PatternDirectionOverrides;
  patternEditingMode: PatternEditingMode;
  patternBrush: PatternBrushSettings;
  isPatternEditorActive: boolean;

  paletteHistory: Array<Array<CustomColor>>;
  paletteHistoryIndex: number;
  draftSet: DraftSetItem[];
}

interface CustomStore extends CustomState {
  setDimensions: (dimensions: Dimensions) => void;
  setSelectedDesign: (design: ItemDesigns) => void;
  previousDesign: () => void;
  nextDesign: () => void;
  setShippingSpeed: (speed: ShippingSpeed) => void;
  setColorPattern: (pattern: ColorPattern) => void;
  setOrientation: (orientation: Orientation) => void;
  isReversed: boolean;
  setIsReversed: (value: boolean) => void;
  updateCurrentColors: (design: ItemDesigns) => void;
  addCustomColor: (hex: string, name?: string) => void;
  removeCustomColor: (index: number) => void;
  duplicateCustomColor: (index: number) => void;
  toggleColorSelection: (hex: string) => void;
  clearSelectedColors: () => void;
  addBlendedColors: (count: number) => void;
  moveColorLeft: (index: number) => void;
  moveColorRight: (index: number) => void;
  reorderPalette: (newOrder: CustomColor[]) => void;
  commitPaletteToHistory: () => void;
  setIsRotated: (value: boolean) => void;
  setStyle: (style: StyleType) => void;
  setUseMini: (value: boolean) => void;
  setShowRuler: (value: boolean) => void;
  setShowWoodGrain: (value: boolean) => void;
  setWoodStyle: (value: string) => void;
  setMetallic: (value: boolean) => void;
  setShowColorInfo: (value: boolean) => void;
  setShowHanger: (value: boolean) => void;
  setShowSplitPanel: (value: boolean) => void;
  setShowFPS: (value: boolean) => void;
  setShowUIControls: (value: boolean) => void;
  setShowRoom: (value: boolean) => void;
  setWallColor: (value: string) => void;
  savePalette: (name: string, folderId?: string) => void;
  updatePalette: (id: string, updates: Partial<SavedPalette>) => void;
  deletePalette: (id: string) => void;
  applyPalette: (paletteId: string) => void;
  applyPaletteVersion: (paletteId: string, versionId: string) => void;
  restorePaletteVersion: (paletteId: string, versionId: string) => void;
  renamePaletteVersion: (
    paletteId: string,
    versionId: string,
    label: string
  ) => void;
  deletePaletteVersion: (paletteId: string, versionId: string) => void;
  setHistoryPaletteId: (id: string | null) => void;
  loadPaletteForEditing: (paletteId: string) => void;
  setEditingPaletteId: (id: string | null) => void;
  setActiveTab: (tab: "create" | "saved" | "official" | "extract") => void;
  // Set the extractor image; a new image clears everything derived from it.
  setImageExtractorImage: (image: string | null) => void;
  setImageExtractorResult: (
    extractedFrom: string,
    dominantColors: string[]
  ) => void;
  setImageExtractorPickedColors: (colors: string[]) => void;
  setImageExtractorSelectedAutoColors: (colors: string[]) => void;
  updateColorName: (index: number, name: string) => void;
  updateColorHex: (index: number, hex: string) => void;
  /** Apply hex and/or name in one shot — a single undo step. */
  updateColor: (
    index: number,
    changes: { hex?: string; name?: string }
  ) => void;
  updateColorExtraPercent: (index: number, extraPercent: number) => void;
  setPieceSize: (updates: Partial<PieceSize>) => void;
  resetPaletteEditor: () => void;
  loadOfficialPalette: (design: ItemDesigns) => void;
  setCustomPalette: (palette: CustomColor[]) => void;
  generateShareableLink: () => string;
  generateShortShareableLink: () => string;
  getShareableStateSnapshot: () => ShareableState;
  getShareableDesignData: () => {
    dimensions: Dimensions;
    selectedDesign: ItemDesigns;
    colorPattern: ColorPattern;
    orientation: Orientation;
    isReversed: boolean;
    customPalette: Array<{ hex: string; name?: string; extraPercent?: number }>;
    isRotated: boolean;
    useMini: boolean;
  };
  createSharedDesign: (
    userId?: string,
    email?: string
  ) => Promise<{
    success: boolean;
    shareId?: string;
    shareUrl?: string;
    error?: string;
  }>;
  createSharedDesignSet: (
    designs: Array<{ label?: string | null; designData: ShareableState }>,
    userId?: string,
    email?: string
  ) => Promise<
    | { success: true; setId: string; setUrl: string }
    | { success: false; error: string }
  >;
  createSharedDesignSetFromPalettes: (
    paletteIds: string[],
    userId?: string,
    email?: string
  ) => Promise<
    | { success: true; setId: string; setUrl: string }
    | { success: false; error: string }
  >;
  loadFromShareableData: (data: string) => boolean;
  loadFromDatabaseData: (designData: ShareableState) => boolean;
  saveToDatabase: () => Promise<boolean>;
  loadFromDatabase: () => Promise<boolean>;
  syncWithDatabase: (autoSave?: boolean) => (() => void) | void;
  setAutoSaveEnabled: (enabled: boolean) => void;
  saveToLocalStorage: () => boolean;
  createDraftOrder: () => Promise<{
    success: boolean;
    checkoutUrl?: string;
    error?: string;
    draftOrder?: any;
  }>;
  createPaletteFolder: (name: string) => string;
  updatePaletteFolder: (id: string, updates: Partial<Folder>) => void;
  deletePaletteFolder: (id: string) => void;
  movePaletteToFolder: (paletteId: string, folderId: string | null) => void;
  init: () => void;
  togglePalettePublic: (id: string) => void;
  setScatterEase: (value: number) => void;
  setScatterWidth: (value: number) => void;
  setScatterAmount: (value: number) => void;

  // New action to set the active custom mode
  setActiveCustomMode: (mode: CustomMode) => void;

  // Draft Set Actions
  addToDraftSet: (item: { label?: string; designData: ShareableState }) => void;
  removeFromDraftSet: (id: string) => void;
  clearDraftSet: () => void;
  updateDraftSetItemLabel: (id: string, label: string) => void;

  setPatternOverride: (overrides: PatternColorOverrides) => void;
  setPatternSquareColor: (key: string, colorIndex: number) => void;
  setPatternSquareDirection: (
    key: string,
    direction: SquareDirection
  ) => void;
  resetPatternSquare: (key: string) => void;
  applyPatternSquareEdit: (
    keys: readonly string[],
    edit: PatternEditingMode
  ) => void;
  clearPatternOverride: () => void;
  setPatternEditingMode: (mode: PatternEditingMode) => void;
  setPatternBrushShape: (shape: PatternBrushShape) => void;
  setPatternBrushSize: (
    shape: SizedPatternBrushShape,
    size: number
  ) => void;
  setIsPatternEditorActive: (active: boolean) => void;

  // Action for setting a directly drawn pattern
  setDrawnPattern: (
    grid: PatternCell[][],
    size: { width: number; height: number },
    keepCustomPalette?: boolean
  ) => void;

  // Action for clearing a drawn pattern
  clearDrawnPattern: (keepCustomPalette?: boolean) => void;

  undoPaletteAction: () => boolean;
  redoPaletteAction: () => boolean;
}

interface HoverState {
  hoverInfo: HoverInfo | null;
  pinnedInfo: HoverInfo | null;
  setHoverInfo: (info: HoverInfo | null) => void;
  setPinnedInfo: (info: HoverInfo | null) => void;
}

// Create a separate vanilla store for hover state
export const hoverStore = createStore<HoverState>((set) => ({
  hoverInfo: null,
  pinnedInfo: null,
  setHoverInfo: (info) => set({ hoverInfo: info }),
  setPinnedInfo: (info) => set({ pinnedInfo: info }),
}));

// A manual hex edit makes a color primary and severs every tie to its
// previous identity: the mix link, the hand-mix prediction, AND the
// "Convert to paint" metadata (match %, mix recipe, the original source
// it was grounded from, and the backup suggestion). Dropping only some
// of these leaves a stale source/backup that a later re-ground or
// convert-to-hex would silently restore over the user's edit, so they
// must all go together.
function detachColorMetadata(
  color: CustomColor
): CustomColor {
  const {
    mix: _droppedMix,
    handMix: _droppedHandMix,
    paintMatch: _droppedMatch,
    paintMixRecipe: _droppedRecipe,
    paintSourceHex: _droppedSourceHex,
    paintSourceName: _droppedSourceName,
    paintBackup: _droppedBackup,
    paintBackupMatch: _droppedBackupMatch,
    ...rest
  } = color;
  void _droppedMix;
  void _droppedHandMix;
  void _droppedMatch;
  void _droppedRecipe;
  void _droppedSourceHex;
  void _droppedSourceName;
  void _droppedBackup;
  void _droppedBackupMatch;
  return rest;
}

// Helper function to create a ColorMap from CustomColor array
// Recompute every mixed color from its two primary parents' *current*
// hexes. Run after any edit that can change a parent so blends stay in
// sync. Repeated passes resolve chains (a mix whose parent is itself a
// mix); it always terminates since each pass can only fix-point. If a
// parent was deleted, that mix is left untouched (nothing to blend from).
const reblendMixedColors = (colors: CustomColor[]): CustomColor[] => {
  const byId = new Map(colors.map((c) => [c.id, c]));
  let next = colors;
  for (let pass = 0; pass < colors.length; pass++) {
    let changed = false;
    next = next.map((c) => {
      if (!c.mix) return c;
      const from = byId.get(c.mix.fromId);
      const to = byId.get(c.mix.toId);
      if (!from || !to) return c;
      const hex = blendHexColors(from.hex, to.hex, c.mix.t);
      const handMix = simulatePaintLikeMix(from.hex, to.hex, c.mix.t, hex);
      const handMixChanged =
        !c.handMix ||
        c.handMix.targetHex !== handMix.targetHex ||
        c.handMix.predictedHex !== handMix.predictedHex ||
        c.handMix.deltaE !== handMix.deltaE ||
        c.handMix.decision !== handMix.decision ||
        c.handMix.confidence !== handMix.confidence ||
        c.handMix.label !== handMix.label ||
        c.handMix.recipe !== handMix.recipe;
      if (hex === c.hex && !handMixChanged) return c;
      changed = true;
      const updated = { ...c, hex, handMix };
      byId.set(c.id, updated);
      return updated;
    });
    if (!changed) break;
  }
  return next;
};

const refreshHandMixMetadata = (colors: CustomColor[]): CustomColor[] => {
  const byId = new Map(colors.map((c) => [c.id, c]));
  return colors.map((c) => {
    if (!c.mix) return c;
    const from = byId.get(c.mix.fromId);
    const to = byId.get(c.mix.toId);
    if (!from || !to) return c;
    return {
      ...c,
      handMix: simulatePaintLikeMix(from.hex, to.hex, c.mix.t, c.hex),
    };
  });
};

const createColorMap = (colors: CustomColor[]): ColorMap => {
  return Object.fromEntries(
    colors.map((color, i) => [
      i.toString(),
      { hex: color.hex, name: `Color ${i + 1}` },
    ])
  );
};

const normalizeSavedPaletteToCustomColors = (
  palette: SavedPalette
): CustomColor[] => {
  // Fresh ids so a loaded palette can't collide with one already in the
  // editor — but remap mix parent references through the same map so
  // mixed colors stay linked to their (renamed) primaries.
  const idMap = new Map<string, string>();
  for (const c of palette.colors) {
    const old = (c as CustomColor).id;
    if (old) idMap.set(old, nanoid());
  }
  const normalized = palette.colors.map((c) => {
    const src = c as CustomColor;
    const mix =
      src.mix &&
      idMap.has(src.mix.fromId) &&
      idMap.has(src.mix.toId)
        ? {
            fromId: idMap.get(src.mix.fromId)!,
            toId: idMap.get(src.mix.toId)!,
            t: src.mix.t,
          }
        : undefined;
    return {
      id: (src.id && idMap.get(src.id)) || nanoid(),
      hex: c.hex,
      name: c.name ?? "",
      extraPercent:
        typeof src.extraPercent === "number" &&
        !Number.isNaN(src.extraPercent)
          ? src.extraPercent
          : 0,
      ...(mix ? { mix } : {}),
    };
  });
  return refreshHandMixMetadata(normalized);
};

const buildShareableStateForPalette = (
  base: ShareableState,
  palette: SavedPalette,
  overrides?: Partial<ShareableState>
): ShareableState => {
  const next: ShareableState = { ...base, ...(overrides ?? {}) };
  if (!overrides?.customPalette) {
    next.customPalette = normalizeSavedPaletteToCustomColors(palette);
  }
  if (!overrides || !("patternOverride" in overrides)) {
    next.patternOverride = { ...(palette.patternOverride ?? {}) };
  }
  if (!overrides || !("patternDirectionOverride" in overrides)) {
    next.patternDirectionOverride = {
      ...(palette.patternDirectionOverride ?? {}),
    };
  }
  return next;
};

// Define the shareable state interface - only include what's needed for sharing
export interface ShareableState {
  dimensions: Dimensions;
  selectedDesign: ItemDesigns;
  shippingSpeed: ShippingSpeed;
  colorPattern: ColorPattern;
  orientation: Orientation;
  isReversed: boolean;
  customPalette: CustomColor[];
  isRotated: boolean;
  style: StyleType;
  useMini: boolean;
  activeCustomMode: CustomMode;
  scatterEase?: number;
  scatterWidth?: number;
  scatterAmount?: number;
  drawnPatternGrid?: PatternCell[][] | null;
  drawnPatternGridSize?: { width: number; height: number } | null;
  patternOverride?: PatternColorOverrides;
  patternDirectionOverride?: PatternDirectionOverrides;
}

function cloneSharedPatternGrid(
  grid: PatternCell[][] | null | undefined,
  size: { width: number; height: number } | null | undefined
): {
  drawnPatternGrid: PatternCell[][] | null;
  drawnPatternGridSize: { width: number; height: number } | null;
} {
  if (!grid || !size) {
    return { drawnPatternGrid: null, drawnPatternGridSize: null };
  }

  return {
    drawnPatternGrid: grid.map((row) =>
      row.map((cell) => ({ ...cell }))
    ),
    drawnPatternGridSize: { ...size },
  };
}

export type DraftSetItem = {
  id: string;
  label: string;
  designData: ShareableState;
  createdAt: number;
};

// Define what we want to persist in the database
interface PersistentState extends ShareableState {
  savedPalettes: SavedPalette[];
  paletteFolders: Folder[];
  // The open editor's piece size, so an in-progress (unsaved) estimate
  // survives a refresh the same way the in-progress palette does.
  pieceSize?: PieceSize;
  useMini: boolean;
  viewSettings: {
    showRuler: boolean;
    showWoodGrain: boolean;
    showColorInfo: boolean;
    showHanger: boolean;
    showSplitPanel: boolean;
    showFPS: boolean;
    showUIControls: boolean;
    showRoom: boolean;
    wallColor: string;
    woodStyle: string;
    metallic: boolean;
  };
  dataSyncVersion?: number;
  draftSet?: DraftSetItem[];
  // Persisted so a refresh keeps an in-progress palette connected to
  // the saved palette it was opened from (Save Version, not Save New).
  editingPaletteId?: string | null;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🌿 VERSION LABEL / BRANCH HELPERS                                     ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Increment the trailing number of a version label, preserving its
// branch prefix: "v3" → "v4", "v2.1" → "v2.2". Custom-renamed labels
// with no trailing number fall back to a ".1" suffix.
const bumpVersionLabel = (label: string): string => {
  const m = label.match(/^(.*?)(\d+)$/);
  return m ? `${m[1]}${Number(m[2]) + 1}` : `${label}.1`;
};

// Make a label unique within a design by bumping it until it's free.
const freeVersionLabel = (base: string, taken: Set<string>): string => {
  let candidate = base;
  while (taken.has(candidate)) candidate = bumpVersionLabel(candidate);
  return candidate;
};

// The version a palette's current colors reflect (the active branch
// tip). Falls back to the last version for pre-branching saved data.
const resolveCurrentVersion = (
  p: SavedPalette
): PaletteVersion | undefined => {
  const versions = p.versions ?? [];
  if (versions.length === 0) return undefined;
  return (
    versions.find((v) => v.id === p.currentVersionId) ??
    versions[versions.length - 1]
  );
};

// Backfill version history for palettes saved before versioning existed.
// Purely additive: an existing palette's current colors become its
// "v1". Never mutates or drops a palette that already has history,
// so old saved designs always remain accessible.
const ensurePaletteVersions = (
  palettes: SavedPalette[] = []
): SavedPalette[] =>
  palettes.map((p) => {
    if (p.versions && p.versions.length > 0) {
      // Existing history but no recorded tip (pre-branching data):
      // point the current version at the newest entry.
      if (!p.currentVersionId) {
        return {
          ...p,
          currentVersionId: p.versions[p.versions.length - 1].id,
        };
      }
      return p;
    }
    const colors = (p.colors || []).map((c) => ({
      ...c,
      id: c.id || nanoid(),
    }));
    const versionId = nanoid();
    return {
      ...p,
      colors,
      currentVersionId: versionId,
      versions: [
        {
          id: versionId,
          colors,
          createdAt: p.createdAt || new Date().toISOString(),
          label: "v1",
        },
      ],
    };
  });

const syncPatternOverridesToActivePalette = (
  savedPalettes: SavedPalette[],
  editingPaletteId: string | null,
  patternOverride: PatternColorOverrides,
  patternDirectionOverride: PatternDirectionOverrides
): SavedPalette[] => {
  if (!editingPaletteId) return savedPalettes;

  const updatedAt = new Date().toISOString();
  let didUpdate = false;
  const nextPalettes = savedPalettes.map((palette) => {
    if (palette.id !== editingPaletteId) return palette;
    didUpdate = true;
    return {
      ...palette,
      patternOverride: { ...patternOverride },
      patternDirectionOverride: { ...patternDirectionOverride },
      updatedAt,
    };
  });
  return didUpdate ? nextPalettes : savedPalettes;
};

// List of state properties that should trigger an auto-save when changed
const AUTO_SAVE_TRACKED_PROPERTIES: (keyof CustomState)[] = [
  "dimensions",
  "selectedDesign",
  "shippingSpeed",
  "colorPattern",
  "orientation",
  "isReversed",
  "customPalette",
  "pieceSize",
  "isRotated",
  "style",
  "savedPalettes",
  "paletteFolders",
  "viewSettings",
  "paletteHistory",
  "paletteHistoryIndex",
  "activeCustomMode",
  "draftSet",
  "scatterEase",
  "scatterWidth",
  "scatterAmount",
  "drawnPatternGrid",
  "drawnPatternGridSize",
  "patternOverride",
  "patternDirectionOverride",
];

// Create the store with the subscribeWithSelector middleware
export const useCustomStore = create<CustomStore>()(
  subscribeWithSelector((set, get) => ({
    dimensions: { width: 24, height: 12 },
    selectedDesign: ItemDesigns.Coastal,
    shippingSpeed: "standard",
    pricing: {
      basePrice: 0,
      shipping: { base: 0, additionalHeight: 0, expedited: 0, total: 0 },
      tax: 0,
      total: 0,
      customFee: 0,
      debug: {
        dimensions: { height: 0, width: 0 },
        squares: { height: 0, width: 0, total: 0 },
      },
    },
    colorPattern: "fade",
    orientation: "horizontal",
    currentColors: null,
    customPalette: [],
    pieceSize: DEFAULT_PIECE_SIZE,
    selectedColors: [],
    isRotated: false,
    style: "geometric",
    useMini: false,
    isReversed: false,
    savedPalettes: [],
    folders: [],
    paletteFolders: [],
    activeTab: "create",
    editingPaletteId: null,
    historyPaletteId: null,
    imageExtractor: {
      image: null,
      extractedFrom: null,
      dominantColors: [],
      pickedColors: [],
      selectedAutoColors: [],
    },
    viewSettings: {
      showRuler: true,
      showWoodGrain: true,
      showColorInfo: false,
      showHanger: false,
      showSplitPanel: false,
      showFPS: false,
      showUIControls: true,
      showRoom: true,
      wallColor: DEFAULT_WALL_COLOR,
      woodStyle: DEFAULT_WOOD_STYLE_ID,
      metallic: false,
    },
    lastSaved: 0,
    autoSaveEnabled: true,
    dataSyncVersion: 1,
    scatterEase: DEFAULT_SCATTER_EASE,
    scatterWidth: DEFAULT_SCATTER_WIDTH,
    scatterAmount: DEFAULT_SCATTER_AMOUNT,
    drawnPatternGrid: null,
    drawnPatternGridSize: null,
    paletteHistory: [],
    paletteHistoryIndex: -1,
    activeCustomMode: "palette",
    draftSet: [],
    patternOverride: {},
    patternDirectionOverride: {},
    patternEditingMode: { tool: "none" },
    patternBrush: {
      shape: "single",
      sizes: {
        square: PATTERN_BRUSH_SIZE_CONFIG.default,
        circle: PATTERN_BRUSH_SIZE_CONFIG.default,
      },
    },
    isPatternEditorActive: false,
    init: () => {
      if (typeof window !== "undefined") {
        const localState = localStorage.getItem("everwood-custom-design");
        if (localState) {
          try {
            const parsedState = JSON.parse(localState);

            // Migration: Ensure all colors have IDs
            if (parsedState.customPalette) {
              parsedState.customPalette = parsedState.customPalette.map(
                (c: any) => ({
                  ...c,
                  id: c.id || nanoid(),
                })
              );
            }

            if (parsedState.savedPalettes) {
              parsedState.savedPalettes = ensurePaletteVersions(
                parsedState.savedPalettes.map((p: any) => ({
                  ...p,
                  colors: (p.colors || []).map((c: any) => ({
                    ...c,
                    id: c.id || nanoid(),
                  })),
                }))
              );
            }

            if (parsedState.draftSet) {
              parsedState.draftSet = parsedState.draftSet.map((item: any) => ({
                ...item,
                designData: {
                  ...item.designData,
                  customPalette: item.designData.customPalette.map(
                    (c: any) => ({
                      ...c,
                      id: c.id || nanoid(),
                    })
                  ),
                },
              }));
            }

            set(parsedState);

            // Determine initial active tab based on conditions
            const savedPalettes = parsedState.savedPalettes || [];
            const customPalette = parsedState.customPalette || [];
            let initialTab: "create" | "saved" | "official" | "extract" =
              "official";

            if (customPalette.length > 0) {
              initialTab = "create";
            } else if (savedPalettes.length > 0) {
              initialTab = "saved";
            }

            set({ activeTab: initialTab });

            // If the restored design is Custom but there's nothing to
            // preview (no palette colors and no drawn pattern), fall
            // back to the Coastal Dream design so the viewer never
            // renders an empty / white screen.
            const hasDrawn =
              parsedState.drawnPatternGrid &&
              parsedState.drawnPatternGridSize;
            if (
              parsedState.selectedDesign === ItemDesigns.Custom &&
              customPalette.length === 0 &&
              !hasDrawn
            ) {
              set({
                selectedDesign: ItemDesigns.Coastal,
                currentColors: DESIGN_COLORS[ItemDesigns.Coastal],
              });
            }

            if (
              parsedState.folders &&
              parsedState.folders.length > 0 &&
              (!parsedState.paletteFolders ||
                parsedState.paletteFolders.length === 0)
            ) {
              set({
                paletteFolders: parsedState.folders,
              });

              console.log(
                `Migrated ${parsedState.folders.length} folders into paletteFolders.`
              );
            }

            console.log("Loaded state from local storage");
          } catch (e) {
            console.error("Failed to parse local storage state", e);
          }
        }
      }
    },
    setDimensions: (dimensions) => {
      set({ dimensions });
      set((state) => ({
        pricing: calculatePrice(dimensions, state.shippingSpeed),
      }));
    },
    setUseMini: (value: boolean) => set({ useMini: value }),
    setSelectedDesign: (design: ItemDesigns) => {
      const designName = design;
      set((state) => ({
        selectedDesign: design,
        editingPaletteId:
          design === ItemDesigns.Custom ? state.editingPaletteId : null,
        currentColors:
          design === ItemDesigns.Custom && state.customPalette.length > 0
            ? createColorMap(state.customPalette)
            : DESIGN_COLORS[design],
      }));
    },
    previousDesign: () => {
      const designKeys = Object.values(ItemDesigns);
      const currentDesign = get().selectedDesign;
      const currentIndex = designKeys.indexOf(currentDesign);
      const prevIndex =
        (currentIndex - 1 + designKeys.length) % designKeys.length;
      get().setSelectedDesign(designKeys[prevIndex]);
    },
    nextDesign: () => {
      const designKeys = Object.values(ItemDesigns);
      const currentDesign = get().selectedDesign;
      const currentIndex = designKeys.indexOf(currentDesign);
      const nextIndex = (currentIndex + 1) % designKeys.length;
      get().setSelectedDesign(designKeys[nextIndex]);
    },
    setShippingSpeed: (speed) =>
      set((state) => ({
        shippingSpeed: speed,
        pricing: calculatePrice(state.dimensions, speed),
      })),
    setColorPattern: (pattern) => set({ colorPattern: pattern }),
    setOrientation: (orientation) => set({ orientation }),
    setIsReversed: (value) => set({ isReversed: value }),
    updateCurrentColors: (design: ItemDesigns) => {
      set({ currentColors: DESIGN_COLORS[design] });
    },
    addCustomColor: (hex, name = "") =>
      set((state) => {
        const newPalette = [
          ...state.customPalette,
          { id: nanoid(), hex, name },
        ];

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(newPalette);

        return {
          customPalette: newPalette,
          currentColors: createColorMap(newPalette),
          selectedDesign: ItemDesigns.Custom,
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    removeCustomColor: (index) =>
      set((state) => {
        if (index < 0 || index >= state.customPalette.length) return state;
        const removedColorId = state.customPalette[index].id;
        const newPalette = state.customPalette.filter((_, i) => i !== index);

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(newPalette);

        return {
          customPalette: newPalette,
          selectedColors: state.selectedColors.filter(
            (id) => id !== removedColorId
          ),
          currentColors:
            newPalette.length > 0
              ? createColorMap(newPalette)
              : DESIGN_COLORS[ItemDesigns.Custom],
          selectedDesign: ItemDesigns.Custom,
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    duplicateCustomColor: (index) =>
      set((state) => {
        // Bounds checking
        if (index < 0 || index >= state.customPalette.length) return state;

        const newPalette = [...state.customPalette];
        const newColor = { ...newPalette[index], id: nanoid() };
        newPalette.splice(index + 1, 0, newColor);

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(newPalette);

        return {
          customPalette: newPalette,
          currentColors: createColorMap(newPalette),
          selectedDesign: ItemDesigns.Custom,
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    toggleColorSelection: (id) =>
      set((state) => {
        if (state.selectedColors.includes(id)) {
          return {
            selectedColors: state.selectedColors.filter((i) => i !== id),
          };
        } else if (state.selectedColors.length < 2) {
          return {
            selectedColors: [...state.selectedColors, id],
          };
        } else {
          console.log(
            "Already have 2 colors selected, replacing the first one"
          );
          return {
            selectedColors: [id, state.selectedColors[1]],
          };
        }
      }),
    clearSelectedColors: () =>
      set({
        selectedColors: [],
      }),
    addBlendedColors: (count) =>
      set((state) => {
        if (state.selectedColors.length !== 2) return state;

        const indices = state.selectedColors.map((id) =>
          state.customPalette.findIndex((color) => color.id === id)
        );

        const [startIndex, endIndex] = indices.sort((a, b) => a - b);

        const fromColor = state.customPalette[startIndex];
        const toColor = state.customPalette[endIndex];
        const color1 = fromColor.hex;
        const color2 = toColor.hex;

        const blendedColors: CustomColor[] = [];

        // Evenly spaced, symmetric steps between the two endpoints,
        // interpolated perceptually in OKLab. t = i/(count+1) keeps the
        // new colors strictly between color1 and color2 with equal gaps.
        // Each blend remembers its two parents + t so it stays in sync
        // when a parent's hex is later edited.
        for (let i = 1; i <= count; i++) {
          const t = i / (count + 1);
          const hex = blendHexColors(color1, color2, t);
          blendedColors.push({
            id: nanoid(),
            hex,
            mix: { fromId: fromColor.id, toId: toColor.id, t },
            handMix: simulatePaintLikeMix(color1, color2, t, hex),
          });
        }

        const newPalette = [...state.customPalette];
        newPalette.splice(startIndex + 1, 0, ...blendedColors);

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(newPalette);

        return {
          customPalette: newPalette,
          selectedColors: [],
          currentColors: createColorMap(newPalette),
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    moveColorLeft: (index) =>
      set((state) => {
        if (index <= 0 || index >= state.customPalette.length) return state;

        const newPalette = [...state.customPalette];
        const temp = newPalette[index];
        newPalette[index] = newPalette[index - 1];
        newPalette[index - 1] = temp;

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(newPalette);

        return {
          customPalette: newPalette,
          currentColors: createColorMap(newPalette),
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    moveColorRight: (index) =>
      set((state) => {
        if (index < 0 || index >= state.customPalette.length - 1) return state;

        const newPalette = [...state.customPalette];
        const temp = newPalette[index];
        newPalette[index] = newPalette[index + 1];
        newPalette[index + 1] = temp;

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(newPalette);

        return {
          customPalette: newPalette,
          currentColors: createColorMap(newPalette),
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    setScatterEase: (value) => set({ scatterEase: value }),
    setScatterWidth: (value) => set({ scatterWidth: value }),
    setScatterAmount: (value) => set({ scatterAmount: value }),
    reorderPalette: (newOrder) =>
      set((state) => {
        return {
          customPalette: newOrder,
          currentColors: createColorMap(newOrder),
        };
      }),
    commitPaletteToHistory: () =>
      set((state) => {
        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push([...state.customPalette]);

        return {
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    setIsRotated: (value) => set({ isRotated: value }),
    setStyle: (style) => set({ style }),
    setShowRuler: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, showRuler: value },
      })),
    setShowWoodGrain: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, showWoodGrain: value },
      })),
    setMetallic: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, metallic: value },
      })),
    setWoodStyle: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, woodStyle: value },
      })),
    setShowColorInfo: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, showColorInfo: value },
      })),
    setShowHanger: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, showHanger: value },
      })),
    setShowSplitPanel: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, showSplitPanel: value },
      })),
    setShowFPS: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, showFPS: value },
      })),
    setShowUIControls: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, showUIControls: value },
      })),
    setShowRoom: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, showRoom: value },
      })),
    setWallColor: (value) =>
      set((state) => ({
        viewSettings: { ...state.viewSettings, wallColor: value },
      })),
    savePalette: (name: string, folderId?: string) => {
      const { customPalette } = get();
      if (customPalette.length === 0) {
        return;
      }

      const now = new Date().toISOString();
      const colorsSnapshot = customPalette.map((c) => ({ ...c }));
      const pieceSizeSnapshot = { ...get().pieceSize };
      const patternOverrideSnapshot = { ...get().patternOverride };
      const patternDirectionOverrideSnapshot = {
        ...get().patternDirectionOverride,
      };
      const editingId = get().editingPaletteId;

      if (editingId) {
        // Saving an edited design appends a new version; the previous
        // versions are preserved so the full history is retained.
        set((state) => ({
          savedPalettes: state.savedPalettes.map((palette) => {
            if (palette.id !== editingId) return palette;
            const seededId = nanoid();
            const existingVersions =
              palette.versions && palette.versions.length > 0
                ? palette.versions
                : [
                    {
                      id: seededId,
                      colors: palette.colors,
                      createdAt: palette.createdAt,
                      label: "v1",
                    },
                  ];
            // The new version continues whatever branch is currently
            // active (the tip), incrementing its label: v3 → v4, or
            // v2.1 → v2.2 if the user is working on a restored branch.
            const tip =
              existingVersions.find(
                (v) => v.id === palette.currentVersionId
              ) ?? existingVersions[existingVersions.length - 1];
            const takenLabels = new Set(
              existingVersions.map((v) => v.label ?? "")
            );
            const newVersion: PaletteVersion = {
              id: nanoid(),
              colors: colorsSnapshot,
              createdAt: now,
              parentId: tip.id,
              label: freeVersionLabel(
                bumpVersionLabel(tip.label ?? "v1"),
                takenLabels
              ),
            };
            return {
              ...palette,
              name,
              colors: colorsSnapshot,
              pieceSize: pieceSizeSnapshot,
              patternOverride: patternOverrideSnapshot,
              patternDirectionOverride: patternDirectionOverrideSnapshot,
              updatedAt: now,
              // Don't wipe an existing folder when saving without one.
              folderId: folderId ?? palette.folderId,
              versions: [...existingVersions, newVersion],
              currentVersionId: newVersion.id,
            };
          }),
          // Keep the palette "open" so further edits keep stacking
          // versions onto the same design instead of forking a new one.
          editingPaletteId: editingId,
          lastSaved: Date.now(),
        }));
      } else {
        const firstVersionId = nanoid();
        const newPalette: SavedPalette = {
          id: Date.now().toString(),
          name,
          colors: colorsSnapshot,
          pieceSize: pieceSizeSnapshot,
          patternOverride: patternOverrideSnapshot,
          patternDirectionOverride: patternDirectionOverrideSnapshot,
          createdAt: now,
          folderId,
          currentVersionId: firstVersionId,
          versions: [
            {
              id: firstVersionId,
              colors: colorsSnapshot,
              createdAt: now,
              label: "v1",
            },
          ],
        };
        set((state) => ({
          savedPalettes: [...state.savedPalettes, newPalette],
          editingPaletteId: null,
          lastSaved: Date.now(),
        }));
      }
    },
    updatePalette: (id, updates) =>
      set((state) => ({
        savedPalettes: state.savedPalettes.map((palette) =>
          palette.id === id
            ? {
                ...palette,
                ...updates,
                updatedAt: new Date().toISOString(),
              }
            : palette
        ),
      })),
    deletePalette: (id) =>
      set((state) => ({
        savedPalettes: state.savedPalettes.filter(
          (palette) => palette.id !== id
        ),
      })),
    applyPalette: (paletteId) =>
      set((state) => {
        const palette = state.savedPalettes.find((p) => p.id === paletteId);
        if (!palette) return state;

        return {
          customPalette: [...palette.colors],
          selectedDesign: ItemDesigns.Custom,
          currentColors: createColorMap(palette.colors),
          editingPaletteId: paletteId,
          patternOverride: { ...(palette.patternOverride ?? {}) },
          patternDirectionOverride: {
            ...(palette.patternDirectionOverride ?? {}),
          },
        };
      }),
    // Preview a specific version in the viewer without changing history.
    applyPaletteVersion: (paletteId, versionId) =>
      set((state) => {
        const palette = state.savedPalettes.find((p) => p.id === paletteId);
        const version = palette?.versions?.find((v) => v.id === versionId);
        if (!palette || !version) return state;

        return {
          customPalette: [...version.colors],
          selectedDesign: ItemDesigns.Custom,
          currentColors: createColorMap(version.colors),
          patternOverride: { ...(palette.patternOverride ?? {}) },
          patternDirectionOverride: {
            ...(palette.patternDirectionOverride ?? {}),
          },
        };
      }),
    // Restore an older version by branching off it. Append-only and
    // non-destructive: this creates a new version whose parent is the
    // restored one, starting a fresh branch (e.g. v2 → v2.1). The
    // original linear history is left untouched; further edits continue
    // the new branch (v2.1 → v2.2 …).
    restorePaletteVersion: (paletteId, versionId) =>
      set((state) => {
        const palette = state.savedPalettes.find((p) => p.id === paletteId);
        const source = palette?.versions?.find((v) => v.id === versionId);
        if (!palette || !source) return state;

        const colors = source.colors.map((c) => ({ ...c }));
        const versions = palette.versions ?? [];
        const sourceLabel = source.label || "v1";
        const takenLabels = new Set(versions.map((v) => v.label ?? ""));
        // First version of a new branch off the source: v2 → v2.1. If
        // that branch root already exists (restored more than once),
        // freeVersionLabel bumps it to the next free slot (v2.2, …).
        const branchLabel = freeVersionLabel(`${sourceLabel}.1`, takenLabels);
        const restored: PaletteVersion = {
          id: nanoid(),
          colors,
          createdAt: new Date().toISOString(),
          parentId: source.id,
          branchedFrom: sourceLabel,
          label: branchLabel,
        };

        return {
          savedPalettes: state.savedPalettes.map((p) =>
            p.id === paletteId
              ? {
                  ...p,
                  colors,
                  updatedAt: new Date().toISOString(),
                  versions: [...versions, restored],
                  currentVersionId: restored.id,
                }
              : p
          ),
          lastSaved: Date.now(),
        };
      }),
    renamePaletteVersion: (paletteId, versionId, label) =>
      set((state) => ({
        savedPalettes: state.savedPalettes.map((p) =>
          p.id === paletteId
            ? {
                ...p,
                versions: (p.versions ?? []).map((v) =>
                  v.id === versionId ? { ...v, label } : v
                ),
              }
            : p
        ),
        lastSaved: Date.now(),
      })),
    // Explicit, user-initiated removal of a single version. Guarded so a
    // design can never be left with zero versions.
    deletePaletteVersion: (paletteId, versionId) =>
      set((state) => ({
        savedPalettes: state.savedPalettes.map((p) => {
          if (p.id !== paletteId) return p;
          const versions = p.versions ?? [];
          if (versions.length <= 1) return p;
          return {
            ...p,
            versions: versions.filter((v) => v.id !== versionId),
          };
        }),
        lastSaved: Date.now(),
      })),
    loadPaletteForEditing: (paletteId) =>
      set((state) => {
        const palette = state.savedPalettes.find((p) => p.id === paletteId);
        if (!palette) return state;

        // Ensure all colors have IDs
        const colorsWithIds = palette.colors.map((c) => ({
          ...c,
          id: c.id || nanoid(),
        }));

        // Initialize history with the loaded palette
        const newHistory = [[...colorsWithIds]];

        return {
          customPalette: [...colorsWithIds],
          pieceSize: { ...DEFAULT_PIECE_SIZE, ...palette.pieceSize },
          selectedDesign: ItemDesigns.Custom,
          currentColors: createColorMap(colorsWithIds),
          selectedColors: [],
          editingPaletteId: paletteId,
          patternOverride: { ...(palette.patternOverride ?? {}) },
          patternDirectionOverride: {
            ...(palette.patternDirectionOverride ?? {}),
          },
          paletteHistory: newHistory,
          paletteHistoryIndex: 0,
        };
      }),
    setEditingPaletteId: (id) => set({ editingPaletteId: id }),
    updateColorName: (index, name) =>
      set((state) => {
        if (index < 0 || index >= state.customPalette.length) return state;

        const newPalette = [...state.customPalette];
        newPalette[index] = { ...newPalette[index], name };

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(newPalette);

        return {
          customPalette: newPalette,
          currentColors: createColorMap(newPalette),
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    updateColorHex: (index, hex) =>
      set((state) => {
        if (
          index < 0 ||
          index >= state.customPalette.length ||
          !/^#[0-9A-Fa-f]{6}$/.test(hex)
        )
          return state;

        const newPalette = [...state.customPalette];
        // Manually setting a hex makes the color primary: the user has
        // taken it over, so sever its mix link and any stale paint-match
        // identity (otherwise the reblend below would overwrite it, or a
        // later re-ground/convert-to-hex would restore the old color).
        newPalette[index] = { ...detachColorMetadata(newPalette[index]), hex };

        // Re-derive every mixed color that descends from the changed
        // primary so the whole palette stays consistent in one edit.
        const reblended = reblendMixedColors(newPalette);

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(reblended);

        return {
          customPalette: reblended,
          currentColors: createColorMap(reblended),
          // selectedColors stores IDs, so no need to update it when hex changes
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    updateColor: (index, changes) =>
      set((state) => {
        if (index < 0 || index >= state.customPalette.length) return state;
        const { hex, name } = changes;
        if (hex !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(hex)) {
          return state;
        }

        const newPalette = [...state.customPalette];
        if (hex !== undefined) {
          // Manual hex makes the color primary — sever its mix link and
          // every stale paint-match field (match %, recipe, the original
          // source it was grounded from, backup) so the edit fully
          // detaches it from its prior grounding.
          newPalette[index] = {
            ...detachColorMetadata(newPalette[index]),
            hex,
          };
        }
        if (name !== undefined) {
          newPalette[index] = { ...newPalette[index], name };
        }

        // Both edits land in a single history entry → one undo step.
        const reblended = reblendMixedColors(newPalette);
        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        // If history was never seeded, record the pre-edit palette as
        // the undo target — otherwise this single push lands at index 0
        // and undo (which needs index > 0) can't go back at all.
        if (newHistory.length === 0) newHistory.push(state.customPalette);
        newHistory.push(reblended);

        return {
          customPalette: reblended,
          currentColors: createColorMap(reblended),
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    updateColorExtraPercent: (index, extraPercent) =>
      set((state) => {
        if (index < 0 || index >= state.customPalette.length) return state;
        const clamped = Math.max(
          0,
          Math.min(500,
            typeof extraPercent === "number" && !Number.isNaN(extraPercent)
              ? extraPercent
              : 0
          )
        );

        const newPalette = [...state.customPalette];
        newPalette[index] = { ...newPalette[index], extraPercent: clamped };

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(newPalette);

        return {
          customPalette: newPalette,
          currentColors: createColorMap(newPalette),
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    setActiveTab: (tab: "create" | "saved" | "official" | "extract") =>
      set({ activeTab: tab }),
    setImageExtractorImage: (image: string | null) =>
      // A new image invalidates everything derived from the previous one.
      set({
        imageExtractor: {
          image,
          extractedFrom: null,
          dominantColors: [],
          pickedColors: [],
          selectedAutoColors: [],
        },
      }),
    setImageExtractorResult: (extractedFrom: string, dominantColors: string[]) =>
      set((state) => ({
        imageExtractor: {
          ...state.imageExtractor,
          extractedFrom,
          dominantColors,
        },
      })),
    setImageExtractorPickedColors: (colors: string[]) =>
      set((state) => ({
        imageExtractor: { ...state.imageExtractor, pickedColors: colors },
      })),
    setImageExtractorSelectedAutoColors: (colors: string[]) =>
      set((state) => ({
        imageExtractor: {
          ...state.imageExtractor,
          selectedAutoColors: colors,
        },
      })),
    setHistoryPaletteId: (id: string | null) =>
      set({ historyPaletteId: id }),
    setPieceSize: (updates) =>
      set((state) => ({
        pieceSize: { ...state.pieceSize, ...updates },
      })),
    resetPaletteEditor: () =>
      set({
        customPalette: [],
        pieceSize: DEFAULT_PIECE_SIZE,
        selectedColors: [],
        editingPaletteId: null,
        patternOverride: {},
        patternDirectionOverride: {},
        paletteHistory: [],
        paletteHistoryIndex: -1,
      }),
    loadOfficialPalette: (design: ItemDesigns) =>
      set((state) => {
        const designColors = DESIGN_COLORS[design];
        const customColors: CustomColor[] = Object.values(designColors).map(
          (color) => ({
            id: nanoid(),
            hex: color.hex,
            name: color.name,
          })
        );

        // Initialize history with the new palette
        const newHistory = [...state.paletteHistory, customColors];

        return {
          customPalette: customColors,
          selectedDesign: ItemDesigns.Custom,
          currentColors: createColorMap(customColors),
          selectedColors: [],
          editingPaletteId: null,
          patternOverride: {},
          patternDirectionOverride: {},
          activeTab: "create",
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    setCustomPalette: (palette: CustomColor[]) =>
      set((state) => {
        const paletteWithIds = refreshHandMixMetadata(
          palette.map((c) => ({
            ...c,
            id: c.id || nanoid(),
          }))
        );

        const newHistory = state.paletteHistory.slice(
          0,
          state.paletteHistoryIndex + 1
        );
        newHistory.push(paletteWithIds);

        return {
          customPalette: paletteWithIds,
          currentColors: createColorMap(paletteWithIds),
          paletteHistory: newHistory,
          paletteHistoryIndex: newHistory.length - 1,
        };
      }),
    generateShareableLink: () => {
      return generateShareableUrl(get().getShareableStateSnapshot());
    },
    generateShortShareableLink: () => {
      return generateShortShareableUrl(get().getShareableStateSnapshot());
    },
    getShareableStateSnapshot: () => {
      const state = get();
      const sharedPatternGrid = cloneSharedPatternGrid(
        state.drawnPatternGrid,
        state.drawnPatternGridSize
      );
      return {
        dimensions: state.dimensions,
        selectedDesign: state.selectedDesign,
        shippingSpeed: state.shippingSpeed,
        colorPattern: state.colorPattern,
        orientation: state.orientation,
        isReversed: state.isReversed,
        customPalette: state.customPalette,
        isRotated: state.isRotated,
        style: state.style,
        useMini: state.useMini,
        activeCustomMode: state.activeCustomMode,
        scatterEase: state.scatterEase,
        scatterWidth: state.scatterWidth,
        scatterAmount: state.scatterAmount,
        ...sharedPatternGrid,
        patternOverride: { ...state.patternOverride },
        patternDirectionOverride: { ...state.patternDirectionOverride },
      };
    },
    getShareableDesignData: () => {
      const state = get();
      return {
        dimensions: state.dimensions,
        selectedDesign: state.selectedDesign,
        colorPattern: state.colorPattern,
        orientation: state.orientation,
        isReversed: state.isReversed,
        customPalette: state.customPalette.map((c) => ({
          hex: c.hex,
          name: c.name,
          ...(c.extraPercent != null && c.extraPercent !== 0
            ? { extraPercent: c.extraPercent }
            : {}),
        })),
        isRotated: state.isRotated,
        useMini: state.useMini,
      };
    },
    createSharedDesign: async (userId?: string, email?: string) => {
      const shareableState = get().getShareableStateSnapshot();

      try {
        const response = await fetch("/api/shared-designs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            designData: shareableState,
            userId,
            email,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create shared design");
        }

        const result = await response.json();
        return {
          success: true,
          shareId: result.shareId,
          shareUrl: result.shareUrl,
        };
      } catch (error) {
        console.error("Error creating shared design:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    createSharedDesignSet: async (designs, userId, email) => {
      if (!Array.isArray(designs) || designs.length === 0) {
        return { success: false, error: "Add at least one design to share." };
      }

      try {
        const response = await fetch("/api/shared-design-sets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ designs, userId, email }),
        });

        if (!response.ok) {
          throw new Error("Failed to create shared design set");
        }

        const result: { setId: string; setUrl: string } = await response.json();
        return { success: true, setId: result.setId, setUrl: result.setUrl };
      } catch (error) {
        console.error("Error creating shared design set:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    createSharedDesignSetFromPalettes: async (
      paletteIds: string[],
      userId?: string,
      email?: string
    ) => {
      const state = get();
      const normalizedIds = paletteIds.filter(Boolean);

      if (normalizedIds.length === 0) {
        return { success: false, error: "Select at least one palette." };
      }

      const baseDesign = get().getShareableStateSnapshot();
      const palettes = normalizedIds
        .map((id) => state.savedPalettes.find((p) => p.id === id))
        .filter((p): p is SavedPalette => Boolean(p));

      if (palettes.length === 0) {
        return {
          success: false,
          error: "No matching palettes found. Please reselect and try again.",
        };
      }

      const designs = palettes.map((palette) => ({
        label: palette.name,
        designData: buildShareableStateForPalette(baseDesign, palette),
      }));

      return get().createSharedDesignSet(designs, userId, email);
    },
    loadFromShareableData: (data: string) => {
      try {
        let shareableState: ShareableState;

        if (data.includes("s=")) {
          const shortData = data.split("s=")[1];
          shareableState = extractStateFromShortUrl<ShareableState>(shortData);
        } else {
          const regularData = data.includes("share=")
            ? data.split("share=")[1]
            : data;
          shareableState = extractStateFromUrl<ShareableState>(regularData);
        }

        if (!shareableState.dimensions || !shareableState.selectedDesign) {
          return false;
        }

        // Ensure loaded palette has IDs and normalized extraPercent
        const loadedPalette = (shareableState.customPalette || []).map(
          (c: { id?: string; hex: string; name?: string; extraPercent?: number }) => ({
            ...c,
            id: c.id || nanoid(),
            extraPercent:
              typeof c.extraPercent === "number" && !Number.isNaN(c.extraPercent)
                ? c.extraPercent
                : 0,
          })
        );
        const sharedPatternGrid = cloneSharedPatternGrid(
          shareableState.drawnPatternGrid,
          shareableState.drawnPatternGridSize
        );

        set({
          dimensions: shareableState.dimensions,
          selectedDesign: shareableState.selectedDesign,
          shippingSpeed: shareableState.shippingSpeed,
          colorPattern: shareableState.colorPattern,
          orientation: shareableState.orientation,
          isReversed: shareableState.isReversed,
          customPalette: loadedPalette,
          isRotated: shareableState.isRotated,
          style: shareableState.style,
          useMini: shareableState.useMini ?? DEFAULT_USE_MINI,
          activeCustomMode: shareableState.activeCustomMode || "palette",
          scatterEase:
            shareableState.scatterEase ?? DEFAULT_SCATTER_EASE,
          scatterWidth:
            shareableState.scatterWidth ?? DEFAULT_SCATTER_WIDTH,
          scatterAmount:
            shareableState.scatterAmount ?? DEFAULT_SCATTER_AMOUNT,
          ...sharedPatternGrid,
          patternOverride: { ...(shareableState.patternOverride ?? {}) },
          patternDirectionOverride: {
            ...(shareableState.patternDirectionOverride ?? {}),
          },
          patternEditingMode: { tool: "none" },
          isPatternEditorActive: false,
          editingPaletteId: null,
          currentColors:
            shareableState.selectedDesign === ItemDesigns.Custom &&
            loadedPalette.length > 0
              ? createColorMap(loadedPalette)
              : DESIGN_COLORS[shareableState.selectedDesign as ItemDesigns] ||
                get().currentColors,
          pricing: calculatePrice(
            shareableState.dimensions,
            shareableState.shippingSpeed
          ),
        });

        return true;
      } catch (error) {
        console.error("Failed to load shared data:", error);
        return false;
      }
    },
    loadFromDatabaseData: (designData: ShareableState) => {
      try {
        if (!designData.dimensions || !designData.selectedDesign) {
          return false;
        }

        // Ensure loaded palette has IDs and normalized extraPercent
        const loadedPalette = (designData.customPalette || []).map(
          (c: { id?: string; hex: string; name?: string; extraPercent?: number }) => ({
            ...c,
            id: c.id || nanoid(),
            extraPercent:
              typeof c.extraPercent === "number" && !Number.isNaN(c.extraPercent)
                ? c.extraPercent
                : 0,
          })
        );
        const sharedPatternGrid = cloneSharedPatternGrid(
          designData.drawnPatternGrid,
          designData.drawnPatternGridSize
        );

        set({
          dimensions: designData.dimensions,
          selectedDesign: designData.selectedDesign,
          shippingSpeed: designData.shippingSpeed,
          colorPattern: designData.colorPattern,
          orientation: designData.orientation,
          isReversed: designData.isReversed,
          customPalette: loadedPalette,
          isRotated: designData.isRotated,
          style: designData.style,
          useMini: designData.useMini ?? DEFAULT_USE_MINI,
          activeCustomMode: designData.activeCustomMode || "palette",
          scatterEase: designData.scatterEase ?? DEFAULT_SCATTER_EASE,
          scatterWidth: designData.scatterWidth ?? DEFAULT_SCATTER_WIDTH,
          scatterAmount: designData.scatterAmount ?? DEFAULT_SCATTER_AMOUNT,
          ...sharedPatternGrid,
          patternOverride: { ...(designData.patternOverride ?? {}) },
          patternDirectionOverride: {
            ...(designData.patternDirectionOverride ?? {}),
          },
          patternEditingMode: { tool: "none" },
          isPatternEditorActive: false,
          editingPaletteId: null,
          currentColors:
            designData.selectedDesign === ItemDesigns.Custom &&
            loadedPalette.length > 0
              ? createColorMap(loadedPalette)
              : DESIGN_COLORS[designData.selectedDesign as ItemDesigns] ||
                get().currentColors,
          pricing: calculatePrice(
            designData.dimensions,
            designData.shippingSpeed
          ),
        });

        return true;
      } catch (error) {
        console.error("Failed to load database data:", error);
        return false;
      }
    },
    syncWithDatabase: (autoSave = true): (() => void) | void => {
      if (typeof window === "undefined") return;

      const authContext = (window as any).__authContext;
      const isAuthenticated = authContext?.user !== null;
      const isGuest = authContext?.isGuest === true;

      if (isAuthenticated) {
        get().loadFromDatabase();
      } else if (isGuest) {
        try {
          const savedState = localStorage.getItem("everwood_guest_data");
          if (savedState) {
            const data = JSON.parse(savedState) as PersistentState & {
              dataSyncVersion?: number;
            };

            const viewSettings = {
              showRuler: data.viewSettings?.showRuler ?? false,
              showWoodGrain: data.viewSettings?.showWoodGrain ?? true,
              showColorInfo: data.viewSettings?.showColorInfo ?? false,
              showHanger: data.viewSettings?.showHanger ?? false,
              showSplitPanel: data.viewSettings?.showSplitPanel ?? false,
              showFPS: data.viewSettings?.showFPS ?? false,
              showUIControls: data.viewSettings?.showUIControls ?? true,
              showRoom: data.viewSettings?.showRoom ?? true,
              wallColor: data.viewSettings?.wallColor ?? DEFAULT_WALL_COLOR,
              woodStyle: data.viewSettings?.woodStyle ?? DEFAULT_WOOD_STYLE_ID,
              metallic: data.viewSettings?.metallic ?? false,
            };

            const localVersion = get().dataSyncVersion;
            const storedVersion = data.dataSyncVersion || 0;

            if (storedVersion >= localVersion || get().lastSaved === 0) {
              // Drop the editing link if its saved palette is gone, so
              // a refresh never leaves "Save Version" pointing nowhere.
              const guestSavedPalettes = data.savedPalettes || [];
              const guestEditingId = data.editingPaletteId ?? null;
              const guestEditingExists =
                guestEditingId != null &&
                guestSavedPalettes.some((p) => p.id === guestEditingId);

              set({
                ...data,
                editingPaletteId: guestEditingExists ? guestEditingId : null,
                viewSettings,
                paletteFolders: data.paletteFolders || [],
                currentColors:
                  data.customPalette && data.customPalette.length > 0
                    ? createColorMap(data.customPalette)
                    : DESIGN_COLORS[data.selectedDesign as ItemDesigns] ||
                      get().currentColors,
                pricing: calculatePrice(
                  data.dimensions || get().dimensions,
                  data.shippingSpeed || get().shippingSpeed
                ),
                dataSyncVersion: Math.max(storedVersion, localVersion),
                lastSaved: Date.now(),
              });

              console.log(
                `Loaded data from localStorage (version ${storedVersion})`
              );
            } else {
              console.log(
                `Local data (v${localVersion}) is newer than stored data (v${storedVersion}). Keeping local data.`
              );
            }
          }
        } catch (error) {
          console.error("Error loading from localStorage:", error);
        }
      }

      if (autoSave) {
        const saveInterval = setInterval(() => {
          if (!get().autoSaveEnabled) return;

          const authContext = (window as any).__authContext;
          const isAuthenticated = authContext?.user !== null;
          const isGuest = authContext?.isGuest === true;

          if (isAuthenticated) {
            get().saveToDatabase();
          } else if (isGuest) {
            get().saveToLocalStorage();
          }
        }, STORE_PERSISTENCE_INTERVAL_MS);

        return () => clearInterval(saveInterval);
      }
    },
    saveToLocalStorage: (): boolean => {
      try {
        const currentVersion = get().dataSyncVersion;
        const newVersion = currentVersion + 1;

        const stateToSave: PersistentState & { dataSyncVersion: number } = {
          dimensions: get().dimensions,
          selectedDesign: get().selectedDesign,
          shippingSpeed: get().shippingSpeed,
          colorPattern: get().colorPattern,
          orientation: get().orientation,
          isReversed: get().isReversed,
          customPalette: get().customPalette,
          pieceSize: get().pieceSize,
          isRotated: get().isRotated,
          style: get().style,
          savedPalettes: get().savedPalettes,
          paletteFolders: get().paletteFolders,
          useMini: get().useMini,
          viewSettings: get().viewSettings,
          activeCustomMode: get().activeCustomMode,
          scatterEase: get().scatterEase,
          scatterWidth: get().scatterWidth,
          scatterAmount: get().scatterAmount,
          ...cloneSharedPatternGrid(
            get().drawnPatternGrid,
            get().drawnPatternGridSize
          ),
          patternOverride: get().patternOverride,
          patternDirectionOverride: get().patternDirectionOverride,
          draftSet: get().draftSet,
          editingPaletteId: get().editingPaletteId,
          dataSyncVersion: newVersion,
        };

        localStorage.setItem(
          "everwood_guest_data",
          JSON.stringify(stateToSave)
        );

        set({
          lastSaved: Date.now(),
          dataSyncVersion: newVersion,
        });

        console.log(
          `Store data saved to local storage (version ${newVersion})`
        );
        return true;
      } catch (error) {
        console.error("Error saving data to local storage:", error);
        return false;
      }
    },
    saveToDatabase: async (): Promise<boolean> => {
      if (typeof window !== "undefined") {
        const authContext = (window as any).__authContext;
        const isAuthenticated = authContext?.user !== null;
        const isGuest = authContext?.isGuest === true;

        if (isGuest) {
          return get().saveToLocalStorage();
        }

        if (isAuthenticated) {
          try {
            const currentVersion = get().dataSyncVersion;
            const newVersion = currentVersion + 1;

            const stateToSave: PersistentState & { dataSyncVersion: number } = {
              dimensions: get().dimensions,
              selectedDesign: get().selectedDesign,
              shippingSpeed: get().shippingSpeed,
              colorPattern: get().colorPattern,
              orientation: get().orientation,
              isReversed: get().isReversed,
              customPalette: get().customPalette,
              pieceSize: get().pieceSize,
              isRotated: get().isRotated,
              style: get().style,
              savedPalettes: get().savedPalettes,
              paletteFolders: get().paletteFolders,
              useMini: get().useMini,
              viewSettings: get().viewSettings,
              activeCustomMode: get().activeCustomMode,
              scatterEase: get().scatterEase,
              scatterWidth: get().scatterWidth,
              scatterAmount: get().scatterAmount,
              ...cloneSharedPatternGrid(
                get().drawnPatternGrid,
                get().drawnPatternGridSize
              ),
              patternOverride: get().patternOverride,
              patternDirectionOverride: get().patternDirectionOverride,
              editingPaletteId: get().editingPaletteId,
              dataSyncVersion: newVersion,
            };

            const hasNoLocalData =
              stateToSave.savedPalettes.length === 0 &&
              stateToSave.paletteFolders.length === 0;
            const isKnownFreshStart = get().lastSaved === 0;

            if (hasNoLocalData && !isKnownFreshStart) {
              try {
                const currentData = await authContext.loadUserData();

                if (currentData) {
                  if (
                    currentData.dataSyncVersion &&
                    currentData.dataSyncVersion > currentVersion
                  ) {
                    console.warn(
                      "Server has newer data (version mismatch). Aborting save to prevent data loss."
                    );
                    const loadSuccess = await get().loadFromDatabase();
                    return loadSuccess;
                  }

                  if (
                    currentData.savedPalettes?.length > 0 ||
                    currentData.paletteFolders?.length > 0
                  ) {
                    stateToSave.savedPalettes = currentData.savedPalettes || [];
                    stateToSave.paletteFolders =
                      currentData.paletteFolders || [];
                    console.log(
                      "Preserved existing palettes and folders during save"
                    );
                  }
                }
              } catch (fetchError) {
                console.error(
                  "Failed to fetch current data during save:",
                  fetchError
                );
                return false;
              }
            }

            const success = await authContext.saveUserData(stateToSave);

            if (success) {
              set({
                lastSaved: Date.now(),
                dataSyncVersion: newVersion,
              });
              return true;
            }
          } catch (error) {
            console.error("Error saving data to database:", error);
          }
        }
      }
      return false;
    },
    loadFromDatabase: async (): Promise<boolean> => {
      try {
        if (typeof window === "undefined") return false;

        const authContext = (window as any).__authContext;
        if (!authContext || !authContext.user || !authContext.loadUserData) {
          console.error("Auth context not available for database load");
          return false;
        }

        let loadAttempts = 0;
        const maxAttempts = 3;
        let data = null;

        while (loadAttempts < maxAttempts && !data) {
          try {
            data = await authContext.loadUserData();
            break;
          } catch (loadError) {
            loadAttempts++;
            console.error(`Load attempt ${loadAttempts} failed:`, loadError);

            if (loadAttempts < maxAttempts) {
              await new Promise((resolve) =>
                setTimeout(resolve, 500 * Math.pow(2, loadAttempts - 1))
              );
            }
          }
        }

        if (!data) {
          console.error("Failed to load user data after multiple attempts");
          return false;
        }

        if (!data.dimensions) {
          console.error("Loaded data is missing key properties");
          return false;
        }

        const localVersion = get().dataSyncVersion;
        const serverVersion = data.dataSyncVersion || 0;

        if (localVersion > serverVersion && get().lastSaved > 0) {
          console.log(
            `Local data (v${localVersion}) is newer than server data (v${serverVersion}). Keeping local data.`
          );
          return false;
        }

        const isFirstLoad = get().lastSaved === 0;

        let mergedState: Partial<PersistentState> = { ...data };

        if (
          !isFirstLoad &&
          get().lastSaved > 0 &&
          localVersion >= serverVersion
        ) {
          const currentState = get();

          if (
            currentState.savedPalettes.length >
            (data.savedPalettes?.length || 0)
          ) {
            console.log("Using local palettes which appear more complete");
            mergedState.savedPalettes = currentState.savedPalettes;
          }

          if (
            currentState.paletteFolders.length >
            (data.paletteFolders?.length || 0)
          ) {
            console.log(
              "Using local palette folders which appear more complete"
            );
            mergedState.paletteFolders = currentState.paletteFolders;
          }
        }

        const finalState = {
          dimensions: mergedState.dimensions || get().dimensions,
          selectedDesign: mergedState.selectedDesign || get().selectedDesign,
          shippingSpeed: mergedState.shippingSpeed || get().shippingSpeed,
          colorPattern: mergedState.colorPattern || get().colorPattern,
          orientation: mergedState.orientation || get().orientation,
          isReversed: mergedState.isReversed ?? get().isReversed,
          customPalette: mergedState.customPalette || get().customPalette,
          pieceSize: mergedState.pieceSize
            ? { ...DEFAULT_PIECE_SIZE, ...mergedState.pieceSize }
            : get().pieceSize,
          isRotated: mergedState.isRotated ?? get().isRotated,
          style: mergedState.style || get().style,
          activeCustomMode:
            mergedState.activeCustomMode || get().activeCustomMode,
          scatterEase:
            mergedState.scatterEase ?? DEFAULT_SCATTER_EASE,
          scatterWidth:
            mergedState.scatterWidth ?? DEFAULT_SCATTER_WIDTH,
          scatterAmount:
            mergedState.scatterAmount ?? DEFAULT_SCATTER_AMOUNT,
          ...cloneSharedPatternGrid(
            mergedState.drawnPatternGrid,
            mergedState.drawnPatternGridSize
          ),
          patternOverride: { ...(mergedState.patternOverride ?? {}) },
          patternDirectionOverride: {
            ...(mergedState.patternDirectionOverride ?? {}),
          },
          savedPalettes: ensurePaletteVersions(mergedState.savedPalettes || []),
          paletteFolders: mergedState.paletteFolders || [],
          useMini: mergedState.useMini ?? get().useMini,
          viewSettings: {
            showRuler:
              mergedState.viewSettings?.showRuler ??
              get().viewSettings.showRuler,
            showWoodGrain:
              mergedState.viewSettings?.showWoodGrain ??
              get().viewSettings.showWoodGrain,
            showColorInfo:
              mergedState.viewSettings?.showColorInfo ??
              get().viewSettings.showColorInfo,
            showHanger:
              mergedState.viewSettings?.showHanger ??
              get().viewSettings.showHanger,
            showSplitPanel:
              mergedState.viewSettings?.showSplitPanel ??
              get().viewSettings.showSplitPanel,
            showFPS:
              mergedState.viewSettings?.showFPS ?? get().viewSettings.showFPS,
            showUIControls:
              mergedState.viewSettings?.showUIControls ??
              get().viewSettings.showUIControls,
            showRoom:
              mergedState.viewSettings?.showRoom ??
              get().viewSettings.showRoom,
            wallColor:
              mergedState.viewSettings?.wallColor ??
              get().viewSettings.wallColor,
            woodStyle:
              mergedState.viewSettings?.woodStyle ??
              get().viewSettings.woodStyle,
            metallic:
              mergedState.viewSettings?.metallic ??
              get().viewSettings.metallic,
          },
          currentColors:
            mergedState.selectedDesign === ItemDesigns.Custom &&
            mergedState.customPalette?.length! > 0
              ? createColorMap(mergedState.customPalette!)
              : DESIGN_COLORS[mergedState.selectedDesign as ItemDesigns] ||
                get().currentColors,
          pricing: calculatePrice(
            mergedState.dimensions || get().dimensions,
            mergedState.shippingSpeed || get().shippingSpeed
          ),
          dataSyncVersion: Math.max(serverVersion, localVersion),
        };

        // Keep an in-progress palette connected to the saved palette it
        // was opened from, but only if that palette still exists — a
        // dangling id would make "Save Version" target nothing.
        const restoredEditingId = mergedState.editingPaletteId ?? null;
        const editingStillExists =
          restoredEditingId != null &&
          finalState.savedPalettes.some((p) => p.id === restoredEditingId);

        set({
          ...finalState,
          editingPaletteId: editingStillExists ? restoredEditingId : null,
          lastSaved: Date.now(),
        });

        console.log(
          `Successfully loaded and merged user data from database (version ${serverVersion})`
        );
        return true;
      } catch (error) {
        console.error("Unexpected error loading from database:", error);
        return false;
      }
    },
    setAutoSaveEnabled: (enabled) => set({ autoSaveEnabled: enabled }),
    createDraftOrder: async () => {
      try {
        const state = get();

        const response = await fetch("/api/create-draft-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dimensions: state.dimensions,
            selectedDesign: state.selectedDesign,
            shippingSpeed: state.shippingSpeed,
            colorPattern: state.colorPattern,
            orientation: state.orientation,
            customPalette: state.customPalette,
            pricing: state.pricing,
            isReversed: state.isReversed,
            style: state.style,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: data.error || "Failed to create order",
          };
        }

        return {
          success: true,
          checkoutUrl: data.checkoutUrl || null,
          draftOrder: data.draftOrder || null,
        };
      } catch (error) {
        console.error("Error creating order:", error);
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create order",
        };
      }
    },
    createPaletteFolder: (name: string) => {
      const id = Date.now().toString();
      const newFolder: Folder = {
        id,
        name,
        createdAt: new Date().toISOString(),
      };

      set((state) => ({
        paletteFolders: [...state.paletteFolders, newFolder],
        lastSaved: Date.now(),
      }));

      return id;
    },
    updatePaletteFolder: (id: string, updates: Partial<Folder>) => {
      set((state) => ({
        paletteFolders: state.paletteFolders.map((folder) =>
          folder.id === id
            ? {
                ...folder,
                ...updates,
                updatedAt: new Date().toISOString(),
              }
            : folder
        ),
        lastSaved: Date.now(),
      }));
    },
    deletePaletteFolder: (id: string) => {
      set((state) => ({
        paletteFolders: state.paletteFolders.filter(
          (folder) => folder.id !== id
        ),
        savedPalettes: state.savedPalettes.map((palette) =>
          palette.folderId === id
            ? { ...palette, folderId: undefined }
            : palette
        ),
        lastSaved: Date.now(),
      }));
    },
    movePaletteToFolder: (paletteId: string, folderId: string | null) => {
      set((state) => ({
        savedPalettes: state.savedPalettes.map((palette) =>
          palette.id === paletteId
            ? { ...palette, folderId: folderId || undefined }
            : palette
        ),
        lastSaved: Date.now(),
      }));
    },
    togglePalettePublic: (id: string) =>
      set((state) => ({
        savedPalettes: state.savedPalettes.map((palette) =>
          palette.id === id
            ? {
                ...palette,
                isPublic: !palette.isPublic,
                updatedAt: new Date().toISOString(),
              }
            : palette
        ),
      })),
    setDrawnPattern: (
      grid: PatternCell[][],
      size: { width: number; height: number },
      keepCustomPalette?: boolean
    ) => {
      set((state) => ({
        drawnPatternGrid: grid,
        drawnPatternGridSize: size,
        selectedDesign: ItemDesigns.Custom, // Ensure design type is Custom
        activeCustomMode: "pattern", // Set to pattern mode
        // Keep both custom palette and current colors - don't clear anything
        currentColors: null, // Clear currentColors as the pattern has embedded colors
      }));
    },
    clearDrawnPattern: (keepCustomPalette?: boolean) => {
      set((state) => ({
        drawnPatternGrid: null,
        drawnPatternGridSize: null,
        // If we still have a custom palette, stay in Custom mode but switch to palette mode
        selectedDesign:
          state.customPalette.length > 0
            ? ItemDesigns.Custom
            : ItemDesigns.Coastal,
        activeCustomMode:
          state.customPalette.length > 0 ? "palette" : "palette",
        currentColors:
          state.customPalette.length > 0
            ? createColorMap(state.customPalette)
            : DESIGN_COLORS[ItemDesigns.Coastal],
      }));
    },
    undoPaletteAction: () => {
      const state = get();
      if (state.paletteHistoryIndex <= 0) return false;

      const newIndex = state.paletteHistoryIndex - 1;
      const previousPalette = state.paletteHistory[newIndex];

      set({
        customPalette: previousPalette,
        currentColors: createColorMap(previousPalette),
        paletteHistoryIndex: newIndex,
      });

      return true;
    },
    redoPaletteAction: () => {
      const state = get();
      if (state.paletteHistoryIndex >= state.paletteHistory.length - 1)
        return false;

      const newIndex = state.paletteHistoryIndex + 1;
      const nextPalette = state.paletteHistory[newIndex];

      set({
        customPalette: nextPalette,
        currentColors: createColorMap(nextPalette),
        paletteHistoryIndex: newIndex,
      });

      return true;
    },
    setActiveCustomMode: (mode: CustomMode) => set({ activeCustomMode: mode }),

    // Draft Set Actions
    addToDraftSet: (item) =>
      set((state) => ({
        draftSet: [
          ...state.draftSet,
          {
            id: nanoid(),
            label: item.label || `Design ${state.draftSet.length + 1}`,
            designData: item.designData,
            createdAt: Date.now(),
          },
        ],
      })),
    removeFromDraftSet: (id) =>
      set((state) => ({
        draftSet: state.draftSet.filter((item) => item.id !== id),
      })),
    clearDraftSet: () => set({ draftSet: [] }),
    updateDraftSetItemLabel: (id, label) =>
      set((state) => ({
        draftSet: state.draftSet.map((item) =>
          item.id === id ? { ...item, label } : item
        ),
      })),

    setPatternOverride: (overrides: PatternColorOverrides) =>
      set((state) => ({
        patternOverride: overrides,
        savedPalettes: syncPatternOverridesToActivePalette(
          state.savedPalettes,
          state.editingPaletteId,
          overrides,
          state.patternDirectionOverride
        ),
      })),
    setPatternSquareColor: (key, colorIndex) =>
      get().applyPatternSquareEdit([key], {
        tool: "color",
        selectedColorIndex: colorIndex,
      }),
    setPatternSquareDirection: (key, direction) =>
      get().applyPatternSquareEdit([key], {
        tool: "direction",
        selectedDirection: direction,
      }),
    resetPatternSquare: (key) =>
      get().applyPatternSquareEdit([key], { tool: "eraser" }),
    applyPatternSquareEdit: (keys, edit) =>
      set((state) => {
        if (!keys.length || edit.tool === "none") return state;

        if (edit.tool === "color") {
          const changedKeys = keys.filter(
            (key) =>
              state.patternOverride[key] !== edit.selectedColorIndex
          );
          if (!changedKeys.length) return state;

          const patternOverride = { ...state.patternOverride };
          changedKeys.forEach((key) => {
            patternOverride[key] = edit.selectedColorIndex;
          });
          return {
            patternOverride,
            savedPalettes: syncPatternOverridesToActivePalette(
              state.savedPalettes,
              state.editingPaletteId,
              patternOverride,
              state.patternDirectionOverride
            ),
          };
        }

        if (edit.tool === "direction") {
          const changedKeys = keys.filter(
            (key) =>
              state.patternDirectionOverride[key] !== edit.selectedDirection
          );
          if (!changedKeys.length) return state;

          const patternDirectionOverride = {
            ...state.patternDirectionOverride,
          };
          changedKeys.forEach((key) => {
            patternDirectionOverride[key] = edit.selectedDirection;
          });
          return {
            patternDirectionOverride,
            savedPalettes: syncPatternOverridesToActivePalette(
              state.savedPalettes,
              state.editingPaletteId,
              state.patternOverride,
              patternDirectionOverride
            ),
          };
        }

        const changedKeys = keys.filter(
          (key) =>
            key in state.patternOverride ||
            key in state.patternDirectionOverride
        );
        if (!changedKeys.length) return state;

        const patternOverride = { ...state.patternOverride };
        const patternDirectionOverride = {
          ...state.patternDirectionOverride,
        };
        changedKeys.forEach((key) => {
          delete patternOverride[key];
          delete patternDirectionOverride[key];
        });
        return {
          patternOverride,
          patternDirectionOverride,
          savedPalettes: syncPatternOverridesToActivePalette(
            state.savedPalettes,
            state.editingPaletteId,
            patternOverride,
            patternDirectionOverride
          ),
        };
      }),
    clearPatternOverride: () =>
      set((state) => {
        if (
          !Object.keys(state.patternOverride).length &&
          !Object.keys(state.patternDirectionOverride).length
        ) {
          return state;
        }
        const patternOverride: PatternColorOverrides = {};
        const patternDirectionOverride: PatternDirectionOverrides = {};
        return {
          patternOverride,
          patternDirectionOverride,
          savedPalettes: syncPatternOverridesToActivePalette(
            state.savedPalettes,
            state.editingPaletteId,
            patternOverride,
            patternDirectionOverride
          ),
        };
      }),
    setPatternEditingMode: (mode: PatternEditingMode) =>
      set({ patternEditingMode: mode }),
    setPatternBrushShape: (shape: PatternBrushShape) =>
      set((state) => ({
        patternBrush: { ...state.patternBrush, shape },
      })),
    setPatternBrushSize: (shape, size) =>
      set((state) => {
        const { min, max, step } = PATTERN_BRUSH_SIZE_CONFIG;
        const clampedSize = Math.min(max, Math.max(min, size));
        const snappedSize =
          min + Math.round((clampedSize - min) / step) * step;
        return {
          patternBrush: {
            ...state.patternBrush,
            sizes: { ...state.patternBrush.sizes, [shape]: snappedSize },
          },
        };
      }),
    setIsPatternEditorActive: (active: boolean) =>
      set({ isPatternEditorActive: active }),
  }))
);

const debouncedSave = debounce(() => {
  const state = useCustomStore.getState();
  if (!state.autoSaveEnabled) return;
  void state.saveToDatabase();
}, STORE_PERSISTENCE_DEBOUNCE_MS);

useCustomStore.subscribe(
  (state) => {
    return AUTO_SAVE_TRACKED_PROPERTIES.reduce((acc, key) => {
      acc[key] = state[key] as any;
      return acc;
    }, {} as Partial<CustomState>);
  },
  (newState, prevState) => {
    if (!useCustomStore.getState().autoSaveEnabled) return;

    const hasChanged = !shallow(newState, prevState);

    if (hasChanged) {
      debouncedSave();
    }
  }
);

// After the store is created, call the init function to migrate data
const isStore = "everwood-init";
if (!(globalThis as any)[isStore]) {
  useCustomStore.getState().init();
  (globalThis as any)[isStore] = true;
}

// For direct access to the hover store
export const useHoverStore = createWithEqualityFn<HoverState>(
  (set) => ({
    hoverInfo: null,
    pinnedInfo: null,
    setHoverInfo: (info) => set({ hoverInfo: info }),
    setPinnedInfo: (info) => set({ pinnedInfo: info }),
  }),
  shallow
);
