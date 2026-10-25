import assert from "node:assert/strict";
import test from "node:test";
import { getDataSyncRouteScope } from "./dataSyncRoute.ts";

const APP_SYNC_SCOPE = "app";
const SHARED_SYNC_SCOPE = "shared";
const TEST_BASE_PATH = process.env.NEXT_PUBLIC_APP_BASE_PATH || "";

test("keeps Palette and Viewer in one sync scope so navigation preserves the active palette", () => {
  assert.equal(getDataSyncRouteScope("/palette"), APP_SYNC_SCOPE);
  assert.equal(getDataSyncRouteScope("/viewer"), APP_SYNC_SCOPE);
});

test("separates shared links from normal app data syncing", () => {
  assert.equal(getDataSyncRouteScope("/shared/design-id"), SHARED_SYNC_SCOPE);
  assert.equal(
    getDataSyncRouteScope("/shared-set/set-id/breakdown"),
    SHARED_SYNC_SCOPE,
  );
});

test("keeps shared links isolated when the app is hosted beneath a base path", () => {
  assert.equal(
    getDataSyncRouteScope(`${TEST_BASE_PATH}/shared/design-id`),
    SHARED_SYNC_SCOPE,
  );
  assert.equal(
    getDataSyncRouteScope(`${TEST_BASE_PATH}/shared-set/set-id/breakdown`),
    SHARED_SYNC_SCOPE,
  );
  assert.equal(
    getDataSyncRouteScope(`${TEST_BASE_PATH}/viewer`),
    APP_SYNC_SCOPE,
  );
});
