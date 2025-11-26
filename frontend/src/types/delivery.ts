export interface Location {
  name: string;
  address: string;
  lat: number;
  lng: number;
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
  author?: string;
}
