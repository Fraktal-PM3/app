"use client";

import type { Package } from "@/types/package";
import { useState, useEffect, useCallback } from "react";

function toIso(s?: string | null | undefined): string | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function normalizePackage(p: any) {
  return {
    ...p,
    createdAt: toIso(p?.createdAt) || undefined,
    updatedAt: toIso(p?.updatedAt) || undefined,
  } as any;
}

export function usePackages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch of all packages
  const fetchPackages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/packages", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch packages: ${response.statusText}`);
      }
      const data = await response.json();
      // Normalize date fields to ISO strings to keep a consistent shape
      const normalized = (data || []).map((p: any) => normalizePackage(p));
      setPackages(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load packages");
      console.error("Error fetching packages:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // Set up SSE for real-time updates
  useEffect(() => {
    const eventSource = new EventSource("/api/packages/events");

    eventSource.addEventListener("connected", () => {
      console.log("Connected to package events stream");
      setIsConnected(true);
    });

    eventSource.addEventListener("CreatePackage", (event) => {
      try {
        const newPackage = JSON.parse(event.data);
        console.log("New package created:", newPackage);
        setPackages((prev) => {
          // Check if package already exists
          const normalized = normalizePackage(newPackage);
          const exists = prev.some((p) => p.packageID === normalized.packageID);
          if (exists) return prev;
          return [normalized, ...prev];
        });
      } catch (err) {
        console.error("Error parsing CreatePackage event:", err);
      }
    });

    eventSource.addEventListener("StatusUpdated", (event) => {
      try {
        const { packageId, status } = JSON.parse(event.data);
        console.log("Package status updated:", packageId, status);
        setPackages((prev) =>
          prev.map((pkg) =>
            pkg.packageID === packageId ? { ...pkg, active: status } : pkg,
          ),
        );
      } catch (err) {
        console.error("Error parsing StatusUpdated event:", err);
      }
    });

    eventSource.addEventListener("ProposeTransfer", (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Transfer proposed:", data);
        // Refresh packages to get updated termsId and price
        fetchPackages();
      } catch (err) {
        console.error("Error parsing ProposeTransfer event:", err);
      }
    });

    eventSource.addEventListener("AcceptTransfer", (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Transfer accepted:", data);
        fetchPackages();
      } catch (err) {
        console.error("Error parsing AcceptTransfer event:", err);
      }
    });

    eventSource.addEventListener("ExecuteTransfer", (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Transfer executed:", data);
        fetchPackages();
      } catch (err) {
        console.error("Error parsing ExecuteTransfer event:", err);
      }
    });

    eventSource.addEventListener("DeletePackage", (event) => {
      try {
        const { packageId } = JSON.parse(event.data);
        console.log("Package deleted:", packageId);
        setPackages((prev) =>
          prev.filter((pkg) => pkg.packageID !== packageId),
        );
      } catch (err) {
        console.error("Error parsing DeletePackage event:", err);
      }
    });

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      setIsConnected(false);
    };

    // Cleanup on unmount
    return () => {
      console.log("Closing SSE connection");
      eventSource.close();
      setIsConnected(false);
    };
  }, [fetchPackages]);

  return {
    packages,
    isLoading,
    isConnected,
    error,
    refetch: fetchPackages,
  };
}
