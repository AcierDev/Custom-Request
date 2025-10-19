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

// Create a client component for the content
function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-300 dark:bg-gray-700">
      <SpeedInsights />
      <MobileWarning />
      <Navbar onOpenSettings={() => {}} />
      <div className="flex-1 flex flex-col">
        <div className="lg:ml-64 mt-14 lg:mt-0 transition-[margin] duration-300 flex flex-col h-full">
          <main className="flex-1 w-full overflow-y-auto pb-16">
            {children}
          </main>
        </div>
      </div>
      {/* <Footer /> */}
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
            <AuthContextProvider>
              <Toaster richColors position="top-right" />
              <LayoutContent>{children}</LayoutContent>
            </AuthContextProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
