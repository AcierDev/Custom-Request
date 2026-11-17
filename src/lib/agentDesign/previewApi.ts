// Shared plumbing for the key-free /api/preview/* routes.
import { NextResponse, type NextRequest } from "next/server";
import { decodePreviewSpecParam, encodePreviewSpecParam, PREVIEW_PARAM_CONFIG } from "@/lib/previewSpecParam";
import { appUrl } from "@/lib/appPaths";
import { requireAgentAuth } from "./auth";
import { AgentSpecError, type ColorGrid, type ResolvedSpec } from "./spec";
import { getAgentDesign } from "./store";
import {
  PREVIEW_SPEC_CONFIG,
  compilePreview,
  publicPreviewLimitError,
  type CompiledPreview,
} from "./previewSpec";
import {
  SCREENSHOT_CONFIG,
  parseScreenshotOptions,
  type ScreenshotOptions,
} from "./screenshot";

export class PreviewInputError extends Error {
  constructor(message: string, readonly field: string, readonly status = 400) {
    super(message);
  }
}

/** True when the request carries the valid agent bearer key (lifts the public caps). */
export const hasAgentKey = (request: NextRequest): boolean => requireAgentAuth(request) === null;

export function previewErrorResponse(error: unknown): NextResponse {
  if (error instanceof PreviewInputError) {
    return NextResponse.json({ error: error.message, field: error.field }, { status: error.status });
  }
  if (error instanceof AgentSpecError) {
    return NextResponse.json({ error: `${error.field}: ${error.message}`, field: error.field }, { status: 400 });
  }
  console.error("Preview request failed:", error);
  return NextResponse.json({ error: "preview request failed" }, { status: 500 });
}

/** Reads the spec from a `spec` query param, or a POST JSON body. */
export async function readSpecInput(request: NextRequest, paramName: string = PREVIEW_PARAM_CONFIG.specParam): Promise<unknown> {
  const param = request.nextUrl.searchParams.get(paramName);
  if (param !== null) {
    try {
      return decodePreviewSpecParam(param);
    } catch (error) {
      throw new PreviewInputError(error instanceof Error ? error.message : "invalid spec", paramName);
    }
  }
  if (request.method === "POST") {
    const text = await request.text();
    if (!hasAgentKey(request) && text.length > PREVIEW_SPEC_CONFIG.publicMaxSpecChars) {
      throw new PreviewInputError("spec is too large", "body", 413);
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new PreviewInputError("body must be valid JSON", "body");
    }
  }
  throw new PreviewInputError(`missing ?${paramName}=<base64url JSON> (or POST a JSON body)`, paramName);
}

/** Compiles a spec and applies the public size cap unless the agent key is present. */
export function compileWithLimits(request: NextRequest, raw: unknown): CompiledPreview {
  const compiled = compilePreview(raw);
  if (!hasAgentKey(request)) {
    const limit = publicPreviewLimitError(compiled.spec);
    if (limit) throw new PreviewInputError(limit, "panels", 413);
  }
  return compiled;
}

/** width/room/gaps parsed with the same strict rules as the agent screenshot. */
export function readScreenshotOptions(request: NextRequest): ScreenshotOptions {
  const source = request.nextUrl.searchParams;
  const filtered = new URLSearchParams();
  for (const key of ["width", "room", "gaps", "margin"]) {
    const value = source.get(key);
    if (value !== null) filtered.set(key, value);
  }
  const options = parseScreenshotOptions(filtered);
  if ("error" in options) throw new PreviewInputError(options.error, options.field);
  if (!hasAgentKey(request) && options.widthPx > PREVIEW_SPEC_CONFIG.publicMaxWidthPx) {
    throw new PreviewInputError(
      `must be at most ${PREVIEW_SPEC_CONFIG.publicMaxWidthPx} without the agent key (agent limit ${SCREENSHOT_CONFIG.maxWidthPx})`,
      "width",
    );
  }
  return options;
}

export const PREVIEW_ROUTES = {
  viewerPath: "/viewer",
  sharedPreviewPath: "/shared/preview",
  screenshotPath: "/api/preview/screenshot.png",
} as const;

/** Links that reopen a spec: sandbox viewer, sandbox shared viewer, PNG. */
export function previewLinks(request: NextRequest, raw: unknown) {
  const origin = request.nextUrl.origin;
  const param = `${PREVIEW_PARAM_CONFIG.specParam}=${encodePreviewSpecParam(raw)}`;
  return {
    viewerUrl: appUrl(`${PREVIEW_ROUTES.viewerPath}?sandbox=1&${param}`, origin),
    captureUrl: appUrl(`${PREVIEW_ROUTES.sharedPreviewPath}?capture=1&${param}`, origin),
    screenshotUrl: appUrl(`${PREVIEW_ROUTES.screenshotPath}?${param}`, origin),
  };
}

/** Agent design ids are 16 URL-safe characters; a spec param is far longer base64url or raw JSON. */
const AGENT_DESIGN_ID = /^[A-Za-z0-9_-]{16}$/;

export interface DesignSource {
  spec: ResolvedSpec;
  grids: Record<string, ColorGrid>;
}

/**
 * Resolves a design reference: an object spec, a `spec` param string, or an
 * agent design id (needs the agent key, since those records are not public).
 */
export async function loadDesignSource(request: NextRequest, value: unknown, field: string): Promise<DesignSource> {
  if (typeof value === "string" && AGENT_DESIGN_ID.test(value)) {
    if (!hasAgentKey(request)) {
      throw new PreviewInputError("agent design ids need the agent bearer key; send a spec instead", field, 401);
    }
    const record = await getAgentDesign(value);
    if (!record) throw new PreviewInputError("agent design not found", field, 404);
    return { spec: record.spec, grids: record.grids };
  }
  let raw = value;
  if (typeof value === "string") {
    try {
      raw = decodePreviewSpecParam(value);
    } catch (error) {
      throw new PreviewInputError(error instanceof Error ? error.message : "invalid spec", field);
    }
  }
  return compileWithLimits(request, raw);
}
