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
    pickupLocation?: any;
    dropLocation?: any;
    size?: any;
    weightKg?: number;
    urgency?: string;
    author?: string;
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

const isValidPackage = (data: any): boolean => {
  const validKeys = ['id', 'pickupLocation', 'dropLocation', 'size', 'weightKg', 'urgency'];
  const hasOnlyValidKeys = Object.keys(data).every(key => validKeys.includes(key));
  return hasOnlyValidKeys &&
        data &&
        typeof data.id === 'string' &&
        data.pickupLocation &&
        typeof data.pickupLocation.address === 'string' &&
        typeof data.pickupLocation.lat === 'number' &&
        typeof data.pickupLocation.lng === 'number' &&
        data.dropLocation &&
        typeof data.dropLocation.address === 'string' &&
        typeof data.dropLocation.lat === 'number' &&
        typeof data.dropLocation.lng === 'number' &&
        data.size &&
        typeof data.size.width === 'number' &&
        typeof data.size.height === 'number' &&
        typeof data.size.depth === 'number' &&
        typeof data.weightKg === 'number' &&
        typeof data.urgency === 'string';
};

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
      const rawData = JSON.parse(e.data);
      
      const packageData = rawData.value;
      const author = rawData.author;
      
      if (isValidPackage(packageData)) {
        const syntheticEvent: PackageEvent = {
          output: {
            externalId: packageData.id,
            id: packageData.id,
            pickupLocation: packageData.pickupLocation,
            dropLocation: packageData.dropLocation,
            size: packageData.size,
            weightKg: packageData.weightKg,
            urgency: packageData.urgency,
            author: author,
          },
          timestamp: rawData.created || new Date().toISOString(),
        };

        setEvents((prev) => [...prev, syntheticEvent]);
      } else {
        console.log("Invalid package structure, ignoring message");
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

  const fetchPackage = async (id: string): Promise<PackageDetails | null> => {
    try {
      const response = await fetch(`/api/packages/${id}`);
      const data = await response.json();

      if (data.success && data.package) {
        const pkg = data.package;
        console.log("Fetched package data:", pkg);

        setPackages((prev) => new Map(prev).set(id, pkg));

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
      if (packages.has(id)) {
        return packages.get(id)!;
      }

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