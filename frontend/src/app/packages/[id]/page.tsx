"use client";

import { PackageActivityTab } from "@/components/package-details/PackageActivityTab";
import { PackageAnnouncementsTab } from "@/components/package-details/PackageAnnouncementsTab";
import { PackageContactCard } from "@/components/package-details/PackageContactCard";
import { PackageDetailsCard } from "@/components/package-details/PackageDetailsCard";
import { PackageDetailsHeader } from "@/components/package-details/PackageDetailsHeader";
import { PackageOffersTab } from "@/components/package-details/PackageOffersTab";
import { PackageStatusCard } from "@/components/package-details/PackageStatusCard";
import { PackageTrackingCard } from "@/components/package-details/PackageTrackingCard";
import { PackageTransfersTab } from "@/components/package-details/PackageTransfersTab";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAnnouncementOffers,
  useAnnouncements,
  usePackage,
  useRecentActivity,
  useSSEConnection,
  useTransfers,
} from "@/providers";
import { Status } from "fraktal-lib";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  Loader2,
  Package as PackageIcon,
  Truck,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { checkPackageOwnership, checkIsSender, executeTransfer } from "./actions";

// Dynamically import PackageMap with SSR disabled to avoid Leaflet window errors
const PackageMap = dynamic(
  () =>
    import("@/components/package-details/PackageMap").then((mod) => ({
      default: mod.PackageMap,
    })),
  { ssr: false },
);

export default function PackageDetailsPage() {
  const params = useParams();
  const packageId = params.id as string;

  const { packageData, isLoading, error, refetch } = usePackage(packageId);
  const { transfers, isLoading: transfersLoading } = useTransfers();
  const { announcements, isLoading: announcementsLoading } =
    useAnnouncements(false);
  const { activities } = useRecentActivity();
  const { isConnected } = useSSEConnection();
  const [isOwner, setIsOwner] = useState(false);
  const [isSender, setIsSender] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const acceptedTransfer = useMemo(() => {
    return transfers.find(
      (transfer) =>
        transfer.status === Status.READY_FOR_PICKUP &&
        transfer.externalId === packageData?.id,
    );
  }, [transfers, packageData]);

  // Find related transfers
  const packageTransfers = useMemo(
    () =>
      transfers.filter(
        (t) =>
          t.packageId === packageData?._id || t.externalId === packageData?.id,
      ),
    [transfers, packageData],
  );

  // Find related announcements
  const packageAnnouncements = useMemo(
    () =>
      announcements.filter(
        (a) =>
          a.packageId === packageData?._id ||
          a.packageExternalId === packageData?.id,
      ),
    [announcements, packageData],
  );

  // Check if package already has an active announcement
  const hasActiveAnnouncement = useMemo(
    () => packageAnnouncements.some((a) => a.isActive),
    [packageAnnouncements],
  );

  // Get the active announcement for this package (to fetch offers)
  const activeAnnouncement = useMemo(
    () => packageAnnouncements.find((a) => a.isActive),
    [packageAnnouncements],
  );

  // Get offers for the active announcement
  const { offers: announcementOffers } = useAnnouncementOffers(
    activeAnnouncement?.messageId || "",
  );

  // Find related activities
  const packageActivities = useMemo(
    () =>
      activities
        .filter((a) => {
          const metadata = a.metadata;
          return (
            metadata?.packageId === packageData?._id ||
            metadata?.externalId === packageData?.id ||
            metadata?.id === packageData?.id
          );
        })
        .slice(0, 20),
    [activities, packageData],
  );

  // Check ownership server-side
  useEffect(() => {
    if (packageData) {
      checkPackageOwnership(packageData.ownerOrgMSP).then(setIsOwner);
      checkIsSender(packageData.senderOrgMSP).then(setIsSender);
    }
  }, [packageData]);

  // Refetch when SSE events occur
  useEffect(() => {
    if (isConnected) {
      refetch();
    }
  }, [isConnected, refetch]);

  if (isLoading || transfersLoading || announcementsLoading || !packageData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 px-4 py-6 md:py-8">
          {/* Header skeleton */}
          <Skeleton className="h-10 w-64" />
          <Separator />
          {/* Tracking & Map row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-[350px]" />
            <Skeleton className="h-[350px]" />
          </div>
          {/* Details & Contact/Status row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[400px]" />
          </div>
          {/* Tabs skeleton */}
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

  if (!packageData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <Card className="border-border bg-card">
            <CardContent className="p-8 text-center md:p-12">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 font-mono text-sm font-bold uppercase">
                Package Not Found
              </h2>
              <p className="mb-6 font-mono text-xs text-muted-foreground">
                The package you're looking for doesn't exist or has been
                removed.
              </p>
              <Link href="/packages">
                <Button className="font-mono text-xs uppercase">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Packages
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-6 px-4 py-6 md:py-8">
        {/* Header */}
        <PackageDetailsHeader
          packageData={packageData}
          isConnected={isConnected}
          isSender={isSender}
          isOwner={isOwner}
          hasActiveAnnouncement={hasActiveAnnouncement}
        />

        <Separator className="bg-border" />

        {/* Accepted Transfer Notice */}
        {packageData.status === Status.READY_FOR_PICKUP && acceptedTransfer && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-green-500/50 bg-green-500/10">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                    <div className="space-y-1">
                      <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-green-500">
                        Offer Accepted
                      </h3>
                      <p className="font-mono text-xs text-muted-foreground">
                        Transfer from{" "}
                        <span className="font-semibold">
                          {acceptedTransfer.fromMSP}
                        </span>{" "}
                        to{" "}
                        <span className="font-semibold">
                          {acceptedTransfer.toMSP}
                        </span>
                      </p>
                      {acceptedTransfer.price && (
                        <p className="font-mono text-xs text-muted-foreground">
                          Price:{" "}
                          <span className="font-semibold">
                            {acceptedTransfer.price} kr
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      setIsExecuting(true);
                      try {
                        await executeTransfer(
                          acceptedTransfer.transferId,
                          acceptedTransfer.externalId,
                        );
                      } catch (error) {
                        console.error("Error executing transfer:", error);
                      } finally {
                        setIsExecuting(false);
                      }
                    }}
                    disabled={isExecuting}
                    className="font-mono text-xs uppercase"
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      "Execute Transfer"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Package Tracking */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <PackageTrackingCard packageData={packageData} />
          </motion.div>

          {/* Package Map */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <PackageMap packageData={packageData} />
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Package Details */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex"
          >
            <PackageDetailsCard packageData={packageData} />
          </motion.div>

          {/* PII & Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-6"
          >
            <PackageContactCard packageData={packageData} />
            <PackageStatusCard packageData={packageData} />
          </motion.div>
        </div>

        {/* Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Tabs defaultValue="transfers" className="w-full">
            <TabsList className="font-mono w-full sm:w-auto grid grid-cols-4 sm:inline-grid">
              <TabsTrigger value="transfers" className="text-xs uppercase">
                <Truck className="mr-0 sm:mr-2 h-3 w-3" />
                <span className="hidden sm:inline">Transfers</span>
                <span className="ml-1">({packageTransfers.length})</span>
              </TabsTrigger>
              <TabsTrigger value="offers" className="text-xs uppercase">
                <Briefcase className="mr-0 sm:mr-2 h-3 w-3" />
                <span className="hidden sm:inline">Offers</span>
                <span className="ml-1">({announcementOffers.length})</span>
              </TabsTrigger>
              <TabsTrigger value="announcements" className="text-xs uppercase">
                <PackageIcon className="mr-0 sm:mr-2 h-3 w-3" />
                <span className="hidden sm:inline">Announce</span>
                <span className="ml-1">({packageAnnouncements.length})</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs uppercase">
                <Clock className="mr-0 sm:mr-2 h-3 w-3" />
                <span className="hidden sm:inline">Activity</span>
                <span className="ml-1">({packageActivities.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transfers" className="mt-6">
              <PackageTransfersTab transfers={packageTransfers} />
            </TabsContent>

            <TabsContent value="offers" className="mt-6">
              <PackageOffersTab
                offers={announcementOffers}
                announcementPrice={activeAnnouncement?.price}
                isOwner={isOwner}
                packageStatus={packageData.status}
                packageActive={packageData.active}
              />
            </TabsContent>

            <TabsContent value="announcements" className="mt-6">
              <PackageAnnouncementsTab announcements={packageAnnouncements} />
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <PackageActivityTab activities={packageActivities} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
