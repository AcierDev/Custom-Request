// Rebuilds public/paints/behr/colors.json from Behr's first-party AEM
// color-detail index.
//
//   node scripts/paints/import-behr.mjs
//
// Behr's production site references this AEM origin directly. The feed carries
// the manufacturer code, name, RGB/hex, LRV, and archived state for every
// color. Behr explicitly says archived colors remain orderable online or at
// The Home Depot, so they stay available for matching.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SOURCE =
  "https://main--behr--mascocg.aem.live/colors/color-detail/query-index.json";
const BRAND = "Behr";
const RETAILER = "The Home Depot";
const EMPTY_COLOR_COUNT = 0;
const FIRST_SOURCE_OFFSET = 0;
const HEX_DIGIT_COUNT = 6;
const HEX_RADIX = 16;
const RGB_HEX_DIGIT_COUNT = 2;
const RGB_CHANNEL_MIN = 0;
const RGB_CHANNEL_MAX = 255;
const LRV_MIN = 0;
const LRV_MAX = 100;
const CLI_ENTRY_ARGUMENT_INDEX = 1;
const FAILURE_EXIT_CODE = 1;
const RGB_FIELDS = ["color-r", "color-g", "color-b"];

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "..", "public", "paints", "behr", "colors.json");

function requiredText(value, field, rowIndex) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Behr row ${rowIndex} has invalid ${field}`);
  }
  return value.trim();
}

function parseRgbChannel(value, field, rowIndex) {
  const channel = Number(value);
  if (
    !Number.isInteger(channel) ||
    channel < RGB_CHANNEL_MIN ||
    channel > RGB_CHANNEL_MAX
  ) {
    throw new Error(`Behr row ${rowIndex} has invalid ${field}`);
  }
  return channel;
}

export function normalizeBehrColors(raw) {
  if (!Array.isArray(raw) || raw.length === EMPTY_COLOR_COUNT) {
    throw new Error("Behr source returned no colors");
  }

  const seenCodes = new Set();
  const colors = raw.map((row, rowIndex) => {
    const code = requiredText(row["color-code"], "color-code", rowIndex);
    const name = requiredText(row["color-name"], "color-name", rowIndex);
    const sourceHex = requiredText(row.rgbhex, "rgbhex", rowIndex).replace(
      /^#/,
      "",
    );
    const expectedPath = `/colors/color-detail/${code.toLowerCase()}`;
    if (row.path !== expectedPath) {
      throw new Error(`Behr row ${rowIndex} path does not match code ${code}`);
    }
    if (!new RegExp(`^[0-9a-f]{${HEX_DIGIT_COUNT}}$`, "i").test(sourceHex)) {
      throw new Error(`Behr row ${rowIndex} has invalid rgbhex`);
    }
    if (row.archived !== "true" && row.archived !== "false") {
      throw new Error(`Behr row ${rowIndex} has invalid archived state`);
    }
    if (seenCodes.has(code)) {
      throw new Error(`Behr source contains duplicate code ${code}`);
    }
    seenCodes.add(code);

    const channels = RGB_FIELDS.map((field) =>
      parseRgbChannel(row[field], field, rowIndex),
    );
    const rgbHex = channels
      .map((channel) =>
        channel.toString(HEX_RADIX).padStart(RGB_HEX_DIGIT_COUNT, "0"),
      )
      .join("");
    if (rgbHex.toLowerCase() !== sourceHex.toLowerCase()) {
      throw new Error(`Behr row ${rowIndex} RGB does not match hex`);
    }

    const lrv = Number(row.lrv);
    if (!Number.isFinite(lrv) || lrv < LRV_MIN || lrv > LRV_MAX) {
      throw new Error(`Behr row ${rowIndex} has invalid LRV`);
    }

    return {
      name,
      code,
      hex: `#${sourceHex.toLowerCase()}`,
      brand: BRAND,
      retailer: RETAILER,
      available: true,
      lrv,
    };
  });

  colors.sort((first, second) =>
    first.code.localeCompare(second.code, undefined, { numeric: true }),
  );
  return colors;
}

async function main() {
  process.stdout.write(`Fetching ${SOURCE} ...\n`);
  const response = await fetch(SOURCE, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Behr source ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (
    !Array.isArray(payload.data) ||
    payload.data.length === EMPTY_COLOR_COUNT ||
    payload.offset !== FIRST_SOURCE_OFFSET ||
    payload.total !== payload.data.length
  ) {
    throw new Error("Behr source returned an incomplete color index");
  }

  const colors = normalizeBehrColors(payload.data);
  const archivedCount = payload.data.filter(
    (row) => row.archived === "true",
  ).length;
  const currentCount = colors.length - archivedCount;

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(colors, null, 2)}\n`);
  process.stdout.write(
    `Wrote ${colors.length} orderable Behr colors ` +
      `(${currentCount} current + ${archivedCount} archived) -> ${OUT}\n`,
  );
}

const cliEntryPath = process.argv[CLI_ENTRY_ARGUMENT_INDEX];
const isDirectExecution =
  cliEntryPath !== undefined &&
  import.meta.url === pathToFileURL(cliEntryPath).href;

if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`import-behr failed: ${error.message}\n`);
    process.exit(FAILURE_EXIT_CODE);
  });
}
