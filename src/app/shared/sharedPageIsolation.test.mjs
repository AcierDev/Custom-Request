import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const SHARED_PAGE_URL = new URL("./[id]/page.tsx", import.meta.url);
const sharedPageSource = await readFile(SHARED_PAGE_URL, "utf8");

test("shared art page has no link back to the editor", () => {
  assert.doesNotMatch(sharedPageSource, /\bhref\s*=/);
  assert.doesNotMatch(sharedPageSource, /\bBUILDER_URL\b/);
  assert.doesNotMatch(sharedPageSource, /Design your own/i);
});
