"use client";

import type { Package, Transfer } from "@/types/package";
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import React, {
  createContext,
  useContext,
  useMemo,
} from "react";

// Helper to normalize date fields to ISO strings
function toIso(timestamp?: number | null): string | undefined {
  if (!timestamp) return undefined;
  return new Date(timestamp).toISOString();
}

function normalizePackage(p: any): Package {
  return {
    ...p,
    _id: p._id,
    id: p.externalId, // Map externalId to id for backwards compatibility
    createdAt: toIso(p._creationTime),
    updatedAt: toIso(p.updatedAt),
  };
}

function normalizeTransfer(t: any): Transfer {
  return {
    ...t,
    _id: t._id,
    createdAt: toIso(t._creationTime),
    updatedAt: toIso(t.updatedAt),
  };
}

interface PackageContextValue {
  packages: Package[];
  transfers: Transfer[];
  isLoading: boolean;
  error: string | null;
}

const PackageContext = createContext<PackageContextValue | undefined>(
  undefined,
);

export function PackageProvider({ children }: { children: React.ReactNode }) {
  // Use Convex queries - they auto-update!
  const packagesData = useQuery(api.queries.packages.list);
  const transfersData = useQuery(api.queries.transfers.list);

  const packages = useMemo(
    () => (packagesData || []).map(normalizePackage),
    [packagesData],
  );

  const transfers = useMemo(
    () => (transfersData || []).map(normalizeTransfer),
    [transfersData],
  );

  const isLoading = packagesData === undefined || transfersData === undefined;
  const error = null; // Convex handles errors automatically

  const value = useMemo(
    () => ({
      packages,
      transfers,
      isLoading,
      error,
    }),
    [packages, transfers, isLoading, error],
  );

  return (
    <PackageContext.Provider value={value}>{children}</PackageContext.Provider>
  );
}

// Hook to access packages
export function usePackages() {
  const context = useContext(PackageContext);
  if (!context) {
    throw new Error("usePackages must be used within PackageProvider");
  }

  return {
    packages: context.packages,
    isLoading: context.isLoading,
    isConnected: !context.isLoading, // If data loaded, we're connected
    error: context.error,
    refetch: () => Promise.resolve(), // Convex handles refetching automatically
  };
}

// Hook to access transfers
export function useTransfers() {
  const context = useContext(PackageContext);
  if (!context) {
    throw new Error("useTransfers must be used within PackageProvider");
  }

  return {
    transfers: context.transfers,
    isLoading: context.isLoading,
    isConnected: !context.isLoading,
    error: context.error,
    refetch: () => Promise.resolve(),
  };
}

// Hook to access a single package by ID
export function usePackage(packageId: string) {
  const context = useContext(PackageContext);
  if (!context) {
    throw new Error("usePackage must be used within PackageProvider");
  }

  const packageData = useMemo(
    () => context.packages.find((pkg) => pkg.id === packageId),
    [context.packages, packageId],
  );

  return {
    packageData: packageData,
    isLoading: context.isLoading,
    isConnected: !context.isLoading,
    error: context.error,
    refetch: () => Promise.resolve(),
  };
}
