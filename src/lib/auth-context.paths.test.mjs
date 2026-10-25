import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { dirname, extname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const { transformSync } = require("next/dist/build/swc");
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PROJECT_EXTENSIONS = ["", ".ts", ".tsx", ".mjs"];
const TYPESCRIPT_EXTENSIONS = new Set([".ts", ".tsx"]);
const PATH_ALIAS_PREFIX_LENGTH = 2;
const LAST_ROUTER_PUSH_INDEX = -1;
const BROWSER_ORIGIN = "https://browser.example.test";
const GOOGLE_OVERRIDE = "https://oauth.example.test/google-callback";
const FACEBOOK_OVERRIDE = "https://oauth.example.test/facebook-callback";
const TEST_BASE_PATH = process.env.NEXT_PUBLIC_APP_BASE_PATH || "";
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const originalGoogleUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
const originalFacebookUri = process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI;
const routerPushes = [];
const navigationMock = `data:text/javascript,${encodeURIComponent(`
  export const useRouter = () => ({ push: (path) => globalThis.__authPathTestPush(path) });
  export const usePathname = () => "/sign-in";
  export const useSearchParams = () => new URLSearchParams();
`)}`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/navigation") {
      return { url: navigationMock, shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      const base = resolve(PROJECT_ROOT, "src", specifier.slice(PATH_ALIAS_PREFIX_LENGTH));
      const file = PROJECT_EXTENSIONS.map((suffix) => `${base}${suffix}`).find(existsSync);
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    const file = url.startsWith("file:") ? fileURLToPath(url) : "";
    if (!TYPESCRIPT_EXTENSIONS.has(extname(file))) return nextLoad(url, context);
    const { code } = transformSync(readFileSync(file, "utf8"), {
      filename: file,
      jsc: {
        parser: { syntax: "typescript", tsx: file.endsWith(".tsx") },
        transform: { react: { runtime: "automatic" } },
        target: "es2022",
      },
      module: { type: "es6" },
      sourceMaps: false,
    });
    return { format: "module", source: code, shortCircuit: true };
  },
});

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { location: { origin: BROWSER_ORIGIN, href: "" } },
});
globalThis.__authPathTestPush = (path) => routerPushes.push(path);
const storage = new Map();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
});

const captureAuth = (module) => {
  let auth;
  const Consumer = () => {
    auth = module.useAuth();
    return null;
  };
  renderToStaticMarkup(React.createElement(module.AuthProvider, null, React.createElement(Consumer)));
  assert.ok(auth);
  return auth;
};

const restoreEnvironment = (key, original) => {
  if (original === undefined) delete process.env[key];
  else process.env[key] = original;
};

test.after(() => {
  for (const [key, descriptor] of [["window", originalWindow], ["localStorage", originalLocalStorage]]) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
  delete globalThis.__authPathTestPush;
  restoreEnvironment("NEXT_PUBLIC_GOOGLE_REDIRECT_URI", originalGoogleUri);
  restoreEnvironment("NEXT_PUBLIC_FACEBOOK_REDIRECT_URI", originalFacebookUri);
});

test("OAuth initiation uses app paths when explicit callback URLs are absent", async () => {
  delete process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
  delete process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI;
  const auth = captureAuth(await import("./auth-context.tsx?fallback"));
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL || BROWSER_ORIGIN).origin;

  await auth.initiateGoogleAuth();
  assert.equal(new URL(window.location.href).searchParams.get("redirect_uri"), `${origin}${TEST_BASE_PATH}/api/auth/google/callback`);
  await auth.signIn("facebook");
  assert.equal(new URL(window.location.href).searchParams.get("redirect_uri"), `${origin}${TEST_BASE_PATH}/api/auth/facebook/callback`);
});

test("OAuth initiation honors explicit provider callback URLs", async () => {
  process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI = GOOGLE_OVERRIDE;
  process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI = FACEBOOK_OVERRIDE;
  const auth = captureAuth(await import("./auth-context.tsx?explicit"));

  await auth.initiateGoogleAuth();
  assert.equal(new URL(window.location.href).searchParams.get("redirect_uri"), GOOGLE_OVERRIDE);
  await auth.signIn("facebook");
  assert.equal(new URL(window.location.href).searchParams.get("redirect_uri"), FACEBOOK_OVERRIDE);
});

test("guest navigation passes an unprefixed saved URL to the Next router", async () => {
  storage.set("everwood_redirect_after_signin", `${TEST_BASE_PATH}/viewer?s=saved-design`);
  const auth = captureAuth(await import("./auth-context.tsx?guest"));

  auth.continueAsGuest();

  assert.equal(routerPushes.at(LAST_ROUTER_PUSH_INDEX), "/viewer?s=saved-design");
  assert.equal(storage.has("everwood_redirect_after_signin"), false);
});
