import WebSocket from 'ws';
import { EventEmitter } from 'events';

interface FireflyEvent {
  id: string;
  type: string;
  namespace: string;
  reference?: string;
  correlator?: string;
  created: string;
  data?: any;
}

interface FireflyConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

export class FireflyClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: FireflyConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;

  constructor(config: Partial<FireflyConfig> = {}) {
    super();
    this.config = {
      url: config.url || 'ws://127.0.0.1:5000/ws',
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10
    };
    
    console.log('FireflyClient initialized with config:', this.config);
  }

  connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    console.log(`Connecting to Hyperledger Firefly at ${this.config.url}`);

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Error creating WebSocket connection to Firefly:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.on('open', () => {
      console.log('Connected to Hyperledger Firefly WebSocket');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.emit('connected');

      // Subscribe to all events - adjust based on your Firefly configuration
      this.subscribeToEvents();
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleFireflyMessage(message);
      } catch (error) {
        console.error('Error parsing Firefly message:', error);
      }
    });

    this.ws.on('close', (code: number, reason: Buffer) => {
      console.log(`Firefly WebSocket closed: ${code} ${reason.toString()}`);
      this.isConnecting = false;
      this.emit('disconnected');
      this.scheduleReconnect();
    });

    this.ws.on('error', (error: Error) => {
      console.error('Firefly WebSocket error:', error);
      this.isConnecting = false;
      this.emit('error', error);
    });
  }

  private subscribeToEvents(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // For now, don't send any subscription messages to avoid protocol errors
    // Firefly WebSocket might automatically stream events or use a different subscription model
    console.log('WebSocket connected to Firefly - listening for events without explicit subscription');
    
    // Many WebSocket implementations just start sending data once connected
    // We'll wait for incoming messages to understand the protocol better
  }

  private handleFireflyMessage(message: any): void {
    console.log('Received Firefly event:', message);

    // Handle protocol errors
    if (message.type === 'protocol_error') {
      console.error('Firefly protocol error:', message.error);
      this.emit('protocolError', message);
      return;
    }

    // Emit the raw message for debugging
    this.emit('message', message);

    // Handle specific event types
    if (message.type === 'blockchain_event') {
      this.emit('blockchainEvent', message);
    } else if (message.type === 'message_confirmed') {
      this.emit('messageConfirmed', message);
    } else if (message.type === 'token_transfer_confirmed') {
      this.emit('tokenTransfer', message);
    } else if (message.type === 'transaction_submitted') {
      this.emit('transactionSubmitted', message);
    } else if (message.type === 'batch_pin_complete') {
      this.emit('batchPinComplete', message);
    } else if (message.type === 'token_mint_confirmed') {
      this.emit('tokenMint', message);
    }

    // Emit a generic 'fireflyEvent' that can be used to forward to frontend
    const fireflyEvent: FireflyEvent = {
      id: message.id || Date.now().toString(),
      type: message.type || 'unknown',
      namespace: message.namespace || 'default',
      reference: message.reference,
      correlator: message.correlator,
      created: message.created || new Date().toISOString(),
      data: message
    };

    this.emit('fireflyEvent', fireflyEvent);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached for Firefly WebSocket');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Scheduling Firefly reconnect attempt ${this.reconnectAttempts} in ${this.config.reconnectInterval}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnecting = false;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Method to send messages to Firefly (for future use)
  send(message: any): boolean {
    if (!this.isConnected()) {
      console.warn('Cannot send message: Firefly WebSocket not connected');
      return false;
    }

    try {
      this.ws?.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending message to Firefly:', error);
      return false;
    }
  }
}