# Paint dataset importers

Each script rebuilds `public/paints/<brand>/colors.json` in the shared
schema defined in `src/lib/paint.ts`:

```jsonc
{
  "name": "Tricorn Black",
  "code": "SW 6258",        // what you give the paint counter
  "hex": "#2f2f30",
  "brand": "Sherwin-Williams",
  "retailer": "Sherwin-Williams",
  "available": true,         // false = discontinued / fan-deck only
  "lrv": 2.8
}
```

The `code` + `available` fields are the fix for "colors that don't
show up when I go to buy paint": you can now search the store by the
exact manufacturer number, and discontinued colors are flagged.

## Status

| Brand | Script | Source | Codes |
|-------|--------|--------|-------|
| Sherwin-Williams | `import-sherwin.mjs` | SW Prism API `colors/sherwin` (keyless, authoritative) | ✅ current + `archived` flag |
| Valspar | `import-valspar.mjs` | SW Prism API `colors/valspar` (SW owns Valspar; keyless) | ✅ all current |
| Benjamin Moore | `import-benjamin-moore.mjs` | Normalizes the existing local BM file — it already had correct, current fan-deck codes (verified). No fetch. | ✅ current |
| Behr | `import-behr.mjs` | `api.behr.com` requires auth (HTTP 401); site is a SPA. No verifiable current feed found. | ⛔ stub (name/hex only) |
| PPG | `import-ppg.mjs` | ppgpaints.com is a Webflow SPA; no public color JSON found. | ⛔ stub (name/hex only) |

Behr/PPG were intentionally **not** scraped: no source could be
confirmed to list only *currently sold* colors, and shipping a guess
would reintroduce the original "color isn't available at the store"
problem. Their existing name/hex data is left untouched and the app
degrades gracefully (no code, no retailer filter) for those brands.

Stubbed brands keep their existing `{name,hex,brand}` JSON untouched
and the app keeps working — `code`/`retailer`/`available` are optional
and the UI falls back to the brand-prefixed name (see `purchaseLabel`).

## Run

```bash
npm run paints:sherwin     # rebuilds public/paints/sherwin/colors.json
```

Re-run whenever you want to refresh against the manufacturer feed.

## Adding a brand importer

1. Find the brand's color feed (browser devtools → Network while using
   their official color tool; look for the JSON request).
2. Copy `import-sherwin.mjs`, swap `SOURCE`, `BRAND`, `RETAILER`, and
   the `normalize()` field mapping. Keep the de-dupe-by-code and the
   `available` flag (map the brand's discontinued/archived marker).
3. Add an `npm run paints:<brand>` script in `package.json`.
4. Flip the table above to ✅.
