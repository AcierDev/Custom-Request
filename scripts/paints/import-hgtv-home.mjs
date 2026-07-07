// Rebuilds public/paints/hgtv_home/colors.json from Sherwin-Williams'
// Prism color API — the SAME authoritative platform behind
// import-sherwin.mjs and import-valspar.mjs.
//
//   node scripts/paints/import-hgtv-home.mjs
//
// The `lowes` brandKey feed is Sherwin-Williams' own definition of the
// Lowe's paint wall: Valspar (house brand) + HGTV Home by Sherwin-
// Williams (brandKey "HGSW", Lowe's-exclusive). Valspar has its own
// importer, so here we take ONLY the HGSW entries — the exact in-store
// HGTV Home deck (a curated subset of the full hgtv feed). Every color
// is current (the feed carries no archived HGSW entries), so each one
// is genuinely mixable at a Lowe's counter.

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// The Lowe's wall feed. We filter to HGSW below; Valspar is imported
// separately (import-valspar.mjs) so it isn't double-counted.
const SOURCE = "https://api.sherwin-williams.com/prism/v1/colors/lowes";
const HGTV_BRAND_KEY = "HGSW";
const BRAND = "HGTV Home by Sherwin-Williams";
const RETAILER = "Lowe's";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "..", "public", "paints", "hgtv_home", "colors.json");

function normalize(raw) {
  const seen = new Set();
  const out = [];
  for (const c of raw) {
    if ((c.brandKey || "") !== HGTV_BRAND_KEY) continue;
    if (!c.colorNumber || !c.hex || !c.name) continue;
    // De-dupe by color number (the counter's unique key).
    if (seen.has(c.colorNumber)) continue;
    seen.add(c.colorNumber);
    out.push({
      name: c.name,
      // The counter/Lowe's.com identifier is the brandKey-prefixed number
      // (e.g. "HGSW0024"), NOT the bare colorNumber — a bare "0024" won't
      // resolve at the paint desk. See lowes.com + hgtvhomebysherwinwilliams.com.
      code: `${HGTV_BRAND_KEY}${c.colorNumber}`,
      hex: c.hex.toLowerCase(),
      brand: BRAND,
      retailer: RETAILER,
      // The lowes feed only lists current, in-store colors; honor the
      // archived flag anyway so a future feed change can't sneak a
      // discontinued color onto the wall.
      available: c.archived !== true,
      lrv: typeof c.lrv === "number" ? Math.round(c.lrv * 10) / 10 : undefined,
    });
  }
  out.sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { numeric: true })
  );
  return out;
}

async function main() {
  process.stdout.write(`Fetching ${SOURCE} ...\n`);
  const res = await fetch(SOURCE, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Prism API ${res.status} ${res.statusText}`);
  const raw = await res.json();
  if (!Array.isArray(raw) || raw.length === 0)
    throw new Error("Prism API returned no Lowe's colors");

  const colors = normalize(raw);
  if (colors.length === 0)
    throw new Error("No HGSW (HGTV Home) colors found in the lowes feed");
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(colors, null, 2) + "\n");
  process.stdout.write(
    `Wrote ${colors.length} HGTV Home by Sherwin-Williams colors -> ${OUT}\n`
  );
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || err}\n`);
  process.exit(1);
});
