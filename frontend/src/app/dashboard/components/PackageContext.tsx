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
  output: {
    id?: string;
    externalId?: string;
    status?: Status;
    [key: string]: unknown;
  };
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

    eventSource.addEventListener("CreatePackage", async (e) => {
      const event: PackageEvent = JSON.parse(e.data);
      console.log("Package created:", event);

      // Fetch full package details from blockchain FIRST
      const packageId = event.output?.externalId || event.output?.id;
      if (packageId) {
        console.log("Fetching package details for:", packageId);
        const packageDetails = await fetchPackage(packageId);

        // Merge the fetched packageDetails into the event output so
        // downstream consumers (dashboard) can read pickup/drop locations
        const enrichedEvent = packageDetails
          ? { ...event, output: { ...event.output, ...packageDetails } }
          : event;

        // Only add event to array after package data is fetched
        // This ensures the dashboard has the data when it processes the event
        setEvents((prev) => [...prev, enrichedEvent]);
      }
    });

    eventSource.addEventListener("StatusUpdated", (e) => {
      const event: PackageEvent = JSON.parse(e.data);
      console.log("Status updated:", event);

      setEvents((prev) => [...prev, event]);

      // Update local package state
      const packageId = event.output?.externalId || event.output?.id;
      if (packageId && event.output.status) {
        setPackages((prev) => {
          const updated = new Map(prev);
          const pkg = updated.get(packageId);
          if (pkg) {
            updated.set(packageId, {
              ...pkg,
              status: event.output.status as Status,
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
      const packageId = event.output?.id || event.output?.externalId;
      if (packageId) {
        setPackages((prev) => {
          const updated = new Map(prev);
          updated.delete(packageId);
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
    // Note: Empty dependency array is intentional - we want this to run once
    // Fast Refresh will cause a full reload when this component changes (expected behavior)
  }, []);

  const fetchPackage = async (id: string): Promise<PackageDetails | null> => {
    try {
      // Use the existing server-side service via API route
      const response = await fetch(`/api/packages/${id}`);
      const data = await response.json();

      if (data.success && data.package) {
        const pkg = data.package;
        console.log("Fetched package data:", pkg);

        // Cache the full package object locally (includes pii, salt, packageDetails)
        setPackages((prev) => new Map(prev).set(id, pkg));

        // Return the nested packageDetails for callers that want the payload
        return pkg.packageDetails || null;
      }
    } catch (error) {
      console.error("Error fetching package:", error);
    }

    return null;
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
