"use client";

import { useState, useEffect, useCallback } from "react";

export interface PackageAnnouncement {
  _id: string;
  messageId: string;
  messageHash?: string;
  packageExternalId: string;
  announcerMSP: string;
  announcerNode: string;
  isActive: boolean;
  packageDetails?: any;
  packageId?: any;
  price?: number;
  messageData?: any;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function usePackageAnnouncements(activeOnly: boolean = true) {
  const [announcements, setAnnouncements] = useState<PackageAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch of all announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const url = activeOnly ? "/api/announcements?active=true" : "/api/announcements";
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch announcements: ${response.statusText}`);
      }
      const data = await response.json();
      setAnnouncements(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load announcements");
      console.error("Error fetching announcements:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Set up SSE for real-time updates
  useEffect(() => {
    const eventSource = new EventSource("/api/packages/events");

    eventSource.addEventListener("connected", () => {
      console.log("Connected to package announcements stream");
      setIsConnected(true);
    });

    // Listen for PackageAnnouncement events
    eventSource.addEventListener("PackageAnnouncement", (event) => {
      try {
        const announcementEvent = JSON.parse(event.data);
        console.log("New package announcement:", announcementEvent);

        // Extract data from the event
        const packageDetails = announcementEvent.value;
        const packageExternalId = packageDetails?.id;

        if (!packageExternalId) {
          console.warn("PackageAnnouncement missing package id");
          return;
        }

        const newAnnouncement: PackageAnnouncement = {
          _id: announcementEvent.id,
          messageId: announcementEvent.id,
          messageHash: announcementEvent.hash,
          packageExternalId: packageExternalId,
          announcerMSP: announcementEvent.signingKey?.split(":")[0] || "",
          announcerNode: announcementEvent.author,
          isActive: true,
          packageDetails: packageDetails,
          createdAt: announcementEvent.created,
        };

        setAnnouncements((prev) => {
          // Check if announcement already exists
          const exists = prev.some((a) => a.messageId === newAnnouncement.messageId);
          if (exists) return prev;
          return [newAnnouncement, ...prev];
        });
      } catch (err) {
        console.error("Error parsing PackageAnnouncement event:", err);
      }
    });

    // Listen for TransferExecuted events to mark announcements as inactive
    eventSource.addEventListener("TransferExecuted", (event) => {
      try {
        const data = JSON.parse(event.data);
        const packageId = data.output?.externalId;

        if (packageId) {
          setAnnouncements((prev) =>
            prev.map((announcement) =>
              announcement.packageExternalId === packageId
                ? { ...announcement, isActive: false }
                : announcement
            )
          );
        }
      } catch (err) {
        console.error("Error handling TransferExecuted for announcements:", err);
      }
    });

    // Listen for DeletePackage events to mark announcements as inactive
    eventSource.addEventListener("DeletePackage", (event) => {
      try {
        const data = JSON.parse(event.data);
        const packageId = data.output?.externalId;

        if (packageId) {
          setAnnouncements((prev) =>
            prev.map((announcement) =>
              announcement.packageExternalId === packageId
                ? { ...announcement, isActive: false }
                : announcement
            )
          );
        }
      } catch (err) {
        console.error("Error handling DeletePackage for announcements:", err);
      }
    });

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      setIsConnected(false);
    };

    // Cleanup on unmount
    return () => {
      console.log("Closing announcements SSE connection");
      eventSource.close();
      setIsConnected(false);
    };
  }, []);

  // Filter announcements if activeOnly is true
  const filteredAnnouncements = activeOnly
    ? announcements.filter((a) => a.isActive)
    : announcements;

  return {
    announcements: filteredAnnouncements,
    isLoading,
    isConnected,
    error,
    refetch: fetchAnnouncements,
  };
}
