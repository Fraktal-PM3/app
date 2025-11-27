"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Package as PackageIcon,
  MapPin,
  Clock,
  Activity,
  Circle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Package } from "@/types/package";
import { Status } from "@/types/package";

type ActivityFeedProps = {
  packages: Package[];
};

export function ActivityFeed({ packages }: ActivityFeedProps) {
  const recentPackages = [...packages]
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0);
      const dateB = new Date(b.updatedAt || b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 10);

  const getStatusBadge = (active?: string) => {
    switch (active) {
      case "true":
        return (
          <Badge className="bg-foreground text-background font-mono text-xs">
            ACTIVE
          </Badge>
        );
      case Status.PENDING:
        return (
          <Badge variant="outline" className="font-mono text-xs">
            PENDING
          </Badge>
        );
      case Status.READY_FOR_PICKUP:
        return (
          <Badge className="bg-foreground text-background font-mono text-xs">
            READY
          </Badge>
        );
      case Status.PICKED_UP:
        return (
          <Badge variant="outline" className="font-mono text-xs">
            PICKED UP
          </Badge>
        );
      case Status.IN_TRANSIT:
        return (
          <Badge className="bg-foreground text-background font-mono text-xs">
            IN TRANSIT
          </Badge>
        );
      case Status.DELIVERED:
      case Status.SUCCEEDED:
      case "false":
        return (
          <Badge
            variant="outline"
            className="border-muted-foreground/30 text-muted-foreground font-mono text-xs"
          >
            DONE
          </Badge>
        );
      case Status.FAILED:
        return (
          <Badge className="bg-red-600 text-background font-mono text-xs">
            FAILED
          </Badge>
        );
      case Status.PROPOSED:
        return (
          <Badge variant="outline" className="font-mono text-xs">
            PROPOSED
          </Badge>
        );
      default: {
        const label = String(active ?? "unknown").toUpperCase();
        return (
          <Badge variant="outline" className="font-mono text-xs">
            {label}
          </Badge>
        );
      }
    }
  };

  const getUrgencyIndicator = (urgency?: string) => {
    if (urgency === "high") {
      return <Circle className="h-2 w-2 fill-foreground" />;
    }
    return null;
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[450px]">
          <div className="space-y-px p-4">
            {recentPackages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <PackageIcon className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="font-mono text-sm text-foreground">
                  No packages yet
                </p>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  Create your first package to get started
                </p>
              </div>
            ) : (
              recentPackages.map((pkg) => (
                <div
                  key={String(pkg._id)}
                  className="border border-border bg-card p-3 transition-all hover:border-foreground/20 hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <PackageIcon className="h-3 w-3 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm font-bold break-all">
                          {pkg.packageID}
                        </p>
                        {pkg.price && pkg.price > 0 && (
                          <p className="font-mono text-xs text-muted-foreground">
                            {pkg.price.toLocaleString()} kr
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {pkg.packageDetails?.urgency &&
                        getUrgencyIndicator(pkg.packageDetails.urgency)}
                      {getStatusBadge(pkg.active)}
                    </div>
                  </div>

                  {pkg.packageDetails && (
                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="truncate">
                            {pkg.packageDetails.pickupLocation.address}
                          </div>
                          <div className="flex items-center gap-1">
                            <span>→</span>
                            <div className="truncate">
                              {pkg.packageDetails.dropLocation.address}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground pt-1 border-t border-border">
                        <Clock className="h-3 w-3" />
                        <span>
                          {pkg.updatedAt
                            ? formatDistanceToNow(new Date(pkg.updatedAt), {
                                addSuffix: true,
                              })
                            : pkg.createdAt
                              ? formatDistanceToNow(new Date(pkg.createdAt), {
                                  addSuffix: true,
                                })
                              : "Unknown"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
