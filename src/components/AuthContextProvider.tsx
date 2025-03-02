import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCustomStore } from "@/store/customStore";

export function AuthContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const syncWithDatabase = useCustomStore((state) => state.syncWithDatabase);

  // Make auth context available globally for the store to access
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__authContext = auth;
    }
  }, [auth]);

  // Set up database syncing when user changes
  useEffect(() => {
    if (auth.user) {
      // User is logged in, sync with database
      const cleanup = syncWithDatabase(true);

      return () => {
        if (typeof cleanup === "function") {
          cleanup();
        }
      };
    }
  }, [auth.user, syncWithDatabase]);

  return <>{children}</>;
}
