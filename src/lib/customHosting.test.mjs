import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const CUSTOM_BASE_PATH = "/custom";
const CUSTOM_PUBLIC_URL = "https://everwoodus.com/custom";
const ROOT_ENV = { ...process.env, NEXT_PUBLIC_APP_BASE_PATH: "", NEXT_PUBLIC_APP_URL: "" };
const CUSTOM_ENV = { ...ROOT_ENV, NEXT_PUBLIC_APP_BASE_PATH: CUSTOM_BASE_PATH, NEXT_PUBLIC_APP_URL: CUSTOM_PUBLIC_URL };

const loadConfig = (env) => JSON.parse(execFileSync(process.execPath, [
  "--input-type=module", "-e",
  'const { default: config } = await import("./next.config.mjs"); console.log(JSON.stringify({ basePath: config.basePath, redirects: await config.redirects() }));',
], { env, encoding: "utf8" }));

test("Next build keeps root hosting as the default", () => {
  const config = loadConfig(ROOT_ENV);
  assert.equal(config.basePath, "");
  assert.equal(config.redirects.find((redirect) => redirect.source === "/").destination, "/shared/:sid");
});

test("Next build opts into the custom mount without changing logical redirects", () => {
  const config = loadConfig(CUSTOM_ENV);
  assert.equal(config.basePath, CUSTOM_BASE_PATH);
  assert.equal(config.redirects.find((redirect) => redirect.source === "/").destination, "/shared/:sid");
});

test("runtime exports use the same opt-in configuration as Next", () => {
  const output = execFileSync(process.execPath, ["--no-warnings", "--input-type=module", "-e",
    'const p = await import("./src/lib/appPaths.ts"); console.log(JSON.stringify([p.APP_BASE_PATH, p.appPath("/api/user-data"), p.appUrl("/shared/test"), p.stripAppBasePath("/custom/viewer")]));',
  ], { env: CUSTOM_ENV, encoding: "utf8" });
  assert.deepEqual(JSON.parse(output), [CUSTOM_BASE_PATH, "/custom/api/user-data", `${CUSTOM_PUBLIC_URL}/shared/test`, "/viewer"]);
});
