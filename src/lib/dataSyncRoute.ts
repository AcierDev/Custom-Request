const SHARED_ROUTE_PREFIX = "/shared";

export const DATA_SYNC_ROUTE_SCOPE = {
  app: "app",
  shared: "shared",
} as const;

export type DataSyncRouteScope =
  (typeof DATA_SYNC_ROUTE_SCOPE)[keyof typeof DATA_SYNC_ROUTE_SCOPE];

export const getDataSyncRouteScope = (
  pathname: string | null,
): DataSyncRouteScope =>
  pathname?.startsWith(SHARED_ROUTE_PREFIX)
    ? DATA_SYNC_ROUTE_SCOPE.shared
    : DATA_SYNC_ROUTE_SCOPE.app;
