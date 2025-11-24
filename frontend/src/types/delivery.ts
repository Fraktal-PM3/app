export interface Location {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface DeliveryOffer {
  id: string;
  packageType: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  urgency: 'high' | 'medium' | 'low' | 'none';
  reward: number;
  distance: number;
  weight: number;
  size: string;
  customerRating: number;
  status: 'available' | 'accepted' | 'completed';
}

export interface PackageDetailsFromEvent {
  pickupLocation?: {
    address: string;
    lat: number;
    lng: number;
  };
  dropLocation?: {
    address: string;
    lat: number;
    lng: number;
  };
  size?: {
    width: number;
    height: number;
    depth: number;
  };
  weightKg?: number;
  urgency?: 'high' | 'medium' | 'low' | 'none';
  timestamp?: string;
}
