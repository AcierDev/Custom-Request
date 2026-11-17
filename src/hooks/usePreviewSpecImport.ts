"use client";

import { useEffect, useState } from "react";
import { fetchPreviewDesign } from "@/lib/previewImport";
import { readSpecParam } from "@/lib/previewSpecParam";

export type PreviewSpecImportState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; warnings: string[] }
  | { status: "error"; message: string };

/**
 * Loads `?spec=` into the page: fetches the compiled design and hands it to
 * `apply`, which returns false when the design cannot be shown. `apply` must be
 * referentially stable (useCallback).
 */
export function usePreviewSpecImport(
  apply: (designData: Record<string, unknown>) => boolean,
): PreviewSpecImportState {
  const [state, setState] = useState<PreviewSpecImportState>({ status: "idle" });

  useEffect(() => {
    const spec = readSpecParam(window.location.search);
    if (!spec) return;
    const controller = new AbortController();
    let active = true;
    setState({ status: "loading" });
    fetchPreviewDesign(spec, controller.signal)
      .then(({ designData, warnings }) => {
        if (!active) return;
        setState(
          apply(designData)
            ? { status: "ready", warnings }
            : { status: "error", message: "The preview design could not be shown." },
        );
      })
      .catch((error: unknown) => {
        if (active) setState({ status: "error", message: error instanceof Error ? error.message : "Preview failed." });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [apply]);

  return state;
}
