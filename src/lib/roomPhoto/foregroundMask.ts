//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🛋️ FOREGROUND MASK — furniture that stands in front of the art         ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// The customer paints (or taps to select) whatever is in front of the wall:
// a sofa back, a lamp, a plant. Those photo pixels are drawn again ON TOP of
// the 3D art, so the art tucks in behind them. The mask lives at a capped
// resolution (it is upscaled with a slight feather, which also softens the
// cut-out edge), and undo keeps 1 byte per pixel per step to stay light on RAM.

import {
  fillSmallHoles,
  floodSelect,
  isolateTappedRegion,
  kMeansLab,
  rgbaToLab,
} from "./floodSelect";

export const FOREGROUND_MASK_CONFIG = {
  maxLongSidePx: 1600,
  undoSteps: 12,
  /** Edge softness when the mask is drawn at photo size, in mask pixels. */
  featherPx: 0.9,
  /**
   * Grow wand selections by this many mask px. 0: the object's own
   * anti-aliased rim (half wall colour) would otherwise halo over the art;
   * the feather blends that rim instead.
   */
  wandGrowPx: 0,
  /** Bridges thinner than ~2× this share of the long side are cut. */
  wandBridgeFraction: 0.005,
  /**
   * A tap that grabs more than this share of the photo is almost always the
   * wall or floor, not furniture, so it is not applied.
   */
  maxWandShare: 0.35,
  /** Holes up to this share of the photo inside a selection are filled. */
  wandHoleShare: 0.0015,
  /** Wall colour model: k-means centres, ignoring minor colours. */
  wallColours: 4,
  wallMinShare: 0.15,
  /** Tint shown over the masked area while editing it. */
  editTint: "rgba(56, 189, 248, 0.42)",
} as const;

export class ForegroundMask {
  readonly width: number;
  readonly height: number;
  /** Mask px per photo px. */
  readonly scale: number;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly photo: CanvasImageSource;
  private lab: Float32Array | null = null;
  private wall: Float32Array | undefined;
  private undoStack: Uint8Array[] = [];
  private painted = false;

  constructor(
    photo: CanvasImageSource,
    photoWidth: number,
    photoHeight: number,
  ) {
    const s = Math.min(
      1,
      FOREGROUND_MASK_CONFIG.maxLongSidePx / Math.max(photoWidth, photoHeight),
    );
    this.scale = s;
    this.width = Math.max(1, Math.round(photoWidth * s));
    this.height = Math.max(1, Math.round(photoHeight * s));
    this.photo = photo;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas 2D is not available");
    this.ctx = ctx;
  }

  get isEmpty(): boolean {
    return !this.painted;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  private ensureLab(): Float32Array | null {
    if (this.lab) return this.lab;
    const tmp = document.createElement("canvas");
    tmp.width = this.width;
    tmp.height = this.height;
    const t = tmp.getContext("2d", { willReadFrequently: true });
    if (!t) return null;
    t.drawImage(this.photo, 0, 0, this.width, this.height);
    this.lab = rgbaToLab(t.getImageData(0, 0, this.width, this.height).data);
    return this.lab;
  }

  /**
   * Teaches the wand what the bare wall looks like, from PHOTO-pixel points
   * that are wall (around and above the art). Selections then stop where a
   * pixel looks more like the wall than like the tapped object.
   */
  setWallSamples(points: readonly { x: number; y: number }[]): void {
    const lab = this.ensureLab();
    if (!lab) return;
    const samples: number[] = [];
    for (const p of points) {
      const x = Math.round(p.x * this.scale);
      const y = Math.round(p.y * this.scale);
      if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue;
      const i = (y * this.width + x) * 3;
      samples.push(lab[i], lab[i + 1], lab[i + 2]);
    }
    this.wall = samples.length
      ? kMeansLab(
          new Float32Array(samples),
          FOREGROUND_MASK_CONFIG.wallColours,
          FOREGROUND_MASK_CONFIG.wallMinShare,
        )
      : undefined;
  }

  /** Call once before each user action (stroke, tap, clear). */
  checkpoint(): void {
    const data = this.ctx.getImageData(0, 0, this.width, this.height).data;
    const alpha = new Uint8Array(this.width * this.height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
    this.undoStack.push(alpha);
    if (this.undoStack.length > FOREGROUND_MASK_CONFIG.undoSteps)
      this.undoStack.shift();
  }

  undo(): boolean {
    const alpha = this.undoStack.pop();
    if (!alpha) return false;
    const img = this.ctx.createImageData(this.width, this.height);
    let any = false;
    for (let i = 0; i < alpha.length; i++) {
      img.data[i * 4] = 255;
      img.data[i * 4 + 1] = 255;
      img.data[i * 4 + 2] = 255;
      img.data[i * 4 + 3] = alpha[i];
      if (alpha[i]) any = true;
    }
    this.ctx.putImageData(img, 0, 0);
    this.painted = any;
    return true;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.painted = false;
  }

  /** Brush segment in PHOTO pixels; `radius` in photo pixels. */
  stroke(
    from: { x: number; y: number },
    to: { x: number; y: number },
    radius: number,
    erase: boolean,
  ): void {
    const s = this.scale;
    const c = this.ctx;
    c.save();
    c.globalCompositeOperation = erase ? "destination-out" : "source-over";
    c.strokeStyle = "#fff";
    c.fillStyle = "#fff";
    c.lineCap = "round";
    c.lineJoin = "round";
    c.lineWidth = radius * 2 * s;
    c.beginPath();
    c.moveTo(from.x * s, from.y * s);
    c.lineTo(to.x * s, to.y * s);
    c.stroke();
    c.beginPath();
    c.arc(to.x * s, to.y * s, radius * s, 0, Math.PI * 2);
    c.fill();
    c.restore();
    if (!erase) this.painted = true;
  }

  /**
   * Magic-wand select at a PHOTO pixel. `taken` is how many mask px it
   * covered; `tooBig` means it was refused as the wall/floor (see
   * maxWandShare) and nothing changed.
   */
  wand(
    x: number,
    y: number,
    tolerance: number,
    subtract: boolean,
  ): { taken: number; tooBig: boolean } {
    const lab = this.ensureLab();
    if (!lab) return { taken: 0, tooBig: false };
    const sx = x * this.scale;
    const sy = y * this.scale;
    const bridge = Math.round(
      Math.max(this.width, this.height) *
        FOREGROUND_MASK_CONFIG.wandBridgeFraction,
    );
    const sel = fillSmallHoles(
      isolateTappedRegion(
        floodSelect(lab, this.width, this.height, sx, sy, tolerance, this.wall),
        this.width,
        this.height,
        sx,
        sy,
        bridge,
      ),
      this.width,
      this.height,
      this.width * this.height * FOREGROUND_MASK_CONFIG.wandHoleShare,
    );
    const img = new ImageData(this.width, this.height);
    let count = 0;
    for (let i = 0; i < sel.length; i++) {
      if (!sel[i]) continue;
      img.data[i * 4] = 255;
      img.data[i * 4 + 1] = 255;
      img.data[i * 4 + 2] = 255;
      img.data[i * 4 + 3] = 255;
      count++;
    }
    if (!count) return { taken: 0, tooBig: false };
    if (
      !subtract &&
      count > this.width * this.height * FOREGROUND_MASK_CONFIG.maxWandShare
    ) {
      return { taken: count, tooBig: true };
    }
    const layer = document.createElement("canvas");
    layer.width = this.width;
    layer.height = this.height;
    layer.getContext("2d")?.putImageData(img, 0, 0);
    const c = this.ctx;
    c.save();
    c.globalCompositeOperation = subtract ? "destination-out" : "source-over";
    const g = FOREGROUND_MASK_CONFIG.wandGrowPx;
    const offsets = g
      ? [
          [0, 0],
          [g, 0],
          [-g, 0],
          [0, g],
          [0, -g],
        ]
      : [[0, 0]];
    for (const [dx, dy] of offsets) c.drawImage(layer, dx, dy);
    c.restore();
    if (!subtract) this.painted = true;
    return { taken: count, tooBig: false };
  }

  /**
   * Draws the foreground cut-out (photo pixels inside the mask) onto `ctx`
   * at `width`×`height`. `tint` highlights the masked area while editing.
   */
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    tint: boolean,
  ): void {
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    if (this.painted) {
      const feather = (FOREGROUND_MASK_CONFIG.featherPx * width) / this.width;
      ctx.filter = `blur(${feather}px)`;
      ctx.drawImage(this.canvas, 0, 0, width, height);
      ctx.filter = "none";
      ctx.globalCompositeOperation = "source-in";
      ctx.drawImage(this.photo, 0, 0, width, height);
      if (tint) {
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = FOREGROUND_MASK_CONFIG.editTint;
        ctx.fillRect(0, 0, width, height);
      }
    }
    ctx.restore();
  }

  /** Dev QA: fill a polygon given in photo pixels. */
  fillPolygon(points: readonly { x: number; y: number }[]): void {
    const s = this.scale;
    const c = this.ctx;
    c.save();
    c.fillStyle = "#fff";
    c.beginPath();
    points.forEach((p, i) =>
      i ? c.lineTo(p.x * s, p.y * s) : c.moveTo(p.x * s, p.y * s),
    );
    c.closePath();
    c.fill();
    c.restore();
    this.painted = true;
  }
}
