"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageAnnouncement } from "@/types/package";
import { format } from "date-fns";
import { Package as PackageIcon } from "lucide-react";

interface PackageAnnouncementsTabProps {
  announcements: PackageAnnouncement[];
}

export function PackageAnnouncementsTab({
  announcements,
}: PackageAnnouncementsTabProps) {
  return (
    <Card className="border-border bg-card font-mono">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider">
          Package Announcements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <div className="py-12 text-center">
            <PackageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              No announcements yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div
                key={announcement._id}
                className="rounded-md border border-border bg-muted/20 p-4"
              >
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="font-mono text-xs font-semibold break-all">
                      {announcement.messageId}
                    </div>
                    {announcement.createdAt && (
                      <div className="text-xs text-muted-foreground">
                        {format(
                          new Date(announcement.createdAt),
                          "MMM dd, yyyy HH:mm"
                        )}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={announcement.isActive ? "default" : "outline"}
                    className="font-mono text-xs w-fit"
                  >
                    {announcement.isActive ? "ACTIVE" : "INACTIVE"}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-muted-foreground uppercase tracking-wider">
                      Announcer MSP
                    </span>
                    <span className="font-semibold break-words">
                      {announcement.announcerMSP}
                    </span>
                  </div>
                  {announcement.price && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-muted-foreground uppercase tracking-wider">
                        Price
                      </span>
                      <span className="font-bold">{announcement.price} kr</span>
                    </div>
                  )}
                  {announcement.expiresAt && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-muted-foreground uppercase tracking-wider">
                        Expires
                      </span>
                      <span className="font-semibold">
                        {format(
                          new Date(announcement.expiresAt),
                          "MMM dd, yyyy HH:mm"
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
