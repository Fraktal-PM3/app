"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useSSEConnection } from "./SSEConnectionProvider";

export type ActivityType =
  | "CreatePackage"
  | "StatusUpdated"
  | "DeletePackage"
  | "StatusUpdatedAfterPropose"
  | "StatusUpdatedAfterAccept"
  | "TransferExecuted"
  | "PackageAnnouncement"
  | "TransferOffer"
  | "Message";

export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

const MAX_ACTIVITIES = 50;

interface MessageContextValue {
  activities: Activity[];
}

const MessageContext = createContext<MessageContextValue | undefined>(undefined);

export function MessageProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const { subscribeAll } = useSSEConnection();

  // Subscribe to all events
  useEffect(() => {
    console.log("[MessageProvider] Setting up subscribeAll");
    const unsubscribe = subscribeAll((eventName, data) => {
      console.log(`[MessageProvider] Received event: ${eventName}`, data);
      const activity = transformEventToActivity(eventName, data);
      if (activity) {
        console.log(`[MessageProvider] Created activity from ${eventName}:`, activity);
        setActivities((prev) => {
          // Check for duplicates
          if (prev.some((a) => a.id === activity.id)) {
            return prev;
          }
          // Add to front and keep only last MAX_ACTIVITIES
          return [activity, ...prev].slice(0, MAX_ACTIVITIES);
        });
      } else {
        console.log(`[MessageProvider] No activity created from ${eventName}`);
      }
    });

    return unsubscribe;
  }, [subscribeAll]);

  const value = useMemo(() => ({ activities }), [activities]);

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
}

// Hook to access recent activity
export function useRecentActivity() {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useRecentActivity must be used within MessageProvider");
  }

  const { isConnected } = useSSEConnection();

  return {
    activities: context.activities,
    isConnected,
  };
}

// Transform SSE events to Activity format
function transformEventToActivity(eventName: string, data: any): Activity | null {
  switch (eventName) {
    case "CreatePackage": {
      const packageId = data.output?.externalId;
      const status = data.output?.status;
      const ownerMSP = data.output?.ownerOrgMSP;

      return {
        id: `create-${packageId}-${Date.now()}`,
        type: "CreatePackage",
        timestamp: data.timestamp || new Date().toISOString(),
        title: "Package Created",
        description: `Package ${packageId} created with status ${status}`,
        metadata: { packageId, status, ownerMSP },
      };
    }

    case "StatusUpdated": {
      const packageId = data.output?.externalId;
      const newStatus = data.output?.status;

      return {
        id: `status-${packageId}-${Date.now()}`,
        type: "StatusUpdated",
        timestamp: data.timestamp || new Date().toISOString(),
        title: "Status Updated",
        description: `Package ${packageId} status changed to ${newStatus}`,
        metadata: { packageId, newStatus },
      };
    }

    case "StatusUpdatedAfterPropose": {
      const packageId = data.output?.externalId;
      const termsID = data.output?.termsID;
      const status = data.output?.status;

      return {
        id: `propose-${termsID}-${Date.now()}`,
        type: "StatusUpdatedAfterPropose",
        timestamp: data.timestamp || new Date().toISOString(),
        title: "Transfer Proposed",
        description: `Package ${packageId} status updated to ${status} after transfer proposal`,
        metadata: { packageId, termsID, status },
      };
    }

    case "StatusUpdatedAfterAccept": {
      const packageId = data.output?.externalId;
      const termsID = data.output?.termsID;
      const status = data.output?.status;

      return {
        id: `accept-${termsID}-${Date.now()}`,
        type: "StatusUpdatedAfterAccept",
        timestamp: data.timestamp || new Date().toISOString(),
        title: "Transfer Accepted",
        description: `Package ${packageId} status updated to ${status} after transfer acceptance`,
        metadata: { packageId, termsID, status },
      };
    }

    case "TransferExecuted": {
      const packageId = data.output?.externalId;
      const termsId = data.output?.termsId;
      const newOwner = data.output?.newOwner;

      return {
        id: `execute-${termsId}-${Date.now()}`,
        type: "TransferExecuted",
        timestamp: data.timestamp || new Date().toISOString(),
        title: "Transfer Executed",
        description: `Package ${packageId} ownership transferred to ${newOwner}`,
        metadata: { packageId, termsId, newOwner },
      };
    }

    case "DeletePackage": {
      const packageId = data.output?.externalId;

      return {
        id: `delete-${packageId}-${Date.now()}`,
        type: "DeletePackage",
        timestamp: data.timestamp || new Date().toISOString(),
        title: "Package Deleted",
        description: `Package ${packageId} was deleted`,
        metadata: { packageId },
      };
    }

    case "PackageAnnouncement": {
      const packageId = data.value?.id;
      const announcerMSP = data.signingKey?.split(":")[0];

      return {
        id: `announce-${data.id}`,
        type: "PackageAnnouncement",
        timestamp: data.created || new Date().toISOString(),
        title: "Package Announced",
        description: `${announcerMSP} announced package ${packageId} for bidding`,
        metadata: { packageId, announcerMSP, messageId: data.id },
      };
    }

    case "message": {
      // Check if it's a transfer offer
      if (data.value?.termsId && data.value?.price) {
        const termsId = data.value?.termsId;
        const fromMSP = data.value?.fromMSP;
        const toMSP = data.value?.toMSP;
        const price = data.value?.price;
        const packageId = data.value?.externalPackageId;

        return {
          id: `offer-${data.id}`,
          type: "TransferOffer",
          timestamp: data.created || new Date().toISOString(),
          title: "Transfer Offer Received",
          description: `${fromMSP} sent transfer offer to ${toMSP} for package ${packageId} (Price: ${price})`,
          metadata: { termsId, fromMSP, toMSP, price, packageId, messageId: data.id },
        };
      } else {
        // Generic message
        const author = data.author;
        const messageId = data.id;

        return {
          id: `message-${messageId}`,
          type: "Message",
          timestamp: data.created || new Date().toISOString(),
          title: "Message Received",
          description: `Message received from ${author}`,
          metadata: { author, messageId, data },
        };
      }
    }

    default:
      return null;
  }
}
