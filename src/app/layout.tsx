"use client";

import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { useState } from "react";
import { MobileWarning } from "@/components/mobile-warning";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Create a client component for the content
function LayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-300 dark:bg-gray-900">
      <MobileWarning />
      <Navbar
        onOpenSettings={() => {}}
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={setSidebarOpen}
      />
      <div className="flex-1 overflow-auto">
        <div
          className={`${
            sidebarOpen ? "lg:ml-64" : "lg:ml-16"
          } mt-14 lg:mt-0 transition-[margin] duration-300`}
        >
          <main className="w-full px-4 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

// Keep RootLayout as a server component
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <Toaster richColors position="top-right" />
            <LayoutContent>{children}</LayoutContent>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
