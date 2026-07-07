// Rebuilds public/paints/valspar/colors.json from the Prism color API.
//
//   node scripts/paints/import-valspar.mjs
//
// Sherwin-Williams owns Valspar and serves its CURRENT color wall from
// the same authoritative Prism platform that powers import-sherwin.mjs
// (also mirrored on api.valspar.com — identical data). The `valspar`
// brandKey feed is the published, in-market Valspar deck: it carries no
// discontinued/archived entries, so every color here is current.
// Valspar is sold at Lowe's.

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SOURCE = "https://api.sherwin-williams.com/prism/v1/colors/valspar";
const BRAND = "Valspar";
const RETAILER = "Lowe's";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "..", "public", "paints", "valspar", "colors.json");
// Discontinued / "Creative Ideas for Color" (CI) Valspar colors that Lowe's
// can still custom-mix but that the Prism `valspar` feed no longer lists.
// Curated by hand (hex verified against valspar.com / myperfectcolor RGB) so
// a re-import never drops them. Add future discontinued colors here.
const SUPPLEMENTAL = join(here, "valspar-discontinued.json");

function normalize(raw) {
  const seen = new Set();
  const out = [];
  for (const c of raw) {
    if (!c.colorNumber || !c.hex || !c.name) continue;
    // Only colors certain to be current: skip anything the platform
    // flags archived (defensive — the valspar feed has none today).
    if (c.archived === true) continue;
    if (seen.has(c.colorNumber)) continue;
    seen.add(c.colorNumber);
    out.push({
      name: c.name,
      code: c.colorNumber,
      hex: c.hex.toLowerCase(),
      brand: BRAND,
      retailer: RETAILER,
      available: true,
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
    throw new Error("Prism API returned no Valspar colors");

  const colors = normalize(raw);

  // Merge in the hand-curated discontinued/CI colors, skipping any the feed
  // now carries (dedupe by code), then re-sort so the file stays stable.
  let supplemental = [];
  try {
    supplemental = JSON.parse(await readFile(SUPPLEMENTAL, "utf8"));
  } catch {
    process.stderr.write(`(no supplemental file at ${SUPPLEMENTAL}, skipping)\n`);
  }
  const feedCodes = new Set(colors.map((c) => c.code.toUpperCase()));
  const extra = supplemental.filter(
    (c) => c.code && !feedCodes.has(c.code.toUpperCase())
  );
  const merged = [...colors, ...extra].sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { numeric: true })
  );

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(merged, null, 2) + "\n");
  process.stdout.write(
    `Wrote ${merged.length} Valspar colors (${colors.length} current + ${extra.length} discontinued) -> ${OUT}\n`
  );
}

main().catch((e) => {
  process.stderr.write(`import-valspar failed: ${e.message}\n`);
  process.exit(1);
});
