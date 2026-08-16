"use client";

import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const IMAGE_ACTION_BUTTON_CLASS =
  "rounded-full glass-surface hover:bg-gray-900/50 hover:border-white/30 transition-colors";
const MOBILE_IMAGE_ACTION_BUTTON_CLASS = "h-9 w-9";
const IMAGE_ACTION_ICON_CLASS = "h-4 w-4 text-gray-200";
const CONFIRMATION_DIALOG_CLASS =
  "max-w-[calc(100vw-2rem)] rounded-2xl border border-white/15 bg-[rgba(22,19,16,0.94)] p-5 text-white shadow-2xl backdrop-blur-xl sm:max-w-sm";
const CONFIRMATION_ICON_CLASS =
  "inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15";
const CONFIRMATION_CANCEL_CLASS =
  "mt-0 rounded-xl border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white";
const CONFIRMATION_SAVE_CLASS =
  "rounded-xl bg-white text-stone-900 hover:bg-stone-100";

interface SharedImageSaveActionProps {
  isMobile: boolean;
  isSaving: boolean;
  isReady: boolean;
  onSave: () => void | Promise<void>;
}

export function SharedImageSaveAction({
  isMobile,
  isSaving,
  isReady,
  onSave,
}: SharedImageSaveActionProps) {
  const accessibleLabel = isSaving
    ? "Saving artwork image"
    : "Save artwork image";
  const disabled = isSaving || !isReady;
  const save = () => void onSave();

  if (!isMobile) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        aria-busy={isSaving}
        aria-label={accessibleLabel}
        onClick={save}
        className={IMAGE_ACTION_BUTTON_CLASS}
      >
        <Camera className={IMAGE_ACTION_ICON_CLASS} />
        {isSaving ? "Saving…" : "Save image"}
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-busy={isSaving}
          aria-label={accessibleLabel}
          className={cn(
            IMAGE_ACTION_BUTTON_CLASS,
            MOBILE_IMAGE_ACTION_BUTTON_CLASS
          )}
        >
          <Camera className={IMAGE_ACTION_ICON_CLASS} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className={CONFIRMATION_DIALOG_CLASS}>
        <AlertDialogHeader className="items-center text-center sm:items-start sm:text-left">
          <span className={CONFIRMATION_ICON_CLASS} aria-hidden>
            <Camera className="h-4 w-4 text-white" />
          </span>
          <AlertDialogTitle className="text-white">
            Save artwork image?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300">
            This creates one image showing the artwork from four angles and
            saves it to your device.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="grid grid-cols-2 gap-2 sm:space-x-0">
          <AlertDialogCancel className={CONFIRMATION_CANCEL_CLASS}>
            Not now
          </AlertDialogCancel>
          <AlertDialogAction
            className={CONFIRMATION_SAVE_CLASS}
            onClick={save}
          >
            Save image
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
