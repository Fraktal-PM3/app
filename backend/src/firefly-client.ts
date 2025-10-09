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

    // Handle protocol errors
    if (message.type === 'protocol_error') {
      console.error('Firefly protocol error:', message.error);
      this.emit('protocolError', message);
      return;
    }

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

    // Check if message has data with hash ID
    if (message.message && message.message.data && Array.isArray(message.message.data) && message.message.data.length > 0) {
      const messageData = message.message.data;
      const hashID = messageData[0].id;
      console.log("SHA-256 hash id:", hashID);

      if (hashID) {
        // Fetch data from Firefly REST API
        fetch(`http://localhost:5000/api/v1/data/${hashID}/value`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(packageData => {
          console.log("Fetched package data for hashID:", packageData);
          
          // Process the package data and emit it as a structured event
          this.processPackageData(hashID, packageData, message);
        })
        .catch(err => {
          console.error("Error fetching data for hashID:", hashID, err);
        });
      }
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

  private processPackageData(hashID: string, packageData: any, originalMessage: any): void {
    try {
      console.log("Processing package data:", { hashID, packageData, originalMessage });
      
      // Transform the Firefly package data into a delivery offer format
      const deliveryOffer = this.transformToDeliveryOffer(hashID, packageData, originalMessage);
      
      if (deliveryOffer) {
        // Emit the processed delivery offer
        this.emit('newDeliveryOffer', deliveryOffer);
        console.log("New delivery offer created from Firefly data:", deliveryOffer.id);
      }
      
      // Also emit the raw data for debugging/other uses
      this.emit('fireflyData', { hashID, data: packageData, originalMessage });
      
    } catch (error) {
      console.error("Error processing package data:", error);
      this.emit('dataProcessingError', { hashID, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private transformToDeliveryOffer(hashID: string, packageData: any, originalMessage: any): any {
    try {
      // Handle different possible data structures
      let actualData = packageData;
      
      // If the data is a string, try to parse it as JSON
      if (typeof packageData === 'string') {
        try {
          actualData = JSON.parse(packageData);
        } catch (e) {
          console.warn("Package data is not valid JSON:", packageData);
          return null;
        }
      }
      
      // Extract package information from the data structure
      // Adjust these field mappings based on your actual Firefly data structure
      const deliveryOffer = {
        id: hashID,
        packageType: actualData.packageType || actualData.type || 'Unknown Package',
        size: this.validateSize(actualData.size) || 'medium',
        weight: this.parseNumber(actualData.weight) || 1.0,
        pickupLocation: {
          name: actualData.pickup?.name || actualData.pickupLocation?.name || 'Firefly Pickup Location',
          address: actualData.pickup?.address || actualData.pickupLocation?.address || 'Address from Firefly',
          lat: this.parseNumber(actualData.pickup?.lat || actualData.pickupLocation?.lat) || 40.7128,
          lng: this.parseNumber(actualData.pickup?.lng || actualData.pickupLocation?.lng) || -74.0060
        },
        dropoffLocation: {
          name: actualData.dropoff?.name || actualData.dropoffLocation?.name || 'Firefly Dropoff Location',
          address: actualData.dropoff?.address || actualData.dropoffLocation?.address || 'Address from Firefly',
          lat: this.parseNumber(actualData.dropoff?.lat || actualData.dropoffLocation?.lat) || 40.7589,
          lng: this.parseNumber(actualData.dropoff?.lng || actualData.dropoffLocation?.lng) || -73.9851
        },
        distance: this.parseNumber(actualData.distance) || 5.0,
        reward: this.parseNumber(actualData.reward || actualData.price || actualData.payment) || 25,
        urgency: this.validateUrgency(actualData.urgency) || 'medium',
        pickupTime: this.parseDate(actualData.pickupTime) || new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        deliveryDeadline: this.parseDate(actualData.deliveryDeadline || actualData.deadline) || new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
        status: 'available',
        customerRating: this.parseNumber(actualData.customerRating || actualData.rating) || 4.5,
        
        // Firefly-specific metadata
        fireflyHashID: hashID,
        fireflyEventId: originalMessage.id,
        fireflyNamespace: originalMessage.namespace,
        fireflyCorrelator: originalMessage.correlator,
        fireflyRawData: actualData,
        createdAt: new Date().toISOString()
      };

      return deliveryOffer;
      
    } catch (error) {
      console.error("Error transforming package data to delivery offer:", error);
      return null;
    }
  }

  // Helper methods for data validation and parsing
  private validateSize(size: string): 'small' | 'medium' | 'large' | null {
    if (!size) return null;
    const normalizedSize = size.toLowerCase();
    if (['small', 'medium', 'large'].includes(normalizedSize)) {
      return normalizedSize as 'small' | 'medium' | 'large';
    }
    return null;
  }

  private validateUrgency(urgency: string): 'low' | 'medium' | 'high' | null {
    if (!urgency) return null;
    const normalizedUrgency = urgency.toLowerCase();
    if (['low', 'medium', 'high'].includes(normalizedUrgency)) {
      return normalizedUrgency as 'low' | 'medium' | 'high';
    }
    return null;
  }

  private parseNumber(value: any): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  private parseDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    
    try {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
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