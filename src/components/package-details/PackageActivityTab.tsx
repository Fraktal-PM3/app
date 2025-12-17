"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "@/providers/MessageProvider";
import { format } from "date-fns";
import { Calendar, Clock } from "lucide-react";

interface PackageActivityTabProps {
  activities: Activity[];
}

export function PackageActivityTab({ activities }: PackageActivityTabProps) {
  return (
    <Card className="border-border bg-card font-mono">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              No activity yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex gap-3 border-l-2 border-primary/50 pl-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold break-words">
                      {activity.title}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {activity.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground break-words">
                    {activity.description}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    <span className="break-all">
                      {format(
                        new Date(activity.timestamp),
                        "MMM dd, yyyy HH:mm:ss"
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
