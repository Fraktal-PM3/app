"use client";

import { proposeTransfer } from "@/app/packages/[id]/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransferOffer } from "@/types/package";
import { format } from "date-fns";
import { Briefcase, Calendar, DollarSign } from "lucide-react";
import { Button } from "../ui/button";

interface PackageOffersTabProps {
  offers: TransferOffer[];
  announcementPrice?: number;
}

export function PackageOffersTab({
  offers,
  announcementPrice,
}: PackageOffersTabProps) {
  const handleAccept = (offer: TransferOffer) => {
    proposeTransfer(offer);
  };

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
            {offers.map((offer) => (
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
                <div>
                  <Button onClick={() => handleAccept(offer)}>
                    Accept Offer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
