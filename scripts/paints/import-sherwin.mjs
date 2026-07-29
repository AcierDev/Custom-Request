// Rebuilds public/paints/sherwin/colors.json from Sherwin-Williams'
// official Color Visualizer API (no key required).
//
//   node scripts/paints/import-sherwin.mjs
//
// Source: https://api.sherwin-williams.com/prism/v1/colors/sherwin
// This is the same feed swcolor.sherwin-williams.com renders, so the
// hex, color NUMBER and the `archived` flag are authoritative. We map
// `archived` -> available:false, which is exactly the set of colors
// that "don't show up" when you try to buy them at the store.

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const SOURCE = "https://api.sherwin-williams.com/prism/v1/colors/sherwin";
const BRAND = "Sherwin-Williams";
const RETAILER = "Sherwin-Williams";
const LRV_DECIMAL_FACTOR = 10;
const EMPTY_COLLECTION_COUNT = 0;
const CLI_ENTRY_ARGUMENT_INDEX = 1;
const FAILURE_EXIT_CODE = 1;

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "..", "public", "paints", "sherwin", "colors.json");

function normalizeCollections(value) {
  if (!Array.isArray(value)) return undefined;

  const collections = [
    ...new Set(
      value
        .filter((entry) => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ];
  return collections.length > EMPTY_COLLECTION_COUNT
    ? collections
    : undefined;
}

export function normalizeSherwinColors(raw) {
  const seen = new Set();
  const out = [];
  for (const c of raw) {
    if (!c.colorNumber || !c.hex || !c.name) continue;
    // De-dupe by color number (the counter's unique key).
    if (seen.has(c.colorNumber)) continue;
    seen.add(c.colorNumber);
    const collections = normalizeCollections(c.brandedCollectionNames);
    out.push({
      name: c.name,
      code: `SW ${c.colorNumber}`,
      hex: c.hex.toLowerCase(),
      brand: BRAND,
      retailer: RETAILER,
      available: c.archived !== true,
      lrv:
        typeof c.lrv === "number"
          ? Math.round(c.lrv * LRV_DECIMAL_FACTOR) / LRV_DECIMAL_FACTOR
          : undefined,
      ...(collections ? { collections } : {}),
    });
  }
  // Stable order: in-stock first, then by code.
  out.sort((a, b) =>
    a.available === b.available
      ? a.code.localeCompare(b.code, undefined, { numeric: true })
      : a.available
        ? -1
        : 1
  );
  return out;
}

async function main() {
  process.stdout.write(`Fetching ${SOURCE} ...\n`);
  const res = await fetch(SOURCE, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`SW API ${res.status} ${res.statusText}`);
  const raw = await res.json();
  if (!Array.isArray(raw) || raw.length === 0)
    throw new Error("SW API returned no colors");

  const colors = normalizeSherwinColors(raw);
  const archived = colors.filter((c) => !c.available).length;

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(colors, null, 2) + "\n");

  process.stdout.write(
    `Wrote ${colors.length} colors (${colors.length - archived} available, ` +
      `${archived} discontinued) -> ${OUT}\n`
  );
}

const cliEntryPath = process.argv[CLI_ENTRY_ARGUMENT_INDEX];
const isDirectExecution =
  cliEntryPath !== undefined &&
  import.meta.url === pathToFileURL(cliEntryPath).href;

if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`import-sherwin failed: ${error.message}\n`);
    process.exit(FAILURE_EXIT_CODE);
  });
}
