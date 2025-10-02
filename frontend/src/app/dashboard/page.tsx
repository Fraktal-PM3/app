'use client';

import { useState } from 'react';
import Link from 'next/link';

// Delivery offer interface
interface DeliveryOffer {
  id: string;
  packageType: string;
  size: 'small' | 'medium' | 'large';
  weight: number; // in kg
  pickupLocation: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  dropoffLocation: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  distance: number; // in km
  reward: number; // in currency
  urgency: 'low' | 'medium' | 'high';
  pickupTime: Date;
  deliveryDeadline: Date;
  status: 'available' | 'accepted' | 'in-transit' | 'delivered';
  customerRating: number;
}

// Sample delivery offers
const initialOffers: DeliveryOffer[] = [
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

// Simple map component placeholder
const DeliveryMap = ({ pickup, dropoff }: { 
  pickup: DeliveryOffer['pickupLocation'], 
  dropoff: DeliveryOffer['dropoffLocation'] 
}) => {
  return (
    <div className="h-40 w-full bg-slate-100 rounded-lg flex items-center justify-center relative border border-border">
      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
        Pickup
      </div>
      <div className="absolute bottom-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
        Dropoff
      </div>
      <div className="text-center text-muted-foreground">
        <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <div className="text-xs">Map View</div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [offers, setOffers] = useState<DeliveryOffer[]>(initialOffers);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<string>('all');

  // Filter offers based on search and urgency
  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.packageType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         offer.pickupLocation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         offer.dropoffLocation.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUrgency = filterUrgency === 'all' || offer.urgency === filterUrgency;
    return matchesSearch && matchesUrgency && offer.status === 'available';
  });

  // Accept offer function
  const acceptOffer = (id: string) => {
    setOffers(offers.map(offer => 
      offer.id === id ? { ...offer, status: 'accepted' } : offer
    ));
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSizeIcon = (size: string) => {
    switch (size) {
      case 'small': return '📦';
      case 'medium': return '📫';
      case 'large': return '📦';
      default: return '📦';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Active Delivery Offers</h1>
        <p className="text-muted-foreground">
          Browse and accept available package delivery opportunities in your area.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by package type or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Filter */}
        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value)}
          className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Urgency</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
      </div>

      {/* Delivery Offers List */}
      <div className="space-y-4">
        {filteredOffers.map((offer) => (
          <div key={offer.id} className="rounded-lg border bg-card hover:shadow-md transition-shadow">
            <div className="flex flex-col lg:flex-row">
              {/* Left: Map Section */}
              <div className="lg:w-1/3 p-4">
                <DeliveryMap pickup={offer.pickupLocation} dropoff={offer.dropoffLocation} />
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Pickup:</span>
                    <span className="text-muted-foreground truncate">{offer.pickupLocation.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-600">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="font-medium">Dropoff:</span>
                    <span className="text-muted-foreground truncate">{offer.dropoffLocation.name}</span>
                  </div>
                </div>
              </div>

              {/* Right: Package Info Section */}
              <div className="lg:w-2/3 p-4 lg:pl-0">
                <div className="flex flex-col h-full">
                  {/* Header with urgency and reward */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getSizeIcon(offer.size)}</span>
                      <div>
                        <h3 className="text-lg font-semibold">{offer.packageType}</h3>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(offer.urgency)}`}>
                          {offer.urgency} priority
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">{offer.reward} kr</div>
                      <div className="text-sm text-muted-foreground">reward</div>
                    </div>
                  </div>

                  {/* Package Details */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Distance</span>
                      <div className="font-medium">{offer.distance} km</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Weight</span>
                      <div className="font-medium">{offer.weight} kg</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Size</span>
                      <div className="font-medium capitalize">{offer.size}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rating</span>
                      <div className="font-medium flex items-center gap-1">
                        ⭐ {offer.customerRating}
                      </div>
                    </div>
                  </div>

                  {/* Time Information */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Pickup Time</span>
                      <div className="font-medium">{offer.pickupTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Deadline</span>
                      <div className="font-medium">{offer.deliveryDeadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-auto">
                    <Link
                      href={`/dashboard/package/${offer.id}`}
                      className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors text-center"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => acceptOffer(offer.id)}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                    >
                      Accept Delivery
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredOffers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            {searchTerm || filterUrgency !== 'all' 
              ? 'No delivery offers match your current filters.' 
              : 'No active delivery offers available at the moment.'
            }
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Check back soon for new delivery opportunities!
          </p>
        </div>
      )}
    </div>
  );
}