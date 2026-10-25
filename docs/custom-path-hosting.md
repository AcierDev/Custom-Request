# Prepared hosting at everwoodus.com/custom

This preparation is inactive by default. No domain, DNS, production environment,
provider settings or live deployment has changed. The current root-hosted app
continues to use its existing routes.

## Opt-in configuration

`.env.custom.example` contains the public settings for a future, separate build:

```dotenv
NEXT_PUBLIC_APP_BASE_PATH=/custom
NEXT_PUBLIC_APP_URL=https://everwoodus.com/custom
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://everwoodus.com/custom/api/auth/google/callback
NEXT_PUBLIC_FACEBOOK_REDIRECT_URI=https://everwoodus.com/custom/api/auth/facebook/callback
```

The example file is deliberately not loaded by Next. Set these values only on
the future deployment when ready. Keep existing database, email, Shopify and
OAuth credentials. `basePath` is baked into the build; changing an environment
value after a build is insufficient. The public app URL may be the origin or
the same `/custom` path; mismatched paths fail configuration validation.

## Future routing requirements

The existing everwoodus.com root currently redirects to Etsy. Its hosting must
serve or proxy `/custom` before applying that root redirect. DNS alone cannot
route one URL path to a separate app.

Forward `/custom` and every `/custom/*` request to the dedicated app deployment,
preserving the prefix, query, request method and body. This includes app routes,
API routes, `/_next` resources, models, textures, paint catalogs and WASM files.
Preserve the public host and HTTPS scheme in trusted forwarded headers.
The future app origin must be built with `/custom` enabled. Do not strip the
prefix when forwarding to Next. The main site's other paths can retain their
existing behavior.

Vercel Speed Insights uses `/custom/_vercel/speed-insights/*` in the opt-in
build. Proxy those platform requests to the dedicated deployment's
`/_vercel/speed-insights/*` endpoint (strip `/custom` for this platform endpoint
only). This keeps its script and telemetry attached to the app deployment.

Register the exact new callback URLs in Google and Facebook before testing
sign-in. Email magic links and new shared links use the configured app URL.
Keep old shared URLs reachable during a later migration, including their IDs
and query strings. Browser drafts and sign-in state belong to the old origin
and will not automatically transfer to the new domain; saved database records
remain available with the same database settings.

Multi-design set galleries still use the independent `viewer.everwoodus.com`
site. Their existing links remain intact; this app's color breakdown page and
individual shared artwork pages support the new mount.

## Local verification

```sh
npm run test:app-paths
npm run test:custom-hosting
npm run build
NEXT_PUBLIC_APP_BASE_PATH=/custom NEXT_PUBLIC_APP_URL=https://everwoodus.com/custom npm run build
npm run test:step-worker-build
```

Use a separate build directory through `CUSTOM_REQUEST_NEXT_DIST_DIR` when
keeping both builds locally. Test the opt-in deployment's welcome and sign-in
pages, shared views, paint/API/texture requests and OAuth callback redirects
before enabling external routing. Rendering is unnecessary for path checks.
The worker check exercises the compiled STEP loader without loading the CAD
runtime. Set `CUSTOM_REQUEST_STEP_BUILD_DIR` to check a separate build directory.

## URL conventions

Use `appPath` for fetch calls, public assets and native browser navigation;
use `appUrl` for absolute shared/email links. Both apply the mount exactly once.
Next `Link` and router navigation already add `basePath` and should retain
unprefixed app routes. Strip the mount before comparing a native browser
pathname; Next's `usePathname` already returns the app route.

Asset manifests retain their root-relative source paths so offline exports and
fixture readers can locate the original files. Loaders prefix those URLs at
the request boundary. STEP's virtual filesystem paths remain filesystem paths.
