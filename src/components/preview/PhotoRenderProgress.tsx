"use client";

import Image from "next/image";
import { Camera, Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PhotoRenderProgress as Progress } from "./photo/photoRenderer";
import { PHOTO_ASSET_CONFIG as A, PHOTO_RENDER_CONFIG as C, PHOTO_MATH as M } from "./photo/photoConfig";

interface PhotoRenderProgressProps { progress: Progress | null; onCancel: () => void; onDownload: () => void }

export function PhotoRenderProgress({ progress, onCancel, onDownload }: PhotoRenderProgressProps) {
  const percent = Math.round((progress?.fraction ?? M.zero) * C.progressPercentScale);
  const complete = progress?.fraction === M.one;
  return (
    <Dialog open={Boolean(progress)} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border-white/15 bg-stone-950 p-5 text-stone-100 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-stone-100"><Camera className="h-4 w-4" /> {complete ? "Your render is ready" : "Rendering your artwork"}</DialogTitle>
          <DialogDescription className="text-stone-400">A detailed room, natural light, and your exact design. Rendered locally on your device.</DialogDescription>
        </DialogHeader>
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-stone-900">
          {progress?.previewUrl ? <Image src={progress.previewUrl} alt="Your artwork render as the lighting resolves" fill unoptimized className="object-cover" sizes="(max-width: 768px) 90vw, 860px" />
            : <LoaderCircle className="h-7 w-7 animate-spin text-stone-500" aria-hidden />}
        </div>
        {!complete && <div className="space-y-2">
          <div className="flex justify-between gap-3 text-xs text-stone-300" aria-live="polite"><span>{progress?.label}</span><span className="tabular-nums">{percent}%</span></div>
          <div role="progressbar" aria-label="Artwork render progress" aria-valuemin={M.zero} aria-valuemax={C.progressPercentScale} aria-valuenow={percent} className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-stone-200 transition-[width] duration-300" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs leading-relaxed text-stone-500">The image becomes cleaner as the light settles. Large renders can take a few minutes.</p>
        </div>}
        <a href={A.creditsUrl} target="_blank" rel="noreferrer" className="w-fit text-xs text-stone-500 underline underline-offset-2 hover:text-stone-300">Room credits</a>
        {complete ? <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-full border-white/15 bg-white/5 text-stone-200 hover:bg-white/10 hover:text-white">Done</Button>
          <Button type="button" onClick={onDownload} className="rounded-full bg-stone-100 text-stone-900 hover:bg-white"><Download className="h-4 w-4" /> Download image</Button>
        </div> : <Button type="button" variant="outline" onClick={onCancel} className="justify-self-end rounded-full border-white/15 bg-white/5 text-stone-200 hover:bg-white/10 hover:text-white">Cancel render</Button>}
      </DialogContent>
    </Dialog>
  );
}
