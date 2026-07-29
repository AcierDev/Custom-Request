import assert from "node:assert/strict";
import test from "node:test";
import {
  filterAndSortPalettesByRecentOpen,
  markPaletteOpened,
} from "./paletteRecency.ts";

const TARGET_PALETTE_ID = "target";
const OTHER_PALETTE_ID = "other";
const MISSING_PALETTE_ID = "missing";
const OPENED_AT = "2026-07-28T20:00:00.000Z";

test("filters case-insensitively by palette name only", () => {
  const palettes = [
    {
      id: "name-match",
      name: "Ocean Study",
      createdAt: "2026-07-20T00:00:00.000Z",
      colors: [{ name: "Clay" }],
    },
    {
      id: "color-only-match",
      name: "Desert Study",
      createdAt: "2026-07-21T00:00:00.000Z",
      colors: [{ name: "Ocean Blue" }],
    },
  ];

  const result = filterAndSortPalettesByRecentOpen(palettes, "  oCeAn ");

  assert.deepEqual(
    result.map(({ id }) => id),
    ["name-match"],
  );
});

test("orders opened palettes by last open and unopened palettes by creation", () => {
  const palettes = [
    {
      id: "old-unopened",
      name: "Old unopened",
      createdAt: "2026-07-01T00:00:00.000Z",
    },
    {
      id: "older-open",
      name: "Older open",
      createdAt: "2026-07-27T00:00:00.000Z",
      lastOpenedAt: "2026-07-27T18:00:00.000Z",
    },
    {
      id: "new-unopened",
      name: "New unopened",
      createdAt: "2026-07-28T00:00:00.000Z",
    },
    {
      id: "recent-open",
      name: "Recent open",
      createdAt: "2026-06-01T00:00:00.000Z",
      lastOpenedAt: "2026-07-28T18:00:00.000Z",
    },
  ];

  const result = filterAndSortPalettesByRecentOpen(palettes, "");

  assert.deepEqual(
    result.map(({ id }) => id),
    ["recent-open", "older-open", "new-unopened", "old-unopened"],
  );
});

test("uses name and id as deterministic ties without mutating input", () => {
  const palettes = [
    {
      id: "beta",
      name: "Beta",
      createdAt: "2026-07-28T00:00:00.000Z",
    },
    {
      id: "alpha-b",
      name: "Alpha",
      createdAt: "2026-07-28T00:00:00.000Z",
    },
    {
      id: "alpha-a",
      name: "Alpha",
      createdAt: "2026-07-28T00:00:00.000Z",
    },
  ];
  const originalIds = palettes.map(({ id }) => id);

  const result = filterAndSortPalettesByRecentOpen(palettes, "");

  assert.deepEqual(
    result.map(({ id }) => id),
    ["alpha-a", "alpha-b", "beta"],
  );
  assert.deepEqual(
    palettes.map(({ id }) => id),
    originalIds,
  );
  assert.notEqual(result, palettes);
});

test("stamps only the opened palette without mutating source records", () => {
  const target = {
    id: TARGET_PALETTE_ID,
    name: "Target",
    createdAt: "2026-07-20T00:00:00.000Z",
  };
  const other = {
    id: OTHER_PALETTE_ID,
    name: "Other",
    createdAt: "2026-07-21T00:00:00.000Z",
  };
  const palettes = [target, other];

  const result = markPaletteOpened(
    palettes,
    TARGET_PALETTE_ID,
    OPENED_AT,
  );

  assert.equal(
    result.find(({ id }) => id === TARGET_PALETTE_ID)?.lastOpenedAt,
    OPENED_AT,
  );
  assert.equal(target.lastOpenedAt, undefined);
  assert.equal(
    result.find(({ id }) => id === OTHER_PALETTE_ID),
    other,
  );
});

test("does not rewrite records when the palette id is unknown", () => {
  const palette = {
    id: TARGET_PALETTE_ID,
    name: "Target",
    createdAt: "2026-07-20T00:00:00.000Z",
  };

  const result = markPaletteOpened(
    [palette],
    MISSING_PALETTE_ID,
    OPENED_AT,
  );

  assert.equal(result.find(({ id }) => id === TARGET_PALETTE_ID), palette);
});
