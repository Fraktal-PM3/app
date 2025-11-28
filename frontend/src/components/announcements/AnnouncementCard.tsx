"use client";

import { PackageAnnouncement } from "@/types/package";
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
  DollarSign,
  Building2,
} from "lucide-react";

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
    <Card className="border-border bg-card font-mono transition-all hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider">
              {announcement.packageExternalId}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            {getUrgencyBadge()}
            {offerSent ? (
              <Badge variant="outline" className="bg-blue-50 font-mono text-xs">
                OFFER SENT
              </Badge>
            ) : (
              <Badge variant="default" className="bg-green-600 font-mono text-xs">
                AVAILABLE
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price */}
        {announcement.price && (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="uppercase">Asking Price</span>
              </div>
              <div className="text-lg font-bold">{announcement.price} SEK</div>
            </div>
          </div>
        )}

        {pkg && (
          <>
            {/* Locations */}
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <MapPin className="mt-0.5 h-3 w-3 text-green-500" />
                <div className="flex-1">
                  <div className="text-muted-foreground">PICKUP</div>
                  <div className="font-semibold">
                    {pkg.pickupLocation?.address || "N/A"}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <MapPin className="mt-0.5 h-3 w-3 text-red-500" />
                <div className="flex-1">
                  <div className="text-muted-foreground">DROPOFF</div>
                  <div className="font-semibold">
                    {pkg.dropLocation?.address || "N/A"}
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
                  <div className="font-semibold">{pkg.weightKg || "N/A"} kg</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground">POSTED</div>
                  <div className="font-semibold">
                    {announcement.createdAt
                      ? format(new Date(announcement.createdAt), "MMM dd, HH:mm")
                      : "N/A"}
                  </div>
                </div>
              </div>
            </div>

            {/* Size */}
            {pkg.size && (
              <div className="text-xs">
                <div className="text-muted-foreground">SIZE (W × H × D)</div>
                <div className="font-semibold">
                  {pkg.size.width} × {pkg.size.height} × {pkg.size.depth} cm
                </div>
              </div>
            )}
          </>
        )}

        {/* Announcer Info */}
        <Separator />
        <div className="flex items-center gap-2 text-xs">
          <Building2 className="h-3 w-3 text-muted-foreground" />
          <div>
            <div className="text-muted-foreground">ANNOUNCED BY</div>
            <div className="font-semibold">{announcement.announcerMSP}</div>
          </div>
        </div>

        {/* Action Button */}
        {!offerSent && onSendOffer && (
          <>
            <Separator />
            <Button
              onClick={() => onSendOffer(announcement)}
              className="w-full font-mono text-xs uppercase"
              size="sm"
            >
              Send Transfer Offer
            </Button>
          </>
        )}

        {offerSent && (
          <>
            <Separator />
            <div className="rounded-md border border-blue-200 bg-blue-50 p-2 text-center text-xs text-blue-900">
              Your offer has been sent to the sender
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
