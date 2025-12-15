"use client";

import { LocationDisplay } from "@/components/common/LocationDisplay";
import { PageHeader } from "@/components/common/PageHeader";
import { TransferOfferModal } from "@/components/offers/TransferOfferModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnnouncements, useTransferOffers } from "@/providers";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  Briefcase,
  Calendar,
  DollarSign,
  Weight,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getCurrentMspId } from "../actions";

// Dynamically import PackageMap with SSR disabled
const PackageMap = dynamic(
  () =>
    import("@/components/package-details/PackageMap").then((mod) => ({
      default: mod.PackageMap,
    })),
  { ssr: false },
);

export default function OfferDetailsPage() {
  const params = useParams();
  const announcementId = params.id as string;

  const { announcements, isLoading, isConnected, error } =
    useAnnouncements(false); // Show ALL announcements, not just active ones
  const { offers, refetch } = useTransferOffers();
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [currentMspId, setCurrentMspId] = useState<string | null>(null);

  // Get current MSP ID on mount
  useEffect(() => {
    getCurrentMspId().then(setCurrentMspId);
  }, []);

  // Find the announcement by ID
  const announcement = useMemo(
    () => announcements.find((a) => a._id === announcementId),
    [announcements, announcementId],
  );

  // Find all user's offers for this announcement
  const userOffers = useMemo(() => {
    if (!currentMspId || !announcement) return [];

    console.log("Offers:", offers);

    const filteredOffers = offers.filter(
      (offer) => offer.announcementMessageId === announcement.messageId,
    );

    console.log(
      "[OfferDetailsPage] User offers for announcement",
      announcementId,
      ":",
      filteredOffers,
    );

    // Sort by creation date (most recent first)
    return filteredOffers.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [offers, currentMspId, announcement]);

  const handleSendOffer = () => {
    setShowOfferModal(true);
  };

  const handleOfferSuccess = () => {
    // Offers will be automatically updated via SSE events
  };

  const getUrgencyBadge = () => {
    const urgency = announcement?.packageDetails?.urgency;
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 px-4 py-6 md:py-8">
          <Skeleton className="h-10 w-64" />
          <Separator />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[400px]" />
          </div>
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="border border-destructive/50 bg-destructive/10 p-6">
            <h2 className="mb-2 font-mono text-sm font-bold uppercase">
              Connection Error
            </h2>
            <p className="font-mono text-xs text-destructive/90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <Card className="border-border bg-card">
            <CardContent className="p-8 text-center md:p-12">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 font-mono text-sm font-bold uppercase">
                Offer Not Found
              </h2>
              <p className="mb-6 font-mono text-xs text-muted-foreground">
                The offer you're looking for doesn't exist or is no longer
                available.
              </p>
              <Link href="/offers">
                <Button className="font-mono text-xs uppercase">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Offers
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const pkg = announcement.packageDetails;

  // Convert announcement to Package format for map component
  const packageDataForMap = pkg
    ? {
        _id: announcement._id,
        id: announcement.packageExternalId,
        name: `Package ${announcement.packageExternalId}`,
        packageDetails: pkg,
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-6 px-4 py-6 md:py-8">
        {/* Header */}
        <PageHeader
          title={`Offer: ${announcement.packageExternalId}`}
          subtitle="View offer details and submit transfer proposal"
          icon={Briefcase}
          breadcrumbLabels={{
            offers: "Available Offers",
            [announcementId]: announcement.packageExternalId,
          }}
          rightContent={
            <div className="flex flex-wrap gap-2">
              {getUrgencyBadge()}
              {announcement?.transferStatus === "accepted" ? (
                <Badge
                  variant="default"
                  className="bg-green-600 font-mono text-xs"
                >
                  ACCEPTED
                </Badge>
              ) : userOffers.length > 0 ? (
                <Badge
                  variant="outline"
                  className="bg-blue-50 font-mono text-xs dark:bg-blue-950"
                >
                  {userOffers.length} OFFER{userOffers.length > 1 ? "S" : ""}{" "}
                  SENT
                </Badge>
              ) : (
                <Badge
                  variant="default"
                  className="bg-green-600 font-mono text-xs"
                >
                  AVAILABLE
                </Badge>
              )}
            </div>
          }
        />

        <Separator className="bg-border" />

        {pkg ? (
          <>
            {/* Map and Price Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Map */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {packageDataForMap && (
                  <PackageMap packageData={packageDataForMap as any} />
                )}
              </motion.div>

              {/* Price and Quick Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-6"
              >
                {/* Price Card */}
                {announcement.price && (
                  <Card className="border-border bg-card font-mono">
                    <CardHeader>
                      <CardTitle className="text-sm font-bold uppercase tracking-wider">
                        Suggested Price
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-8 w-8 text-primary" />
                        <div>
                          <div className="text-4xl font-bold">
                            {announcement.price} kr
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Price suggested by sender
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Package Info Card */}
                <Card className="border-border bg-card font-mono">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider">
                      Package Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Weight and Size Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Weight className="h-3 w-3 flex-shrink-0" />
                          <span className="uppercase tracking-wider">
                            Weight
                          </span>
                        </div>
                        <div className="text-lg font-bold">
                          {pkg.weightKg || "N/A"} kg
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Boxes className="h-3 w-3 flex-shrink-0" />
                          <span className="uppercase tracking-wider">Size</span>
                        </div>
                        <div className="text-sm font-semibold">
                          {pkg.size
                            ? `${pkg.size.width} × ${pkg.size.height} × ${pkg.size.depth} cm`
                            : "N/A"}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Metadata */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground uppercase tracking-wider flex-shrink-0">
                          Posted
                        </span>
                        <span className="font-semibold text-right">
                          {announcement.createdAt
                            ? format(
                                new Date(announcement.createdAt),
                                "MMM dd, yyyy HH:mm",
                              )
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground uppercase tracking-wider flex-shrink-0">
                          Announced By
                        </span>
                        <span className="font-mono font-semibold text-right break-all">
                          {announcement.announcerMSP}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Locations Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-border bg-card font-mono">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">
                    Delivery Locations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <LocationDisplay
                    type="pickup"
                    location={pkg.pickupLocation}
                  />
                  <LocationDisplay type="dropoff" location={pkg.dropLocation} />
                </CardContent>
              </Card>
            </motion.div>

            {/* Action Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-border bg-card font-mono">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-mono text-sm font-bold uppercase">
                        {userOffers.length > 0
                          ? "Want to submit another offer?"
                          : "Interested in this delivery?"}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submit a transfer offer to the sender with your proposed
                        terms
                      </p>
                    </div>
                    <Button
                      onClick={handleSendOffer}
                      size="lg"
                      className="font-mono text-xs uppercase"
                      disabled={userOffers.length >= 1}
                    >
                      {userOffers.length > 0
                        ? "Send Another Offer"
                        : "Send Transfer Offer"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Offers Log */}
            {userOffers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 font-mono">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">
                      Your Submitted Offer{userOffers.length > 1 ? "s" : ""} (
                      {userOffers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="max-h-[400px] space-y-4 overflow-y-auto">
                      {userOffers.map((offer, index) => (
                        <div
                          key={offer._id}
                          className="space-y-3 rounded-md border border-blue-200 bg-white p-4 dark:border-blue-700 dark:bg-blue-900/30"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-blue-700 dark:text-blue-400">
                              Offer #{userOffers.length - index}
                            </div>
                            {index === 0 && (
                              <Badge
                                variant="outline"
                                className="bg-blue-100 dark:bg-blue-800 text-xs"
                              >
                                Latest
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-md bg-blue-100 dark:bg-blue-900/50 p-3">
                              <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400">
                                <DollarSign className="h-3 w-3" />
                                <span className="uppercase tracking-wider">
                                  Price
                                </span>
                              </div>
                              <div className="mt-1 text-xl font-bold text-blue-900 dark:text-blue-100">
                                {offer.price} kr
                              </div>
                            </div>

                            {offer.expiryISO && (
                              <div className="rounded-md bg-blue-100 dark:bg-blue-900/50 p-3">
                                <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400">
                                  <Calendar className="h-3 w-3" />
                                  <span className="uppercase tracking-wider">
                                    Expiry
                                  </span>
                                </div>
                                <div className="mt-1 text-sm font-bold text-blue-900 dark:text-blue-100">
                                  {format(
                                    new Date(offer.expiryISO),
                                    "MMM dd, yyyy HH:mm",
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            Sent:{" "}
                            {format(
                              new Date(offer.createdAt || new Date()),
                              "MMM dd, yyyy HH:mm",
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator className="bg-blue-200 dark:bg-blue-800" />

                    <div className="space-y-2 text-center text-xs text-blue-700 dark:text-blue-400">
                      <p>
                        Your offer{userOffers.length > 1 ? "s have" : " has"}{" "}
                        been sent to the sender.
                      </p>
                      <p>They will review and respond soon.</p>
                      {announcement.price && (
                        <p className="font-semibold">
                          (Asking price: {announcement.price} kr)
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="p-8 text-center md:p-12">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 font-mono text-sm font-bold uppercase">
                Package Details Unavailable
              </h2>
              <p className="font-mono text-xs text-muted-foreground">
                Package details haven't synced yet. Please try again later.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Transfer Offer Modal */}
        {announcement && (
          <TransferOfferModal
            announcement={announcement}
            open={showOfferModal}
            onOpenChange={setShowOfferModal}
            onSuccess={handleOfferSuccess}
          />
        )}
      </div>
    </div>
  );
}
