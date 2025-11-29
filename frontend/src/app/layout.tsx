"use client";

import {
  AuctionProvider,
  MessageProvider,
  MetricsProvider,
  PackageProvider,
  SSEConnectionProvider,
} from "@/providers";
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

            {/* Navigation Links */}
            <nav className="flex items-center gap-6">
              <Link
                href="/messages"
                className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              >
                Messages
              </Link>
              <Link
                href="/createPackage"
                className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              >
                Create
              </Link>
              <Link
                href="/activePackage"
                className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              >
                Active
              </Link>
            </nav>
          </div>
        </header>
        <SSEConnectionProvider>
          <PackageProvider>
            <AuctionProvider>
              <MetricsProvider>
                <MessageProvider>
                  <main className="flex-1">{children}</main>
                </MessageProvider>
              </MetricsProvider>
            </AuctionProvider>
          </PackageProvider>
        </SSEConnectionProvider>
      </body>
    </html>
  );
}
