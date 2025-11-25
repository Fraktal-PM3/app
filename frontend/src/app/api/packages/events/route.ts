import { getPackageService, getFireFly } from "../service";

// Use dynamic rendering for SSE
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const service = await getPackageService();
      let isClosed = false;

      const firefly = await getFireFly();

      // Helper to send SSE message
      const sendEvent = (eventName: string, data: unknown) => {
        if (isClosed) {
          // Silently return - this is normal when client disconnects
          return;
        }
        
        try {
          const message = `event: ${eventName}\ndata: ${JSON.stringify(
            data
          )}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // Mark as closed but don't log - this happens during normal disconnections
          isClosed = true;
        }
      };

      // Register handlers for all blockchain events
      await service.onEvent("CreatePackage", (event) => {
        sendEvent("CreatePackage", event);
      });

      await service.onEvent("StatusUpdated", (event) => {
        sendEvent("StatusUpdated", event);
      });

      await service.onEvent("ProposeTransfer", (event) => {
        sendEvent("ProposeTransfer", event);
      });

      await service.onEvent("AcceptTransfer", (event) => {
        sendEvent("AcceptTransfer", event);
      });

      await service.onEvent("ExecuteTransfer", (event) => {
        sendEvent("ExecuteTransfer", event);
      });

      await service.onEvent("DeletePackage", (event) => {
        sendEvent("DeletePackage", event);
      });

      await service.onEvent("message", (event) => {
        sendEvent("message", event);
      });

      // Send initial connection message
      sendEvent("connected", { message: "Connected to package events" });

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        console.log("Client disconnected from SSE stream");
        isClosed = true;
        try {
          controller.close();
        } catch {
          console.log("Controller already closed");
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
