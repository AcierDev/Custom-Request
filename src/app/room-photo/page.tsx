"use client";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🏠 SEE IT IN YOUR ROOM — the live 3D art placed on a customer photo   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// 1. Upload a room photo (or try a sample room).
// 2. Drag 4 dots onto the corners of something rectangular on the wall and
//    give its real height → camera + wall pose (lib/roomPhoto/wallPose).
// 3. The /viewer's own 3D model is rendered over the photo in true
//    perspective and scale; drag it around the wall, resize, relight, then
//    download or share the picture.
// 4. Furniture in front of the wall (a sofa back, a lamp) can be tapped or
//    brushed into the foreground mask so the art tucks in behind it
//    (lib/roomPhoto/foregroundMask).

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Brush,
  Download,
  Eraser,
  Eye,
  Hand,
  ImagePlus,
  Layers,
  Move,
  Share2,
  SquareDashed,
  Trash2,
  Undo2,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { SizeCard } from "@/components/cards/SizeCard";
import { cn } from "@/lib/utils";
import { appPath } from "@/lib/appPaths";
import { useCustomStore } from "@/store/customStore";
import { getArtSnapshot, subscribeArtSnapshot } from "@/lib/ar/artSnapshot";
import {
  pixelToWall,
  solveWallPose,
  wallToPixel,
  type Vec2,
} from "@/lib/roomPhoto/wallPose";
import {
  estimatePhotoLook,
  type PhotoLookEstimate,
} from "@/lib/roomPhoto/photoLook";
import { ForegroundMask } from "@/lib/roomPhoto/foregroundMask";
import {
  ROOM_PHOTO_SCENE_CONFIG,
  RoomPhotoScene,
  type RoomPhotoExportHandle,
} from "./components/RoomPhotoScene";

const ROOM_PHOTO_CONFIG = {
  // Uploads are downscaled to this long side: plenty for a phone screen or a
  // shared picture, and keeps decode/GPU RAM small.
  maxPhotoLongSidePx: 2560,
  exportQuality: 0.92,
  // Starting rectangle for the 4 corner dots, as fractions of the photo.
  defaultQuad: { left: 0.22, right: 0.78, top: 0.14, bottom: 0.72 },
  handleRadiusPx: 11,
  handleHitPx: 26,
  // Art centre height above the floor when the marked rectangle reaches the
  // floor (a whole wall or a door) — standard gallery hanging height.
  artCenterAboveFloorIn: 60,
  nudgeIn: 1,
  nudgeFastIn: 6,
  defaultBrightness: 1,
  minBrightness: 0.4,
  maxBrightness: 1.8,
  brightnessStep: 0.02,
  defaultShadow: 0.5,
  shadowStep: 0.02,
  // Foreground brush diameter, in on-screen px (so it feels the same on any
  // photo size); [ and ] scale it by brushKeyFactor.
  defaultBrushPx: 34,
  minBrushPx: 6,
  maxBrushPx: 140,
  brushKeyFactor: 1.25,
  // Magic-wand colour tolerance (ΔE). Generous, because the wand also knows
  // the wall's colours (sampled around the art) and won't flood into them.
  defaultTolerance: 16,
  minTolerance: 4,
  maxTolerance: 45,
  // Wall colour samples: a grid over the art's footprint grown by this
  // factor, keeping points beside/above the art (furniture sits below).
  wallSampleGrid: 16,
  wallSampleSpread: 1.7,
} as const;

type ForegroundTool = "move" | "wand" | "brush" | "erase";

const FOREGROUND_TOOLS: {
  id: ForegroundTool;
  label: string;
  key: string;
  icon: LucideIcon;
}[] = [
  { id: "move", label: "Move art", key: "V", icon: Hand },
  { id: "wand", label: "Select", key: "W", icon: Wand2 },
  { id: "brush", label: "Brush", key: "B", icon: Brush },
  { id: "erase", label: "Erase", key: "E", icon: Eraser },
];

type ReferenceKind = "wall" | "door" | "other";

const REFERENCES: Record<
  ReferenceKind,
  { label: string; hint: string; heightIn: string; reachesFloor: boolean }
> = {
  wall: {
    label: "Whole wall",
    hint: "Floor to ceiling. Most rooms are 96 in (8 ft).",
    heightIn: "96",
    reachesFloor: true,
  },
  door: {
    label: "Door",
    hint: "Outer corners of the door. Standard doors are 80 in tall.",
    heightIn: "80",
    reachesFloor: true,
  },
  other: {
    label: "Other",
    hint: "A window, frame, TV or anything rectangular you can measure.",
    heightIn: "",
    reachesFloor: false,
  },
};

const SAMPLE_ROOMS = [
  { id: "dining", label: "Dining room", src: "/room-photo/samples/dining.jpg" },
  {
    id: "sofa-wall",
    label: "Living room",
    src: "/room-photo/samples/sofa-wall.jpg",
  },
  { id: "living-2", label: "Lounge", src: "/room-photo/samples/living-2.jpg" },
  {
    id: "dining-2",
    label: "Dining nook",
    src: "/room-photo/samples/dining-2.jpg",
  },
] as const;

interface LoadedPhoto {
  url: string;
  image: HTMLImageElement;
  width: number;
  height: number;
  name: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = src;
  });
}

async function preparePhoto(src: string, name: string): Promise<LoadedPhoto> {
  const img = await loadImage(src);
  const long = Math.max(img.naturalWidth, img.naturalHeight);
  if (long <= ROOM_PHOTO_CONFIG.maxPhotoLongSidePx) {
    return {
      url: src,
      image: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      name,
    };
  }
  const s = ROOM_PHOTO_CONFIG.maxPhotoLongSidePx / long;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * s);
  canvas.height = Math.round(img.naturalHeight * s);
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, "image/jpeg", ROOM_PHOTO_CONFIG.exportQuality),
  );
  if (!blob) throw new Error("Could not prepare that image");
  const url = URL.createObjectURL(blob);
  const scaled = await loadImage(url);
  return {
    url,
    image: scaled,
    width: canvas.width,
    height: canvas.height,
    name,
  };
}

function defaultQuad(w: number, h: number): Vec2[] {
  const q = ROOM_PHOTO_CONFIG.defaultQuad;
  return [
    { x: q.left * w, y: q.top * h },
    { x: q.right * w, y: q.top * h },
    { x: q.right * w, y: q.bottom * h },
    { x: q.left * w, y: q.bottom * h },
  ];
}

/** Fits a w×h box inside the stage. */
function useFittedStage(aspect: number | null) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !aspect) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      const w = Math.min(width, height * aspect);
      setBox({ width: Math.floor(w), height: Math.floor(w / aspect) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect]);
  return { stageRef, box };
}

export default function RoomPhotoPage() {
  const [photo, setPhoto] = useState<LoadedPhoto | null>(null);
  const [quad, setQuad] = useState<Vec2[]>([]);
  const [mode, setMode] = useState<"mark" | "place">("mark");
  const [refKind, setRefKind] = useState<ReferenceKind>("wall");
  const [heightIn, setHeightIn] = useState<string>(REFERENCES.wall.heightIn);
  // Optional second side: lets photos whose verticals stay parallel (no
  // focal information in the quad) still get an exact lens + scale.
  const [widthIn, setWidthIn] = useState<string>("");
  const [center, setCenter] = useState<Vec2 | null>(null);
  const [estimate, setEstimate] = useState<PhotoLookEstimate | null>(null);
  const [brightness, setBrightness] = useState<number>(
    ROOM_PHOTO_CONFIG.defaultBrightness,
  );
  const [shadow, setShadow] = useState<number>(ROOM_PHOTO_CONFIG.defaultShadow);
  const [lightSide, setLightSide] = useState<1 | -1>(1);
  const [isExporting, setIsExporting] = useState(false);
  const [artSnapshot, setArtSnapshot] = useState(() => getArtSnapshot());
  const exportRef = useRef<RoomPhotoExportHandle | null>(null);
  const qaCenterRef = useRef<Vec2 | null>(null);
  const [tool, setTool] = useState<ForegroundTool>("move");
  // Press-and-hold "Original" hides the art to compare with the bare photo.
  const [peekOriginal, setPeekOriginal] = useState(false);
  const [brushPx, setBrushPx] = useState<number>(
    ROOM_PHOTO_CONFIG.defaultBrushPx,
  );
  const [tolerance, setTolerance] = useState<number>(
    ROOM_PHOTO_CONFIG.defaultTolerance,
  );
  // Bumped after every mask edit: redraws the cut-out and refreshes Undo.
  const [maskVersion, setMaskVersion] = useState(0);
  const maskRef = useRef<ForegroundMask | null>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const bumpMask = useCallback(() => setMaskVersion((v) => v + 1), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dimensions = useCustomStore((s) => s.dimensions);

  const { stageRef, box } = useFittedStage(
    photo ? photo.width / photo.height : null,
  );
  const pxPerDisplay = photo && box.width ? photo.width / box.width : 1;

  useEffect(() => subscribeArtSnapshot(setArtSnapshot), []);

  // Free the previous upload's object URL.
  useEffect(() => {
    const url = photo?.url;
    return () => {
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [photo?.url]);

  const openPhoto = useCallback(async (src: string, name: string) => {
    try {
      const loaded = await preparePhoto(src, name);
      setPhoto(loaded);
      maskRef.current = new ForegroundMask(
        loaded.image,
        loaded.width,
        loaded.height,
      );
      setMaskVersion((v) => v + 1);
      setTool("move");
      setQuad(defaultQuad(loaded.width, loaded.height));
      setMode("mark");
      setCenter(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not open that photo",
      );
    }
  }, []);

  // QA links: ?photo=/path.jpg opens a same-site photo; optional
  // &quad=x,y,x,y,x,y,x,y (photo px) &h=96 &w=… preset the wall marking.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const param = params.get("photo");
    if (!param || !param.startsWith("/") || param.startsWith("//")) return;
    void openPhoto(appPath(param), param.split("/").pop() ?? "room").then(
      () => {
        const nums = (params.get("quad") ?? "").split(",").map(Number);
        if (nums.length === 8 && nums.every(Number.isFinite)) {
          setQuad([0, 2, 4, 6].map((i) => ({ x: nums[i], y: nums[i + 1] })));
        }
        if (params.has("h")) setHeightIn(params.get("h") ?? "");
        if (params.has("w")) setWidthIn(params.get("w") ?? "");
        const cx = Number(params.get("cx"));
        const cy = Number(params.get("cy"));
        if (params.has("cx") && params.has("cy"))
          qaCenterRef.current = { x: cx, y: cy };
        const kind = params.get("kind");
        if (kind && kind in REFERENCES) setRefKind(kind as ReferenceKind);
      },
    );
  }, [openPhoto]);

  const knownH = Number(heightIn) > 0 ? Number(heightIn) : undefined;
  const knownW = Number(widthIn) > 0 ? Number(widthIn) : undefined;
  const pose = useMemo(() => {
    if (!photo || quad.length !== 4 || !(knownH || knownW)) return null;
    return solveWallPose(quad, photo.width, photo.height, {
      heightIn: knownH,
      widthIn: knownW,
    });
  }, [knownH, knownW, photo, quad]);
  const floorBased = REFERENCES[refKind].reachesFloor && Boolean(knownH);

  // Art footprint on the wall, inches (vertical orientation swaps axes).
  const artIn = useMemo(() => {
    const u = ROOM_PHOTO_SCENE_CONFIG.inchesPerUnit;
    if (!artSnapshot) {
      return {
        w: dimensions.width * 3,
        h: dimensions.height * 3,
        units: { width: dimensions.width / 2, height: dimensions.height / 2 },
      };
    }
    const vertical = Math.abs(artSnapshot.orientationRotationZ) > 0.1;
    const width = vertical ? artSnapshot.totalHeight : artSnapshot.totalWidth;
    const height = vertical ? artSnapshot.totalWidth : artSnapshot.totalHeight;
    return { w: width * u, h: height * u, units: { width, height } };
  }, [artSnapshot, dimensions.height, dimensions.width]);

  const placeArt = useCallback(() => {
    if (!pose || !photo) return;
    const y = floorBased
      ? Math.max(
          artIn.h / 2,
          pose.rectHeightIn - ROOM_PHOTO_CONFIG.artCenterAboveFloorIn,
        )
      : pose.rectHeightIn / 2;
    setCenter(qaCenterRef.current ?? { x: pose.rectWidthIn / 2, y });
    const est = estimatePhotoLook(photo.image, quad);
    setEstimate(est);
    setLightSide(est.lightSide);
    setMode("place");
  }, [artIn.h, floorBased, photo, pose, quad]);

  const look = useMemo(
    () => ({
      intensity: (estimate?.intensity ?? 1) * brightness,
      lightColor: estimate?.lightColor ?? "#ffffff",
      lightSide,
      shadow,
    }),
    [brightness, estimate, lightSide, shadow],
  );

  //──────────────── pointer: corner dots (mark) / drag art (place) ─────────
  const dragRef = useRef<
    | { kind: "corner"; index: number }
    | { kind: "art"; offset: Vec2 }
    | { kind: "paint"; last: Vec2; erase: boolean }
    | null
  >(null);

  const editingForeground = mode === "place" && tool !== "move";
  // Brush radius in photo px, from its on-screen diameter.
  const brushRadiusPhotoPx = (brushPx / 2) * pxPerDisplay;

  // Redraw the cut-out layer (at most once per frame).
  const redrawFrameRef = useRef(0);
  const redrawForeground = useCallback(() => {
    cancelAnimationFrame(redrawFrameRef.current);
    redrawFrameRef.current = requestAnimationFrame(() => {
      const canvas = fgCanvasRef.current;
      const mask = maskRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !mask || !ctx) return;
      mask.render(ctx, canvas.width, canvas.height, editingForeground);
    });
  }, [editingForeground]);

  useEffect(() => {
    redrawForeground();
  }, [redrawForeground, maskVersion, mode, box.width, photo]);

  // Teach the wand the wall's colours from around (and above) the art.
  useEffect(() => {
    const mask = maskRef.current;
    if (mode !== "place" || !pose || !center || !photo || !mask) return;
    const n = ROOM_PHOTO_CONFIG.wallSampleGrid;
    const spread = ROOM_PHOTO_CONFIG.wallSampleSpread;
    const points: Vec2[] = [];
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        const x = center.x + (i / n - 0.5) * artIn.w * spread;
        const y = center.y + (j / n - 0.5) * artIn.h * spread;
        const onArt =
          Math.abs(x - center.x) <= artIn.w / 2 &&
          Math.abs(y - center.y) <= artIn.h / 2;
        if (onArt || y > center.y) continue;
        const px = wallToPixel(pose, x, y);
        if (px.x >= 0 && px.y >= 0 && px.x < photo.width && px.y < photo.height)
          points.push(px);
      }
    }
    mask.setWallSamples(points);
  }, [artIn.h, artIn.w, center, mode, photo, pose]);

  // The brush ring only belongs to Brush/Erase; it reappears on the next move.
  useEffect(() => {
    if (cursorRef.current && tool !== "brush" && tool !== "erase") {
      cursorRef.current.style.display = "none";
    }
  }, [tool]);

  const moveBrushCursor = (e: ReactPointerEvent) => {
    const el = cursorRef.current;
    if (!el) return;
    if (tool !== "brush" && tool !== "erase") {
      el.style.display = "none";
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    el.style.display = "block";
    el.style.width = `${brushPx}px`;
    el.style.height = `${brushPx}px`;
    el.style.transform = `translate(${e.clientX - rect.left - brushPx / 2}px, ${e.clientY - rect.top - brushPx / 2}px)`;
  };

  const runWand = (p: Vec2, subtract: boolean) => {
    const mask = maskRef.current;
    if (!mask) return;
    mask.checkpoint();
    const { tooBig } = mask.wand(p.x, p.y, tolerance, subtract);
    if (tooBig) {
      mask.undo();
      toast.message(
        "That picked up too much of the room. Lower Tolerance, or use the Brush.",
      );
    }
    bumpMask();
  };

  const toPhotoPx = (e: ReactPointerEvent): Vec2 => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * pxPerDisplay,
      y: (e.clientY - rect.top) * pxPerDisplay,
    };
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!photo) return;
    const p = toPhotoPx(e);
    if (mode === "mark") {
      const hit = ROOM_PHOTO_CONFIG.handleHitPx * pxPerDisplay;
      let best = -1;
      let bestD = Infinity;
      quad.forEach((q, i) => {
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best < 0 || bestD > hit) return;
      dragRef.current = { kind: "corner", index: best };
    } else if (tool === "wand") {
      runWand(p, e.altKey);
      return;
    } else if (tool === "brush" || tool === "erase") {
      const mask = maskRef.current;
      if (!mask) return;
      const erase = tool === "erase" || e.altKey;
      mask.checkpoint();
      mask.stroke(p, p, brushRadiusPhotoPx, erase);
      dragRef.current = { kind: "paint", last: p, erase };
      redrawForeground();
    } else if (pose && center) {
      const w = pixelToWall(pose, p.x, p.y);
      if (!w) return;
      const onArt =
        Math.abs(w.x - center.x) <= artIn.w / 2 &&
        Math.abs(w.y - center.y) <= artIn.h / 2;
      // Tapping bare wall moves the art there; then it drags from its centre.
      if (!onArt) setCenter(w);
      dragRef.current = {
        kind: "art",
        offset: onArt
          ? { x: center.x - w.x, y: center.y - w.y }
          : { x: 0, y: 0 },
      };
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (mode === "place") moveBrushCursor(e);
    const drag = dragRef.current;
    if (!drag || !photo) return;
    const p = toPhotoPx(e);
    if (drag.kind === "paint") {
      maskRef.current?.stroke(drag.last, p, brushRadiusPhotoPx, drag.erase);
      drag.last = p;
      redrawForeground();
    } else if (drag.kind === "corner") {
      const clamped = {
        x: Math.max(0, Math.min(photo.width, p.x)),
        y: Math.max(0, Math.min(photo.height, p.y)),
      };
      setQuad((q) => q.map((v, i) => (i === drag.index ? clamped : v)));
    } else if (pose) {
      const w = pixelToWall(pose, p.x, p.y);
      if (w) setCenter({ x: w.x + drag.offset.x, y: w.y + drag.offset.y });
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    if (dragRef.current?.kind === "paint") bumpMask();
    dragRef.current = null;
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture(e.pointerId))
      el.releasePointerCapture(e.pointerId);
  };

  // Arrow keys nudge the art (Shift = 6 in).
  useEffect(() => {
    if (mode !== "place") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (maskRef.current?.undo()) bumpMask();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const toolKey = FOREGROUND_TOOLS.find(
        (t) => t.key.toLowerCase() === e.key.toLowerCase(),
      );
      if (toolKey) {
        setTool(toolKey.id);
        return;
      }
      if (e.key === "[" || e.key === "]") {
        const f =
          e.key === "]"
            ? ROOM_PHOTO_CONFIG.brushKeyFactor
            : 1 / ROOM_PHOTO_CONFIG.brushKeyFactor;
        setBrushPx((b) =>
          Math.round(
            Math.max(
              ROOM_PHOTO_CONFIG.minBrushPx,
              Math.min(ROOM_PHOTO_CONFIG.maxBrushPx, b * f),
            ),
          ),
        );
        return;
      }
      const step = e.shiftKey
        ? ROOM_PHOTO_CONFIG.nudgeFastIn
        : ROOM_PHOTO_CONFIG.nudgeIn;
      const d: Record<string, Vec2> = {
        ArrowLeft: { x: -step, y: 0 },
        ArrowRight: { x: step, y: 0 },
        ArrowUp: { x: 0, y: -step },
        ArrowDown: { x: 0, y: step },
      };
      const v = d[e.key];
      if (!v) return;
      e.preventDefault();
      setCenter((c) => (c ? { x: c.x + v.x, y: c.y + v.y } : c));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bumpMask, mode]);

  //──────────────── export ────────────────────────────────────────────────
  const composeImage = useCallback(async (): Promise<Blob | null> => {
    if (!photo || !exportRef.current) return null;
    const out = document.createElement("canvas");
    out.width = photo.width;
    out.height = photo.height;
    const ctx = out.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(photo.image, 0, 0, photo.width, photo.height);
    const art = exportRef.current.renderAt(photo.width, photo.height);
    if (art) ctx.drawImage(art, 0, 0);
    const mask = maskRef.current;
    if (mask && !mask.isEmpty) {
      const fg = document.createElement("canvas");
      fg.width = photo.width;
      fg.height = photo.height;
      const fctx = fg.getContext("2d");
      if (fctx) {
        mask.render(fctx, photo.width, photo.height, false);
        ctx.drawImage(fg, 0, 0);
      }
    }
    return new Promise((r) =>
      out.toBlob(r, "image/jpeg", ROOM_PHOTO_CONFIG.exportQuality),
    );
  }, [photo]);

  // Dev-only QA hook: lets automated checks grab the exact composite.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as {
      __roomPhotoCompose?: typeof composeImage;
      __roomPhotoMask?: (polygons: Vec2[][]) => void;
      __roomPhotoWand?: (x: number, y: number, tol?: number) => number;
    };
    w.__roomPhotoCompose = composeImage;
    w.__roomPhotoMask = (polygons) => {
      polygons.forEach((poly) => maskRef.current?.fillPolygon(poly));
      bumpMask();
    };
    w.__roomPhotoWand = (x, y, tol = ROOM_PHOTO_CONFIG.defaultTolerance) => {
      const n = maskRef.current?.wand(x, y, tol, false).taken ?? 0;
      bumpMask();
      return n;
    };
  }, [bumpMask, composeImage]);

  const fileName = `everwood-${dimensions.width}x${dimensions.height}-in-my-room.jpg`;

  const handleDownload = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await composeImage();
      if (!blob) throw new Error("Could not create the picture");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setIsExporting(false);
    }
  }, [composeImage, fileName]);

  const handleShare = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await composeImage();
      if (!blob) throw new Error("Could not create the picture");
      const file = new File([blob], fileName, { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Everwood piece" });
      } else {
        await handleDownload();
        toast.message(
          "Sharing isn't available here, so the picture was downloaded.",
        );
      }
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError")
        toast.error("Share failed");
    } finally {
      setIsExporting(false);
    }
  }, [composeImage, fileName, handleDownload]);

  //──────────────── render ────────────────────────────────────────────────
  const overlayLabels = useMemo(() => {
    if (!pose) return null;
    const top = wallToPixel(pose, pose.rectWidthIn / 2, 0);
    const left = wallToPixel(pose, 0, pose.rectHeightIn / 2);
    return { top, left };
  }, [pose]);

  const r = ROOM_PHOTO_CONFIG.handleRadiusPx * pxPerDisplay;
  const fmtIn = (v: number) => `${Math.round(v)} in`;
  const ref = REFERENCES[refKind];

  return (
    <div className="flex h-full min-h-[560px] flex-col gap-3 p-3 lg:flex-row lg:p-4">
      {/* Stage */}
      <div className="relative flex min-h-[320px] flex-1 flex-col">
        <div className="mb-2 flex items-center gap-2">
          <Link
            href="/viewer"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-300 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Viewer
          </Link>
          <h1 className="text-base font-semibold text-white">
            See it in your room
          </h1>
        </div>
        <div
          ref={stageRef}
          className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-black/30"
        >
          {!photo ? (
            <div className="flex flex-col items-center gap-4 p-6 text-center">
              <ImagePlus className="h-10 w-10 text-sky-300" />
              <p className="max-w-sm text-sm text-gray-300">
                Take a photo of your wall, straight on or at an angle, with the
                whole area where the art would hang in view.
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="h-4 w-4" /> Upload a room photo
              </Button>
              <div className="mt-2 text-xs uppercase tracking-wide text-gray-500">
                or try a sample room
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SAMPLE_ROOMS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openPhoto(appPath(s.src), s.label)}
                    className="group overflow-hidden rounded-lg ring-1 ring-white/10 hover:ring-sky-400"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={appPath(s.src)}
                      alt={s.label}
                      className="h-20 w-28 object-cover"
                    />
                    <div className="py-1 text-xs text-gray-300">{s.label}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div
              className="relative select-none touch-none overflow-hidden"
              style={{
                width: box.width,
                height: box.height,
                cursor:
                  mode !== "place"
                    ? undefined
                    : tool === "move"
                      ? "grab"
                      : tool === "wand"
                        ? "crosshair"
                        : "none",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={() => {
                if (cursorRef.current) cursorRef.current.style.display = "none";
              }}
              data-testid="room-photo-stage"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt="Your room"
                className="absolute inset-0 h-full w-full"
                draggable={false}
              />
              {mode === "place" && pose && center && box.width > 0 && (
                <div
                  className="absolute inset-0"
                  style={{ visibility: peekOriginal ? "hidden" : "visible" }}
                >
                  <RoomPhotoScene
                    pose={pose}
                    center={center}
                    look={look}
                    artSize={artIn.units}
                    exportRef={exportRef}
                  />
                </div>
              )}
              {/* Furniture in front of the wall, redrawn over the art. */}
              <canvas
                ref={fgCanvasRef}
                width={photo.width}
                height={photo.height}
                className="pointer-events-none absolute inset-0 h-full w-full"
                style={{
                  display: mode === "place" && !peekOriginal ? "block" : "none",
                }}
              />
              <div
                ref={cursorRef}
                className="pointer-events-none absolute left-0 top-0 rounded-full"
                style={{
                  display: "none",
                  border: "1.5px solid rgba(255,255,255,0.95)",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.45)",
                }}
              />
              {mode === "mark" && quad.length === 4 && (
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox={`0 0 ${photo.width} ${photo.height}`}
                  preserveAspectRatio="none"
                >
                  <path
                    d={`M0 0H${photo.width}V${photo.height}H0Z M${quad.map((p) => `${p.x} ${p.y}`).join(" L")}Z`}
                    fill="rgba(0,0,0,0.35)"
                    fillRule="evenodd"
                  />
                  <polygon
                    points={quad.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={2 * pxPerDisplay}
                  />
                  {quad.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={r}
                      fill="rgba(56,189,248,0.35)"
                      stroke="#fff"
                      strokeWidth={2 * pxPerDisplay}
                    />
                  ))}
                  {pose && overlayLabels && (
                    <g
                      fontSize={13 * pxPerDisplay}
                      fill="#fff"
                      fontWeight={600}
                      style={{ paintOrder: "stroke" }}
                      stroke="rgba(0,0,0,0.7)"
                      strokeWidth={3 * pxPerDisplay}
                    >
                      <text
                        x={overlayLabels.top.x}
                        y={overlayLabels.top.y - 10 * pxPerDisplay}
                        textAnchor="middle"
                      >
                        {knownW && !knownH ? "" : "≈ "}
                        {fmtIn(pose.rectWidthIn)}
                      </text>
                      <text
                        x={overlayLabels.left.x + 14 * pxPerDisplay}
                        y={overlayLabels.left.y}
                      >
                        {knownH ? "" : "≈ "}
                        {fmtIn(pose.rectHeightIn)}
                      </text>
                    </g>
                  )}
                </svg>
              )}
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void openPhoto(URL.createObjectURL(f), f.name);
            e.target.value = "";
          }}
        />
      </div>

      {/* Side panel */}
      <aside className="flex w-full shrink-0 flex-col gap-4 rounded-xl bg-gray-800/60 p-4 ring-1 ring-white/10 lg:w-80">
        {!photo && (
          <p className="text-sm text-gray-300">
            Your current design ({dimensions.width}×{dimensions.height}) will be
            placed on your wall at its true size.
          </p>
        )}

        {photo && mode === "mark" && (
          <>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <SquareDashed className="h-4 w-4 text-sky-300" /> Mark your wall
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Drag the 4 dots onto the corners of something rectangular on the
                wall.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(Object.keys(REFERENCES) as ReferenceKind[]).map((k) => (
                <Button
                  key={k}
                  size="sm"
                  variant={refKind === k ? "default" : "outline"}
                  onClick={() => {
                    setRefKind(k);
                    setHeightIn(REFERENCES[k].heightIn);
                  }}
                >
                  {REFERENCES[k].label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-400">{ref.hint}</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "Height",
                  value: heightIn,
                  set: setHeightIn,
                  placeholder: "in",
                },
                {
                  label: "Width (optional)",
                  value: widthIn,
                  set: setWidthIn,
                  placeholder: "in",
                },
              ].map((f) => (
                <label key={f.label} className="text-xs text-gray-300">
                  {f.label}
                  <div className="mt-1 flex items-center gap-1">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={1}
                      value={f.value}
                      placeholder={f.placeholder}
                      onChange={(e) => f.set(e.target.value)}
                      className="h-8"
                    />
                    <span className="text-gray-500">in</span>
                  </div>
                </label>
              ))}
            </div>
            {pose && !pose.focalSolved && !knownW && (
              <p className="text-xs text-amber-300/90">
                Tip: add the width too for an exact fit on wide-angle photos.
              </p>
            )}
            <Button onClick={placeArt} disabled={!pose}>
              Place my art
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Use a different photo
            </Button>
          </>
        )}

        {photo && mode === "place" && (
          <>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Move className="h-4 w-4 text-sky-300" /> Position
              </div>
              <p className="mt-1 text-xs text-gray-400">
                With Move art on, drag the art or tap the wall to move it. Arrow
                keys nudge.
              </p>
              {center && pose && floorBased && (
                <p className="mt-1 text-xs text-gray-300">
                  Centre {Math.round(pose.rectHeightIn - center.y)} in above the
                  floor · {Math.round(artIn.w)}×{Math.round(artIn.h)} in
                </p>
              )}
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-gray-300">Size</div>
              <SizeCard compact bare labelMode="physical" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Layers className="h-4 w-4 text-sky-300" /> In front of the art
              </div>
              <p className="text-xs text-gray-400">
                Sofa or lamp in the way? Tap it with Select, then touch up the
                edges with Brush and Erase.
              </p>
              <div className="grid grid-cols-4 gap-1" role="radiogroup">
                {FOREGROUND_TOOLS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={tool === t.id}
                    title={`${t.label} (${t.key})`}
                    onClick={() => setTool(t.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] ring-1 ring-white/10",
                      tool === t.id
                        ? "bg-sky-500 text-white ring-sky-400"
                        : "text-gray-300 hover:bg-white/10",
                    )}
                  >
                    <t.icon className="h-4 w-4" />
                    {t.label}
                  </button>
                ))}
              </div>
              {(tool === "brush" || tool === "erase") && (
                <div>
                  <div className="mb-1 flex justify-between text-xs text-gray-300">
                    <span>Brush size</span>
                    <span>{brushPx}px · [ ]</span>
                  </div>
                  <Slider
                    value={[brushPx]}
                    min={ROOM_PHOTO_CONFIG.minBrushPx}
                    max={ROOM_PHOTO_CONFIG.maxBrushPx}
                    step={1}
                    onValueChange={([v]) => setBrushPx(v)}
                  />
                </div>
              )}
              {tool === "wand" && (
                <div>
                  <div className="mb-1 flex justify-between text-xs text-gray-300">
                    <span>Tolerance</span>
                    <span>{tolerance}</span>
                  </div>
                  <Slider
                    value={[tolerance]}
                    min={ROOM_PHOTO_CONFIG.minTolerance}
                    max={ROOM_PHOTO_CONFIG.maxTolerance}
                    step={1}
                    onValueChange={([v]) => setTolerance(v)}
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Alt-click removes a selection.
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={!maskRef.current?.canUndo}
                  onClick={() => {
                    if (maskRef.current?.undo()) bumpMask();
                  }}
                  data-mask-version={maskVersion}
                >
                  <Undo2 className="h-4 w-4" /> Undo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={!maskRef.current || maskRef.current.isEmpty}
                  onClick={() => {
                    maskRef.current?.checkpoint();
                    maskRef.current?.clear();
                    bumpMask();
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Clear
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs text-gray-300">
                  <span>Brightness</span>
                  <span>{Math.round(brightness * 100)}%</span>
                </div>
                <Slider
                  value={[brightness]}
                  min={ROOM_PHOTO_CONFIG.minBrightness}
                  max={ROOM_PHOTO_CONFIG.maxBrightness}
                  step={ROOM_PHOTO_CONFIG.brightnessStep}
                  onValueChange={([v]) => setBrightness(v)}
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-gray-300">
                  <span>Shadow</span>
                  <span>{Math.round(shadow * 100)}%</span>
                </div>
                <Slider
                  value={[shadow]}
                  min={0}
                  max={1}
                  step={ROOM_PHOTO_CONFIG.shadowStep}
                  onValueChange={([v]) => setShadow(v)}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span>Light from</span>
                <div className="flex overflow-hidden rounded-md ring-1 ring-white/15">
                  {([1, -1] as const).map((side) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setLightSide(side)}
                      className={cn(
                        "px-2 py-1",
                        lightSide === side
                          ? "bg-sky-500 text-white"
                          : "hover:bg-white/10",
                      )}
                    >
                      {side === 1 ? "Left" : "Right"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="select-none"
              onPointerDown={() => setPeekOriginal(true)}
              onPointerUp={() => setPeekOriginal(false)}
              onPointerLeave={() => setPeekOriginal(false)}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") setPeekOriginal(true);
              }}
              onKeyUp={() => setPeekOriginal(false)}
            >
              <Eye className="h-4 w-4" /> Hold to see original
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleDownload} disabled={isExporting}>
                <Download className="h-4 w-4" /> Download
              </Button>
              <Button
                variant="outline"
                onClick={handleShare}
                disabled={isExporting}
              >
                <Share2 className="h-4 w-4" /> Share
              </Button>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setMode("mark")}>
                Re-mark wall
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                New photo
              </Button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
