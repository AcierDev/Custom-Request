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
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context";

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
  return (
    <SidebarProvider>
      <LayoutContentInner>{children}</LayoutContentInner>
    </SidebarProvider>
  );
}

function LayoutContentInner({ children }: { children: React.ReactNode }) {
  const sidebar = useSidebar();
  const isSidebarOpen = sidebar?.isSidebarOpen ?? true;
  return (
    <div className="flex h-screen overflow-hidden bg-gray-900 text-gray-100">
      <SpeedInsights />
      <MobileWarning />
      <Navbar />
      <div className="flex-1 overflow-auto no-scrollbar border-t border-sky-400/40">
        <div
          className={`mt-14 lg:mt-0 transition-[margin] duration-300 flex flex-col h-full ${
            isSidebarOpen ? "lg:ml-36" : "lg:ml-12"
          }`}
        >
          <main className="flex-1 w-full pb-16">{children}</main>
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}catch(e){}})();`,
          }}
        />
      </head>
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
