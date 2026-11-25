import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAppPaths } from "./src/lib/appPathConfig.mjs";

const DEFAULT_DIST_DIR = ".next";
const mechitzaHost = { type: "host", value: "mechitza\\.everwoodus\\.com" };
const customHost = { type: "host", value: "custom\\.everwood\\.shop" };
const mechitzaOrigin = "https://mechitza.everwoodus.com";
const mechitzaResources = ["/mechitza-assets", "/mechitza-films", "/mechitza-figures", "/api/mechitza-model"];
const PROJECT_ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const configuredDistDir = process.env.CUSTOM_REQUEST_NEXT_DIST_DIR;
const { basePath } = createAppPaths({
  basePath: process.env.NEXT_PUBLIC_APP_BASE_PATH,
  publicUrl: process.env.NEXT_PUBLIC_APP_URL,
});
const distDir = configuredDistDir
  ? path.relative(
      PROJECT_ROOT_DIR,
      path.resolve(PROJECT_ROOT_DIR, configuredDistDir),
    )
  : DEFAULT_DIST_DIR;

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir,
  // Native image library: load it from node_modules at runtime instead of bundling it.
  serverExternalPackages: ["sharp"],
  // Opt-in at build time; absent env keeps the current root deployment intact.
  basePath,
  // Next 16 removed the `eslint` config key; ESLint no longer runs during
  // `next build` (use `next lint` separately), so it's simply omitted.
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingIncludes: {
    "/api/mechitza-model/*": [
      "./public/mechitza-assets/*.glb",
      "./public/mechitza-assets/*.usdz",
      "./public/mechitza-films/*.jpg",
      "./public/mechitza-figures/**/*",
    ],
  },
  // The Blender job routes build paths from process.cwd(), so tracing pulls the
  // whole project into their functions. They only run on the studio Mac
  // (hosted, they answer 503), so keep the project's assets out of them.
  outputFileTracingExcludes: {
    "/api/mechitza-model/*": [
      "./public/textures/**/*",
      "./public/wasm/**/*",
      "./public/photo-room/**/*",
      "./public/paints/**/*",
      "./public/images/**/*",
      "./public/room-photo/**/*",
      "./public/models/**/*",
      "./public/mechitza-assets/*.webp",
    ],
    "/api/blender-render/**": [
      "./public/**/*",
      "./output/**/*",
      "./scripts/**/*",
      "./docs/**/*",
    ],
  },
  async headers() {
    return [{
      source: "/mechitza-assets/:model(.*\\.usdz)",
      headers: [{ key: "Content-Type", value: "model/vnd.usdz+zip" }],
    }];
  },
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", has: [mechitzaHost], destination: "/mechitza" }],
    };
  },
  // The old viewer (viewer.everwoodus.com) served shared designs at
  // /?shareId=ID. The design now lives at /shared/ID (the gallery room),
  // so any legacy /?shareId=ID that reaches THIS app is forwarded to it.
  // (Links already pointing at viewer.everwoodus.com need the same
  // redirect added to the Custom-Request-Viewer deployment.)
  async redirects() {
    return [
      {
        source: "/mechitza",
        has: [customHost],
        destination: mechitzaOrigin,
        permanent: true,
      },
      ...mechitzaResources.map((path) => ({
        source: `${path}/:file*`,
        has: [customHost],
        destination: `${mechitzaOrigin}${path}/:file*`,
        permanent: true,
      })),
      {
        source: "/mechitza",
        has: [mechitzaHost],
        destination: "/",
        permanent: true,
      },
      {
        source: "/:appPath((?!(?:_next|_vercel|mechitza-assets|mechitza-films|mechitza-figures|api/mechitza-model)(?:/|$)|(?:favicon\\.ico|icon\\.svg)$).+)",
        has: [mechitzaHost],
        destination: "https://custom.everwood.shop/:appPath",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "query", key: "shareId", value: "(?<sid>[^&]+)" }],
        missing: [mechitzaHost],
        destination: "/shared/:sid",
        permanent: true,
      },
    ];
  },
  // Allow loading the dev server from a phone on the LAN (and an HTTPS tunnel)
  // for on-device AR testing — Next 16 otherwise blocks cross-origin dev
  // resources (HMR/RSC) from non-localhost origins, which leaves the page a
  // dead shell. Dev-only; ignored by production builds.
  allowedDevOrigins: ["192.168.1.247", "*.trycloudflare.com", "*.ngrok-free.app"],
};

export default nextConfig;
