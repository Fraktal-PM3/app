'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Location {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface DeliveryMapProps {
  pickup: Location;
  dropoff: Location;
}

const DeliveryMap = ({ pickup, dropoff }: DeliveryMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Prevent reinitializing the map on every re-render
    if (mapInstanceRef.current) return;

    // Create custom colored markers using divIcon
    const pickupIcon = L.divIcon({
      html: '<div style="background-color: #22c55e; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white;"></div>',
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });

    const dropoffIcon = L.divIcon({
      html: '<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white;"></div>',
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });

    // Initialize map
    const map = L.map(mapRef.current).setView(
      [pickup.lat, pickup.lng],
      13
    );
    mapInstanceRef.current = map;

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add pickup marker
    const pickupMarker = L.marker([pickup.lat, pickup.lng], { icon: pickupIcon }).addTo(map);
    pickupMarker.bindPopup(`<b>Pickup:</b> ${pickup.name}<br>${pickup.address}`);

    // Add dropoff marker
    const dropoffMarker = L.marker([dropoff.lat, dropoff.lng], { icon: dropoffIcon }).addTo(map);
    dropoffMarker.bindPopup(`<b>Dropoff:</b> ${dropoff.name}<br>${dropoff.address}`);

    // Draw a line between pickup and dropoff
    L.polyline([[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]], {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.7,
      dashArray: '10, 10'
    }).addTo(map);

    // Fit map bounds to both points
    const bounds = L.latLngBounds(
      [pickup.lat, pickup.lng],
      [dropoff.lat, dropoff.lng]
    );
    map.fitBounds(bounds, { padding: [50, 50] });

    // Cleanup when component unmounts
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [pickup, dropoff]);

  return (
    <div className="h-60 w-full rounded-lg overflow-hidden border border-border">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
};

export default DeliveryMap;