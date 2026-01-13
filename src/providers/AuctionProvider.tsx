"use client";

import type { PackageAnnouncement } from "@/types/package";
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import React, {
  createContext,
  useContext,
  useMemo,
} from "react";

function normalizeAnnouncement(a: any): PackageAnnouncement {
  return {
    ...a,
    _id: a._id,
    createdAt: a._creationTime ? new Date(a._creationTime).toISOString() : undefined,
    updatedAt: a.updatedAt ? new Date(a.updatedAt).toISOString() : undefined,
  };
}

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
}

const AuctionContext = createContext<AuctionContextValue | undefined>(
  undefined,
);

export function AuctionProvider({ children }: { children: React.ReactNode }) {
  // Use Convex queries - auto-update!
  const announcementsData = useQuery(api.queries.announcements.listActive);
  const offersData = useQuery(api.queries.offers.list);

  const announcements = useMemo(
    () => (announcementsData || []).map(normalizeAnnouncement),
    [announcementsData],
  );

  const offers = useMemo(() => {
    return (offersData || []).map((o: any): TransferOffer => ({
      id: o._id,
      termsId: o.messageId || "",
      packageId: o.externalPackageId,
      fromMSP: o.fromMSP,
      toMSP: o.toMSP,
      price: o.price,
      createdAt: o._creationTime ? new Date(o._creationTime).toISOString() : "",
      expiryISO: o.expiryISO,
    }));
  }, [offersData]);

  const isLoading = announcementsData === undefined || offersData === undefined;
  const error = null;

  const value = useMemo(
    () => ({
      announcements,
      offers,
      isLoading,
      error,
    }),
    [announcements, offers, isLoading, error],
  );

  return (
    <AuctionContext.Provider value={value}>{children}</AuctionContext.Provider>
  );
}

// Hook to access announcements
export function useAnnouncements() {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error("useAnnouncements must be used within AuctionProvider");
  }

  return {
    announcements: context.announcements,
    isLoading: context.isLoading,
    isConnected: !context.isLoading,
    error: context.error,
    refetch: () => Promise.resolve(),
  };
}

// Hook to access offers (for auction bids)
export function useAuctionOffers() {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error("useAuctionOffers must be used within AuctionProvider");
  }

  return {
    offers: context.offers,
    isLoading: context.isLoading,
    isConnected: !context.isLoading,
    error: context.error,
    refetch: () => Promise.resolve(),
  };
}
