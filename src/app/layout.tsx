"use client";

import {
  AuctionProvider,
  MessageProvider,
  MetricsProvider,
  OffersProvider,
  PackageProvider,
} from "@/providers";
import { ConvexClientProvider } from "@/providers/ConvexClientProvider";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Toaster } from "sonner";
import "../styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scrollbar-hide">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased scrollbar-hide overflow-x-hidden bg-background text-foreground`}
      >
        <Toaster position="top-right" richColors />
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
          <div className="container mx-auto flex h-14 items-center justify-between px-6">
            {/* Logo */}
            <Link
              href="/"
              className="font-mono text-2xl font-bold uppercase tracking-wider transition-colors hover:text-muted-foreground"
            >
              Fraktal
            </Link>
          </div>
        </header>
        <ConvexClientProvider>
          <PackageProvider>
            <AuctionProvider>
              <OffersProvider>
                <MetricsProvider>
                  <MessageProvider>
                    <main className="flex-1">{children}</main>
                  </MessageProvider>
                </MetricsProvider>
              </OffersProvider>
            </AuctionProvider>
          </PackageProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
