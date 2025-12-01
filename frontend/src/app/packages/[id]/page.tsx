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
import dynamic from "next/dynamic";

// Dynamically import PackageMap with SSR disabled to avoid Leaflet window errors
const PackageMap = dynamic(
    () => import("@/components/package-details/PackageMap").then((mod) => ({ default: mod.PackageMap })),
    { ssr: false }
);
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    useAnnouncements,
    useAnnouncementOffers,
    usePackages,
    useRecentActivity,
    useSSEConnection,
    useTransfers,
} from "@/providers";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Briefcase, Clock, Package as PackageIcon, Truck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { checkPackageOwnership } from "./actions";

export default function PackageDetailsPage() {
    const params = useParams();
    const packageId = params.id as string;

    const { packages, isLoading, error, refetch } = usePackages();
    const { transfers, isLoading: transfersLoading } = useTransfers();
    const { announcements, isLoading: announcementsLoading } =
        useAnnouncements(false);
    const { activities } = useRecentActivity();
    const { isConnected } = useSSEConnection();
    const [isOwner, setIsOwner] = useState(false);

    // Find the package by ID (blockchain id)
    const packageData = useMemo(
        () => packages.find((pkg) => pkg.id === packageId),
        [packages, packageId]
    );

    // Find related transfers
    const packageTransfers = useMemo(
        () =>
            transfers.filter(
                (t) =>
                    t.packageId === packageData?._id || t.externalId === packageData?.id
            ),
        [transfers, packageData]
    );

    // Find related announcements
    const packageAnnouncements = useMemo(
        () =>
            announcements.filter(
                (a) =>
                    a.packageId === packageData?._id ||
                    a.packageExternalId === packageData?.id
            ),
        [announcements, packageData]
    );

    // Check if package already has an active announcement
    const hasActiveAnnouncement = useMemo(
        () => packageAnnouncements.some((a) => a.isActive),
        [packageAnnouncements]
    );

    // Get the active announcement for this package (to fetch offers)
    const activeAnnouncement = useMemo(
        () => packageAnnouncements.find((a) => a.isActive),
        [packageAnnouncements]
    );

    // Get offers for the active announcement
    const { offers: announcementOffers } = useAnnouncementOffers(
        activeAnnouncement?.messageId || ""
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
        [activities, packageData]
    );

    // Check ownership server-side
    useEffect(() => {
        if (packageData) {
            checkPackageOwnership(packageData.mspId).then(setIsOwner);
        }
    }, [packageData]);

    // Refetch when SSE events occur
    useEffect(() => {
        if (isConnected) {
            refetch();
        }
    }, [isConnected, refetch]);

    if (isLoading || transfersLoading || announcementsLoading) {
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
                    isOwner={isOwner}
                    hasActiveAnnouncement={hasActiveAnnouncement}
                />

                <Separator className="bg-border" />

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
