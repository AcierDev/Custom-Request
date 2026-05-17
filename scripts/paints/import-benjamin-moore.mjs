// Normalizes public/paints/benjamin_moore/colors.json into the shared
// schema (src/lib/paint.ts).
//
//   node scripts/paints/import-benjamin-moore.mjs
//
// Unlike the SW/Valspar importers this does NOT fetch a remote feed.
// The existing local BM dataset already carries correct, current
// Benjamin Moore fan-deck codes (spot-checked: White Dove OC-17, Hale
// Navy HC-154, Chantilly Lace OC-65 — all correct; 0 blank, 0 dup
// codes). BM's published color book (Classic, Color Preview, Off-White,
// Historical, Affinity, Williamsburg) is long-standing and effectively
// stable, so these codes are reliable to give a paint counter. We only
// add `retailer` + `available` and keep the data as-is — no scraping,
// so no risk of pulling in uncertain/discontinued colors.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BRAND = "Benjamin Moore";
const RETAILER = "Benjamin Moore";

const here = dirname(fileURLToPath(import.meta.url));
const FILE = join(
  here,
  "..",
  "..",
  "public",
  "paints",
  "benjamin_moore",
  "colors.json"
);

async function main() {
  const raw = JSON.parse(await readFile(FILE, "utf8"));
  if (!Array.isArray(raw) || raw.length === 0)
    throw new Error("benjamin_moore/colors.json is empty");

  const seen = new Set();
  const out = [];
  for (const c of raw) {
    if (!c.code || !c.hex || !c.name) continue;
    if (seen.has(c.code)) continue;
    seen.add(c.code);
    out.push({
      name: c.name,
      code: c.code,
      hex: c.hex.toLowerCase(),
      brand: BRAND,
      retailer: RETAILER,
      available: true,
      ...(c.family ? { family: c.family } : {}),
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));

  await writeFile(FILE, JSON.stringify(out, null, 2) + "\n");
  process.stdout.write(
    `Normalized ${out.length} Benjamin Moore colors (codes + retailer) ` +
      `-> ${FILE}\n`
  );
}

main().catch((e) => {
  process.stderr.write(`import-benjamin-moore failed: ${e.message}\n`);
  process.exit(1);
});
