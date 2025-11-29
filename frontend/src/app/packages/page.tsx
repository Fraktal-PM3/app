"use client";

import { AnnouncementModal } from "@/components/announcement/AnnouncementModal";
import { RealtimeIndicator } from "@/components/dashboard/RealtimeIndicator";
import { PackageCard } from "@/components/packages/PackageCard";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnnouncements, usePackages } from "@/providers";
import { Package } from "@/types/package";
import { motion } from "framer-motion";
import { Package as PackageIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";

export default function MyPackagesPage() {
  const { packages, isLoading, isConnected, error, refetch } = usePackages();
  const {
    announcements,
    isLoading: announcementsLoading,
    refetch: refetchAnnouncements,
  } = useAnnouncements(false);

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  const handleAnnounce = (pkg: Package) => {
    setSelectedPackage(pkg);
    setShowAnnouncementModal(true);
  };

  const handleAnnouncementSuccess = () => {
    // Refetch data after successful announcement
    refetch();
    refetchAnnouncements();
  };

  // Check which packages are announced
  const announcedPackageIds = new Set(
    announcements.filter((a) => a.isActive).map((a) => a.packageExternalId),
  );

  // Filter packages by status
  const activePackages = packages.filter(
    (pkg) => pkg.active === "true" && pkg.status !== "succeeded",
  );
  const completedPackages = packages.filter(
    (pkg) => pkg.active === "false" || pkg.status === "succeeded",
  );

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

  if (isLoading || announcementsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 px-4 py-6 md:py-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Separator className="bg-border" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[400px]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-6 px-4 py-6 md:py-8">
        {/* Header */}
        <PageHeader
          title="Packages"
          subtitle="Manage and announce your packages"
          icon={PackageIcon}
          breadcrumbLabels={{
            packages: "My Packages",
          }}
          rightContent={<RealtimeIndicator isConnected={isConnected} />}
        />

        <Separator className="bg-border" />

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="font-mono">
              <TabsTrigger value="all" className="text-xs uppercase">
                All ({packages.length})
              </TabsTrigger>
              <TabsTrigger value="active" className="text-xs uppercase">
                Active ({activePackages.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs uppercase">
                Completed ({completedPackages.length})
              </TabsTrigger>
            </TabsList>

            {/* All Packages */}
            <TabsContent value="all" className="mt-6">
              {packages.length === 0 ? (
                <div className="rounded-md border border-border bg-card p-12 text-center">
                  <PackageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 font-mono text-sm font-bold uppercase">
                    No Packages Found
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground">
                    Create a new package to get started
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {packages.map((pkg, index) => {
                    return (
                      <motion.div
                        key={pkg._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link href={`/packages/${pkg.id}`} prefetch={true}>
                          <PackageCard
                            package={pkg}
                            isAnnounced={announcedPackageIds.has(pkg.id)}
                            onAnnounce={handleAnnounce}
                          />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Active Packages */}
            <TabsContent value="active" className="mt-6">
              {activePackages.length === 0 ? (
                <div className="rounded-md border border-border bg-card p-12 text-center">
                  <PackageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 font-mono text-sm font-bold uppercase">
                    No Active Packages
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground">
                    All your packages have been completed or are pending
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activePackages.map((pkg, index) => (
                    <motion.div
                      key={pkg._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link href={`/packages/${pkg.id}`} prefetch={true}>
                        <PackageCard
                          package={pkg}
                          isAnnounced={announcedPackageIds.has(pkg.id)}
                          onAnnounce={handleAnnounce}
                        />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Completed Packages */}
            <TabsContent value="completed" className="mt-6">
              {completedPackages.length === 0 ? (
                <div className="rounded-md border border-border bg-card p-12 text-center">
                  <PackageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 font-mono text-sm font-bold uppercase">
                    No Completed Packages
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground">
                    Completed packages will appear here
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {completedPackages.map((pkg, index) => (
                    <motion.div
                      key={pkg._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link href={`/packages/${pkg.id}`} prefetch={true}>
                        <PackageCard
                          package={pkg}
                          isAnnounced={announcedPackageIds.has(pkg.id)}
                          onAnnounce={handleAnnounce}
                        />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Announcement Modal */}
        {selectedPackage && (
          <AnnouncementModal
            package={selectedPackage}
            open={showAnnouncementModal}
            onOpenChange={setShowAnnouncementModal}
            onSuccess={handleAnnouncementSuccess}
          />
        )}
      </div>
    </div>
  );
}
