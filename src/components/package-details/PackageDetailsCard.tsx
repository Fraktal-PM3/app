"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Package } from "@/types/package";
import { format } from "date-fns";
import { Ruler, Weight } from "lucide-react";
import { LocationDisplay } from "@/components/common/LocationDisplay";

interface PackageDetailsCardProps {
  packageData: Package;
}

export function PackageDetailsCard({ packageData }: PackageDetailsCardProps) {
  const hasDetails = !!packageData.packageDetails;

  return (
    <Card className="border-border bg-card font-mono h-full w-full">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider">
          Package Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasDetails && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
            <p className="font-semibold">⚠️ Details not available</p>
            <p className="mt-1 text-yellow-700 dark:text-yellow-300">
              Package details haven't synced yet.
            </p>
          </div>
        )}

        {hasDetails && (
          <>
            {/* Locations */}
            <div className="space-y-3">
              <LocationDisplay
                type="pickup"
                location={packageData.packageDetails?.pickupLocation}
                showCoordinates
              />
              <LocationDisplay
                type="dropoff"
                location={packageData.packageDetails?.dropLocation}
                showCoordinates
              />
            </div>

            <Separator />

            {/* Dimensions & Weight */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Weight className="h-3 w-3 flex-shrink-0" />
                  <span className="uppercase tracking-wider">Weight</span>
                </div>
                <div className="text-lg font-bold">
                  {packageData.packageDetails?.weightKg} kg
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Ruler className="h-3 w-3 flex-shrink-0" />
                  <span className="uppercase tracking-wider">
                    Size (W x H x D)
                  </span>
                </div>
                <div className="text-sm font-semibold">
                  {packageData.packageDetails?.size.width} x{" "}
                  {packageData.packageDetails?.size.height} x{" "}
                  {packageData.packageDetails?.size.depth} cm
                </div>
              </div>
            </div>

            <Separator />

            {/* Price */}
            {packageData.price && (
              <div className="rounded-md bg-muted/30 p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Price
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {packageData.price} kr
                </div>
              </div>
            )}
          </>
        )}

        {/* Metadata */}
        <Separator />
        <div className="space-y-2 text-xs">
          {packageData.createdAt && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground uppercase tracking-wider">
                Created
              </span>
              <span className="font-semibold text-right">
                {format(new Date(packageData.createdAt), "MMM dd, yyyy HH:mm")}
              </span>
            </div>
          )}
          {packageData.updatedAt && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground uppercase tracking-wider">
                Updated
              </span>
              <span className="font-semibold text-right">
                {format(new Date(packageData.updatedAt), "MMM dd, yyyy HH:mm")}
              </span>
            </div>
          )}
          {packageData.mspId && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground uppercase tracking-wider flex-shrink-0">
                MSP ID
              </span>
              <span className="font-mono font-semibold text-right break-all">
                {packageData.mspId}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
