"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";

export function SettingsWrapper({ children }: { children: React.ReactNode }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
    // You can implement the actual settings modal/dialog here
  };

  return (
    <div className="flex h-screen bg-gray-300 dark:bg-gray-900/50">
      <Navbar onOpenSettings={handleOpenSettings} />
      <div className="flex-1 flex flex-col">
        <div className="lg:ml-64 mt-14 lg:mt-0 transition-[margin] duration-300 flex flex-col h-full">
          <main className="flex-1 w-full overflow-y-auto pb-16">
            {children}
          </main>
        </div>
      </div>
      {/* Settings modal would be placed here */}
    </div>
  );
}
