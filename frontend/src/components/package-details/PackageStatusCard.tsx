"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "@/types/package";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

interface PackageStatusCardProps {
  packageData: Package;
}

export function PackageStatusCard({ packageData }: PackageStatusCardProps) {
  const getStatusBadge = (status: string, active?: string) => {
    if (status === "succeeded" || active === "false") {
      return (
        <Badge variant="outline" className="font-mono text-xs">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          COMPLETED
        </Badge>
      );
    }

    if (status === "failed") {
      return (
        <Badge variant="destructive" className="font-mono text-xs">
          <XCircle className="mr-1 h-3 w-3" />
          FAILED
        </Badge>
      );
    }

    if (active === "true") {
      return (
        <Badge variant="default" className="font-mono text-xs">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ACTIVE
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="font-mono text-xs">
        {status?.toUpperCase() || "PENDING"}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency?: string) => {
    if (!urgency) return null;

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
    <Card className="border-border bg-card font-mono">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider">
          Status Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Current Status
          </span>
          {getStatusBadge(packageData.status, packageData.active)}
        </div>

        {packageData.packageDetails?.urgency && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Urgency
            </span>
            {getUrgencyBadge(packageData.packageDetails.urgency)}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Active
          </span>
          <span className="font-semibold">
            {packageData.active === "true" ? "Yes" : "No"}
          </span>
        </div>

        {packageData.termsId && packageData.termsId !== "null" && (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Terms ID
            </span>
            <span className="font-mono text-xs font-semibold break-all">
              {packageData.termsId}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
