import eventBus, { type TypedEventEnvelope } from "@/lib/eventBus";

// Use dynamic rendering for SSE
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;

      // Helper to send SSE message with proper typing
      const sendEvent = (eventName: string, data: unknown): void => {
        if (isClosed) {
          // Silently return - this is normal when client disconnects
          return;
        }

        try {
          const messageData = {
            event: eventName,
            data,
          };
          const message = JSON.stringify(messageData) + "\n";
          controller.enqueue(encoder.encode(message));
        } catch {
          // Mark as closed but don't log - this happens during normal disconnections
          isClosed = true;
        }
      };

      // Subscribe to blockchain events from the background service with proper typing
      const unsubscribe = eventBus.onBlockchainEvent(
        (event: TypedEventEnvelope): void => {
          sendEvent(event.eventName, event.data);
        },
      );

      // Send initial connection message
      sendEvent("connected", { message: "Connected to package events" });

      console.log("[SSE] Client connected to event stream");

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        console.log("[SSE] Client disconnected from event stream");
        isClosed = true;
        unsubscribe(); // Clean up event listener

        try {
          controller.close();
        } catch {
          // Controller already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
