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
  pickupTime: Date;
  deliveryDeadline: Date;
  urgency: string;
  reward: number;
  distance: number;
  weight: number;
  size: string;
  customerRating: number;
  status: 'available' | 'accepted' | 'completed';
}
