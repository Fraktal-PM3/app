"use client";

import type { TransferOffer } from "@/types/package";
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import React, { createContext, useCallback, useContext, useMemo } from "react";

function normalizeOffer(o: any): TransferOffer {
  return {
    ...o,
    _id: o._id,
    createdAt: o._creationTime ? new Date(o._creationTime).toISOString() : undefined,
    updatedAt: o.updatedAt ? new Date(o.updatedAt).toISOString() : undefined,
  };
}

interface OffersContextValue {
  offers: TransferOffer[];
  isLoading: boolean;
  error: string | null;
  getOffersByAnnouncement: (announcementMessageId: string) => TransferOffer[];
}

const OffersContext = createContext<OffersContextValue | undefined>(undefined);

export function OffersProvider({ children }: { children: React.ReactNode }) {
  // Use Convex query - auto-updates!
  const offersData = useQuery(api.queries.offers.list);

  const offers = useMemo(
    () => (offersData || []).map(normalizeOffer),
    [offersData],
  );

  const isLoading = offersData === undefined;
  const error = null;

  // Get offers for a specific announcement
  const getOffersByAnnouncement = useCallback(
    (announcementMessageId: string): TransferOffer[] => {
      return offers.filter(
        (offer) => offer.announcementMessageId === announcementMessageId
      );
    },
    [offers]
  );

  const value = useMemo(
    () => ({
      offers,
      isLoading,
      error,
      getOffersByAnnouncement,
    }),
    [offers, isLoading, error, getOffersByAnnouncement],
  );

  return (
    <OffersContext.Provider value={value}>{children}</OffersContext.Provider>
  );
}

// Hook to access all offers
export function useOffers() {
  const context = useContext(OffersContext);
  if (!context) {
    throw new Error("useOffers must be used within OffersProvider");
  }

  return {
    offers: context.offers,
    isLoading: context.isLoading,
    isConnected: !context.isLoading,
    error: context.error,
    refetch: () => Promise.resolve(),
  };
}

// Hook to get offers by announcement
export function useOffersByAnnouncement(announcementMessageId: string) {
  const context = useContext(OffersContext);
  if (!context) {
    throw new Error(
      "useOffersByAnnouncement must be used within OffersProvider"
    );
  }

  const offers = useMemo(
    () => context.getOffersByAnnouncement(announcementMessageId),
    [context, announcementMessageId]
  );

  return {
    offers,
    isLoading: context.isLoading,
    isConnected: !context.isLoading,
    error: context.error,
    refetch: () => Promise.resolve(),
  };
}


