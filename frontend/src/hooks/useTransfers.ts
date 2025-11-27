"use client";

import { useState, useEffect } from "react";
import { Transfer } from "@/types/package";

export function useTransfers() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch transfers from API
  const fetchTransfers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/transfers");
      if (!res.ok) {
        throw new Error(`Failed to fetch transfers: ${res.statusText}`);
      }
      const data = await res.json();
      setTransfers(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching transfers:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch transfers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();

    // Connect to SSE for real-time updates
    const eventSource = new EventSource("/api/packages/events");

    eventSource.addEventListener("connected", () => {
      console.log("[useTransfers] Connected to SSE");
      setIsConnected(true);
    });

    // Listen for ProposeTransfer events
    eventSource.addEventListener("ProposeTransfer", (event) => {
      try {
        const transferData = JSON.parse(event.data);
        console.log("[useTransfers] ProposeTransfer event:", transferData);

        setTransfers((prev) => {
          const exists = prev.some((t) => t.transferId === transferData.transferId);
          if (exists) {
            return prev.map((t) =>
              t.transferId === transferData.transferId ? transferData : t
            );
          }
          return [transferData, ...prev];
        });
      } catch (err) {
        console.error("[useTransfers] Error parsing ProposeTransfer:", err);
      }
    });

    // Listen for AcceptTransfer events
    eventSource.addEventListener("AcceptTransfer", (event) => {
      try {
        const transferData = JSON.parse(event.data);
        console.log("[useTransfers] AcceptTransfer event:", transferData);

        setTransfers((prev) =>
          prev.map((t) =>
            t.transferId === transferData.transferId ? transferData : t
          )
        );
      } catch (err) {
        console.error("[useTransfers] Error parsing AcceptTransfer:", err);
      }
    });

    // Listen for TransferExecuted events
    eventSource.addEventListener("TransferExecuted", (event) => {
      try {
        const transferData = JSON.parse(event.data);
        console.log("[useTransfers] TransferExecuted event:", transferData);

        setTransfers((prev) =>
          prev.map((t) =>
            t.transferId === transferData.transferId ? transferData : t
          )
        );
      } catch (err) {
        console.error("[useTransfers] Error parsing TransferExecuted:", err);
      }
    });

    eventSource.onerror = () => {
      console.error("[useTransfers] SSE connection error");
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, []);

  return {
    transfers,
    isLoading,
    isConnected,
    error,
    refetch: fetchTransfers,
  };
}
