import express from "express";
import cors from "cors";

const app = express();
app.use(cors()); // allow requests from frontend
app.use(express.json());

// Example route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Example route: return delivery offers
app.get("/api/posts", (req, res) => {
  const deliveryOffers = [
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
    },
    {
      id: '2',
      packageType: 'Documents',
      size: 'small',
      weight: 0.5,
      pickupLocation: {
        name: 'Office Building',
        address: '789 Business Ave, Midtown',
        lat: 40.7505,
        lng: -73.9934
      },
      dropoffLocation: {
        name: 'Law Firm',
        address: '321 Legal St, Downtown',
        lat: 40.7061,
        lng: -74.0087
      },
      distance: 4.2,
      reward: 15,
      urgency: 'medium',
      pickupTime: new Date('2024-10-02T16:00:00'),
      deliveryDeadline: new Date('2024-10-02T20:00:00'),
      status: 'available',
      customerRating: 4.5
    },
    {
      id: '3',
      packageType: 'Food',
      size: 'medium',
      weight: 2.1,
      pickupLocation: {
        name: 'Restaurant Plaza',
        address: '555 Food Court, Mall District',
        lat: 40.7282,
        lng: -73.9942
      },
      dropoffLocation: {
        name: 'Residential Complex',
        address: '888 Home St, Suburb',
        lat: 40.7831,
        lng: -73.9712
      },
      distance: 12.3,
      reward: 35,
      urgency: 'low',
      pickupTime: new Date('2024-10-02T17:30:00'),
      deliveryDeadline: new Date('2024-10-02T21:00:00'),
      status: 'available',
      customerRating: 4.9
    }
  ];
  
  res.json(deliveryOffers);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
