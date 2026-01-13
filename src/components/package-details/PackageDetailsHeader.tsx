"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Status } from "@/types/package";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Megaphone,
  Package as PackageIcon,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface PackageDetailsHeaderProps {
  packageData: Package;
  isConnected: boolean;
  isSender: boolean;
  isOwner: boolean;
  hasActiveAnnouncement?: boolean;
}

export function PackageDetailsHeader({
  packageData,
  isConnected,
  isSender,
  isOwner,
  hasActiveAnnouncement = false,
}: PackageDetailsHeaderProps) {
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [announceError, setAnnounceError] = useState<string | null>(null);
  const [announceSuccess, setAnnounceSuccess] = useState(false);
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [price, setPrice] = useState<string>("");

  const handleOpenAnnounceDialog = () => {
    setPrice("");
    setAnnounceError(null);
    setShowPriceDialog(true);
  };

  const handleAnnounce = async () => {
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      setAnnounceError("Please enter a valid price greater than 0");
      return;
    }

    try {
      setIsAnnouncing(true);
      setAnnounceError(null);

      const response = await fetch("/api/announcements/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId: packageData.id,
          price: priceValue,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to announce package");
      }

      setShowPriceDialog(false);
      setPrice("");
      setAnnounceSuccess(true);
      setTimeout(() => setAnnounceSuccess(false), 3000);
    } catch (error) {
      console.error("Error announcing package:", error);
      setAnnounceError(
        error instanceof Error ? error.message : "Failed to announce package",
      );
    } finally {
      setIsAnnouncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "succeeded") {
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

    // Active statuses: proposed, ready_for_pickup, picked_up, in_transit, delivered
    if (["proposed", "ready_for_pickup", "picked_up", "in_transit", "delivered"].includes(status)) {
      return (
        <Badge variant="default" className="font-mono text-xs">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          {status?.toUpperCase() || "ACTIVE"}
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
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
      <Link
        href="/packages"
        className="mb-4 inline-flex items-center font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Packages
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <PackageIcon className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            <h1 className="font-mono text-2xl md:text-3xl font-bold uppercase tracking-tight">
              {packageData.name || "Unnamed Package"}
            </h1>
          </div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground break-all">
            Package ID: {packageData.id || packageData._id}
          </p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <div className="flex flex-wrap gap-2">
            {getUrgencyBadge(packageData.packageDetails?.urgency)}
            {getStatusBadge(packageData.status)}
            {isConnected && (
              <Badge variant="outline" className="font-mono text-xs">
                <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-green-500" />
                LIVE
              </Badge>
            )}
          </div>
          {isSender &&
            isOwner &&
            packageData.status !== Status.DELIVERED &&
            !hasActiveAnnouncement &&
            packageData.packageDetails && (
              <div className="flex flex-col gap-1">
                <Button
                  onClick={handleOpenAnnounceDialog}
                  disabled={
                    announceSuccess ||
                    packageData.status === "succeeded" ||
                    packageData.status === "failed"
                  }
                  size="sm"
                  variant={hasActiveAnnouncement ? "outline" : "default"}
                  className="font-mono text-xs uppercase"
                >
                  {announceSuccess ? (
                    <>
                      <CheckCircle2 className="mr-2 h-3 w-3" />
                      Announced!
                    </>
                  ) : hasActiveAnnouncement ? (
                    <>
                      <CheckCircle2 className="mr-2 h-3 w-3" />
                      Already Announced
                    </>
                  ) : (
                    <>
                      <Megaphone className="mr-2 h-3 w-3" />
                      Announce Package
                    </>
                  )}
                </Button>
              </div>
            )}
        </div>
      </div>

      {/* Price Dialog */}
      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent className="font-mono sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wider">
              Announce Package
            </DialogTitle>
            <DialogDescription className="text-xs">
              Broadcast this package to all transporters with your suggested
              price
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="announce-price"
                className="text-xs uppercase tracking-wider"
              >
                Suggested Price (SEK)
              </Label>
              <Input
                id="announce-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter price..."
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={isAnnouncing}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                This price will be visible to all transporters
              </p>
            </div>

            {announceError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                <p className="text-xs text-destructive">{announceError}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPriceDialog(false)}
              disabled={isAnnouncing}
              className="font-mono text-xs uppercase"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAnnounce}
              disabled={isAnnouncing}
              className="font-mono text-xs uppercase"
            >
              {isAnnouncing ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                "Broadcast Announcement"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
