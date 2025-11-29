"use client";

import { PackageAnnouncement } from "@/types/package";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  Package as PackageIcon,
  Weight,
  Boxes,
  ExternalLink,
} from "lucide-react";
import { LocationDisplay } from "@/components/common/LocationDisplay";
import Link from "next/link";

interface AnnouncementCardProps {
  announcement: PackageAnnouncement;
  onSendOffer?: (announcement: PackageAnnouncement) => void;
  offerSent?: boolean;
}

export function AnnouncementCard({
  announcement,
  onSendOffer,
  offerSent = false,
}: AnnouncementCardProps) {
  const pkg = announcement.packageDetails;

  const getUrgencyBadge = () => {
    if (!pkg?.urgency) return null;

    const urgency = pkg.urgency;
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

  return (
    <Card className="border-border bg-card font-mono transition-all hover:border-primary/50 h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <PackageIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider truncate">
              {announcement.packageExternalId}
            </CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            {getUrgencyBadge()}
            {offerSent ? (
              <Badge variant="outline" className="bg-blue-50 font-mono text-xs whitespace-nowrap">
                OFFER SENT
              </Badge>
            ) : (
              <Badge variant="default" className="bg-green-600 font-mono text-xs whitespace-nowrap">
                AVAILABLE
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 flex flex-col">
        {pkg && (
          <>
            {/* Price */}
            {announcement.price && (
              <div className="rounded-md bg-muted/30 p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Suggested Price
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {announcement.price} kr
                </div>
              </div>
            )}

            {/* Locations */}
            <div className="space-y-3">
              <LocationDisplay type="pickup" location={pkg.pickupLocation} />
              <LocationDisplay type="dropoff" location={pkg.dropLocation} />
            </div>

            <Separator />

            {/* Package Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Weight className="h-3 w-3 flex-shrink-0" />
                  <span className="uppercase tracking-wider">Weight</span>
                </div>
                <div className="text-lg font-bold">
                  {pkg.weightKg || "N/A"} kg
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Boxes className="h-3 w-3 flex-shrink-0" />
                  <span className="uppercase tracking-wider">Size</span>
                </div>
                <div className="text-sm font-semibold">
                  {pkg.size
                    ? `${pkg.size.width} × ${pkg.size.height} × ${pkg.size.depth} cm`
                    : "N/A"}
                </div>
              </div>
            </div>

            <Separator />

            {/* Metadata */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground uppercase tracking-wider flex-shrink-0">
                  Posted
                </span>
                <span className="font-semibold text-right">
                  {announcement.createdAt
                    ? format(new Date(announcement.createdAt), "MMM dd, yyyy HH:mm")
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground uppercase tracking-wider flex-shrink-0">
                  Announced By
                </span>
                <span className="font-mono font-semibold text-right break-all">
                  {announcement.announcerMSP}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons - pushed to bottom */}
        <div className="mt-auto space-y-3">
          <Separator />

          {/* View Details Button */}
          <Link href={`/offers/${announcement._id}`} className="block">
            <Button
              variant="outline"
              className="w-full font-mono text-xs uppercase"
              size="sm"
            >
              <ExternalLink className="mr-2 h-3 w-3" />
              View Details
            </Button>
          </Link>

          {/* Send Offer Button */}
          {!offerSent && onSendOffer && (
            <Button
              onClick={() => onSendOffer(announcement)}
              className="w-full font-mono text-xs uppercase"
              size="sm"
            >
              Send Transfer Offer
            </Button>
          )}

          {offerSent && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-center text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
              Your offer has been sent to the sender
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
