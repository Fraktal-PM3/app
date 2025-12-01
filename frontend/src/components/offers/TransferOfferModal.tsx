"use client";

import { getCurrentMspId } from "@/app/offers/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  PackageAnnouncement,
  TransferOfferSchema
} from "@/types/package";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

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
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  const [deliveryTime, setDeliveryTime] = useState<string>("12:00");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const priceValue = parseFloat(offerPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      setError("Please enter a valid price greater than 0");
      return;
    }

    if (!deliveryDate) {
      setError("Please select a delivery date and time");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Combine date and time into ISO string
      const [hours, minutes] = deliveryTime.split(":");
      const deliveryDateTime = new Date(deliveryDate);
      deliveryDateTime.setHours(
        parseInt(hours, 10),
        parseInt(minutes, 10),
        0,
        0,
      );
      const deliveryDateTimeISO = deliveryDateTime.toISOString();

      const transferOffer = TransferOfferSchema.parse({
        externalPackageId: announcement.packageExternalId,
        price: priceValue,
        fromMSP: announcement.announcerMSP, // Assuming sender and announcer are the same for this example
        toMSP: await getCurrentMspId(), // Function to get current user's MSP ID
        createdISO: new Date().toISOString(),
        expiryISO: deliveryDateTimeISO,
      });

      // Send private message with transfer offer
      const response = await fetch(
        `/api/packages/${announcement.packageExternalId}/privateMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transferOffer),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send transfer offer");
      }

      // Success - close modal and notify parent
      onOpenChange(false);
      setOfferPrice("");
      setDeliveryDate(undefined);
      setDeliveryTime("12:00");
      onSuccess?.();
    } catch (err) {
      console.error("Error sending transfer offer:", err);
      setError(
        err instanceof Error ? err.message : "Failed to send transfer offer",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setOfferPrice("");
    setDeliveryDate(undefined);
    setDeliveryTime("12:00");
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
                <span className="font-semibold">
                  {announcement.announcerMSP}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Offer Price Input */}
          <div className="space-y-2">
            <Label
              htmlFor="offerPrice"
              className="text-xs uppercase tracking-wider"
            >
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

          {/* Delivery Date & Time Picker */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider">
              Proposed Delivery Date & Time
            </Label>
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label
                  htmlFor="date-picker"
                  className="text-xs text-muted-foreground"
                >
                  Date
                </Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="date-picker"
                      disabled={isSubmitting}
                      className="w-full justify-between font-mono text-xs"
                    >
                      {deliveryDate ? (
                        deliveryDate.toLocaleDateString()
                      ) : (
                        <span className="text-muted-foreground">
                          Select date
                        </span>
                      )}
                      <CalendarIcon className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deliveryDate}
                      onSelect={(date) => {
                        setDeliveryDate(date);
                        setDatePickerOpen(false);
                      }}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1 space-y-2">
                <Label
                  htmlFor="time-picker"
                  className="text-xs text-muted-foreground"
                >
                  Time
                </Label>
                <Input
                  type="time"
                  id="time-picker"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  disabled={isSubmitting}
                  className="font-mono"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              When can you deliver this package?
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
            {isSubmitting ? "Sending..." : "Send Offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
