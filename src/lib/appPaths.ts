import { createAppPaths } from "./appPathConfig.mjs";

// Keep direct env references so Next can inline the build-time values in clients.
const paths = createAppPaths({
  basePath: process.env.NEXT_PUBLIC_APP_BASE_PATH,
  publicUrl: process.env.NEXT_PUBLIC_APP_URL,
});

export const APP_BASE_PATH = paths.basePath;
export const appPath = paths.appPath;
export const stripAppBasePath = paths.stripAppBasePath;
export const appUrl = paths.appUrl;
