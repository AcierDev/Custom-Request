"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCustomStore } from "@/store/customStore";
import {
  DATA_SYNC_ROUTE_SCOPE,
  getDataSyncRouteScope,
} from "@/lib/dataSyncRoute";

export function AuthContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const pathname = usePathname();
  const dataSyncRouteScope = getDataSyncRouteScope(pathname);
  const syncWithDatabase = useCustomStore((state) => state.syncWithDatabase);

  // Make auth context available globally for the store to access
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__authContext = auth;
    }
  }, [auth]);

  // Set up data syncing when authentication state changes
  useEffect(() => {
    // Shared links are read-only snapshots. Loading the recipient's saved
    // state here would overwrite the shared design moments after it renders.
    if (dataSyncRouteScope === DATA_SYNC_ROUTE_SCOPE.shared) return;

    // User is logged in or in guest mode, sync with appropriate storage
    const cleanup = syncWithDatabase(true);

    return () => {
      // The cleanup function is now properly typed in syncWithDatabase to return () => void | void
      if (typeof cleanup === "function") {
        cleanup();
      }
    };
  }, [auth.user, auth.isGuest, dataSyncRouteScope, syncWithDatabase]);

  return <>{children}</>;
}
