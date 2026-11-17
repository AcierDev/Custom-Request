// Preview sandbox: ?sandbox=1 keeps a browser tab from reading or writing the
// visitor's saved data (guest localStorage and account autosave), so building a
// customer preview never disturbs what was already saved. The flag is kept in
// sessionStorage, so it follows in-tab navigation (/palette -> /viewer) and
// never leaks into other tabs. ?capture=1 and ?spec= (preview tools) imply the
// sandbox unless the URL says ?sandbox=0.

import { PREVIEW_PARAM_CONFIG } from "./previewSpecParam";

export const SANDBOX_QUERY_PARAM = "sandbox";
export const SANDBOX_STORAGE_KEY = "everwood_sandbox";
const SANDBOX_ON = "1";
const SANDBOX_OFF = "0";

/** Params that imply a sandbox on their own (clean capture, spec preview). */
const IMPLYING_PARAMS = [
  { name: "capture", value: "1" },
  { name: PREVIEW_PARAM_CONFIG.specParam, value: null },
] as const;

/** `?sandbox=1` -> true, `?sandbox=0` -> false, implied by capture/spec -> true, otherwise null. */
export function parseSandboxParam(search: string): boolean | null {
  const params = new URLSearchParams(search);
  const value = params.get(SANDBOX_QUERY_PARAM);
  if (value === SANDBOX_ON) return true;
  if (value === SANDBOX_OFF) return false;
  const implied = IMPLYING_PARAMS.some(({ name, value: expected }) =>
    expected === null ? params.has(name) : params.get(name) === expected,
  );
  return implied ? true : null;
}

/** True while this tab is a sandbox; safe on the server and with storage blocked. */
export function isSandboxMode(): boolean {
  if (typeof window === "undefined") return false;
  const fromUrl = parseSandboxParam(window.location.search);
  try {
    if (fromUrl === true) window.sessionStorage.setItem(SANDBOX_STORAGE_KEY, SANDBOX_ON);
    else if (fromUrl === false) window.sessionStorage.removeItem(SANDBOX_STORAGE_KEY);
    return fromUrl ?? window.sessionStorage.getItem(SANDBOX_STORAGE_KEY) === SANDBOX_ON;
  } catch {
    return fromUrl === true;
  }
}
