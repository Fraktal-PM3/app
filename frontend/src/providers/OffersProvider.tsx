"use client";

import type { TransferOffer } from "@/types/package";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSSEConnection } from "./SSEConnectionProvider";

interface OffersContextValue {
  offers: TransferOffer[];
  isLoading: boolean;
  error: string | null;
  refetchOffers: () => Promise<void>;
  getOffersByAnnouncement: (announcementMessageId: string) => TransferOffer[];
}

const OffersContext = createContext<OffersContextValue | undefined>(undefined);

export function OffersProvider({ children }: { children: React.ReactNode }) {
  const [offers, setOffers] = useState<TransferOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { subscribe } = useSSEConnection();

  // Fetch transfer offers from API
  const refetchOffers = useCallback(async () => {
    try {
      const response = await fetch("/api/transferOffers", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch offers: ${response.statusText}`);
      }
      const data = await response.json();
      setOffers(data || []);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load offers";
      setError(errorMsg);
      console.error("[OffersProvider] Error fetching offers:", err);
    }
  }, []);

  // Get offers for a specific announcement
  const getOffersByAnnouncement = useCallback(
    (announcementMessageId: string): TransferOffer[] => {
      return offers.filter(
        (offer) => offer.announcementMessageId === announcementMessageId
      );
    },
    [offers]
  );

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      await refetchOffers();
      setIsLoading(false);
    };

    fetchInitialData();
  }, [refetchOffers]);

  // SSE event subscriptions
  useEffect(() => {
    const unsubscribes = [
      // TransferOffer - new offer received (private message)
      subscribe("TransferOffer", (data) => {
        console.log("[OffersProvider] TransferOffer event:", data);

        // Refetch to get the complete transfer offer data
        refetchOffers();
      }),
    ];

    return () => {
      unsubscribes.forEach((fn) => fn());
    };
  }, [subscribe, refetchOffers]);

  const value = useMemo(
    () => ({
      offers,
      isLoading,
      error,
      refetchOffers,
      getOffersByAnnouncement,
    }),
    [offers, isLoading, error, refetchOffers, getOffersByAnnouncement]
  );

  return <OffersContext.Provider value={value}>{children}</OffersContext.Provider>;
}

// Hook to access all offers
export function useOffers() {
  const context = useContext(OffersContext);
  if (!context) {
    throw new Error("useOffers must be used within OffersProvider");
  }

  const { isConnected } = useSSEConnection();

  return {
    offers: context.offers,
    isLoading: context.isLoading,
    isConnected,
    error: context.error,
    refetch: context.refetchOffers,
  };
}

// Hook to access offers for a specific announcement
export function useAnnouncementOffers(announcementMessageId: string) {
  const context = useContext(OffersContext);
  if (!context) {
    throw new Error("useAnnouncementOffers must be used within OffersProvider");
  }

  const { isConnected } = useSSEConnection();

  const announcementOffers = useMemo(
    () => context.getOffersByAnnouncement(announcementMessageId),
    [context, announcementMessageId]
  );

  return {
    offers: announcementOffers,
    isLoading: context.isLoading,
    isConnected,
    error: context.error,
    refetch: context.refetchOffers,
  };
}
