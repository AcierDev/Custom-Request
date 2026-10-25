import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAppPaths } from "./src/lib/appPathConfig.mjs";

const DEFAULT_DIST_DIR = ".next";
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
  // The Blender job routes build paths from process.cwd(), so tracing pulls the
  // whole project into their functions. They only run on the studio Mac
  // (hosted, they answer 503), so keep the project's assets out of them.
  outputFileTracingExcludes: {
    "/api/blender-render/**": [
      "./public/**/*",
      "./output/**/*",
      "./scripts/**/*",
      "./docs/**/*",
    ],
  },
  // The old viewer (viewer.everwoodus.com) served shared designs at
  // /?shareId=ID. The design now lives at /shared/ID (the gallery room),
  // so any legacy /?shareId=ID that reaches THIS app is forwarded to it.
  // (Links already pointing at viewer.everwoodus.com need the same
  // redirect added to the Custom-Request-Viewer deployment.)
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "query", key: "shareId", value: "(?<sid>[^&]+)" }],
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
