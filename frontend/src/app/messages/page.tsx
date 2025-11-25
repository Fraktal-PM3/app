"use client";

import { useState, useEffect } from "react";
import { usePackages } from "../dashboard/components/PackageContext";

type PrivateMessage = {
  id: string;
  sender: string;
  recipient: string;
  message: string;
  timestamp: string;
  packageId?: string;
  price?: number;
  group?: {
    name: string;
    members: Array<{ identity: string }>;
  };
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<PrivateMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const { connected } = usePackages();

  // Fetch historical messages on page load
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch("/api/messages");
        const data = await response.json();

        //console.log(data)

        if (data.success && data.messages) {
          // Transform FireFly messages to our PrivateMessage format
          const transformedMessages: PrivateMessage[] = data.messages.map((msg: { author?: string; created?: string; id?: string; value?: { PID?: string; price?: number; [key: string]: unknown } }) => ({
            id: msg.id || Date.now().toString(),
            sender: msg.author || "Unknown",
            recipient: "You",
            message: msg.value?.PID ? `Package ID: ${msg.value.PID}` : "",
            packageId: msg.value?.PID || "N/A", 
            price: msg.value?.price || undefined,
            timestamp: msg.created || new Date().toISOString(),
          }));

          setMessages(transformedMessages);
        }
      } catch (error) {
        console.error("Error fetching historical messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  // Listen for private message events from SSE
  useEffect(() => {
    const eventSource = new EventSource("/api/packages/events");

    eventSource.addEventListener("message", (e) => {
      try {
        const event = JSON.parse(e.data);
        console.log("Private message event received:", event);

        // Extract message data from the event
        const messageData: PrivateMessage = {
          id: event.id || Date.now().toString(),
          sender: event.author || "Unknown",
          recipient: "You",
          message: event.value?.PID ? `Package ID: ${event.value.PID}` : "",
          timestamp: event.created || new Date().toISOString(),
          packageId: event.value?.PID,
          price: event.value?.price,
        };

        // Check if message already exists (avoid duplicates)
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === messageData.id);
          if (exists) return prev;
          return [messageData, ...prev];
        });
      } catch (error) {
        console.error("Error parsing message event:", error);
      }
    });

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getMessagePreview = (message: string, price?: number) => {
    if (price) {
      return `Delivery proposal: ${price} kr`;
    }
    return message.length > 50 ? message.substring(0, 50) + "..." : message;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Messages</h1>
            <p className="text-muted-foreground">
              View your private messages and delivery proposals
            </p>
          </div>
          {/* Real-time connection status */}
          <div className="flex items-center gap-2 text-sm">
            <div
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-blue-500" : "bg-gray-400"
              }`}
            ></div>
            <span className="text-muted-foreground">
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-muted-foreground">Inbox</h2>
              <p className="text-sm text-muted-foreground">
                {messages.length} {messages.length === 1 ? "message" : "messages"}
              </p>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <div className="text-4xl mb-2">⏳</div>
                  <p>Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <div className="text-4xl mb-2">📬</div>
                  <p>No messages yet</p>
                  <p className="text-sm mt-1">
                    Private messages will appear here
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                      selectedMessage?.id === msg.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-medium text-sm text-muted-foreground truncate flex-1">
                        {msg.sender}
                      </div>
                      <div className="text-xs text-muted-foreground ml-2">
                        {formatTimestamp(msg.timestamp)}
                      </div>
                    </div>
                    {msg.group && (
                      <div className="text-xs text-muted-foreground mb-1">
                        Group: {msg.group.name}
                      </div>
                    )}
                    {msg.price && (
                      <div className="text-sm font-semibold text-green-600 mb-1">
                        {msg.price} kr
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground truncate">
                      {getMessagePreview(msg.message, msg.price)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Message Details */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-card h-full">
            {selectedMessage ? (
              <div className="p-6">
                <div className="border-b pb-4 mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="text-xl text-muted-foreground font-semibold mb-1">
                        From: {selectedMessage.sender}
                      </h2>
                      {selectedMessage.group && (
                        <p className="text-sm text-muted-foreground">
                          Group: {selectedMessage.group.name}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(selectedMessage.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Price Badge if present */}
                {selectedMessage.price && (
                  <div className="mb-4 p-4 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          Proposed Price
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {selectedMessage.price} kr
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message Content */}
                <div className="bg-accent/50 rounded-lg p-4 mb-4">
                  <div className="text-sm text-muted-foreground font-medium mb-2">Message:</div>
                  <div className="whitespace-pre-wrap text-muted-foreground wrap-break-word">
                    {selectedMessage.message}
                  </div>
                </div>

                {/* Message Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Message ID:</span>
                    <div className="font-mono text-muted-foreground text-xs mt-1 break-all">
                      {selectedMessage.id}
                    </div>
                  </div>
                  {selectedMessage.packageId && (
                    <div>
                      <span className="text-muted-foreground">Package ID:</span>
                      <div className="font-mono text-muted-foreground text-xs mt-1 break-all">
                        {selectedMessage.packageId}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {selectedMessage.price && selectedMessage.packageId && (
                  <div className="mt-6 pt-6 text-muted-foreground border-t flex gap-3">
                    <button className="px-4 py-2 bg-primary rounded-md hover:bg-primary/90 transition-colors">
                      Accept Proposal
                    </button>
                    <button className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors">
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
                <div className="text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <p>Select a message to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
