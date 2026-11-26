// A same-page fragment keeps the browser preview and its in-memory selection
// available when Android cannot handle the native intent.
export const SCENE_VIEWER_FALLBACK_HASH = "#android-ar-unavailable";

export function supportsAndroidSceneViewer(userAgent: string, protocol: string): boolean {
  return protocol === "https:" && /Android/i.test(userAgent);
}

export function getSceneViewerIntent(modelPath: string, pageUrl: string): string | null {
  const fallback = new URL(pageUrl);
  const model = new URL(modelPath, fallback);
  if (model.protocol !== "https:" || model.origin !== fallback.origin) return null;

  fallback.hash = SCENE_VIEWER_FALLBACK_HASH;
  const query = new URLSearchParams({
    file: model.href,
    mode: "ar_only",
    resizable: "false",
  });
  return `intent://arvr.google.com/scene-viewer/1.0?${query}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fallback.href)};end;`;
}
