"use client";

import { useState, useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "../styles/globals.css";
import { PackageProvider } from "./offers/components/PackageContext";

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
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
          <div className="container mx-auto flex h-14 items-center justify-between px-6">
            {/* Logo */}
            <Link
              href="/"
              className="font-mono text-lg font-bold uppercase tracking-wider transition-colors hover:text-muted-foreground"
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
        <PackageProvider>
          <main className="flex-1">{children}</main>
        </PackageProvider>
      </body>
    </html>
  );
}
