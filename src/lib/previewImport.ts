// Client side of ?spec=: posts the decoded spec to /api/preview/compile and
// returns the viewer payload. No saved state is touched.
import { appPath } from "./appPaths";
import { decodePreviewSpecParam } from "./previewSpecParam";

export const PREVIEW_IMPORT_CONFIG = {
  compileEndpoint: "/api/preview/compile",
  timeoutMs: 15000,
} as const;

export interface PreviewImportResult {
  designData: Record<string, unknown>;
  title: string | null;
  warnings: string[];
}

export async function fetchPreviewDesign(specParam: string, signal?: AbortSignal): Promise<PreviewImportResult> {
  const raw = decodePreviewSpecParam(specParam);
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), PREVIEW_IMPORT_CONFIG.timeoutMs);
  signal?.addEventListener("abort", () => timeout.abort(), { once: true });
  try {
    const response = await fetch(appPath(PREVIEW_IMPORT_CONFIG.compileEndpoint), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(raw),
      signal: timeout.signal,
    });
    const body = (await response.json().catch(() => ({}))) as Partial<PreviewImportResult> & { error?: string };
    if (!response.ok || !body.designData) throw new Error(body.error ?? "The preview spec could not be loaded.");
    return { designData: body.designData, title: body.title ?? null, warnings: body.warnings ?? [] };
  } finally {
    clearTimeout(timer);
  }
}
