"use client";

import { Stage, TransportTimeline } from "@/components/TransportTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "@/types/package";
import { CheckCircle2, Clock, Flag, Package as PackageIcon, Truck } from "lucide-react";
import { useMemo, useState } from "react";

interface PackageTrackingCardProps {
  packageData: Package;
  isOwner?: boolean;
  onMarkInTransit?: () => Promise<void>;
}

// Map blockchain status to stage keys
const STATUS_TO_STAGE: Record<string, string> = {
  pending: "waiting_pickup",
  ready_for_pickup: "waiting_pickup",
  picked_up: "picked_up",
  in_transit: "in_transit",
  delivered: "arrived_destination",
  succeeded: "completed",
  failed: "failed",
};

export function PackageTrackingCard({
  packageData,
  isOwner = false,
  onMarkInTransit,
}: PackageTrackingCardProps) {
  const [isMarkingInTransit, setIsMarkingInTransit] = useState(false);

  const STAGES: Stage[] = useMemo(
    () => [
      { key: "waiting_pickup", label: "Waiting for pickup", icon: Clock },
      { key: "picked_up", label: "Picked up", icon: PackageIcon },
      { key: "in_transit", label: "In transit", icon: Truck },
      { key: "arrived_destination", label: "Arrived at destination", icon: Flag },
      { key: "completed", label: "Completed", icon: CheckCircle2 },
    ],
    []
  );

  const currentStage = useMemo(() => {
    const status = packageData.status?.toLowerCase() || "pending";
    return STATUS_TO_STAGE[status] || "waiting_pickup";
  }, [packageData.status]);

  const isPickedUp = packageData.status?.toLowerCase() === "picked_up";
  const shouldShowInTransitAction = isOwner && isPickedUp && onMarkInTransit;

  const handleMarkInTransit = async (stageKey: string) => {
    if (!onMarkInTransit) return;
    setIsMarkingInTransit(true);
    try {
      await onMarkInTransit();
    } catch (error) {
      console.error("Error marking package in transit:", error);
    } finally {
      setIsMarkingInTransit(false);
    }
  };

  // Don't show tracking for failed packages
  if (packageData.status === "failed") {
    return (
      <Card className="border-border bg-card font-mono h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider">
            Package Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="rounded-full bg-destructive/10 p-4 mx-auto w-fit mb-4">
              <CheckCircle2 className="h-12 w-12 text-destructive" />
            </div>
            <p className="text-xs uppercase tracking-wider text-destructive font-semibold">
              Package Failed
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              This package delivery has failed
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show tracking if package doesn't have details
  if (!packageData.packageDetails) {
    return (
      <Card className="border-border bg-card font-mono h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider">
            Package Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <PackageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Tracking not available
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Package details haven't synced yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card font-mono h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider">
          Package Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex items-center">
        <TransportTimeline
          stages={STAGES}
          currentKey={currentStage}
          interactiveStageKey={shouldShowInTransitAction ? "in_transit" : undefined}
          onInteractiveStageClick={
            shouldShowInTransitAction ? handleMarkInTransit : undefined
          }
          isLoadingInteractive={isMarkingInTransit}
        />
      </CardContent>
    </Card>
  );
}
