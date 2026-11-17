"use client";

import { useCallback, useEffect, useState } from "react";
import { isSandboxMode } from "@/lib/sandboxMode";
import {
  CAPTURE_ACTIVE_ATTRIBUTE,
  CAPTURE_FALLBACK_MS,
  CAPTURE_READY_ATTRIBUTE,
  CAPTURE_READY_FLAG,
  parseCaptureOptions,
  type CaptureOptions,
} from "@/lib/captureMode";

const DEFAULT_CAPTURE_OPTIONS: CaptureOptions = {
  enabled: false,
  showRoom: false,
  background: null,
  wallColor: null,
};

/** ?capture=1 options, read once after mount (SSR-safe); tags <html> while capturing. */
export function useCaptureOptions(): CaptureOptions {
  const [options, setOptions] = useState<CaptureOptions>(DEFAULT_CAPTURE_OPTIONS);
  useEffect(() => {
    const parsed = parseCaptureOptions(window.location.search);
    setOptions(parsed);
    if (!parsed.enabled) return;
    const root = document.documentElement;
    root.setAttribute(CAPTURE_ACTIVE_ATTRIBUTE, "1");
    return () => root.removeAttribute(CAPTURE_ACTIVE_ATTRIBUTE);
  }, []);
  return options;
}

/**
 * Raises window.__everwoodCaptureReady (and <html data-capture-ready>) once the
 * art is framed and painted, so a screenshotting script waits on it instead of
 * sleeping. `blocked` holds it while loading/erroring; the fallback timer flags
 * it anyway so a script never hangs. Returns the callback for onCaptureFramed.
 */
export function useCaptureReady(enabled: boolean, blocked: boolean): () => void {
  const [framed, setFramed] = useState(false);
  useEffect(() => {
    if (!enabled || blocked) return;
    const flagReady = () => {
      (window as unknown as Record<string, unknown>)[CAPTURE_READY_FLAG] = true;
      document.documentElement.setAttribute(CAPTURE_READY_ATTRIBUTE, "1");
    };
    if (framed) {
      flagReady();
      return;
    }
    const timer = setTimeout(flagReady, CAPTURE_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [enabled, blocked, framed]);
  return useCallback(() => setFramed(true), []);
}

/** True when this tab is a sandbox (?sandbox=1, ?capture=1 or ?spec=), read after mount. */
export function useSandboxMode(): boolean {
  const [sandbox, setSandbox] = useState(false);
  useEffect(() => setSandbox(isSandboxMode()), []);
  return sandbox;
}
