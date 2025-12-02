"use client";

import { proposeTransfer } from "@/app/packages/[id]/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransferOffer } from "@/types/package";
import { format } from "date-fns";
import { Briefcase, Calendar, CheckCircle2, DollarSign, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";

interface PackageOffersTabProps {
  offers: TransferOffer[];
  announcementPrice?: number;
  isOwner: boolean;
  packageStatus: string;
  packageActive?: string;
}

export function PackageOffersTab({
  offers,
  announcementPrice,
  isOwner,
  packageStatus,
  packageActive,
}: PackageOffersTabProps) {
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);
  const [acceptedOfferId, setAcceptedOfferId] = useState<string | null>(null);
  const [errorOfferId, setErrorOfferId] = useState<string | null>(null);

  const handleAccept = async (offer: TransferOffer) => {
    try {
      setAcceptingOfferId(offer._id);
      setErrorOfferId(null);

      await proposeTransfer(offer);

      setAcceptedOfferId(offer._id);
      setAcceptingOfferId(null);

      // Auto-clear success state after 3 seconds
      setTimeout(() => {
        setAcceptedOfferId(null);
      }, 3000);
    } catch (error) {
      console.error("Error accepting offer:", error);
      setErrorOfferId(offer._id);
      setAcceptingOfferId(null);

      // Auto-clear error state after 5 seconds
      setTimeout(() => {
        setErrorOfferId(null);
      }, 5000);
    }
  };

  // Check if offers can be accepted
  // Only allow accepting offers if:
  // 1. User is the owner
  // 2. Package status is "pending" (announcement sent but no transfer accepted yet)
  // 3. Package is active
  const canAcceptOffers = isOwner && packageStatus === "pending" && packageActive !== "false";

  return (
    <Card className="border-border bg-card font-mono">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">
            Received Offers
          </CardTitle>
          {announcementPrice && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span className="uppercase tracking-wider">
                Asking: {announcementPrice} kr
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {offers.length === 0 ? (
          <div className="py-12 text-center">
            <Briefcase className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              No offers received yet
            </p>
            {announcementPrice && (
              <p className="mt-2 text-xs text-muted-foreground">
                Announce your package to receive delivery offers
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => {
              const isAccepting = acceptingOfferId === offer._id;
              const isAccepted = acceptedOfferId === offer._id;
              const hasError = errorOfferId === offer._id;

              return (
                <div
                  key={offer._id}
                  className="rounded-md border border-border bg-muted/20 p-4"
                >
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="font-mono text-xs text-muted-foreground break-all">
                        {offer.messageId}
                      </div>
                      {offer.createdISO && (
                        <div className="text-xs text-muted-foreground">
                          Received{" "}
                          {format(
                            new Date(offer.createdISO),
                            "MMM dd, yyyy HH:mm",
                          )}
                        </div>
                      )}
                    </div>
                    {offer.expiryISO && (
                      <Badge variant="outline" className="font-mono text-xs">
                        <Calendar className="mr-1 h-3 w-3" />
                        Delivery:{" "}
                        {format(new Date(offer.expiryISO), "MMM dd, HH:mm")}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground uppercase tracking-wider">
                        From Transporter
                      </div>
                      <div className="mt-1 font-semibold break-words">
                        {offer.fromMSP}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground uppercase tracking-wider">
                        To Sender
                      </div>
                      <div className="mt-1 font-semibold break-words">
                        {offer.toMSP}
                      </div>
                    </div>
                  </div>

                  {offer.price !== undefined && (
                    <div className="mt-3 rounded-md bg-background p-2 text-center">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">
                        Offered Price
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-lg font-bold">{offer.price} kr</div>
                        {announcementPrice &&
                          offer.price !== announcementPrice && (
                            <Badge
                              variant={
                                offer.price < announcementPrice
                                  ? "outline"
                                  : "default"
                              }
                              className="text-xs"
                            >
                              {offer.price < announcementPrice
                                ? `-${announcementPrice - offer.price} kr`
                                : `+${offer.price - announcementPrice} kr`}
                            </Badge>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Only show accept button if user is owner and package is in valid state */}
                  {canAcceptOffers && (
                    <div className="mt-4">
                      <Button
                        onClick={() => handleAccept(offer)}
                        disabled={isAccepting || isAccepted}
                        variant={isAccepted ? "outline" : hasError ? "destructive" : "default"}
                        className="w-full font-mono text-xs uppercase"
                      >
                        {isAccepting ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Accepting Offer...
                          </>
                        ) : isAccepted ? (
                          <>
                            <CheckCircle2 className="mr-2 h-3 w-3" />
                            Offer Accepted!
                          </>
                        ) : hasError ? (
                          "Failed - Try Again"
                        ) : (
                          "Accept Offer"
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Show message if user is not the owner */}
                  {!isOwner && (
                    <div className="mt-4 rounded-md bg-muted/30 p-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        Only the package owner can accept offers
                      </p>
                    </div>
                  )}

                  {/* Show message if package status doesn't allow accepting */}
                  {isOwner && !canAcceptOffers && (
                    <div className="mt-4 rounded-md bg-muted/30 p-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        {packageStatus !== "pending"
                          ? "Package must be in pending status to accept offers"
                          : "Package is no longer active"}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
