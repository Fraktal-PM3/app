"use client";

import { useState, useEffect } from "react";

export type ActivityType =
  | "CreatePackage"
  | "StatusUpdated"
  | "DeletePackage"
  | "ProposeTransfer"
  | "AcceptTransfer"
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

export function useRecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource("/api/packages/events");

    eventSource.addEventListener("connected", () => {
      console.log("Connected to activity stream");
      setIsConnected(true);
    });

    // Helper to add activity
    const addActivity = (activity: Activity) => {
      setActivities((prev) => {
        const exists = prev.some((a) => a.id === activity.id);
        if (exists) return prev;
        return [activity, ...prev].slice(0, MAX_ACTIVITIES);
      });
    };

    // CreatePackage event
    eventSource.addEventListener("CreatePackage", (event) => {
      try {
        const data = JSON.parse(event.data);
        const packageId = data.output?.externalId;
        const status = data.output?.status;
        const ownerMSP = data.output?.ownerOrgMSP;

        addActivity({
          id: `create-${packageId}-${Date.now()}`,
          type: "CreatePackage",
          timestamp: data.timestamp || new Date().toISOString(),
          title: "Package Created",
          description: `Package ${packageId} created with status ${status}`,
          metadata: { packageId, status, ownerMSP },
        });
      } catch (err) {
        console.error("Error parsing CreatePackage event:", err);
      }
    });

    // StatusUpdated event
    eventSource.addEventListener("StatusUpdated", (event) => {
      try {
        const data = JSON.parse(event.data);
        const packageId = data.output?.externalId;
        const newStatus = data.output?.status;

        addActivity({
          id: `status-${packageId}-${Date.now()}`,
          type: "StatusUpdated",
          timestamp: data.timestamp || new Date().toISOString(),
          title: "Status Updated",
          description: `Package ${packageId} status changed to ${newStatus}`,
          metadata: { packageId, newStatus },
        });
      } catch (err) {
        console.error("Error parsing StatusUpdated event:", err);
      }
    });

    // ProposeTransfer event
    eventSource.addEventListener("ProposeTransfer", (event) => {
      try {
        const data = JSON.parse(event.data);
        const packageId = data.output?.externalId;
        const termsId = data.output?.termsId;
        const fromMSP = data.output?.terms?.fromMSP;
        const toMSP = data.output?.terms?.toMSP;

        addActivity({
          id: `propose-${termsId}-${Date.now()}`,
          type: "ProposeTransfer",
          timestamp: data.timestamp || new Date().toISOString(),
          title: "Transfer Proposed",
          description: `${fromMSP} proposed transfer of package ${packageId} to ${toMSP}`,
          metadata: { packageId, termsId, fromMSP, toMSP },
        });
      } catch (err) {
        console.error("Error parsing ProposeTransfer event:", err);
      }
    });

    // AcceptTransfer event
    eventSource.addEventListener("AcceptTransfer", (event) => {
      try {
        const data = JSON.parse(event.data);
        const packageId = data.output?.externalId;
        const termsId = data.output?.termsId;

        addActivity({
          id: `accept-${termsId}-${Date.now()}`,
          type: "AcceptTransfer",
          timestamp: data.timestamp || new Date().toISOString(),
          title: "Transfer Accepted",
          description: `Transfer proposal for package ${packageId} was accepted`,
          metadata: { packageId, termsId },
        });
      } catch (err) {
        console.error("Error parsing AcceptTransfer event:", err);
      }
    });

    // TransferExecuted event
    eventSource.addEventListener("TransferExecuted", (event) => {
      try {
        const data = JSON.parse(event.data);
        const packageId = data.output?.externalId;
        const termsId = data.output?.termsId;
        const newOwner = data.output?.newOwner;

        addActivity({
          id: `execute-${termsId}-${Date.now()}`,
          type: "TransferExecuted",
          timestamp: data.timestamp || new Date().toISOString(),
          title: "Transfer Executed",
          description: `Package ${packageId} ownership transferred to ${newOwner}`,
          metadata: { packageId, termsId, newOwner },
        });
      } catch (err) {
        console.error("Error parsing TransferExecuted event:", err);
      }
    });

    // DeletePackage event
    eventSource.addEventListener("DeletePackage", (event) => {
      try {
        const data = JSON.parse(event.data);
        const packageId = data.output?.externalId;

        addActivity({
          id: `delete-${packageId}-${Date.now()}`,
          type: "DeletePackage",
          timestamp: data.timestamp || new Date().toISOString(),
          title: "Package Deleted",
          description: `Package ${packageId} was deleted`,
          metadata: { packageId },
        });
      } catch (err) {
        console.error("Error parsing DeletePackage event:", err);
      }
    });

    // PackageAnnouncement event
    eventSource.addEventListener("PackageAnnouncement", (event) => {
      try {
        const data = JSON.parse(event.data);
        const packageId = data.value?.id;
        const announcerMSP = data.signingKey?.split(":")[0];

        addActivity({
          id: `announce-${data.id}`,
          type: "PackageAnnouncement",
          timestamp: data.created || new Date().toISOString(),
          title: "Package Announced",
          description: `${announcerMSP} announced package ${packageId} for bidding`,
          metadata: { packageId, announcerMSP, messageId: data.id },
        });
      } catch (err) {
        console.error("Error parsing PackageAnnouncement event:", err);
      }
    });

    // Generic message event (for messages that aren't announcements or offers)
    eventSource.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);

        // Check if it's a transfer offer based on data structure
        if (data.value?.termsId && data.value?.price) {
          const termsId = data.value?.termsId;
          const fromMSP = data.value?.fromMSP;
          const toMSP = data.value?.toMSP;
          const price = data.value?.price;
          const packageId = data.value?.externalPackageId;

          addActivity({
            id: `offer-${data.id}`,
            type: "TransferOffer",
            timestamp: data.created || new Date().toISOString(),
            title: "Transfer Offer Received",
            description: `${fromMSP} sent transfer offer to ${toMSP} for package ${packageId} (Price: ${price})`,
            metadata: {
              termsId,
              fromMSP,
              toMSP,
              price,
              packageId,
              messageId: data.id,
            },
          });
        } else {
          // Generic message
          const author = data.author;
          const messageId = data.id;

          addActivity({
            id: `message-${messageId}`,
            type: "Message",
            timestamp: data.created || new Date().toISOString(),
            title: "Message Received",
            description: `Message received from ${author}`,
            metadata: { author, messageId, data },
          });
        }
      } catch (err) {
        console.error("Error parsing message event:", err);
      }
    });

    eventSource.onerror = (error) => {
      console.error("Activity stream connection error:", error);
      setIsConnected(false);
    };

    // Cleanup on unmount
    return () => {
      console.log("Closing activity stream connection");
      eventSource.close();
      setIsConnected(false);
    };
  }, []);

  return {
    activities,
    isConnected,
  };
}
