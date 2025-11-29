"use client";

import { useState } from "react";
import { Package } from "@/types/package";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface AnnouncementModalProps {
  package: Package;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AnnouncementModal({
  package: pkg,
  open,
  onOpenChange,
  onSuccess,
}: AnnouncementModalProps) {
  const [price, setPrice] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      setError("Please enter a valid price greater than 0");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Call the API to create announcement
      const response = await fetch("/api/announcements/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId: pkg.id,
          price: priceValue,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create announcement");
      }

      // Success - close modal and notify parent
      onOpenChange(false);
      setPrice("");
      onSuccess?.();
    } catch (err) {
      console.error("Error creating announcement:", err);
      setError(err instanceof Error ? err.message : "Failed to create announcement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setPrice("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-mono sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wider">
            Announce Package
          </DialogTitle>
          <DialogDescription className="text-xs">
            Broadcast this package to all transporters with your suggested price
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Package Preview */}
          <div className="rounded-md border border-border bg-card p-4">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Package Details
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Package ID:</span>
                <span className="font-semibold">{pkg.id}</span>
              </div>
              {pkg.packageDetails && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">From:</span>
                    <span className="truncate max-w-[250px]">
                      {pkg.packageDetails.pickupLocation.address}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">To:</span>
                    <span className="truncate max-w-[250px]">
                      {pkg.packageDetails.dropLocation.address}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Urgency:</span>
                    <span className="uppercase">{pkg.packageDetails.urgency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weight:</span>
                    <span>{pkg.packageDetails.weightKg} kg</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Price Input */}
          <div className="space-y-2">
            <Label htmlFor="price" className="text-xs uppercase tracking-wider">
              Suggested Price (SEK)
            </Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter price..."
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isSubmitting}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              This price will be visible to all transporters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="font-mono text-xs uppercase"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="font-mono text-xs uppercase"
          >
            {isSubmitting ? "Broadcasting..." : "Broadcast Announcement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
