"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import type { ConnectionState, EventHandler, AllEventsHandler } from "@/types/events";

interface SSEConnectionContextValue {
  isConnected: boolean;
  connectionState: ConnectionState;
  error: string | null;
  subscribe: <T = any>(eventName: string, handler: EventHandler<T>) => () => void;
  subscribeAll: (handler: AllEventsHandler) => () => void;
  manualReconnect: () => void;
}

const SSEConnectionContext = createContext<SSEConnectionContextValue | undefined>(undefined);

export function SSEConnectionProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventHandlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const allEventsHandlersRef = useRef<Set<AllEventsHandler>>(new Set());

  // Setup listener for a specific event on the EventSource
  const setupEventListener = useCallback((eventName: string) => {
    if (!eventSourceRef.current) return;

    console.log(`[SSE] Setting up listener for event: ${eventName}`);

    eventSourceRef.current.addEventListener(eventName, (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        console.log(`[SSE] Event received: ${eventName}`, data);

        // Call specific event handlers
        const handlers = eventHandlersRef.current.get(eventName);
        if (handlers) {
          handlers.forEach((handler) => handler(data));
        }

        // Call all-events handlers
        allEventsHandlersRef.current.forEach((handler) => {
          handler(eventName, data);
        });
      } catch (err) {
        console.error(`[SSE] Error parsing ${eventName} event:`, err);
      }
    });
  }, []);

  // Subscribe to a specific event
  const subscribe = useCallback(<T = any,>(eventName: string, handler: EventHandler<T>): (() => void) => {
    if (!eventHandlersRef.current.has(eventName)) {
      eventHandlersRef.current.set(eventName, new Set());
    }
    eventHandlersRef.current.get(eventName)!.add(handler);

    // Setup EventSource listener if this is the first subscriber
    if (eventHandlersRef.current.get(eventName)!.size === 1 && eventSourceRef.current) {
      setupEventListener(eventName);
    }

    // Return unsubscribe function
    return () => {
      const handlers = eventHandlersRef.current.get(eventName);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventHandlersRef.current.delete(eventName);
        }
      }
    };
  }, [setupEventListener]);

  // Subscribe to all events
  const subscribeAll = useCallback((handler: AllEventsHandler): (() => void) => {
    console.log("[SSE] Subscribing to all events");
    allEventsHandlersRef.current.add(handler);

    // If EventSource is already connected, we need to ensure listeners are set up
    // We'll setup common event listeners immediately
    if (eventSourceRef.current) {
      const commonEvents = [
        "CreatePackage",
        "StatusUpdated",
        "DeletePackage",
        "ProposeTransfer",
        "AcceptTransfer",
        "TransferExecuted",
        "PackageAnnouncement",
        "message",
        "connected",
      ];

      commonEvents.forEach((eventName) => {
        if (!eventHandlersRef.current.has(eventName)) {
          console.log(`[SSE] Setting up listener for ${eventName}`);
          setupEventListener(eventName);
        }
      });
    }

    return () => {
      allEventsHandlersRef.current.delete(handler);
    };
  }, [setupEventListener]);

  // Create EventSource connection
  const createConnection = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    console.log("[SSE] Creating connection...");
    setConnectionState("connecting");
    setError(null);

    const eventSource = new EventSource("/api/packages/events");
    eventSourceRef.current = eventSource;

    // Setup listener for connected event
    eventSource.addEventListener("connected", (e) => {
      console.log("[SSE] Connected successfully", e.data);
      setConnectionState("connected");
      setIsConnected(true);
      setReconnectAttempts(0); // Reset attempts on successful connection
    });

    // Setup all common event listeners immediately to ensure we don't miss events
    const commonEvents = [
      "CreatePackage",
      "StatusUpdated",
      "DeletePackage",
      "ProposeTransfer",
      "AcceptTransfer",
      "TransferExecuted",
      "PackageAnnouncement",
      "message",
    ];

    commonEvents.forEach((eventName) => {
      setupEventListener(eventName);
    });

    // Also setup listeners for any custom subscribed events
    eventHandlersRef.current.forEach((_, eventName) => {
      if (!commonEvents.includes(eventName)) {
        setupEventListener(eventName);
      }
    });

    // Error handler
    eventSource.onerror = (err) => {
      console.error("[SSE] Connection error:", err);
      setConnectionState("error");
      setIsConnected(false);
      setError("Connection failed");
      eventSource.close();

      // Schedule reconnect
      scheduleReconnect();
    };
  }, []);

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    setReconnectAttempts((prev) => {
      const newAttempts = prev + 1;
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
      const delay = Math.min(1000 * Math.pow(2, newAttempts - 1), 30000);

      console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${newAttempts})`);

      reconnectTimeoutRef.current = setTimeout(() => {
        createConnection();
      }, delay);

      return newAttempts;
    });
  }, [createConnection]);

  // Manual reconnect function
  const manualReconnect = useCallback(() => {
    console.log("[SSE] Manual reconnect triggered");
    setReconnectAttempts(0);
    createConnection();
  }, [createConnection]);

  // Initial connection on mount
  useEffect(() => {
    createConnection();

    // Cleanup on unmount
    return () => {
      console.log("[SSE] Cleaning up connection");
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [createConnection]);

  const value: SSEConnectionContextValue = {
    isConnected,
    connectionState,
    error,
    subscribe,
    subscribeAll,
    manualReconnect,
  };

  return <SSEConnectionContext.Provider value={value}>{children}</SSEConnectionContext.Provider>;
}

export function useSSEConnection() {
  const context = useContext(SSEConnectionContext);
  if (!context) {
    throw new Error("useSSEConnection must be used within SSEConnectionProvider");
  }
  return context;
}
