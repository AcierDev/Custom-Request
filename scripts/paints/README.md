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
| Behr | `import-behr.mjs` | Behr first-party AEM color-detail index (production site source) | ✅ codes + RGB/hex + LRV + archive state |
| PPG | `import-ppg.mjs` | ppgpaints.com is a Webflow SPA; no public color JSON found. | ⛔ stub (name/hex only) |

Behr is imported from the same first-party index that powers its current
color-detail pages. The importer rejects duplicate codes, malformed rows,
RGB/hex disagreement, invalid LRV values, and incomplete responses before
replacing the local catalog. Behr states that archived colors remain
orderable online or at The Home Depot, so both current and archived colors
stay eligible for matching.

PPG remains intentionally **unscraped** because no source has been confirmed
to provide authoritative codes and color values. Its existing
`{name,hex,brand}` JSON stays untouched and the app falls back to the
brand-prefixed name (see `purchaseLabel`).

## Run

```bash
npm run paints:sherwin     # rebuilds public/paints/sherwin/colors.json
npm run paints:behr        # rebuilds public/paints/behr/colors.json
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
