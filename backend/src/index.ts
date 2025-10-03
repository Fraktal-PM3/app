import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { FireflyClient } from "./firefly-client";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
app.use(cors()); // allow requests from frontend
app.use(express.json());

// In-memory storage for packages
let deliveryOffers: any[] = [
  {
    id: '1',
    packageType: 'Electronics',
    size: 'small',
    weight: 1.2,
    pickupLocation: {
      name: 'Tech Store Downtown',
      address: '123 Main St, Downtown',
      lat: 40.7128,
      lng: -74.0060
    },
    dropoffLocation: {
      name: 'Customer Home',
      address: '456 Oak Ave, Uptown',
      lat: 40.7589,
      lng: -73.9851
    },
    distance: 8.5,
    reward: 25,
    urgency: 'high',
    pickupTime: new Date('2024-10-02T14:00:00'),
    deliveryDeadline: new Date('2024-10-02T18:00:00'),
    status: 'available',
    customerRating: 4.8
  }
];

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Frontend connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Frontend disconnected:', socket.id);
  });
});

// Initialize Hyperledger Firefly WebSocket connection
const fireflyClient = new FireflyClient({
  url: process.env.FIREFLY_WS_URL || 'ws://127.0.0.1:5000/ws',
  reconnectInterval: parseInt(process.env.FIREFLY_RECONNECT_INTERVAL || '5000'),
  maxReconnectAttempts: parseInt(process.env.FIREFLY_MAX_RECONNECT_ATTEMPTS || '10')
});

// Set up Firefly event handlers
fireflyClient.on('connected', () => {
  console.log('Successfully connected to Hyperledger Firefly');
  // Notify all connected frontend clients about Firefly connection status
  io.emit('fireflyStatus', { connected: true });
});

fireflyClient.on('disconnected', () => {
  console.log('Disconnected from Hyperledger Firefly');
  // Notify all connected frontend clients about Firefly connection status
  io.emit('fireflyStatus', { connected: false });
});

fireflyClient.on('error', (error) => {
  console.error('Firefly connection error:', error);
  io.emit('fireflyError', { error: error.message });
});

fireflyClient.on('protocolError', (errorData) => {
  console.error('Firefly protocol error:', errorData);
  io.emit('fireflyProtocolError', errorData);
});

// Handle specific Firefly events and forward them to frontend
fireflyClient.on('blockchainEvent', (event) => {
  console.log('Blockchain event received:', event);
  
  // Transform blockchain events into delivery offers if they match your use case
  // This is where you'd implement your business logic to convert Firefly events
  // into the delivery package format your frontend expects
  
  io.emit('fireflyBlockchainEvent', event);
});

fireflyClient.on('messageConfirmed', (event) => {
  console.log('Message confirmed:', event);
  io.emit('fireflyMessageConfirmed', event);
});

fireflyClient.on('tokenTransfer', (event) => {
  console.log('Token transfer confirmed:', event);
  
  // Example: Convert token transfers to delivery rewards/payments
  const deliveryPayment = {
    id: event.id || Date.now().toString(),
    type: 'payment_confirmed',
    amount: event.amount,
    from: event.from,
    to: event.to,
    timestamp: new Date().toISOString(),
    fireflyData: event
  };
  
  io.emit('deliveryPayment', deliveryPayment);
});

fireflyClient.on('transactionSubmitted', (event) => {
  console.log('Transaction submitted:', event);
  io.emit('fireflyTransactionSubmitted', event);
});

// Generic handler for all Firefly events
fireflyClient.on('fireflyEvent', (event) => {
  console.log('Generic Firefly event:', event.type, event.id);
  
  // Forward all Firefly events to frontend for debugging/monitoring
  io.emit('fireflyEvent', event);
  
  // Here you can add logic to convert specific Firefly events into delivery offers
  if (event.type === 'custom_delivery_request') {
    // Example: Transform a custom Firefly event into a delivery offer
    const deliveryOffer = {
      id: event.id,
      packageType: event.data?.packageType || 'Unknown',
      size: event.data?.size || 'medium',
      weight: event.data?.weight || 1.0,
      pickupLocation: event.data?.pickup || {
        name: 'Blockchain Pickup',
        address: 'From Firefly Event',
        lat: 40.7128,
        lng: -74.0060
      },
      dropoffLocation: event.data?.dropoff || {
        name: 'Blockchain Dropoff',
        address: 'From Firefly Event',
        lat: 40.7589,
        lng: -73.9851
      },
      distance: event.data?.distance || 5.0,
      reward: event.data?.reward || 20,
      urgency: event.data?.urgency || 'medium',
      pickupTime: new Date(event.data?.pickupTime || Date.now()),
      deliveryDeadline: new Date(event.data?.deliveryDeadline || Date.now() + 4 * 60 * 60 * 1000), // 4 hours
      status: 'available',
      customerRating: event.data?.customerRating || 4.5,
      fireflyEventId: event.id,
      fireflyCorrelator: event.correlator
    };
    
    // Add to local storage
    deliveryOffers.push(deliveryOffer);
    
    // Broadcast as new package to frontend
    io.emit('newPackage', deliveryOffer);
  }
});

// Connect to Firefly
fireflyClient.connect();

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok",
    firefly: {
      connected: fireflyClient.isConnected(),
      url: process.env.FIREFLY_WS_URL || 'ws://127.0.0.1:5000/ws'
    }
  });
});

// Get all delivery offers
app.get("/api/posts", (req, res) => {
  res.json(deliveryOffers);
});

// Get Firefly connection status
app.get("/api/firefly/status", (req, res) => {
  res.json({
    connected: fireflyClient.isConnected(),
    url: process.env.FIREFLY_WS_URL || 'ws://127.0.0.1:5000/ws',
    namespace: process.env.FIREFLY_NAMESPACE || 'default'
  });
});

// Manually trigger Firefly reconnection (for debugging)
app.post("/api/firefly/reconnect", (req, res) => {
  try {
    fireflyClient.disconnect();
    setTimeout(() => {
      fireflyClient.connect();
    }, 1000);
    res.json({ success: true, message: 'Firefly reconnection initiated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reconnect to Firefly' });
  }
});

// POST endpoint to receive new package information
app.post("/api/packages", (req, res) => {
  try {
    const packageData = req.body;
    
    // Generate a unique ID for the new package
    const newPackage = {
      id: Date.now().toString(),
      ...packageData,
      status: 'available'
    };
    
    // Add to storage
    deliveryOffers.push(newPackage);
    
    // Broadcast to all connected frontend clients
    io.emit('newPackage', newPackage);
    
    console.log('New package added:', newPackage.id, newPackage.packageType);
    
    res.status(201).json({ 
      success: true, 
      message: 'Package added successfully',
      package: newPackage
    });
  } catch (error) {
    console.error('Error adding package:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding package' 
    });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready for real-time communication`);
});
