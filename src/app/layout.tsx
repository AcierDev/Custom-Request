"use client";

import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { MobileWarning } from "@/components/mobile-warning";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { AuthContextProvider } from "@/components/AuthContextProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";

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

function LayoutContent({ children }: { children: React.ReactNode }) {
  // Sidebar is permanently collapsed, so content always clears the
  // collapsed-width rail.
  return (
    <div className="flex h-dvh overflow-hidden bg-gray-900 text-gray-100">
      <SpeedInsights />
      <MobileWarning />
      <Navbar />
      <div className="flex-1 overflow-auto no-scrollbar border-t border-sky-400/40">
        <div className="mt-14 lg:mt-0 flex h-full min-h-0 flex-col lg:ml-[4.5rem]">
          <main className="min-h-0 flex-1 w-full pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-16">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark"
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900 text-gray-100`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <AuthContextProvider>
              <Toaster richColors theme="dark" position="top-right" />
              <LayoutContent>{children}</LayoutContent>
            </AuthContextProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
