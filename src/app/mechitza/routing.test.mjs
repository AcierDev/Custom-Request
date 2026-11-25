import assert from "node:assert/strict";
import { test } from "node:test";
import nextConfig from "../../../next.config.mjs";

test("the Mechitza host opens the preview at its root without affecting the artwork app", async () => {
  const { beforeFiles } = await nextConfig.rewrites();
  assert.deepEqual(beforeFiles.find(({ destination }) => destination === "/mechitza"), {
    source: "/",
    has: [{ type: "host", value: "mechitza\\.everwoodus\\.com" }],
    destination: "/mechitza",
  });

  const redirects = await nextConfig.redirects();
  assert.ok(redirects.some(({ source, destination }) => source === "/mechitza" && destination === "/"));
  assert.ok(redirects.some(({ source, destination }) =>
    source === "/mechitza" && destination === "https://mechitza.everwoodus.com",
  ));
  assert.ok(redirects.some(({ source, destination }) => source === "/" && destination === "/shared/:sid"));
});
