export const DEFAULT_APP_ORIGIN = "https://custom.everwood.shop";

/** @param {string | undefined} value */
export function normalizeAppBasePath(value) {
  const basePath = (value ?? "").trim().replace(/\/+$/, "");
  if (basePath && !/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(basePath)) {
    throw new Error("The app base path must be empty or a root path such as /custom.");
  }
  return basePath;
}

/** @param {string} url */
const isRootPath = (url) => url.startsWith("/") && !url.startsWith("//");

/** @param {string} url @param {string} basePath */
const hasBasePath = (url, basePath) =>
  Boolean(basePath) &&
  (url === basePath ||
    url.startsWith(`${basePath}/`) ||
    url.startsWith(`${basePath}?`) ||
    url.startsWith(`${basePath}#`));

/**
 * Shared by Next's build config and runtime URL helpers. Public assets and
 * fetch/native navigation need this prefix; Next Link/router apply it themselves.
 * @param {{basePath?: string, publicUrl?: string, fallbackOrigin?: string}} options
 */
export function createAppPaths({
  basePath: configuredBasePath,
  publicUrl,
  fallbackOrigin = DEFAULT_APP_ORIGIN,
} = {}) {
  const basePath = normalizeAppBasePath(configuredBasePath);

  /** @param {string} value */
  const parseOrigin = (value) => {
    const parsed = new URL(value);
    if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new Error("The public app URL must be an HTTP(S) URL without credentials, a query or a fragment.");
    }
    const urlBasePath = normalizeAppBasePath(parsed.pathname);
    if (urlBasePath && urlBasePath !== basePath) {
      throw new Error("The public app URL path must match the app base path.");
    }
    return parsed.origin;
  };
  const canonicalOrigin = publicUrl ? parseOrigin(publicUrl) : undefined;

  /** @param {string} url */
  const appPath = (url) =>
    !basePath || !isRootPath(url) || hasBasePath(url, basePath)
      ? url
      : `${basePath}${url}`;

  /** @param {string} pathname */
  const stripAppBasePath = (pathname) => {
    if (!hasBasePath(pathname, basePath)) return pathname;
    const stripped = pathname.slice(basePath.length);
    return stripped.startsWith("/") ? stripped : `/${stripped}`;
  };

  /** @param {string} route @param {string} [origin] */
  const appUrl = (route, origin = fallbackOrigin) => {
    if (!isRootPath(route)) return route;
    return new URL(appPath(route), canonicalOrigin ?? parseOrigin(origin)).href;
  };

  return { basePath, appPath, stripAppBasePath, appUrl };
}
