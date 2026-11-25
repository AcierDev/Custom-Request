"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ImagePlus, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  DEFAULT_FILM_CROP,
  FILM_CROP_ASPECT,
  MAX_FILM_CROP_ZOOM,
  openCustomFilm,
  panFilmCrop,
  renderCustomFilmCrop,
  resolveFilmCrop,
  type FilmCrop,
} from "./customFilm";
import styles from "./FilmCropDialog.module.css";

const KEY_DIRECTIONS = new Map<string, [number, number]>([
  ["ArrowLeft", [-1, 0]],
  ["ArrowRight", [1, 0]],
  ["ArrowUp", [0, -1]],
  ["ArrowDown", [0, 1]],
]);

type FilmCropDialogProps = {
  file: File;
  initialCrop?: FilmCrop;
  onApply: (image: Blob, crop: FilmCrop) => void;
  onCancel: () => void;
};

export function FilmCropDialog({ file, initialCrop = DEFAULT_FILM_CROP, onApply, onCancel }: FilmCropDialogProps) {
  const [crop, setCrop] = useState(initialCrop);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const source = useRef<HTMLImageElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const zoomId = useId();

  useEffect(() => setCrop(initialCrop), [file, initialCrop]);
  useEffect(() => {
    setImage(null);
    setError("");
    setApplying(false);
    let local: ReturnType<typeof openCustomFilm>;
    try {
      local = openCustomFilm(file);
    } catch (error) {
      setError(error instanceof Error ? error.message : "This image couldn’t be opened.");
      return;
    }

    source.current = local.image;
    void local.image.decode().then(() => {
      if (source.current === local.image) setImage(local.image);
    }).catch(() => {
      if (source.current === local.image) setError("This image couldn’t be opened. Try JPEG or PNG.");
    });
    return () => {
      source.current = null;
      local.dispose();
    };
  }, [file]);

  function move(horizontal: number, vertical: number) {
    if (!image || applying) return;
    setCrop((current) => panFilmCrop(image.naturalWidth, image.naturalHeight, current, horizontal, vertical));
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!image || applying || event.button !== 0 || pointer.current) return;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const previous = pointer.current;
    if (previous?.id !== event.pointerId) return;
    const { width, height } = event.currentTarget.getBoundingClientRect();
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    if (width && height) move((event.clientX - previous.x) / width, (event.clientY - previous.y) / height);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (pointer.current?.id === event.pointerId) pointer.current = null;
  }

  function nudge(event: KeyboardEvent<HTMLDivElement>) {
    const direction = KEY_DIRECTIONS.get(event.key);
    if (!direction || !image || applying) return;
    event.preventDefault();
    const step = event.shiftKey ? 0.1 : 0.025;
    move(direction[0] * step, direction[1] * step);
  }

  function cancel() {
    source.current = null;
    onCancel();
  }

  async function apply() {
    if (!image || applying) return;
    setError("");
    setApplying(true);
    try {
      const result = await renderCustomFilmCrop(image, crop);
      if (source.current === image) onApply(result, crop);
    } catch (error) {
      if (source.current === image) {
        setError(error instanceof Error ? error.message : "This crop couldn’t be prepared.");
      }
    } finally {
      if (source.current === image) setApplying(false);
    }
  }

  const frame = image && resolveFilmCrop(image.naturalWidth, image.naturalHeight, crop);
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) cancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.dialog}
          onOpenAutoFocus={() => {
            if (document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement;
          }}
          onCloseAutoFocus={(event) => {
            if (!returnFocus.current?.isConnected) return;
            event.preventDefault();
            returnFocus.current.focus();
          }}
        >
          <Dialog.Title className={styles.title}>Crop glass image</Dialog.Title>
          <Dialog.Description className={styles.description}>
            Drag or use the arrow keys to position your image inside the glass.
          </Dialog.Description>
          <div
            className={styles.preview}
            data-ready={Boolean(image)}
            style={{ aspectRatio: FILM_CROP_ASPECT }}
            role="group"
            aria-label="Glass crop preview"
            tabIndex={image && !applying ? 0 : -1}
            onPointerDown={startDrag}
            onPointerMove={drag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
            onKeyDown={nudge}
          >
            {image && frame ? (
              <Image
                className={styles.source}
                src={image.src}
                alt=""
                width={image.naturalWidth}
                height={image.naturalHeight}
                unoptimized
                draggable={false}
                style={{
                  left: `${-100 * frame.x / frame.width}%`,
                  top: `${-100 * frame.y / frame.height}%`,
                  width: `${100 * image.naturalWidth / frame.width}%`,
                  height: `${100 * image.naturalHeight / frame.height}%`,
                }}
              />
            ) : (
              <div className={styles.placeholder} role={error ? undefined : "status"}>
                <ImagePlus size={24} aria-hidden />
                {error ? "Preview unavailable" : "Opening image…"}
              </div>
            )}
          </div>
          <div className={styles.adjustments}>
            <label htmlFor={zoomId}>Zoom <output htmlFor={zoomId}>{Math.round(crop.zoom * 100)}%</output></label>
            <input
              className={styles.slider}
              id={zoomId}
              type="range"
              min={1}
              max={MAX_FILM_CROP_ZOOM}
              step={0.01}
              value={crop.zoom}
              disabled={!image || applying}
              onChange={(event) => {
                if (!image) return;
                const zoom = event.currentTarget.valueAsNumber;
                setCrop((current) => panFilmCrop(image.naturalWidth, image.naturalHeight, { ...current, zoom }, 0, 0));
              }}
            />
            <button type="button" className={styles.reset} disabled={!image || applying} onClick={() => setCrop(DEFAULT_FILM_CROP)}>
              <RotateCcw size={15} aria-hidden /> Reset
            </button>
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <Dialog.Close type="button" className={styles.secondary}>Cancel</Dialog.Close>
            <button type="button" className={styles.primary} disabled={!image || applying} onClick={() => void apply()}>
              {applying ? "Preparing crop…" : "Apply crop"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default FilmCropDialog;
