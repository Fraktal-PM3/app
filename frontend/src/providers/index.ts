// Re-export all providers and hooks for clean imports

// SSE Connection Provider
export { SSEConnectionProvider, useSSEConnection } from "./SSEConnectionProvider";

// Package Provider
export { PackageProvider, usePackages, useTransfers } from "./PackageProvider";

// Auction Provider
export { AuctionProvider, useAnnouncements, useOffers } from "./AuctionProvider";
export type { TransferOffer } from "./AuctionProvider";

// Offers Provider (Transfer offers linked to announcements)
export { OffersProvider, useOffers as useTransferOffers, useAnnouncementOffers } from "./OffersProvider";

// Metrics Provider
export { MetricsProvider, useMetrics, useRoleDetection } from "./MetricsProvider";
export type { UserRole, PackageMetrics } from "./MetricsProvider";

// Message Provider
export { MessageProvider, useRecentActivity } from "./MessageProvider";
export type { Activity, ActivityType } from "./MessageProvider";
