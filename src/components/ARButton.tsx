"use client";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📱 AR BUTTON — "View in your room" (iOS AR Quick Look)                ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Two AR backends, picked per device:
//   • iOS     → Apple AR Quick Look (bake a USDZ, hand off; a closed system view).
//   • Android → WebXR immersive-ar (our own scene + in-AR DOM controls).
// Both hang the piece life-size on a real wall. The notes below describe the iOS
// Quick Look path; the Android path lives in lib/ar/webxrSession + ARWebXROverlay.
//
// SINGLE-TAP flow (iOS). AR Quick Look must launch synchronously inside a real user
// tap (an await between the tap and the launch drops the gesture), and baking +
// uploading the USDZ is async — so we can't do both inside one tap. Instead we
// bake AHEAD of time: whenever the on-screen art changes we (debounced) build +
// upload the USDZ in the background and cache it per design (snapshot
// timestamp). By the time the user taps, the model is ready and the tap launches
// synchronously — one tap. If a tap beats the background bake, we fall back to
// the two-tap path (this tap bakes; the next launches).

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Box, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { isIOSARCapable } from "@/lib/ar/isIOS";
import { getArtSnapshot, subscribeArtSnapshot } from "@/lib/ar/artSnapshot";
import { prepareUsdz, launchAR } from "@/lib/ar/exportUsdz";
import {
  isWebXRARSupported,
  startWebXRARSession,
  type WebXRARController,
} from "@/lib/ar/webxrSession";
import { ARWebXROverlay } from "@/components/ARWebXROverlay";

type Status = "idle" | "preparing" | "ready" | "error";

// Wait this long after the art stops changing before baking, so rapid design
// edits don't kick off a bake per keystroke/drag.
const EAGER_PREP_DEBOUNCE_MS = 600;

interface ARButtonProps {
  /** "viewer" → compact icon button in the action cluster; "shared" → pill. */
  variant?: "viewer" | "shared";
  className?: string;
}

const LABEL: Record<Status, string> = {
  idle: "View in your room",
  preparing: "Preparing…",
  ready: "Tap to place on your wall",
  error: "Retry AR view",
};

export function ARButton({ variant = "viewer", className }: ARButtonProps) {
  const isMobile = useIsMobile();
  const [capable, setCapable] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  // Once AR has opened at least once, reveal a "Re-place on wall" control:
  // AR Quick Look is Apple's own view (we can't reset its wall-lock from code),
  // but relaunching it restarts Apple's surface detection — the practical reset.
  const [hasLaunched, setHasLaunched] = useState(false);
  // Cached prepared model, keyed by the design snapshot timestamp.
  const cacheRef = useRef<{ key: number; url: string } | null>(null);
  // Snapshot key currently being baked (eagerly or on a tap), to dedupe bakes.
  const preparingKeyRef = useRef<number | null>(null);
  // True once the user has tapped and is waiting on an in-flight bake — only
  // then do we surface "ready"/"error" (eager background bakes stay silent so
  // the button doesn't change color before any interaction).
  const waitingTapRef = useRef(false);
  const mountedRef = useRef(true);
  // Android WebXR path. iOS uses Quick Look (above); Android renders our own
  // immersive-ar scene with in-session DOM controls (see ARWebXROverlay).
  const [webxrSupported, setWebxrSupported] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [placed, setPlaced] = useState(false);
  const overlayRootRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<WebXRARController | null>(null);
  // Synchronous guard against a second requestSession before the first resolves
  // (React state isn't synchronous, so sessionActive can't gate a double tap).
  const startingRef = useRef(false);
  const [webxrError, setWebxrError] = useState(false);

  // navigator/document checks must run after mount (SSR-safe). iOS → Quick Look;
  // otherwise probe for Android WebXR immersive-ar (async).
  useEffect(() => {
    if (isIOSARCapable()) {
      setCapable(true);
      return;
    }
    let active = true;
    void isWebXRARSupported().then((ok) => {
      if (active && ok) setWebxrSupported(true);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => () => void (mountedRef.current = false), []);

  // Bake + upload the USDZ for a given design key, deduped against any bake
  // already done or in flight for that key.
  const bake = useCallback((key: number) => {
    if (cacheRef.current?.key === key || preparingKeyRef.current === key) return;
    preparingKeyRef.current = key;
    prepareUsdz()
      .then((url) => {
        cacheRef.current = { key, url };
        preparingKeyRef.current = null;
        if (mountedRef.current && waitingTapRef.current) setStatus("ready");
      })
      .catch(() => {
        preparingKeyRef.current = null;
        if (mountedRef.current && waitingTapRef.current) setStatus("error");
      });
  }, []);

  // Keep the cache warm: bake (debounced) whenever the on-screen art changes,
  // so the user's first tap finds a ready model and launches in one tap.
  useEffect(() => {
    if (!isMobile || !capable) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const snapshot = getArtSnapshot();
        if (!snapshot || snapshot.instances.length === 0) return;
        bake(snapshot.updatedAt ?? 0);
      }, EAGER_PREP_DEBOUNCE_MS);
    };
    schedule(); // warm the cache for the design already on screen
    const unsubscribe = subscribeArtSnapshot(schedule);
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [isMobile, capable, bake]);

  // Which backend this device gets (iOS Quick Look wins if both somehow match).
  const arMode: "quicklook" | "webxr" | null = capable
    ? "quicklook"
    : webxrSupported
      ? "webxr"
      : null;

  if (!isMobile || arMode === null) return null;

  // ── Android WebXR immersive-ar ────────────────────────────────────────────
  const handleStartWebXR = () => {
    const root = overlayRootRef.current;
    if (!root || controllerRef.current || startingRef.current) return;
    startingRef.current = true; // synchronous — blocks a duplicate tap at once
    setWebxrError(false);
    setSessionActive(true);
    setPlaced(false);
    // Called synchronously from the tap so requestSession keeps the gesture.
    startWebXRARSession({
      overlayRoot: root,
      onEnd: () => {
        controllerRef.current = null;
        if (!mountedRef.current) return;
        setSessionActive(false);
        setPlaced(false);
      },
      onPlacedChange: (next) => {
        if (mountedRef.current) setPlaced(next);
      },
    })
      .then((controller) => {
        startingRef.current = false;
        controllerRef.current = controller;
      })
      .catch(() => {
        // requestSession was rejected (e.g. required features not granted) or
        // startup failed and ended the session — surface a retry instead of a
        // dead-looking button.
        startingRef.current = false;
        controllerRef.current = null;
        if (mountedRef.current) {
          setSessionActive(false);
          setWebxrError(true);
        }
      });
  };

  if (arMode === "webxr") {
    // The overlay root is always mounted (so it exists in the DOM when the tap
    // fires requestSession) and is click-through; only its controls take taps.
    const overlay = createPortal(
      <div
        ref={overlayRootRef}
        className="pointer-events-none fixed inset-0 z-[120]"
      >
        {sessionActive && (
          <ARWebXROverlay
            placed={placed}
            onReset={() => controllerRef.current?.reset()}
            onExit={() => controllerRef.current?.end()}
          />
        )}
      </div>,
      document.body
    );

    if (variant === "shared") {
      return (
        <>
          {overlay}
          <button
            type="button"
            onClick={handleStartWebXR}
            aria-label="View in your room"
            className={cn(
              "group inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium shadow-lg transition-colors",
              webxrError
                ? "bg-red-600/90 text-white hover:bg-red-500"
                : "glass-surface text-white ring-1 ring-white/20 hover:bg-gray-900/50 hover:border-white/30",
              className
            )}
          >
            <Box className="h-4 w-4" />
            <span>{webxrError ? "Retry AR" : "View on your wall"}</span>
          </button>
        </>
      );
    }

    return (
      <>
        {overlay}
        <button
          type="button"
          onClick={handleStartWebXR}
          title={webxrError ? "AR didn't start — tap to retry" : "View in your room"}
          aria-label="View in your room"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-white ring-1 transition-colors",
            webxrError
              ? "bg-red-600/90 ring-red-400/40 hover:bg-red-500"
              : "glass-surface ring-white/15 hover:bg-gray-900/50 hover:border-white/30",
            className
          )}
        >
          <Box className="h-4 w-4" />
          <span>{webxrError ? "Retry" : "View in Room"}</span>
        </button>
      </>
    );
  }

  const handleClick = () => {
    const snapshot = getArtSnapshot();
    const key = snapshot?.updatedAt ?? 0;
    const canonical =
      typeof window !== "undefined" ? window.location.href : undefined;

    // Fresh model already prepared (eagerly in the background, or on a prior
    // tap) → launch now, synchronously within this tap so the gesture survives.
    if (cacheRef.current && cacheRef.current.key === key) {
      waitingTapRef.current = false;
      setStatus("idle");
      setHasLaunched(true);
      launchAR(cacheRef.current.url, canonical);
      return;
    }

    // Not ready yet: the eager bake hasn't finished (or hasn't run). It can't
    // complete inside this tap, so show the spinner, bake (or piggyback on the
    // in-flight bake), and the next tap launches.
    waitingTapRef.current = true;
    setStatus("preparing");
    bake(key);
  };

  const preparing = status === "preparing";
  const icon = preparing ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Box className="h-4 w-4" />
  );

  if (variant === "shared") {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          disabled={preparing}
          aria-label={LABEL[status]}
          className={cn(
            "group inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium shadow-lg transition-colors",
            status === "error"
              ? "bg-red-600/90 text-white hover:bg-red-500"
              : "glass-surface text-white ring-1 ring-white/20 hover:bg-gray-900/50 hover:border-white/30",
            className
          )}
        >
          {icon}
          <span>
            {status === "ready"
              ? "View in AR"
              : status === "preparing"
                ? "Preparing…"
                : status === "error"
                  ? "Retry AR"
                  : "View on your wall"}
          </span>
        </button>
        {hasLaunched && (
          <button
            type="button"
            onClick={handleClick}
            aria-label="Re-place on wall (reset AR placement)"
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-xs font-medium text-white/90 transition-colors glass-surface ring-1 ring-white/15 hover:bg-gray-900/50 hover:border-white/30",
              className
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Re-place on wall</span>
          </button>
        )}
      </>
    );
  }

  // "viewer" — pill button with icon + label so users know what it does.
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={preparing}
      title={LABEL[status]}
      aria-label={LABEL[status]}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-white ring-1 transition-colors",
        status === "ready"
          ? "bg-indigo-600 ring-indigo-400/50 hover:bg-indigo-500"
          : status === "error"
            ? "bg-red-600/90 ring-red-400/40 hover:bg-red-500"
            : "glass-surface ring-white/15 hover:bg-gray-900/50 hover:border-white/30",
        className
      )}
    >
      {icon}
      <span>
        {status === "preparing"
          ? "Preparing…"
          : status === "error"
            ? "Retry"
            : "View in Room"}
      </span>
    </button>
  );
}
