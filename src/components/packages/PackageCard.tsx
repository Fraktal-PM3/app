"use client";

import { Package, Status } from "@/types/package";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  MapPin,
  Package as PackageIcon,
  Clock,
  Weight,
  CheckCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { confirmPackageReceipt } from "@/app/packages/[id]/actions";

interface PackageCardProps {
  package: Package;
  isAnnounced?: boolean;
  onAnnounce?: (pkg: Package) => void;
  showReceiptButton?: boolean;
}

export function PackageCard({
  package: pkg,
  isAnnounced = false,
  onAnnounce,
  showReceiptButton = false,
}: PackageCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirmReceipt = async () => {
    if (!pkg.id || !pkg.termsId) {
      toast.error("Missing package or transfer information");
      return;
    }

    setIsConfirming(true);
    const loadingToast = toast.loading("Confirming package receipt...");

    try {
      const result = await confirmPackageReceipt(pkg.id);

      if (result.success) {
        toast.success("Package receipt confirmed!", { id: loadingToast });
      } else {
        toast.error(result.error || "Failed to confirm receipt", {
          id: loadingToast,
        });
      }
    } catch (error) {
      toast.error("An error occurred", { id: loadingToast });
    } finally {
      setIsConfirming(false);
    }
  };

  const getStatusBadge = () => {
    if (isAnnounced) {
      return (
        <Badge variant="default" className="bg-green-600 font-mono text-xs">
          ANNOUNCED
        </Badge>
      );
    }

    if (pkg.status === "succeeded" || pkg.active === "false") {
      return (
        <Badge variant="outline" className="font-mono text-xs">
          COMPLETED
        </Badge>
      );
    }

    if (pkg.active === "true") {
      return (
        <Badge variant="default" className="font-mono text-xs">
          ACTIVE
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="font-mono text-xs">
        {pkg.status?.toUpperCase() || "PENDING"}
      </Badge>
    );
  };

  const getUrgencyBadge = () => {
    if (!pkg.packageDetails) return null;

    const urgency = pkg.packageDetails.urgency;
    const variant =
      urgency === "high"
        ? "destructive"
        : urgency === "medium"
          ? "default"
          : "secondary";

    return (
      <Badge variant={variant} className="font-mono text-xs">
        {urgency.toUpperCase()}
      </Badge>
    );
  };

  // Check if package has details
  const hasDetails = !!pkg.packageDetails;

  return (
    <Card className="border-border bg-card font-mono transition-all hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider">
              {pkg.name || "Unnamed Package"}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            {getUrgencyBadge()}
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasDetails && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900">
            <p className="font-semibold">⚠️ Package details not available</p>
            <p className="mt-1 text-yellow-700">
              This package was created on the blockchain but details haven't
              synced yet.
            </p>
          </div>
        )}

        {hasDetails && (
          <>
            {/* Locations */}
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <MapPin className="mt-0.5 h-3 w-3 text-green-500" />
                <div className="flex-1">
                  <div className="text-muted-foreground">PICKUP</div>
                  <div className="font-semibold">
                    {pkg.packageDetails?.pickupLocation.address}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <MapPin className="mt-0.5 h-3 w-3 text-red-500" />
                <div className="flex-1">
                  <div className="text-muted-foreground">DROPOFF</div>
                  <div className="font-semibold">
                    {pkg.packageDetails?.dropLocation.address}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Package Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Weight className="h-3 w-3 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground">WEIGHT</div>
                  <div className="font-semibold">
                    {pkg.packageDetails?.weightKg} kg
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground">CREATED</div>
                  <div className="font-semibold">
                    {pkg.createdAt
                      ? format(new Date(pkg.createdAt), "MMM dd, HH:mm")
                      : "N/A"}
                  </div>
                </div>
              </div>
            </div>

            {/* Size */}
            <div className="text-xs">
              <div className="text-muted-foreground">SIZE (W × H × D)</div>
              <div className="font-semibold">
                {pkg.packageDetails?.size.width} ×{" "}
                {pkg.packageDetails?.size.height} ×{" "}
                {pkg.packageDetails?.size.depth} cm
              </div>
            </div>
          </>
        )}

        {/* Action Button */}
        {!isAnnounced &&
          hasDetails &&
          pkg.active === "true" &&
          pkg.status !== Status.SUCCEEDED &&
          onAnnounce && (
            <>
              <Separator />
              <Button
                onClick={() => onAnnounce(pkg)}
                className="w-full font-mono text-xs uppercase"
                size="sm"
              >
                Announce Package
              </Button>
            </>
          )}
        {/* Confirm Receipt Button (for receivers) */}
        {showReceiptButton && (
          <>
            <Separator />
            <Button
              onClick={handleConfirmReceipt}
              disabled={isConfirming}
              className="w-full font-mono text-xs uppercase bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <CheckCircle className="mr-2 h-3 w-3" />
              {isConfirming ? "Confirming..." : "Confirm Receipt"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
