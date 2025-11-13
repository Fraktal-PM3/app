"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  BlockchainPackage,
  Status,
  PackageDetails,
  PackagePII,
} from "fraktal-lib";

type PackageEvent = {
  txid?: string;
  output: any;
  timestamp: string;
};

type PackageContextType = {
  packages: Map<string, BlockchainPackage>;
  events: PackageEvent[];
  connected: boolean;
  createPackage: (details: PackageDetails, pii: PackagePII) => Promise<void>;
  updatePackageStatus: (id: string, status: Status) => Promise<void>;
  getPackage: (id: string) => Promise<BlockchainPackage | null>;
};

const PackageContext = createContext<PackageContextType | undefined>(undefined);

export function PackageProvider({ children }: { children: React.ReactNode }) {
  const [packages, setPackages] = useState<Map<string, BlockchainPackage>>(
    new Map()
  );
  const [events, setEvents] = useState<PackageEvent[]>([]);
  const [connected, setConnected] = useState(false);

  // Connect to SSE stream
  useEffect(() => {
    const eventSource = new EventSource("/api/packages/events");

    eventSource.addEventListener("connected", () => {
      console.log("Connected to package event stream");
      setConnected(true);
    });

    eventSource.addEventListener("CreatePackage", (e) => {
      const event: PackageEvent = JSON.parse(e.data);
      console.log("Package created:", event);

      setEvents((prev) => [...prev, event]);

      // Optionally fetch full package details
      if (event.output?.id) {
        fetchPackage(event.output.id);
      }
    });

    eventSource.addEventListener("StatusUpdated", (e) => {
      const event: PackageEvent = JSON.parse(e.data);
      console.log("Status updated:", event);

      setEvents((prev) => [...prev, event]);

      // Update local package state
      if (event.output?.id) {
        setPackages((prev) => {
          const updated = new Map(prev);
          const pkg = updated.get(event.output.id);
          if (pkg) {
            updated.set(event.output.id, {
              ...pkg,
              status: event.output.status,
            });
          }
          return updated;
        });
      }
    });

    eventSource.addEventListener("ProposeTransfer", (e) => {
      const event: PackageEvent = JSON.parse(e.data);
      console.log("Transfer proposed:", event);
      setEvents((prev) => [...prev, event]);
    });

    eventSource.addEventListener("AcceptTransfer", (e) => {
      const event: PackageEvent = JSON.parse(e.data);
      console.log("Transfer accepted:", event);
      setEvents((prev) => [...prev, event]);
    });

    eventSource.addEventListener("ExecuteTransfer", (e) => {
      const event: PackageEvent = JSON.parse(e.data);
      console.log("Transfer executed:", event);
      setEvents((prev) => [...prev, event]);

      // Refresh package to get new owner
      if (event.output?.externalId) {
        fetchPackage(event.output.externalId);
      }
    });

    eventSource.addEventListener("DeletePackage", (e) => {
      const event: PackageEvent = JSON.parse(e.data);
      console.log("Package deleted:", event);

      setEvents((prev) => [...prev, event]);

      // Remove from local state
      if (event.output?.id) {
        setPackages((prev) => {
          const updated = new Map(prev);
          updated.delete(event.output.id);
          return updated;
        });
      }
    });

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const fetchPackage = async (id: string) => {
    try {
      const response = await fetch(`/api/packages/${id}`);
      const data = await response.json();

      if (data.success) {
        setPackages((prev) => new Map(prev).set(id, data.package));
      }
    } catch (error) {
      console.error("Error fetching package:", error);
    }
  };

  const createPackage = useCallback(
    async (details: PackageDetails, pii: PackagePII) => {
      try {
        const response = await fetch("/api/packages/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageDetails: details, pii }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error);
        }

        return data.packageId;
      } catch (error) {
        console.error("Error creating package:", error);
        throw error;
      }
    },
    []
  );

  const updatePackageStatus = useCallback(
    async (id: string, status: Status) => {
      try {
        const response = await fetch(`/api/packages/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error);
        }
      } catch (error) {
        console.error("Error updating status:", error);
        throw error;
      }
    },
    []
  );

  const getPackage = useCallback(
    async (id: string): Promise<BlockchainPackage | null> => {
      // Check local cache first
      if (packages.has(id)) {
        return packages.get(id)!;
      }

      // Fetch from API
      await fetchPackage(id);
      return packages.get(id) || null;
    },
    [packages]
  );

  return (
    <PackageContext.Provider
      value={{
        packages,
        events,
        connected,
        createPackage,
        updatePackageStatus,
        getPackage,
      }}
    >
      {children}
    </PackageContext.Provider>
  );
}

export function usePackages() {
  const context = useContext(PackageContext);
  if (!context) {
    throw new Error("usePackages must be used within PackageProvider");
  }
  return context;
}
