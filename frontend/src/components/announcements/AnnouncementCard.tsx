"use client";

import { LocationDisplay } from "@/components/common/LocationDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PackageAnnouncement, TransferOffer } from "@/types/package";
import { format } from "date-fns";
import {
  Boxes,
  Calendar,
  DollarSign,
  ExternalLink,
  Package as PackageIcon,
  Weight,
} from "lucide-react";
import Link from "next/link";

interface AnnouncementCardProps {
  announcement: PackageAnnouncement;
  onSendOffer?: (announcement: PackageAnnouncement) => void;
  userOffers?: TransferOffer[];
}

export function AnnouncementCard({
  announcement,
  onSendOffer,
  userOffers = [],
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

  const isAccepted = announcement.transferStatus === 'accepted';

  const isAccepted = announcement.transferStatus === 'accepted';

  return (
    <Card className={`font-mono transition-all hover:border-primary/50 h-full flex flex-col ${
      isAccepted 
        ? 'border-green-500 dark:border-green-600 border-2 bg-green-50 dark:bg-green-950/30' 
        : 'border-border bg-card'
    }`}>
    <Card className={`font-mono transition-all hover:border-primary/50 h-full flex flex-col ${
      isAccepted 
        ? 'border-green-500 dark:border-green-600 border-2 bg-green-50 dark:bg-green-950/30' 
        : 'border-border bg-card'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-1">
            <PackageIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <CardTitle className="text-sm font-bold uppercase truncate">
              {announcement.packageExternalId}
            </CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            {getUrgencyBadge()}
            {isAccepted ? (
              <Badge variant="default" className="bg-green-600 font-mono text-xs whitespace-nowrap">
                ACCEPTED
              </Badge>
            ) : userOffers.length > 0 ? (
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 font-mono text-xs whitespace-nowrap">
                {userOffers.length} OFFER{userOffers.length > 1 ? 'S' : ''} SENT
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

          {/* Send Offer Button - Always show */}
          {onSendOffer && (
            <Button
              onClick={() => onSendOffer(announcement)}
              className="w-full font-mono text-xs uppercase"
              size="sm"
              disabled={userOffers.length >= 1}
            >
              {userOffers.length > 0 ? 'Send Another Offer' : 'Send Transfer Offer'}
            </Button>
          )}

          {/* User's Offers Log */}
          {userOffers.length > 0 && (
            <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
              <div className="text-center text-xs font-bold uppercase text-blue-900 dark:text-blue-200">
                Your Offer{userOffers.length > 1 ? 's' : ''} ({userOffers.length})
              </div>
              <Separator className="bg-blue-200 dark:bg-blue-800" />
              <div className="max-h-[200px] space-y-3 overflow-y-auto">
                {userOffers.map((offer, index) => (
                  <div
                    key={offer._id}
                    className="space-y-2 rounded-md bg-blue-100 dark:bg-blue-900/50 p-2"
                  >
                    {userOffers.length > 1 && (
                      <div className="text-xs font-bold text-blue-700 dark:text-blue-400">
                        Offer #{userOffers.length - index}
                        {index === 0 && (
                          <span className="ml-2 text-blue-600 dark:text-blue-300">(Latest)</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-700 dark:text-blue-400 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Price:
                      </span>
                      <span className="font-bold text-blue-900 dark:text-blue-100">
                        {offer.price} kr
                      </span>
                    </div>
                    {offer.expiryISO && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-blue-700 dark:text-blue-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Delivery:
                        </span>
                        <span className="font-semibold text-blue-900 dark:text-blue-100">
                          {format(new Date(offer.expiryISO), "MMM dd, HH:mm")}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      Sent: {format(new Date(offer.createdISO || offer.createdAt || new Date()), "MMM dd, HH:mm")}
                    </div>
                  </div>
                ))}
              </div>
              {announcement.price && (
                <div className="pt-1 text-center text-xs text-blue-700 dark:text-blue-400">
                  (Asking: {announcement.price} kr)
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
