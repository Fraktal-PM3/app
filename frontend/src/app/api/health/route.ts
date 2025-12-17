import { NextResponse } from "next/server";
import eventListenerService from "@/services/eventListener";
import eventSyncService from "@/services/eventSync";

// Use dynamic rendering
export const dynamic = "force-dynamic";

/**
 * Health check endpoint
 * Returns the status of the event listener service, Convex, and Firefly
 */
export async function GET() {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      eventListener: {},
      convex: {},
      firefly: {},
      lastSync: {},
    },
  };

  try {
    // Check event listener status
    const listenerStatus = eventListenerService.getStatus();
    health.services.eventListener = {
      status: listenerStatus.isRunning ? "running" : "stopped",
      nodeMSP: listenerStatus.nodeMSP,
      reconnectAttempts: listenerStatus.reconnectAttempts,
    };

    if (!listenerStatus.isRunning) {
      health.status = "degraded";
    }

    // Convex connection is handled by the SDK
    health.services.convex = {
      status: "connected", // Convex manages connection internally
    };

    // Check last event sync
    try {
      const lastSync = await eventSyncService.getLastSyncStatus();
      health.services.lastSync = {
        lastSyncTimestamp: lastSync?.lastSyncTimestamp?.toISOString() || null,
        metadata: lastSync?.metadata,
      };
    } catch (error: any) {
      health.services.lastSync = {
        status: "error",
        error: error.message,
      };
    }

    // Firefly status (just based on event listener)
    health.services.firefly = {
      status: listenerStatus.isRunning ? "connected" : "disconnected",
      nodeMSP: listenerStatus.nodeMSP,
    };

    // Return appropriate status code
    const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
        services: health.services,
      },
      { status: 503 }
    );
  }
}
