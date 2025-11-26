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

    eventSource.addEventListener("message", (e) => {
      // The e.data contains the entire message event from FireFly
      const rawData = JSON.parse(e.data);
      console.log("Raw message event received:", rawData);
      
      // The header is at the top level of the message event
      const messageHeader = rawData.header;
      const messageData = rawData.data;
      
      console.log("Message header:", messageHeader);
      console.log("Sender:", messageHeader?.author);
      console.log("Tag:", messageHeader?.tag);

      // Only process messages with "NewPackage" tag
      if (messageHeader?.tag === "NewPackage" && messageData && messageData.length > 0) {
        const packageData = messageData[0]?.value;
        if (packageData && packageData.id) {
          console.log("New package from broadcast:", packageData);

          // Create a synthetic event with package details from message
          const syntheticEvent: PackageEvent = {
            output: {
              externalId: packageData.id,
              id: packageData.id,
              pickupLocation: packageData.pickupLocation,
              dropLocation: packageData.dropLocation,
              size: packageData.size,
              weightKg: packageData.weightKg,
              urgency: packageData.urgency,
              author: messageHeader?.author,
            },
            timestamp: rawData.timestamp || new Date().toISOString(),
          };

          setEvents((prev) => [...prev, syntheticEvent]);
        }
      }
    });

    // We only listen to message events with NewPackage tag now
    // Remove other event listeners as they are no longer needed for the dashboard

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
