"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { appPath } from "@/lib/appPaths";
import {
  IMPORT_DEFAULTS,
  IMPORT_DIRECTIONS,
  IMPORT_LIMITS,
  IMPORT_PATTERNS,
  ImportError,
  buildPreviewPath,
  medianColor,
  parseImportText,
  type ImportDirection,
  type ImportPattern,
} from "@/lib/importDesign";

// Pasted colors -> a read-only preview, without touching saved designs. The
// preview opens in sandbox mode (never reads or writes saved data) and, by
// default, in clean-capture mode (no controls, art framed tightly).

const EYEDROPPER_SAMPLE_PX = 64;
const COPY_FEEDBACK_MS = 1600;
const PLACEHOLDER = `#1F3A5F Slate Blue
#4F7CAC
#9DC3E6 Sea Glass

or JSON: {"colors":["#1F3A5F","#9DC3E6"],"width":28,"height":12,"direction":"left-to-right"}`;

const fieldClass = "flex flex-col gap-1 text-xs text-slate-300";
const selectClass =
  "h-9 rounded-md border border-white/10 bg-slate-900 px-2 text-sm text-white";

export default function ImportPage() {
  const [text, setText] = useState("");
  const [width, setWidth] = useState(String(IMPORT_DEFAULTS.width));
  const [height, setHeight] = useState(String(IMPORT_DEFAULTS.height));
  const [mini, setMini] = useState(false);
  const [direction, setDirection] = useState<ImportDirection>(IMPORT_DEFAULTS.direction);
  const [pattern, setPattern] = useState<ImportPattern>(IMPORT_DEFAULTS.pattern);
  const [blend, setBlend] = useState(String(IMPORT_DEFAULTS.blend));
  const [capture, setCapture] = useState(true);
  const [room, setRoom] = useState(false);
  const [background, setBackground] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const buildPath = (): string | null => {
    try {
      const spec = parseImportText(text, {
        width: Number(width),
        height: Number(height),
        mini,
        direction,
        pattern,
        blend: Number(blend),
      });
      setError(null);
      return buildPreviewPath(spec, {
        capture,
        room,
        background: background.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof ImportError ? e.message : "could not build the preview");
      return null;
    }
  };

  const openPreview = () => {
    const path = buildPath();
    if (path) window.open(appPath(path), "_blank");
  };

  const copyLink = async () => {
    const path = buildPath();
    if (!path) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${appPath(path)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      setError("clipboard unavailable; use Open preview and copy the address bar");
    }
  };

  // Eyedropper: median color of a customer's swatch photo, appended as a new line.
  const addColorFromImage = async (file: File) => {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, EYEDROPPER_SAMPLE_PX / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const hex = medianColor(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
      if (!hex) throw new Error("empty image");
      const label = file.name.replace(/\.[^.]+$/, "");
      setText((current) => `${current.trimEnd()}${current.trim() ? "\n" : ""}${hex} ${label}`);
      setError(null);
    } catch {
      setError("could not read a color from that image");
    }
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6 text-white">
      <h1 className="heading-section">Preview from a color list</h1>
      <p className="text-sm text-slate-400">
        Paste hex colors (one per line, optional name) or JSON. The preview opens in a sandbox tab:
        nothing is saved and your own designs are untouched.
      </p>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={8}
        className="font-mono text-sm"
        aria-label="Colors"
      />

      <div className="flex items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void addColorFromImage(file);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
          Add color from image
        </Button>
        <span className="text-xs text-slate-500">median color of a swatch photo</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className={fieldClass}>
          Width (squares)
          <Input type="number" min={IMPORT_LIMITS.minSquares} max={IMPORT_LIMITS.maxSquares} value={width} onChange={(e) => setWidth(e.target.value)} />
        </label>
        <label className={fieldClass}>
          Height (squares)
          <Input type="number" min={IMPORT_LIMITS.minSquares} max={IMPORT_LIMITS.maxSquares} value={height} onChange={(e) => setHeight(e.target.value)} />
        </label>
        <label className={fieldClass}>
          Blend (0-100)
          <Input type="number" min={IMPORT_LIMITS.minBlend} max={IMPORT_LIMITS.maxBlend} step={5} value={blend} onChange={(e) => setBlend(e.target.value)} />
        </label>
        <label className={fieldClass}>
          Fade direction
          <select className={selectClass} value={direction} onChange={(e) => setDirection(e.target.value as ImportDirection)}>
            {IMPORT_DIRECTIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className={fieldClass}>
          Pattern
          <select className={selectClass} value={pattern} onChange={(e) => setPattern(e.target.value as ImportPattern)}>
            {IMPORT_PATTERNS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className={fieldClass}>
          Square size
          <select className={selectClass} value={mini ? "mini" : "standard"} onChange={(e) => setMini(e.target.value === "mini")}>
            <option value="standard">standard (3&quot;)</option>
            <option value="mini">mini (2.65&quot;)</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={capture} onChange={(e) => setCapture(e.target.checked)} />
          Clean capture (no controls, tight framing)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={room} disabled={!capture} onChange={(e) => setRoom(e.target.checked)} />
          Show room
        </label>
        <label className="flex items-center gap-2">
          Background
          <Input className="h-8 w-28" placeholder="ffffff" disabled={!capture} value={background} onChange={(e) => setBackground(e.target.value)} />
        </label>
      </div>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" onClick={openPreview}>Open preview</Button>
        <Button type="button" variant="outline" onClick={() => void copyLink()}>
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </main>
  );
}
