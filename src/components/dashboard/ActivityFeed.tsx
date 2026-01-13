"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Package as PackageIcon,
  Activity as ActivityIcon,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRecentActivity, type Activity } from "@/providers";

export function ActivityFeed() {
  const { activities, isConnected } = useRecentActivity();

  const getActivityBadge = (type: Activity["type"]) => {
    switch (type) {
      case "CreatePackage":
        return (
          <Badge className="bg-blue-600 text-white font-mono text-xs">
            CREATE
          </Badge>
        );
      case "StatusUpdated":
        return (
          <Badge variant="outline" className="font-mono text-xs">
            STATUS
          </Badge>
        );
      case "StatusUpdatedAfterPropose":
        return (
          <Badge className="bg-yellow-600 text-white font-mono text-xs">
            PROPOSE
          </Badge>
        );
      case "StatusUpdatedAfterAccept":
        return (
          <Badge className="bg-green-600 text-white font-mono text-xs">
            ACCEPT
          </Badge>
        );
      case "TransferExecuted":
        return (
          <Badge className="bg-purple-600 text-white font-mono text-xs">
            EXECUTE
          </Badge>
        );
      case "DeletePackage":
        return (
          <Badge className="bg-red-600 text-white font-mono text-xs">
            DELETE
          </Badge>
        );
      case "PackageAnnouncement":
        return (
          <Badge className="bg-indigo-600 text-white font-mono text-xs">
            ANNOUNCE
          </Badge>
        );
      case "TransferOffer":
        return (
          <Badge className="bg-amber-600 text-white font-mono text-xs">
            OFFER
          </Badge>
        );
      case "Message":
        return (
          <Badge variant="outline" className="font-mono text-xs">
            MESSAGE
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-mono text-xs">
            UNKNOWN
          </Badge>
        );
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider">
            <ActivityIcon className="h-4 w-4" />
            Recent Activity
          </div>
          {isConnected && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-xs text-muted-foreground">
                LIVE
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[450px]">
          <div className="space-y-px p-4">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ActivityIcon className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="font-mono text-sm text-foreground">
                  No activity yet
                </p>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  Activity will appear here as events occur
                </p>
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="border border-border bg-card p-3 transition-all hover:border-foreground/20 hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm font-bold">
                          {activity.title}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground mt-0.5 break-words">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {getActivityBadge(activity.type)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground pt-2 border-t border-border">
                    <Clock className="h-3 w-3" />
                    <span className="font-mono text-xs">
                      {formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
