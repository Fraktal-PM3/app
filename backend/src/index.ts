import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:3000", // Frontend URL
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

// Example route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Get all delivery offers
app.get("/api/posts", (req, res) => {
  res.json(deliveryOffers);
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
