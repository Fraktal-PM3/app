'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

    const pickupIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/8589/8589319.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });

    const dropoffIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/484/484167.png', // example: a valid red marker icon
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
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

    // Fit map bounds to both points
    const bounds = L.latLngBounds(
      [pickup.lat, pickup.lng],
      [dropoff.lat, dropoff.lng]
    );
    map.fitBounds(bounds, { padding: [50, 50] });

    // Cleanup when component unmounts
    return () => {
      map.remove();
    };
  }, [pickup, dropoff]);

  return (
    <div className="h-60 w-full rounded-lg overflow-hidden border border-border">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
};

export default DeliveryMap;
