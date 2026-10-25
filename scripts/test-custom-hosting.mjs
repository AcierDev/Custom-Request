import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SUCCESS_EXIT_CODE = 0;
const FAILED_EXIT_CODE = 1;
const COMMON_TESTS = [
  "src/lib/appPathConfig.test.mjs",
  "src/lib/customHosting.test.mjs",
  "src/app/api/backendLinks.test.mjs",
  "src/components/preview/photo/photoAssetPaths.test.mjs",
];
const ROUTE_TESTS = [
  "src/lib/auth-context.paths.test.mjs",
  "src/lib/dataSyncRoute.test.mjs",
  "src/lib/urlUtils.test.mjs",
  "src/lib/toast.test.mjs",
  "src/hooks/useInitialRoomViewDefault.test.mjs",
];
const HOSTING_MODES = [
  { name: "root", basePath: "", publicUrl: "" },
  { name: "custom", basePath: "/custom", publicUrl: "https://everwoodus.com/custom" },
];
const rootEnv = {
  ...process.env,
  NEXT_PUBLIC_APP_BASE_PATH: "",
  NEXT_PUBLIC_APP_URL: "",
};

function runTests(files, env) {
  const result = spawnSync(process.execPath, ["--no-warnings", "--test", ...files], {
    cwd: PROJECT_ROOT,
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== SUCCESS_EXIT_CODE) process.exit(result.status ?? FAILED_EXIT_CODE);
}

runTests(COMMON_TESTS, rootEnv);
for (const { name, basePath, publicUrl } of HOSTING_MODES) {
  console.log(`Checking ${name} hosting route behavior`);
  runTests(ROUTE_TESTS, {
    ...rootEnv,
    NEXT_PUBLIC_APP_BASE_PATH: basePath,
    NEXT_PUBLIC_APP_URL: publicUrl,
  });
}
