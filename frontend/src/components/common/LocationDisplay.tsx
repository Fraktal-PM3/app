"use client";

import { MapPin } from "lucide-react";

export type LocationType = "pickup" | "dropoff";

interface Location {
  address: string;
  lat?: number;
  lng?: number;
}

interface LocationDisplayProps {
  type: LocationType;
  location?: Location;
  showCoordinates?: boolean;
  className?: string;
}

const LOCATION_STYLES = {
  pickup: {
    container:
      "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50",
    icon: "text-green-600 dark:text-green-400",
    title: "text-green-900 dark:text-green-100",
    address: "text-green-700 dark:text-green-300",
    coordinates: "text-green-600 dark:text-green-400",
    label: "Pickup Location",
  },
  dropoff: {
    container:
      "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/50",
    icon: "text-red-600 dark:text-red-400",
    title: "text-red-900 dark:text-red-100",
    address: "text-red-700 dark:text-red-300",
    coordinates: "text-red-600 dark:text-red-400",
    label: "Drop Location",
  },
} as const;

/**
 * LocationDisplay - Reusable component for displaying pickup/dropoff locations
 *
 * Used across the application wherever location information needs to be displayed
 * with consistent styling and color coding (green for pickup, red for dropoff).
 *
 * @example
 * ```tsx
 * <LocationDisplay
 *   type="pickup"
 *   location={packageData.packageDetails?.pickupLocation}
 *   showCoordinates
 * />
 * ```
 */
export function LocationDisplay({
  type,
  location,
  showCoordinates = false,
  className = "",
}: LocationDisplayProps) {
  const styles = LOCATION_STYLES[type];

  return (
    <div
      className={`flex items-start gap-3 rounded-md border p-3 ${styles.container} ${className}`}
    >
      <MapPin className={`mt-0.5 h-4 w-4 flex-shrink-0 ${styles.icon}`} />
      <div className="flex-1 min-w-0">
        <div
          className={`text-xs font-semibold uppercase tracking-wider ${styles.title}`}
        >
          {styles.label}
        </div>
        <div className={`mt-1 text-xs ${styles.address} break-words`}>
          {location?.address || "N/A"}
        </div>
        {showCoordinates && location?.lat && location?.lng && (
          <div className={`mt-1 text-xs ${styles.coordinates}`}>
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </div>
        )}
      </div>
    </div>
  );
}
