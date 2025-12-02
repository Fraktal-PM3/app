"use client";

import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { PageHeader } from "@/components/common/PageHeader";
import { RealtimeIndicator } from "@/components/dashboard/RealtimeIndicator";
import { TransferOfferModal } from "@/components/offers/TransferOfferModal";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnnouncements, useTransferOffers } from "@/providers";
import { PackageAnnouncement, TransferOffer } from "@/types/package";
import { motion } from "framer-motion";
import { Briefcase, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCurrentMspId } from "./actions";

export default function OffersPage() {
  const {
    announcements,
    isLoading,
    isConnected,
    error,
    refetch,
  } = useAnnouncements(true); // Show ALL announcements, not just active ones

  const { offers } = useTransferOffers();

  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<PackageAnnouncement | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUrgency, setFilterUrgency] = useState<string>("all");
  const [currentMspId, setCurrentMspId] = useState<string | null>(null);

  // Get current MSP ID on mount
  useEffect(() => {
    getCurrentMspId().then(setCurrentMspId);
  }, []);

  // Create a map of announcement ID to user's offers (array) for that announcement
  const userOffersByAnnouncement = useMemo(() => {
    if (!currentMspId) return new Map<string, TransferOffer[]>();

    const offerMap = new Map<string, TransferOffer[]>();

    offers.forEach((offer) => {
      // Check if this offer is from the current user
      if (offer.announcementMessageId) {
        // Find the announcement this offer is for
        const announcement = announcements.find(
          (a) => a.messageId === offer.announcementMessageId
        );
        if (announcement) {
          const existingOffers = offerMap.get(announcement._id) || [];
          offerMap.set(announcement._id, [...existingOffers, offer]);
        }
      }
    });

    // Sort offers by creation date (most recent first) for each announcement
    offerMap.forEach((offers, announcementId) => {
      offers.sort((a, b) => {
        const dateA = new Date(a.createdISO || a.createdAt || 0).getTime();
        const dateB = new Date(b.createdISO || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
    });

    return offerMap;
  }, [offers, currentMspId, announcements]);

  const handleSendOffer = (announcement: PackageAnnouncement) => {
    setSelectedAnnouncement(announcement);
    setShowOfferModal(true);
  };

  const handleOfferSuccess = () => {
    refetch();
  };

  // Filter announcements based on search and urgency
  const filteredAnnouncements = announcements.filter((announcement) => {
    const pkg = announcement.packageDetails;
    if (!pkg) return false;

    const pickupAddress = pkg.pickupLocation?.address || "";
    const dropAddress = pkg.dropLocation?.address || "";

    const matchesSearch =
      searchTerm === "" ||
      pickupAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dropAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      announcement.packageExternalId
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesUrgency =
      filterUrgency === "all" || pkg.urgency === filterUrgency;

    return matchesSearch && matchesUrgency;
  });

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

  if (isLoading) {
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
              <Skeleton key={i} className="h-[500px]" />
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
          title="Available Offers"
          subtitle="Browse package delivery opportunities"
          icon={Briefcase}
          breadcrumbLabels={{
            offers: "Available Offers",
          }}
          rightContent={
            <>
              <Badge variant="outline" className="font-mono text-xs">
                {filteredAnnouncements.length} Available
              </Badge>
              <RealtimeIndicator isConnected={isConnected} />
            </>
          }
        />

        <Separator className="bg-border" />

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-4 sm:flex-row"
        >
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by location or package ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 font-mono text-xs"
            />
          </div>

          {/* Urgency Filter */}
          <select
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 font-mono text-xs uppercase ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="all">All Urgency</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
            <option value="none">No Urgency</option>
          </select>
        </motion.div>

        {/* Announcements Grid */}
        {filteredAnnouncements.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-md border border-border bg-card p-12 text-center"
          >
            <Briefcase className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-mono text-sm font-bold uppercase">
              No Offers Available
            </h3>
            <p className="font-mono text-xs text-muted-foreground">
              {searchTerm || filterUrgency !== "all"
                ? "No offers match your current filters"
                : "Check back soon for new delivery opportunities"}
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAnnouncements.map((announcement, index) => (
              <motion.div
                key={announcement._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <AnnouncementCard
                  announcement={announcement}
                  onSendOffer={handleSendOffer}
                  userOffers={userOffersByAnnouncement.get(announcement._id)}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Transfer Offer Modal */}
        {selectedAnnouncement && (
          <TransferOfferModal
            announcement={selectedAnnouncement}
            open={showOfferModal}
            onOpenChange={setShowOfferModal}
            onSuccess={handleOfferSuccess}
          />
        )}
      </div>
    </div>
  );
}
