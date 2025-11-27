"use client";

import { useState } from "react";
import { PackageAnnouncement } from "@/hooks/usePackageAnnouncements";
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
import { Badge } from "@/components/ui/badge";

interface TransferOfferModalProps {
  announcement: PackageAnnouncement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TransferOfferModal({
  announcement,
  open,
  onOpenChange,
  onSuccess,
}: TransferOfferModalProps) {
  const [offerPrice, setOfferPrice] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const priceValue = parseFloat(offerPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      setError("Please enter a valid price greater than 0");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Send private message with transfer offer
      const response = await fetch(
        `/api/packages/${announcement.packageExternalId}/privateMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            price: priceValue,
            message: message || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send transfer offer");
      }

      // Success - close modal and notify parent
      onOpenChange(false);
      setOfferPrice("");
      setMessage("");
      onSuccess?.();
    } catch (err) {
      console.error("Error sending transfer offer:", err);
      setError(
        err instanceof Error ? err.message : "Failed to send transfer offer"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setOfferPrice("");
    setMessage("");
    setError(null);
    onOpenChange(false);
  };

  const pkg = announcement.packageDetails;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-mono sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wider">
            Send Transfer Offer
          </DialogTitle>
          <DialogDescription className="text-xs">
            Submit your price offer to the package sender
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Package Preview */}
          <div className="rounded-md border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Package Details
              </h4>
              {announcement.price && (
                <Badge variant="outline" className="font-mono text-xs">
                  Asking: {announcement.price} SEK
                </Badge>
              )}
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Package ID:</span>
                <span className="font-semibold">
                  {announcement.packageExternalId}
                </span>
              </div>
              {pkg && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">From:</span>
                    <span className="max-w-[250px] truncate">
                      {pkg.pickupLocation?.address || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">To:</span>
                    <span className="max-w-[250px] truncate">
                      {pkg.dropLocation?.address || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Urgency:</span>
                    <span className="uppercase">{pkg.urgency || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weight:</span>
                    <span>{pkg.weightKg || "N/A"} kg</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Announced by:</span>
                <span className="font-semibold">{announcement.announcerMSP}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Offer Price Input */}
          <div className="space-y-2">
            <Label htmlFor="offerPrice" className="text-xs uppercase tracking-wider">
              Your Offer Price (SEK)
            </Label>
            <Input
              id="offerPrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter your price..."
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              disabled={isSubmitting}
              className="font-mono"
            />
            {announcement.price && (
              <p className="text-xs text-muted-foreground">
                Asking price: {announcement.price} SEK
              </p>
            )}
          </div>

          {/* Optional Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-xs uppercase tracking-wider">
              Message (Optional)
            </Label>
            <Input
              id="message"
              type="text"
              placeholder="Add a note to your offer..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
              className="font-mono"
            />
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
            {isSubmitting ? "Sending..." : "Send Offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
