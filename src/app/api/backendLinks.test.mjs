import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { dirname, extname, resolve as resolvePath } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DEFAULT_APP_ORIGIN } from "../../lib/appPathConfig.mjs";

const TEST_FILE = fileURLToPath(import.meta.url);
const PROJECT_ROOT = resolvePath(dirname(TEST_FILE), "..", "..", "..");
const CHILD_MODE_ENV = "EVERWOOD_BACKEND_LINK_TEST_MODE";
const TEST_MODES = ["root", "custom"];
const CUSTOM_BASE_PATH = "/custom";
const CUSTOM_PUBLIC_URL = "https://everwoodus.com/custom/";
const TEST_ORIGIN = "http://localhost:3123";
const PROXY_UPSTREAM_ORIGIN = "https://everwood-upstream.vercel.app";
const DEFAULT_MAGIC_ORIGIN = "http://localhost:3000";
const DEFAULT_EMAIL_ORIGIN = "https://everwood.com";
const LEGACY_VIEWER_ORIGIN = "http://viewer.everwoodus.com";
const SHARE_SET_ID = "shared-set-test";
const TEST_EMAIL = "person+tag@example.test";
const TEST_TOKEN = "token?with&special=value";
const TEST_ORDER_NUMBER = "order-test";
const HTTP_OK = 200;
const PROCESS_SUCCESS = 0;
const EXPECTED_DELETED_TOKEN_COUNT = 1;
const INITIAL_ACCESS_COUNT = 0;
const FIRST_ITEM_INDEX = 0;
const TOKEN_COLLECTION_NAME = "tokens";
const PROJECT_FILE_EXTENSIONS = ["", ".ts", ".tsx", ".js", ".mjs"];
const TYPESCRIPT_EXTENSIONS = new Set([".ts", ".tsx"]);
const EXPLICIT_FACEBOOK_CALLBACK = "https://auth.example.test/facebook-return";
const EXPLICIT_GOOGLE_CALLBACK = "https://auth.example.test/google-return";
const TEST_ACCESS_TOKEN = "local-provider-token";
const GOOGLE_USER_ID = "google-person";
const FACEBOOK_USER_ID = "facebook-person";
const TEST_USER_NAME = "Person";
const TEST_USER_IMAGE = "https://images.example.test/person.png";

if (!process.env[CHILD_MODE_ENV]) {
  for (const mode of TEST_MODES) {
    test(`backend links remain inside the ${mode} app deployment`, () => {
      const childEnv = {
        ...process.env,
        [CHILD_MODE_ENV]: mode,
        NODE_ENV: "test",
        // The database module is mocked below; a set URI keeps the routes off
        // their no-Mongo local development stores so the mock is exercised.
        MONGODB_URI: "mongodb://backend-links.test/everwood",
        NEXT_PUBLIC_APP_BASE_PATH: mode === "custom" ? CUSTOM_BASE_PATH : "",
        NEXT_PUBLIC_APP_URL: mode === "custom" ? CUSTOM_PUBLIC_URL : "",
        NEXT_PUBLIC_FACEBOOK_REDIRECT_URI: "",
        NEXT_PUBLIC_GOOGLE_REDIRECT_URI: "",
        ZEPTOMAIL_TOKEN: "test-transport-token",
      };
      delete childEnv.NODE_TEST_CONTEXT;
      const result = spawnSync(
        process.execPath,
        ["--no-warnings", "--test", TEST_FILE],
        {
          encoding: "utf8",
          env: childEnv,
        },
      );
      assert.equal(result.status, PROCESS_SUCCESS, result.stdout + result.stderr);
    });
  }
} else {
  const require = createRequire(import.meta.url);
  const { transformSync } = require("next/dist/build/swc");
  const mode = process.env[CHILD_MODE_ENV];
  const prefix = mode === "custom" ? CUSTOM_BASE_PATH : "";
  const canonicalOrigin = "https://everwoodus.com";
  const magicOrigin = mode === "custom" ? canonicalOrigin : DEFAULT_MAGIC_ORIGIN;
  const emailOrigin = mode === "custom" ? canonicalOrigin : DEFAULT_EMAIL_ORIGIN;
  const shareOrigin = mode === "custom" ? canonicalOrigin : TEST_ORIGIN;
  const resolveProjectFile = (basePath) =>
    PROJECT_FILE_EXTENSIONS.map((suffix) => `${basePath}${suffix}`).find(
      (candidate) => existsSync(candidate),
    );
  const databaseModule = `
    export const getCollection = async () => globalThis.backendLinkCollection;
    export const getMongoDb = async () => ({
      collection: (name) => name === ${JSON.stringify(TOKEN_COLLECTION_NAME)}
        ? globalThis.backendLinkTokens
        : globalThis.backendLinkCollection,
    });
  `;
  const emailTransportModule = `
    export class SendMailClient {
      async sendMail(payload) {
        globalThis.backendLinkEmailPayload = payload;
        return { request_id: "test-message-id" };
      }
    }
  `;
  const testModuleUrl = (source) =>
    `data:text/javascript,${encodeURIComponent(source)}`;

  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "zeptomail") {
        return { url: testModuleUrl(emailTransportModule), shortCircuit: true };
      }
      if (specifier === "next/server") {
        return {
          url: pathToFileURL(require.resolve("next/server")).href,
          shortCircuit: true,
        };
      }
      let basePath;
      if (specifier.startsWith("@/")) {
        basePath = resolvePath(PROJECT_ROOT, "src", specifier.slice("@/".length));
      } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
        basePath = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
      }
      if (basePath === resolvePath(PROJECT_ROOT, "src/lib/mongodb")) {
        return { url: testModuleUrl(databaseModule), shortCircuit: true };
      }
      const projectFile = basePath ? resolveProjectFile(basePath) : undefined;
      return projectFile
        ? { url: pathToFileURL(projectFile).href, shortCircuit: true }
        : nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      const filename = url.startsWith("file:") ? fileURLToPath(url) : "";
      if (!TYPESCRIPT_EXTENSIONS.has(extname(filename))) {
        return nextLoad(url, context);
      }
      const result = transformSync(readFileSync(filename, "utf8"), {
        filename,
        jsc: { parser: { syntax: "typescript" }, target: "es2022" },
        module: { type: "es6" },
        sourceMaps: false,
      });
      return { format: "module", source: result.code, shortCircuit: true };
    },
  });

  const { NextRequest } = await import("next/server");
  const { configureTokenDebug, generateMagicLink } = await import("../../lib/token.ts");
  const { sendEmail } = await import("../../lib/email.ts");
  const { POST: shareDesign } = await import("./shared-designs/route.ts");
  const { POST: shareSet, GET: getSet } = await import("./shared-design-sets/route.ts");
  const { GET: emailCallback } = await import("./auth/email/callback/route.ts");
  const { GET: facebookCallback } = await import("./auth/facebook/callback/route.ts");
  const { GET: facebookAuth } = await import("./auth/facebook/route.ts");
  const { GET: googleCallback } = await import("./auth/google/callback/route.ts");
  configureTokenDebug({ enabled: false });
  globalThis.fetch = async () => {
    throw new Error("Network requests are disabled in backend link tests");
  };
  globalThis.backendLinkTokens = {
    findOne: async () => ({ email: TEST_EMAIL }),
    deleteOne: async () => ({ deletedCount: EXPECTED_DELETED_TOKEN_COUNT }),
  };
  globalThis.backendLinkCollection = {
    insertOne: async () => {},
    createIndexes: async () => {},
    updateOne: async () => {},
    findOne: async () => ({ setId: SHARE_SET_ID, designs: [], accessCount: INITIAL_ACCESS_COUNT }),
    find: () => ({
      sort() { return this; },
      limit() { return this; },
      toArray: async () => [{ setId: SHARE_SET_ID }],
    }),
  };
  const request = (path, init) => new NextRequest(`${TEST_ORIGIN}${prefix}${path}`, init);
  const jsonRequest = (path, data) => request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const setUrl = (setId) => `${LEGACY_VIEWER_ORIGIN}/?setId=${setId}`;
  const localOAuthTransport = (googleUri, facebookUri) => async (input, init) => {
    const url = new URL(input);
    if (url.href === "https://oauth2.googleapis.com/token") {
      assert.equal(init.body.get("redirect_uri"), googleUri);
      return Response.json({ access_token: TEST_ACCESS_TOKEN });
    }
    if (url.href === "https://www.googleapis.com/oauth2/v3/userinfo") {
      return Response.json({ sub: GOOGLE_USER_ID, email: TEST_EMAIL, name: TEST_USER_NAME, picture: TEST_USER_IMAGE });
    }
    if (url.pathname === "/v19.0/oauth/access_token") {
      assert.equal(url.searchParams.get("redirect_uri"), facebookUri);
      return Response.json({ access_token: TEST_ACCESS_TOKEN });
    }
    if (url.pathname === "/v19.0/me") {
      return Response.json({ id: FACEBOOK_USER_ID, email: TEST_EMAIL, name: TEST_USER_NAME, picture: { data: { url: TEST_USER_IMAGE } } });
    }
    throw new Error(`Unexpected provider transport: ${url.href}`);
  };
  const verifyOAuthCompletion = async (callback, provider, expectedId) => {
    const response = await callback(request(`/api/auth/${provider}/callback?code=test-code`));
    const redirect = new URL(response.headers.get("location"));
    assert.equal(redirect.origin, shareOrigin);
    assert.equal(redirect.pathname, `${prefix}/auth/${provider}-handler`);
    const user = JSON.parse(Buffer.from(redirect.searchParams.get("token"), "base64").toString());
    assert.equal(user.id, expectedId);
    assert.equal(user.email, TEST_EMAIL);
  };

  test("magic links contain one app prefix and retain token/email query values", () => {
    const url = new URL(generateMagicLink(TEST_TOKEN, TEST_EMAIL));
    assert.equal(url.origin, magicOrigin);
    assert.equal(url.pathname, `${prefix}/api/auth/email/callback`);
    assert.equal(url.searchParams.get("token"), TEST_TOKEN);
    assert.equal(url.searchParams.get("email"), TEST_EMAIL);
  });

  test("welcome and order emails point to their pages inside the app", async () => {
    for (const [template, templateData, path] of [
      ["welcome", { name: "Person" }, "/order"],
      ["order-confirmation", { orderNumber: TEST_ORDER_NUMBER, items: [] }, `/orders/${TEST_ORDER_NUMBER}`],
    ]) {
      const result = await sendEmail({ to: TEST_EMAIL, subject: "Test", template, templateData });
      assert.equal(result.success, true);
      assert.ok(globalThis.backendLinkEmailPayload.htmlbody.includes(`href="${emailOrigin}${prefix}${path}"`));
    }
  });

  test("new individual shares use the configured canonical deployment URL", async () => {
    const response = await shareDesign(jsonRequest("/api/shared-designs", { designData: { selectedDesign: "squares" } }));
    assert.equal(response.status, HTTP_OK);
    const payload = await response.json();
    // Stored shares always link to the canonical public app, never the request origin.
    const canonicalShareOrigin = mode === "custom" ? canonicalOrigin : DEFAULT_APP_ORIGIN;
    assert.equal(payload.shareUrl, `${canonicalShareOrigin}${prefix}/shared/${payload.shareId}`);
  });

  test("shared set creation, lookup, and listing preserve the independent gallery links", async () => {
    const created = await shareSet(jsonRequest("/api/shared-design-sets", { designs: [{ designData: {} }] }));
    const payload = await created.json();
    assert.equal(created.status, HTTP_OK);
    assert.equal(payload.setUrl, setUrl(payload.setId));
    const fetched = await getSet(request(`/api/shared-design-sets?id=${SHARE_SET_ID}`));
    assert.equal((await fetched.json()).setUrl, setUrl(SHARE_SET_ID));
    const listed = await getSet(request("/api/shared-design-sets"));
    assert.equal((await listed.json()).sets.at(FIRST_ITEM_INDEX).link, setUrl(SHARE_SET_ID));
  });

  test("missing auth credentials redirect to sign-in inside the app", async () => {
    for (const [callback, path, error] of [
      [emailCallback, "/api/auth/email/callback", "no_token"],
      [facebookCallback, "/api/auth/facebook/callback", "no_code"],
      [googleCallback, "/api/auth/google/callback", "no_code"],
    ]) {
      const response = await callback(request(path));
      const redirect = new URL(response.headers.get("location"));
      assert.equal(redirect.origin, shareOrigin);
      assert.equal(redirect.pathname, `${prefix}/sign-in`);
      assert.equal(redirect.searchParams.get("error"), error);
    }
  });

  test("auth redirects use the public URL when requests arrive through a proxy upstream", async () => {
    const expectedOrigin = mode === "custom" ? canonicalOrigin : PROXY_UPSTREAM_ORIGIN;
    for (const [callback, path] of [
      [emailCallback, "/api/auth/email/callback"],
      [facebookCallback, "/api/auth/facebook/callback"],
      [googleCallback, "/api/auth/google/callback"],
    ]) {
      const response = await callback(new NextRequest(`${PROXY_UPSTREAM_ORIGIN}${prefix}${path}`));
      const redirect = new URL(response.headers.get("location"));
      assert.equal(redirect.origin, expectedOrigin);
      assert.equal(redirect.pathname, `${prefix}/sign-in`);
    }
  });

  test("valid email authentication completes inside the app", async () => {
    const response = await emailCallback(request(`/api/auth/email/callback?token=${encodeURIComponent(TEST_TOKEN)}&email=${encodeURIComponent(TEST_EMAIL)}`));
    const redirect = new URL(response.headers.get("location"));
    assert.equal(redirect.origin, shareOrigin);
    assert.equal(redirect.pathname, `${prefix}/auth/email/complete`);
    assert.equal(JSON.parse(redirect.searchParams.get("user")).email, TEST_EMAIL);
  });

  test("OAuth fallback callbacks and completion redirects stay inside the app", async () => {
    const response = await facebookAuth(request("/api/auth/facebook"));
    const oauthUrl = new URL(response.headers.get("location"));
    assert.equal(oauthUrl.searchParams.get("redirect_uri"), `${shareOrigin}${prefix}/api/auth/facebook/callback`);
    const previousFetch = globalThis.fetch;
    globalThis.fetch = localOAuthTransport(
      `${shareOrigin}${prefix}/api/auth/google/callback`,
      `${shareOrigin}${prefix}/api/auth/facebook/callback`,
    );
    try {
      await verifyOAuthCompletion(googleCallback, "google", GOOGLE_USER_ID);
      await verifyOAuthCompletion(facebookCallback, "facebook", FACEBOOK_USER_ID);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  test("explicit OAuth callback configuration remains unchanged", async () => {
    process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI = EXPLICIT_FACEBOOK_CALLBACK;
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI = EXPLICIT_GOOGLE_CALLBACK;
    const { GET: explicitFacebookAuth } = await import("./auth/facebook/route.ts?explicit");
    const { GET: explicitFacebookCallback } = await import("./auth/facebook/callback/route.ts?explicit");
    const { GET: explicitGoogleCallback } = await import("./auth/google/callback/route.ts?explicit");
    const response = await explicitFacebookAuth(request("/api/auth/facebook"));
    assert.equal(new URL(response.headers.get("location")).searchParams.get("redirect_uri"), EXPLICIT_FACEBOOK_CALLBACK);
    const previousFetch = globalThis.fetch;
    globalThis.fetch = localOAuthTransport(EXPLICIT_GOOGLE_CALLBACK, EXPLICIT_FACEBOOK_CALLBACK);
    try {
      await verifyOAuthCompletion(explicitGoogleCallback, "google", GOOGLE_USER_ID);
      await verifyOAuthCompletion(explicitFacebookCallback, "facebook", FACEBOOK_USER_ID);
    } finally {
      globalThis.fetch = previousFetch;
      delete process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI;
      delete process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
    }
  });
}
