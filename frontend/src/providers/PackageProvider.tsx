"use client";

import type {
  AcceptTransferEvent,
  CreatePackageEvent,
  DeletePackageEvent,
  ProposeTransferEvent,
  StatusUpdatedEvent,
  TransferExecutedEvent,
} from "@/types/events";
import type { Package, Transfer } from "@/types/package";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSSEConnection } from "./SSEConnectionProvider";

// Helper to normalize date fields to ISO strings
function toIso(s?: string | null | undefined): string | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function normalizePackage(p: any): Package {
  return {
    ...p,
    createdAt: toIso(p?.createdAt) || undefined,
    updatedAt: toIso(p?.updatedAt) || undefined,
  };
}

interface PackageContextValue {
  packages: Package[];
  transfers: Transfer[];
  isLoading: boolean;
  error: string | null;
  refetchPackages: () => Promise<void>;
  refetchTransfers: () => Promise<void>;
}

const PackageContext = createContext<PackageContextValue | undefined>(
  undefined,
);

export function PackageProvider({ children }: { children: React.ReactNode }) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { subscribe } = useSSEConnection();

  // Fetch packages from API
  const refetchPackages = useCallback(async () => {
    try {
      const response = await fetch("/api/packages", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch packages: ${response.statusText}`);
      }
      const data = await response.json();
      const normalized = (data || []).map((p: any) => normalizePackage(p));
      setPackages(normalized);
      setError(null);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load packages";
      setError(errorMsg);
      console.error("[PackageProvider] Error fetching packages:", err);
    }
  }, []);

  // Fetch transfers from API
  const refetchTransfers = useCallback(async () => {
    try {
      const response = await fetch("/api/transfers");
      if (!response.ok) {
        throw new Error(`Failed to fetch transfers: ${response.statusText}`);
      }
      const data = await response.json();
      setTransfers(data || []);
      setError(null);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load transfers";
      setError(errorMsg);
      console.error("[PackageProvider] Error fetching transfers:", err);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      await Promise.all([refetchPackages(), refetchTransfers()]);
      setIsLoading(false);
    };

    fetchInitialData();
  }, [refetchPackages, refetchTransfers]);

  // SSE event subscriptions
  useEffect(() => {
    const unsubscribes = [
      // CreatePackage - add new package
      subscribe<CreatePackageEvent>("CreatePackage", async (data) => {
        setIsLoading(true);
        console.log("[PackageProvider] CreatePackage event:", data);
        await refetchPackages();
        setIsLoading(false);
      }),

      // StatusUpdated - update package status
      subscribe<StatusUpdatedEvent>("StatusUpdated", (data) => {
        console.log("[PackageProvider] StatusUpdated event:", data);
        const packageId = data.output?.externalId;
        const status = data.output?.status;
        if (packageId) {
          setPackages((prev) =>
            prev.map((pkg) =>
              pkg.id === packageId ? { ...pkg, active: status } : pkg,
            ),
          );
        }
      }),

      // DeletePackage - remove package
      subscribe<DeletePackageEvent>("DeletePackage", (data) => {
        console.log("[PackageProvider] DeletePackage event:", data);
        const packageId = data.output?.externalId;
        if (packageId) {
          setPackages((prev) => prev.filter((pkg) => pkg.id !== packageId));
        }
      }),

      // ProposeTransfer - refetch packages to get updated termsId
      subscribe<ProposeTransferEvent>("ProposeTransfer", (data) => {
        console.log("[PackageProvider] ProposeTransfer event:", data);
        refetchPackages();

        // Also update transfers
        const transferData = data as any;
        if (transferData.transferId) {
          setTransfers((prev) => {
            const exists = prev.some(
              (t) => t.transferId === transferData.transferId,
            );
            if (exists) {
              return prev.map((t) =>
                t.transferId === transferData.transferId ? transferData : t,
              );
            }
            return [transferData, ...prev];
          });
        }
      }),

      // AcceptTransfer - refetch packages
      subscribe<AcceptTransferEvent>("AcceptTransfer", (data) => {
        console.log("[PackageProvider] AcceptTransfer event:", data);
        refetchPackages();

        // Update transfers
        const transferData = data as any;
        if (transferData.transferId) {
          setTransfers((prev) =>
            prev.map((t) =>
              t.transferId === transferData.transferId ? transferData : t,
            ),
          );
        }
      }),

      // TransferExecuted - refetch packages (FIXED: was ExecuteTransfer)
      subscribe<TransferExecutedEvent>("TransferExecuted", (data) => {
        console.log("[PackageProvider] TransferExecuted event:", data);
        refetchPackages();

        // Update transfers
        const transferData = data as any;
        if (transferData.transferId) {
          setTransfers((prev) =>
            prev.map((t) =>
              t.transferId === transferData.transferId ? transferData : t,
            ),
          );
        }
      }),
    ];

    return () => {
      unsubscribes.forEach((fn) => fn());
    };
  }, [subscribe, refetchPackages, refetchTransfers]);

  const value = useMemo(
    () => ({
      packages,
      transfers,
      isLoading,
      error,
      refetchPackages,
      refetchTransfers,
    }),
    [packages, transfers, isLoading, error, refetchPackages, refetchTransfers],
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

  const { isConnected } = useSSEConnection();

  return {
    packages: context.packages,
    isLoading: context.isLoading,
    isConnected,
    error: context.error,
    refetch: context.refetchPackages,
  };
}

// Hook to access transfers
export function useTransfers() {
  const context = useContext(PackageContext);
  if (!context) {
    throw new Error("useTransfers must be used within PackageProvider");
  }

  const { isConnected } = useSSEConnection();

  return {
    transfers: context.transfers,
    isLoading: context.isLoading,
    isConnected,
    error: context.error,
    refetch: context.refetchTransfers,
  };
}

// Hook to access a single package by ID
export function usePackage(packageId: string) {
  const context = useContext(PackageContext);
  if (!context) {
    throw new Error("usePackage must be used within PackageProvider");
  }

  const { isConnected } = useSSEConnection();

  const packageData = useMemo(
    () => context.packages.find((pkg) => pkg.id === packageId),
    [context.packages, packageId],
  );

  return {
    packageData: packageData,
    isLoading: context.isLoading,
    isConnected,
    error: context.error,
    refetch: context.refetchPackages,
  };
}
