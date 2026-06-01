//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🍎 iOS AR CAPABILITY                                                  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// AR Quick Look is iOS-only. EVERY iOS browser (Safari AND Chrome/Edge/Firefox)
// runs WebKit and can launch Quick Look, so we detect it via either the native
// rel="ar" support flag (Safari) or the known iOS third-party browser UA tokens
// (model-viewer's whitelist). We intentionally return false on Android so the
// button is hidden there (no USDZ path); a GLB + Scene Viewer flow could add it
// later.

// iOS third-party browsers (Chrome, Edge, Firefox, Google app, DuckDuckGo) —
// these don't report rel="ar" support but DO hand off to Quick Look.
const IOS_THIRD_PARTY_BROWSER = /CriOS\/|EdgiOS\/|FxiOS\/|GSA\/|DuckDuckGo\//;

export function isIOSARCapable(): boolean {
  if (typeof navigator === "undefined" || typeof document === "undefined") {
    return false;
  }

  // Native AR support (Safari on iOS reports true here).
  const anchor = document.createElement("a");
  const supportsRelAr =
    typeof anchor.relList !== "undefined" &&
    typeof anchor.relList.supports === "function" &&
    anchor.relList.supports("ar");

  const ua = navigator.userAgent || "";
  const isIOSDevice =
    /iPhone|iPad|iPod/.test(ua) ||
    // iPadOS 13+ masquerades as macOS; disambiguate via touch points.
    (/Macintosh/.test(ua) &&
      typeof navigator.maxTouchPoints === "number" &&
      navigator.maxTouchPoints > 1);

  return Boolean(
    supportsRelAr || IOS_THIRD_PARTY_BROWSER.test(ua) || isIOSDevice
  );
}
