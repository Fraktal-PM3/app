import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface FireflyEvent {
  id: string;
  type: string;
  namespace: string;
  reference?: string;
  correlator?: string;
  created: string;
  data?: unknown;
}

interface DeliveryPayment {
  id: string;
  type: string;
  amount?: number;
  from?: string;
  to?: string;
  timestamp: string;
  fireflyData: unknown;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [fireflyConnected, setFireflyConnected] = useState(false);

  useEffect(() => {
    // Create socket connection
    const socketInstance = io(SOCKET_URL);

    socketInstance.on('connect', () => {
      console.log('Connected to backend via WebSocket');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from backend');
      setConnected(false);
    });

    // Listen for Firefly connection status updates
    socketInstance.on('fireflyStatus', (data: { connected: boolean }) => {
      console.log('Firefly connection status:', data.connected);
      setFireflyConnected(data.connected);
    });

    // Listen for Firefly events
    socketInstance.on('fireflyEvent', (event: FireflyEvent) => {
      console.log('Firefly event received:', event);
    });

    socketInstance.on('fireflyBlockchainEvent', (event: FireflyEvent) => {
      console.log('Firefly blockchain event:', event);
    });

    socketInstance.on('fireflyMessageConfirmed', (event: FireflyEvent) => {
      console.log('Firefly message confirmed:', event);
    });

    socketInstance.on('deliveryPayment', (payment: DeliveryPayment) => {
      console.log('Delivery payment confirmed:', payment);
      // You could show a notification here
    });

    socketInstance.on('fireflyTransactionSubmitted', (event: FireflyEvent) => {
      console.log('Firefly transaction submitted:', event);
    });

    socketInstance.on('fireflyError', (error: { error: string }) => {
      console.error('Firefly error:', error.error);
    });


    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.close();
    };
  }, []);

  return { socket, connected, fireflyConnected };
};