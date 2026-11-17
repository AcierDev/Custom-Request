// Isomorphic helpers for carrying a preview spec in a URL: base64url(JSON).
// A raw (URL-encoded) JSON object is accepted too, so links stay hand-editable.
export const PREVIEW_PARAM_CONFIG = {
  /** Query param that holds the spec on /viewer, /shared/preview and /api/preview/*. */
  specParam: "spec",
  maxParamChars: 24000,
} as const;

const BASE64URL_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\+/g, "-"],
  [/\//g, "_"],
  [/=+$/g, ""],
];

function utf8ToBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return BASE64URL_REPLACEMENTS.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    btoa(binary),
  );
}

function base64UrlToUtf8(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export function encodePreviewSpecParam(spec: unknown): string {
  return utf8ToBase64Url(JSON.stringify(spec));
}

/** Decodes a `spec` param; returns the parsed JSON or throws a readable Error. */
export function decodePreviewSpecParam(param: string): unknown {
  const text = param.trim();
  if (!text) throw new Error("spec is empty");
  if (text.length > PREVIEW_PARAM_CONFIG.maxParamChars) throw new Error("spec is too long");
  try {
    return JSON.parse(text.startsWith("{") ? text : base64UrlToUtf8(text));
  } catch {
    throw new Error("spec must be base64url JSON or a raw JSON object");
  }
}

/** The raw `spec` param from a location.search string, or null. */
export function readSpecParam(search: string): string | null {
  return new URLSearchParams(search).get(PREVIEW_PARAM_CONFIG.specParam);
}
