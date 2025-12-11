"use client";

import type {
  DeletePackageEvent,
  MessageEvent,
  PackageAnnouncementEvent,
  StatusUpdatedAfterProposeEvent,
  TransferExecutedEvent,
} from "@/types/events";
import type { PackageAnnouncement } from "@/types/package";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSSEConnection } from "./SSEConnectionProvider";

export interface TransferOffer {
  id: string;
  termsId: string;
  packageId: string;
  fromMSP: string;
  toMSP: string;
  price: number;
  createdAt: string;
  expiryISO: string;
}

interface AuctionContextValue {
  announcements: PackageAnnouncement[];
  offers: TransferOffer[];
  isLoading: boolean;
  error: string | null;
  refetchAnnouncements: () => Promise<void>;
}

const AuctionContext = createContext<AuctionContextValue | undefined>(
  undefined,
);

export function AuctionProvider({ children }: { children: React.ReactNode }) {
  const [announcements, setAnnouncements] = useState<PackageAnnouncement[]>([]);
  const [offers, setOffers] = useState<TransferOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { subscribe } = useSSEConnection();

  // Fetch announcements from API
  const refetchAnnouncements = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/announcements", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch announcements: ${response.statusText}`,
        );
      }
      const data = await response.json();
      console.log("[AuctionProvider] Fetched announcements:", data);
      setAnnouncements(data || []);
      setError(null);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load announcements";
      setError(errorMsg);
      console.error("[AuctionProvider] Error fetching announcements:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    refetchAnnouncements();
  }, [refetchAnnouncements]);

  // SSE event subscriptions
  useEffect(() => {
    const unsubscribes = [
      // PackageAnnouncement - add new announcement
      subscribe<PackageAnnouncementEvent>("PackageAnnouncement", (data) => {
        console.log("[AuctionProvider] PackageAnnouncement event:", data);

        const packageDetails = data.value;
        const packageExternalId = packageDetails?.id;

        if (!packageExternalId) {
          console.warn(
            "[AuctionProvider] PackageAnnouncement missing package id",
          );
          return;
        }

        const newAnnouncement: PackageAnnouncement = {
          _id: data.id,
          messageId: data.id,
          messageHash: data.hash,
          packageExternalId: packageExternalId,
          announcerMSP: data.signingKey?.split(":")[0] || "",
          announcerNode: data.author,
          isActive: true,
          price: packageDetails?.price, // Extract price from package details
          packageDetails: packageDetails,
          createdAt: data.created,
        };

        setAnnouncements((prev) => {
          const exists = prev.some(
            (a) => a.messageId === newAnnouncement.messageId,
          );
          if (exists) return prev;
          return [newAnnouncement, ...prev];
        });
      }),

      // Message event - filter for transfer offers
      subscribe<MessageEvent>("message", (data) => {
        // Check if message is a transfer offer (has termsId and price)
        if (data.value?.termsId && data.value?.price) {
          console.log("[AuctionProvider] Transfer offer detected:", data);

          const offer: TransferOffer = {
            id: data.id,
            termsId: data.value.termsId,
            packageId: data.value.externalPackageId,
            fromMSP: data.value.fromMSP,
            toMSP: data.value.toMSP,
            price: data.value.price,
            createdAt: data.created,
            expiryISO: data.value.expiryISO,
          };

          setOffers((prev) => {
            const exists = prev.some((o) => o.id === offer.id);
            if (exists) return prev;
            return [offer, ...prev];
          });
        }
      }),

      // TransferExecuted - mark announcement inactive
      subscribe<TransferExecutedEvent>("TransferExecuted", (data) => {
        const packageId = data.output?.externalId;
        if (packageId) {
          console.log(
            "[AuctionProvider] Marking announcement inactive for package:",
            packageId,
          );
          setAnnouncements((prev) =>
            prev.map((announcement) =>
              announcement.packageExternalId === packageId
                ? { ...announcement, isActive: false }
                : announcement,
            ),
          );
        }
      }),

      // DeletePackage - mark announcement inactive
      subscribe<DeletePackageEvent>("DeletePackage", (data) => {
        const packageId = data.output?.externalId;
        if (packageId) {
          console.log(
            "[AuctionProvider] Marking announcement inactive for deleted package:",
            packageId,
          );
          setAnnouncements((prev) =>
            prev.map((announcement) =>
              announcement.packageExternalId === packageId
                ? { ...announcement, isActive: false }
                : announcement,
            ),
          );
        }
      }),

      // StatusUpdatedAfterPropose - transfer proposed, refetch to get updated status from DB
      subscribe<StatusUpdatedAfterProposeEvent>("StatusUpdatedAfterPropose", (data) => {
        console.log("[AuctionProvider] StatusUpdatedAfterPropose event received:", data);

        const packageId = data.output?.externalId;

        if (packageId) {
          console.log(
            "[AuctionProvider] Transfer proposed for package:",
            packageId,
            "- refetching announcements",
          );

          // Refetch announcements to get updated status from DB
          // The status is already persisted in DB by eventListener
          refetchAnnouncements();
        } else {
          console.warn(
            "[AuctionProvider] StatusUpdatedAfterPropose missing packageId",
          );
        }
      }),
    ];

    return () => {
      unsubscribes.forEach((fn) => fn());
    };
  }, [subscribe]);

  const value = useMemo(
    () => ({
      announcements,
      offers,
      isLoading,
      error,
      refetchAnnouncements,
    }),
    [announcements, offers, isLoading, error, refetchAnnouncements],
  );

  return (
    <AuctionContext.Provider value={value}>{children}</AuctionContext.Provider>
  );
}

// Hook to access announcements
export function useAnnouncements(activeOnly: boolean = true) {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error("useAnnouncements must be used within AuctionProvider");
  }

  const { isConnected } = useSSEConnection();

  // Filter announcements if activeOnly is true
  const filteredAnnouncements = activeOnly
    ? context.announcements.filter((a) => a.isActive)
    : context.announcements;

  return {
    announcements: filteredAnnouncements,
    isLoading: context.isLoading,
    isConnected,
    error: context.error,
    refetch: context.refetchAnnouncements,
  };
}

// Hook to access offers
export function useOffers() {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error("useOffers must be used within AuctionProvider");
  }

  const { isConnected } = useSSEConnection();

  return {
    offers: context.offers,
    isLoading: context.isLoading,
    isConnected,
    error: context.error,
  };
}
