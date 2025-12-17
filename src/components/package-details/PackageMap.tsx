"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "@/types/package";
import { MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface PackageMapProps {
  packageData: Package;
}

export function PackageMap({ packageData }: PackageMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const hasDetails = !!packageData.packageDetails;
  const hasLocations =
    hasDetails &&
    packageData.packageDetails?.pickupLocation?.lat !== undefined &&
    packageData.packageDetails?.dropLocation?.lat !== undefined;

  useEffect(() => {
    if (!mapRef.current || !hasLocations) return;

    // Prevent reinitializing the map on every re-render
    if (mapInstanceRef.current) return;

    const pickup = packageData.packageDetails!.pickupLocation;
    const dropoff = packageData.packageDetails!.dropLocation;

    // Create custom colored markers using divIcon (bright colors for dark mode)
    const pickupIcon = L.divIcon({
      html: '<div style="background-color: #10b981; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid #1f2937; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
      className: "",
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });

    const dropoffIcon = L.divIcon({
      html: '<div style="background-color: #f87171; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid #1f2937; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
      className: "",
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });

    // Initialize map
    const map = L.map(mapRef.current).setView([pickup.lat!, pickup.lng!], 13);
    mapInstanceRef.current = map;

    // Add dark mode map tiles (CartoDB Dark Matter)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    // Add pickup marker
    const pickupMarker = L.marker([pickup.lat!, pickup.lng!], {
      icon: pickupIcon,
    }).addTo(map);
    pickupMarker.bindPopup(
      `<div class="font-mono"><b>Pickup</b><br/>${pickup.address}</div>`
    );

    // Add dropoff marker
    const dropoffMarker = L.marker([dropoff.lat!, dropoff.lng!], {
      icon: dropoffIcon,
    }).addTo(map);
    dropoffMarker.bindPopup(
      `<div class="font-mono"><b>Dropoff</b><br/>${dropoff.address}</div>`
    );

    // Draw a line between pickup and dropoff (brighter for dark mode)
    L.polyline(
      [
        [pickup.lat!, pickup.lng!],
        [dropoff.lat!, dropoff.lng!],
      ],
      {
        color: "#60a5fa",
        weight: 3,
        opacity: 0.8,
        dashArray: "10, 10",
      }
    ).addTo(map);

    // Fit map bounds to both points
    const bounds = L.latLngBounds(
      [pickup.lat!, pickup.lng!],
      [dropoff.lat!, dropoff.lng!]
    );
    map.fitBounds(bounds, { padding: [50, 50] });

    // Handle window resize and orientation changes for mobile
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    // Check if we're in the browser before accessing window
    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      window.addEventListener("orientationchange", handleResize);

      // Invalidate size after a short delay to ensure proper rendering on mobile
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
    }

    // Cleanup when component unmounts
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("orientationchange", handleResize);
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [packageData, hasLocations]);

  return (
    <Card className="border-border bg-card font-mono h-full flex flex-col min-h-[400px]">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider">
          Delivery Route
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        {!hasDetails && (
          <div className="flex flex-1 min-h-[300px] items-center justify-center rounded-lg border border-border bg-muted/20">
            <div className="text-center">
              <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Location data unavailable
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Package details haven't synced yet
              </p>
            </div>
          </div>
        )}

        {hasDetails && !hasLocations && (
          <div className="flex flex-1 min-h-[300px] items-center justify-center rounded-lg border border-border bg-muted/20">
            <div className="text-center">
              <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Coordinates missing
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Location coordinates not provided
              </p>
            </div>
          </div>
        )}

        {hasLocations && (
          <div className="flex-1 min-h-[300px] w-full overflow-hidden rounded-lg border border-border relative z-0">
            <div ref={mapRef} className="h-full w-full min-h-[300px]" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
