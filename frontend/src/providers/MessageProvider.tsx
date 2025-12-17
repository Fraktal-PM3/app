"use client";

import React, {
  createContext,
  useContext,
  useMemo,
} from "react";
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";

export type ActivityType =
  | "CreatePackage"
  | "StatusUpdated"
  | "DeletePackage"
  | "StatusUpdatedAfterPropose"
  | "StatusUpdatedAfterAccept"
  | "TransferExecuted"
  | "PackageAnnouncement"
  | "TransferOffer"
  | "TransferToPM3"
  | "Message";

export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: string;
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

interface MessageContextValue {
  activities: Activity[];
}

const MessageContext = createContext<MessageContextValue | undefined>(
  undefined,
);

export function MessageProvider({ children }: { children: React.ReactNode }) {
  // Use Convex query for activities - auto-updates!
  const activitiesData = useQuery(api.queries.activities.listRecent, { limit: 50 });

  const activities = useMemo(() => {
    if (!activitiesData) return [];
    
    return activitiesData.map((a: any): Activity => ({
      id: a.id,
      type: a.type as ActivityType,
      timestamp: new Date(a.timestamp).toISOString(),
      title: a.title,
      description: a.description,
      metadata: a.metadata,
    }));
  }, [activitiesData]);

  const value = useMemo(() => ({ activities }), [activities]);

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
}

// Hook to access recent activity
export function useRecentActivity() {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useRecentActivity must be used within MessageProvider");
  }

  const isConnected = context.activities !== undefined;

  return {
    activities: context.activities,
    isConnected,
  };
}


