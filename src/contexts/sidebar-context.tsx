"use client";

import { createContext, useContext, useState } from "react";

type SidebarContextValue = {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  return useContext(SidebarContext);
}

export function SidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  return (
    <SidebarContext.Provider value={{ isSidebarOpen, setIsSidebarOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}
