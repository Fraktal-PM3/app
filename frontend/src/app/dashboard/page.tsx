'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { useSocket } from '@/lib/useSocket';
import dynamic from 'next/dynamic';
import { PackageService, PackageDetails } from 'fraktal-lib';


// Dynamically import DeliveryMap to prevent SSR issues
const DeliveryMap = dynamic(() => import('@/components/DeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="h-40 w-full bg-slate-100 rounded-lg flex items-center justify-center border border-border">
      <div className="text-center text-muted-foreground">Loading map...</div>
    </div>
  )
});



export default function Dashboard() {
  // Use SWR to fetch delivery offers from the backend
  const { data: backendOffers, error, isLoading, mutate } = useSWR<DeliveryOffer[]>('/api/posts', fetcher);
  
  // Socket connection for real-time updates
  const { socket, connected, fireflyConnected } = useSocket();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<string>('all');

  // Listen for new packages from backend
  useEffect(() => {
    if (!socket) return;

    socket.on('newPackage', (newPackage: DeliveryOffer) => {
      console.log('New package received via WebSocket:', newPackage);
      
      // Convert date strings to Date objects
      const packageWithDates = {
        ...newPackage,
        pickupTime: new Date(newPackage.pickupTime),
        deliveryDeadline: new Date(newPackage.deliveryDeadline)
      };
      
      // Update SWR cache to include the new package
      mutate((currentData) => {
        const updatedData = currentData ? [...currentData, packageWithDates] : [packageWithDates];
        return updatedData;
      }, { revalidate: false });
    });

    return () => {
      socket.off('newPackage');
    };
  }, [socket, mutate]);

  // Use backend data if available, convert date strings to Date objects
  const offers = backendOffers ? backendOffers.map(offer => ({
    ...offer,
    pickupTime: new Date(offer.pickupTime),
    deliveryDeadline: new Date(offer.deliveryDeadline)
  })) : [];

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="text-center py-12">
          <div className="text-muted-foreground">Loading delivery offers...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="text-center py-12">
          <div className="text-red-600">Failed to load delivery offers</div>
          <p className="text-sm text-muted-foreground mt-2">
            Please check if the backend server is running on localhost:4000
          </p>
        </div>
      </div>
    );
  }

  // Filter offers based on search and urgency
  const filteredOffers = offers.filter((offer: DeliveryOffer) => {
    const matchesSearch = offer.packageType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         offer.pickupLocation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         offer.dropoffLocation.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUrgency = filterUrgency === 'all' || offer.urgency === filterUrgency;
    return matchesSearch && matchesUrgency && offer.status === 'available';
  });

  // Accept offer function - update using mutate for proper cache management
  const acceptOffer = (id: string) => {
    mutate((currentData) => {
      if (!currentData) return currentData;
      
      return currentData.map((offer: DeliveryOffer) => 
        offer.id === id ? { ...offer, status: 'accepted' as const } : offer
      );
    }, { revalidate: false });
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Active Delivery Offers</h1>
            <p className="text-muted-foreground">
              Browse and accept available package delivery opportunities in your area.
            </p>
          </div>
          {/* Real-time connection status */}
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-muted-foreground">
                Backend: {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${fireflyConnected ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
              <span className="text-muted-foreground">
                Firefly: {fireflyConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
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
        {filteredOffers.map((offer: DeliveryOffer) => (
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
                        <h3 className="text-lg font-semibold text-neutral-400">{offer.packageType}</h3>
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
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 text-sm text-neutral-400">
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
                  <div className="flex flex-col sm:flex-row gap-4 mb-4 text-sm text-neutral-400">
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
                  <div className="flex gap-3 mt-auto text-neutral-400">
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